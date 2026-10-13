import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../create-app.js";
import { SqlitePartnerOperationStore } from "../services/partner/sqlite-store.js";
import { PARTNER_MEDIA_TYPE, signPartnerRequest } from "../services/partner/request-auth.js";
import { partnerReceiptEventSchema, verifyReceiptEvidence } from "../services/partner/receipt-evidence.js";
import { partnerRoutes } from "./partner.js";

const SECRET = "moniflow-hustle-sandbox-test-secret-never-use-in-production";
const apps: ReturnType<typeof Fastify>[] = [];
const cleanups: Array<() => void> = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map(app => app.close()));
  cleanups.splice(0).forEach(cleanup => cleanup());
});

function sandbox(store = new SqlitePartnerOperationStore(":memory:")) {
  const app = Fastify();
  apps.push(app);
  app.register(partnerRoutes, { prefix: "/internal/v1", store, secret: SECRET });
  app.addHook("onClose", async () => store.close());
  return app;
}

const BUYER = "59b9b085-758f-4391-b97b-98d574650a6a";
const SELLER = "87e81c06-a551-4825-9adf-17e32a41d4d1";
const SUBJECT = "77986f3b-1bc0-4aab-b900-477438338bac";

function collection() {
  return {
    version: "1", partner: "HUSTLE", environment: "sandbox",
    operationId: randomUUID(), idempotencyKey: "hustle-payment-" + randomUUID(),
    kind: "COLLECTION", subjectType: "BOOKING", subjectId: SUBJECT,
    payerReference: BUYER, beneficiaryReference: SELLER,
    amountMinor: 1000000, currency: "NGN"
  };
}

function payout() {
  return {
    version: "1", partner: "HUSTLE", environment: "sandbox",
    operationId: randomUUID(), idempotencyKey: "hustle-payout-" + randomUUID(),
    kind: "PAYOUT", payoutId: randomUUID(), beneficiaryReference: SELLER,
    destinationReference: "verified-destination:sandbox-only",
    hustleReservationReference: "ledger:committed-reservation-id",
    amountMinor: 300000, currency: "NGN"
  };
}

function signed(
  method: "POST" | "GET",
  url: string,
  payload?: unknown,
  opts: { nonce?: string; timestamp?: string; partner?: string; signBody?: string } = {}
) {
  const body = payload === undefined ? "" : JSON.stringify(payload);
  const timestamp = opts.timestamp ?? String(Date.now());
  const nonce = opts.nonce ?? randomUUID();
  const signature = signPartnerRequest(
    SECRET,method,url,timestamp,nonce,Buffer.from(opts.signBody ?? body)
  );
  return {
    method, url,
    headers: {
      "x-moniflow-partner": opts.partner ?? "HUSTLE",
      "x-moniflow-timestamp": timestamp,
      "x-moniflow-nonce": nonce,
      "x-moniflow-signature": signature,
      ...(method === "POST" ? { "content-type": PARTNER_MEDIA_TYPE } : {})
    },
    ...(method === "POST" ? { payload: body } : {})
  };
}

