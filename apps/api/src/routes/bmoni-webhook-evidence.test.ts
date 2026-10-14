import { createHmac, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../create-app.js";
import { SqliteBmoniEvidenceStore } from "../services/bmoni/webhook-evidence-store.js";
import { bmoniWebhookEvidenceRoutes } from "./bmoni-webhook-evidence.js";

const SECRET = "0123456789abcdef".repeat(4); // throwaway 64-char fixture; NEVER a real provider key
const testApps: Array<ReturnType<typeof Fastify>> = [];
const cleanups: Array<() => void>=[];
afterEach(async()=>{
  await Promise.all(testApps.splice(0).map(app=>app.close()));
  cleanups.splice(0).forEach(cleanup=>cleanup());
});
function file(){
  const dir=mkdtempSync(join(tmpdir(),"moniflow-bmoni-webhook-"));
  cleanups.push(()=>rmSync(dir,{recursive:true,force:true}));
  return "file:"+join(dir,"evidence.sqlite");
}
function appWithStore(db = new SqliteBmoniEvidenceStore(":memory:")) {
  const app=Fastify();
  testApps.push(app);
  app.register(bmoniWebhookEvidenceRoutes,{
    prefix:"/internal/test-only/bmoni-webhook-evidence",store:db,secretKey:SECRET
  });
  app.addHook("onClose", async()=>db.close());
  return {app,db};
}
function event(type="employee.deposit.completed",id=randomUUID()) {
  return { id, eventType:type, payload:{userId:"bmoni-fixture-user",amount:"1000.00"},
    timestamp:"2026-10-14T10:00:00.000Z" };
}
const URL="/internal/test-only/bmoni-webhook-evidence/received";
function signed(value:unknown, overrides:{
  body?:string, signature?:string, eventId?:string, sourceEventId?:string
}={}) {
  const raw=overrides.body??JSON.stringify(value);
  const digest=createHmac("sha256",SECRET).update(Buffer.from(raw)).digest("hex");
  return {
    method:"POST" as const,url:URL,
    headers:{"content-type":"application/json",
      "x-webhook-id":overrides.eventId??(value as {id:string}).id,
      "x-webhook-signature":overrides.signature??digest,
      "x-source-event-id":overrides.sourceEventId??"sandbox-source-id"
    },
    payload:raw
  };
}
describe("BMONI documented webhook evidence — strictly simulated, never financial truth",()=>{
  it("does not expose a callback on the normal MONIFlow API without opt-in",async()=>{
    const app=buildApp();
    testApps.push(app);
    const r=await app.inject({method:"POST",url:URL,payload:event()});
    expect(r.statusCode).toBe(404);
  });

  it("verifies raw bytes and stores one immutable observational digest on repeated deliveries",async()=>{
    const dbUrl=file();
    const {app,db}=appWithStore(new SqliteBmoniEvidenceStore(dbUrl));
    const e=event();
    const first=await app.inject(signed(e));
    expect(first.statusCode).toBe(200);
    expect(first.json()).toMatchObject({
      eventId:e.id,accepted:true,duplicate:false,
      evidenceStatus:"TEST_OBSERVATION_ONLY",
      providerSettlementConfirmed:false,hustleFinancialStateUnchanged:true
    });
    expect((await app.inject(signed(e))).json().duplicate).toBe(true);
    expect(await db.count()).toBe(1);
    const inspect=new DatabaseSync(dbUrl.slice(5));
    const records=inspect.prepare(
      "SELECT event_id,event_type,body_digest,evidence_kind FROM bmoni_sandbox_webhook_observations_v1"
    ).all() as Record<string,unknown>[];
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      event_id:e.id,event_type:"employee.deposit.completed",evidence_kind:"TEST_OBSERVATION"
    });
    expect(records[0].body_digest).toMatch(/^[a-f0-9]{64}$/);
    const schema=inspect.prepare(
      "SELECT sql FROM sqlite_master WHERE name='bmoni_sandbox_webhook_observations_v1'"
    ).get() as {sql:string};
    expect(schema.sql).not.toContain("payload_json");
    inspect.close();
  });

  it("accepts equivalent JSON only if the signature matches exact raw whitespace and key order",async()=>{
    const {app,db}=appWithStore();
    const a=event();
    const raw=JSON.stringify(a,null,2);
    const yes=await app.inject(signed(a,{body:raw}));
    expect(yes.statusCode).toBe(200);
    const b=event();
    const wrong=await app.inject(signed(b,{body:JSON.stringify(b,null,2),
      signature:createHmac("sha256",SECRET).update(JSON.stringify(b)).digest("hex")
    }));
    expect(wrong.statusCode).toBe(401);
    expect(await db.count()).toBe(1);
  });

  it("rejects unsigned, forged, changed, missing-ID and wrong-scope deliveries",async()=>{
    const {app,db}=appWithStore();
    const e=event();
    expect((await app.inject({method:"POST",url:URL,headers:{"content-type":"application/json"},payload:JSON.stringify(e)})).statusCode).toBe(401);
    expect((await app.inject(signed(e,{signature:"0".repeat(64)}))).statusCode).toBe(401);
    expect((await app.inject(signed(e,{eventId:randomUUID()}))).statusCode).toBe(401);
    expect((await app.inject(signed(e,{body:JSON.stringify({...e,payload:{amount:"999999.00"}}),
      signature:createHmac("sha256",SECRET).update(JSON.stringify(e)).digest("hex")
    }))).statusCode).toBe(401);
    const legacy=event("wallet.deposit.completed");
    expect((await app.inject(signed(legacy))).statusCode).toBe(401);
    expect(await db.count()).toBe(0);
  });

  it("rejects same stable event ID carrying conflicting signed details",async()=>{
    const {app,db}=appWithStore();
    const original=event("employee.withdrawal.processing");
    expect((await app.inject(signed(original))).statusCode).toBe(200);
    const conflicting={...original,eventType:"employee.withdrawal.completed"};
    const res=await app.inject(signed(conflicting));
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe("BMONI_EVENT_REPLAY_CONFLICT");
    expect(await db.count()).toBe(1);
  });

  it("accepts documented deposit reversal and withdrawal status events as observations only",async()=>{
    const {app,db}=appWithStore();
    const types=[
      "employee.deposit.completed","employee.deposit.failed","employee.deposit.refunded",
      "employee.withdrawal.processing","employee.withdrawal.completed","employee.withdrawal.failed"
    ];
    for(const type of types){
      const e=event(type);
      const r=await app.inject(signed(e));
      expect(r.statusCode).toBe(200);
      expect(r.json().providerSettlementConfirmed).toBe(false);
    }
    expect(await db.count()).toBe(types.length);
  });

  it("returns retryable 503 when the durable observation store is unavailable",async()=>{
    const app=Fastify();
    testApps.push(app);
    app.register(bmoniWebhookEvidenceRoutes,{
      prefix:"/internal/test-only/bmoni-webhook-evidence",secretKey:SECRET,
      store:{
        async record(){throw new Error("SQLITE_BUSY");},
        async count(){return 0;},
        async close(){}
      }
    });
    const r=await app.inject(signed(event()));
    expect(r.statusCode).toBe(503);
    expect(r.json().code).toBe("WEBHOOK_EVIDENCE_STORE_UNAVAILABLE");
  });

  it("survives an actual SQLite database close/reopen with intact replay identity",async()=>{
    const dbUrl=file();
    const e=event();
    const first=new SqliteBmoniEvidenceStore(dbUrl);
    expect((await first.record({
      eventId:e.id,eventType:"employee.deposit.completed",
      sourceEventId:"test-source-id",occurredAt:e.timestamp,
      bodyDigest:"a".repeat(64)
    })).duplicate).toBe(false);
    await first.close();
    const reopened=new SqliteBmoniEvidenceStore(dbUrl);
    expect((await reopened.record({
      eventId:e.id,eventType:"employee.deposit.completed",
      sourceEventId:"test-source-id",occurredAt:e.timestamp,
      bodyDigest:"a".repeat(64)
    })).duplicate).toBe(true);
    expect(await reopened.count()).toBe(1);
    await reopened.close();
  });
});