describe("MONIFlow Hustle sandbox-only partner control plane", () => {
  it("accepts source-authentic Hustle CUIDs without treating receipt as payment", async () => {
    const app = sandbox();
    const cuid = "cmq8h5rjk0000n91t32g77v4p";
    const command = { ...collection(), operationId:cuid, subjectId:cuid, payerReference:cuid, beneficiaryReference:cuid };
    const result = await app.inject(signed("POST", "/internal/v1/collections", command));
    expect(result.statusCode).toBe(202);
    expect(result.json()).toMatchObject({ operationId:cuid, status:"RECEIVED", executionStarted:false, realFundsMoved:false });
    expect((await app.inject(signed("GET", "/internal/v1/operations/"+cuid))).statusCode).toBe(200);
  });
  it("is not registered in the normal MONIFlow app when opt-in is absent", async () => {
    const app = buildApp();
    apps.push(app);
    const res = await app.inject({ method: "GET", url: "/internal/v1/provider-capabilities" });
    expect(res.statusCode).toBe(404);
  });

  it("rejects missing credentials, invalid HMAC, stale timestamp and impersonation", async () => {
    const app = sandbox();
    const command=collection();
    const url="/internal/v1/collections";
    expect((await app.inject({method:"POST",url,payload:command})).statusCode).toBe(401);
    expect((await app.inject(signed("POST",url,command,{timestamp:String(Date.now()-600_000)}))).statusCode).toBe(401);
    expect((await app.inject(signed("POST",url,command,{partner:"OTHER"}))).statusCode).toBe(401);
    expect((await app.inject(signed("POST",url,command,{signBody:"{}"}))).statusCode).toBe(401);
    const forged = signed("POST",url,command);
    forged.headers["x-moniflow-signature"] = "sha256=" + "0".repeat(64);
    expect((await app.inject(forged)).statusCode).toBe(401);
  });

  it("accepts once and persists signed command, never claims money moved", async () => {
    const app = sandbox();
    const command=collection();
    const url="/internal/v1/collections";
    const signedCommand=signed("POST",url,command);
    const first=await app.inject(signedCommand);
    expect(first.statusCode).toBe(202);
    expect(first.json()).toMatchObject({
      operationId:command.operationId, kind:"COLLECTION",status:"RECEIVED",
      environment:"sandbox",simulated:true,executionStarted:false,
      realFundsMoved:false,providerEvidenceReference:null,duplicate:false
    });
    const replay=await app.inject(signedCommand);
    expect(replay.statusCode).toBe(409);
    expect(replay.json().code).toBe("SIGNED_REQUEST_REPLAY");
    const second=await app.inject(signed("POST",url,command));
    expect(second.statusCode).toBe(200);
    expect(second.json().duplicate).toBe(true);
    const detail=await app.inject(signed("GET","/internal/v1/operations/"+command.operationId));
    expect(detail.statusCode).toBe(200);
    expect(detail.json()).toMatchObject({operationId:command.operationId,status:"RECEIVED",realFundsMoved:false});
    expect(detail.body).not.toContain("payerReference");
    expect(detail.body).not.toContain("hustleReservationReference");
  });

  it("rejects changes to an existing idempotency key or operation ID", async () => {
    const app=sandbox();const command=collection();const url="/internal/v1/collections";
    expect((await app.inject(signed("POST",url,command))).statusCode).toBe(202);
    expect((await app.inject(signed("POST",url,{...command,amountMinor:2000000}))).statusCode).toBe(409);
    expect((await app.inject(signed("POST",url,{...command,operationId:randomUUID()}))).statusCode).toBe(409);
    expect((await app.inject(signed("POST",url,{...command,idempotencyKey:"other-"+randomUUID()}))).statusCode).toBe(409);
    const original = await app.inject(signed("GET","/internal/v1/operations/"+command.operationId));
    expect(original.json()).toMatchObject({status:"RECEIVED",realFundsMoved:false});
  });

  it("fails closed for invalid amounts, untrusted fields, wrong kind and live environment", async () => {
    const app=sandbox();const command=collection();const url="/internal/v1/collections";
    for (const data of [
      {...command,amountMinor:0},
      {...command,amountMinor:1.15},
      {...command,currency:"USD"},
      {...command,environment:"production"},
      {...command,providerSuccess:true},
      {...command,partner:"OTHER"},
      {...command,kind:"PAYOUT"}
    ]) {
      expect((await app.inject(signed("POST",url,data))).statusCode).toBe(400);
    }
    expect((await app.inject(signed("GET","/internal/v1/operations/"+command.operationId))).statusCode).toBe(404);
  });

  it("authenticates readback and signs immutable RECEIVED-only evidence, not financial success", async () => {
    const app = sandbox();
    const command = collection();
    const post = await app.inject(signed("POST","/internal/v1/collections",command));
    expect(post.statusCode).toBe(202);
    const url="/internal/v1/operations/"+command.operationId+"/receipt-evidence";
    expect((await app.inject({method:"GET",url})).statusCode).toBe(401);
    const first=await app.inject(signed("GET",url));
    expect(first.statusCode).toBe(200);
    const signature=String(first.headers["x-moniflow-receipt-signature"]);
    expect(verifyReceiptEvidence(SECRET,Buffer.from(first.rawPayload),signature)).toBe(true);
    const receipt=partnerReceiptEventSchema.parse(first.json());
    expect(receipt).toMatchObject({
      source:"MONIFLOW",partner:"HUSTLE",eventType:"operation.received",
      operationId:command.operationId,kind:"COLLECTION",amountMinor:command.amountMinor,
      status:"RECEIVED",simulated:true,executionStarted:false,
      realFundsMoved:false,providerEvidenceReference:null
    });
    expect(first.body).not.toContain("payerReference");
    expect(first.body).not.toContain("beneficiaryReference");
    expect(verifyReceiptEvidence(SECRET,Buffer.from(first.body+" "),signature)).toBe(false);
    expect(verifyReceiptEvidence(SECRET,Buffer.from(first.body),"sha256="+"f".repeat(64))).toBe(false);
    const again=await app.inject(signed("GET",url));
    expect(again.statusCode).toBe(200);
    expect(again.body).toBe(first.body);
    expect(again.headers["x-moniflow-receipt-signature"]).toBe(signature);
    const replay=signed("GET",url,{});
    const replayFirst=await app.inject(replay);
    const replaySecond=await app.inject(replay);
    expect(replayFirst.statusCode).toBe(200);
    expect(replaySecond.statusCode).toBe(409);
    expect((await app.inject(signed("GET","/internal/v1/operations/"+randomUUID()+"/receipt-evidence"))).statusCode).toBe(404);
    expect((await app.inject(signed("GET","/internal/v1/operations/"+command.operationId))).json().status).toBe("RECEIVED");
  });

  it("records payout/refund proposals only, without provider activation", async () => {
    const app=sandbox();
    const p=payout();
    const accepted=await app.inject(signed("POST","/internal/v1/payouts",p));
    expect(accepted.statusCode).toBe(202);
    expect(accepted.json()).toMatchObject({kind:"PAYOUT",status:"RECEIVED",executionStarted:false});
    const refund={
      version:"1",partner:"HUSTLE",environment:"sandbox",operationId:randomUUID(),
      idempotencyKey:"hustle-refund-"+randomUUID(),kind:"REFUND",refundId:randomUUID(),
      originalPaymentReference:"payment:sandbox-only",subjectType:"ORDER",subjectId:SUBJECT,
      amountMinor:2000,currency:"NGN",hustleRefundAuthorizationReference:"hustle:refund-hold"
    };
    expect((await app.inject(signed("POST","/internal/v1/refunds",refund))).statusCode).toBe(202);
    const capabilities=await app.inject(signed("GET","/internal/v1/provider-capabilities"));
    expect(capabilities.statusCode).toBe(200);
    expect(capabilities.json()).toMatchObject({
      partner:"HUSTLE",simulated:true,providerExecutionEnabled:false,
      payoutsEnabled:false,refundsEnabled:false,merchantCollectionsEnabled:false,custodyEnabled:false
    });
  });

  it("persists signed nonce replay guard and operation across SQLite process restart", async () => {
    const dir = mkdtempSync(join(tmpdir(),"moniflow-partner-test-"));
    cleanups.push(()=>rmSync(dir,{recursive:true,force:true}));
    const path="file:"+join(dir,"partner-test.db");
    const cmd=collection();
    const req=signed("POST","/internal/v1/collections",cmd);
    const initial=sandbox(new SqlitePartnerOperationStore(path));
    expect((await initial.inject(req)).statusCode).toBe(202);
    await initial.close();apps.splice(apps.indexOf(initial),1);
    const restarted=sandbox(new SqlitePartnerOperationStore(path));
    expect((await restarted.inject(req)).statusCode).toBe(409);
    const detail=await restarted.inject(signed("GET","/internal/v1/operations/"+cmd.operationId));
    expect(detail.statusCode).toBe(200);
    expect(detail.json().status).toBe("RECEIVED");
    expect((await restarted.inject(signed("POST","/internal/v1/collections",cmd))).statusCode).toBe(200);
  });
});
