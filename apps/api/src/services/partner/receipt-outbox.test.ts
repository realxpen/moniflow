import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { SqlitePartnerOperationStore } from "./sqlite-store.js";
import { SqliteReceiptOutbox } from "./receipt-outbox.js";
import { deliverOneSandboxReceipt } from "./receipt-delivery.js";

const cleanup: Array<() => void>=[];
afterEach(()=>cleanup.splice(0).forEach(fn=>fn()));
function testFile() {
  const dir=mkdtempSync(join(tmpdir(),"moniflow-receipt-queue-"));
  cleanup.push(()=>rmSync(dir,{recursive:true,force:true}));
  return "file:"+join(dir,"partner.db");
}
const ID="59b9b085-758f-4391-b97b-98d574650a6a";
function command() {
  return {
    version:"1" as const,partner:"HUSTLE" as const,environment:"sandbox" as const,
    operationId:randomUUID(),idempotencyKey:randomUUID(),kind:"COLLECTION" as const,
    subjectType:"ORDER" as const,subjectId:ID,payerReference:ID,
    beneficiaryReference:ID,amountMinor:20000,currency:"NGN" as const
  };
}
describe("durable sandbox-only partner RECEIVED receipt outbox",()=>{
  it("backfills a missing outbox row after restart and leases safely",async()=>{
    const file=testFile();
    const store=new SqlitePartnerOperationStore(file);
    const c=command();
    await store.record(c,"a".repeat(64));
    await store.close();
    const outbox=new SqliteReceiptOutbox(file);
    await outbox.sync();
    await outbox.sync();
    const now=Date.now();
    const first=await outbox.claim(now);
    expect(first).toMatchObject({operationId:c.operationId,attempts:1});
    expect(await outbox.claim(now)).toBe(null);
    await outbox.close();

    // A crash can leave a lease; automatic retries wait for it to expire.
    const recovered=new SqliteReceiptOutbox(file);
    await recovered.sync();
    expect(await recovered.claim(now+1000)).toBe(null);
    expect(await recovered.claim(now+31000)).toMatchObject({
      operationId:c.operationId,attempts:2
    });
    await recovered.delivered(c.operationId);
    expect(await recovered.claim(now+70000)).toBe(null);
    await recovered.close();
  });

  it("holds failed deliveries for retry and caps attempts",async()=>{
    const file=testFile();
    const store=new SqlitePartnerOperationStore(file);
    const c=command();await store.record(c,"b".repeat(64));await store.close();
    const outbox=new SqliteReceiptOutbox(file);
    await outbox.sync();
    const now=Date.now();
    expect((await outbox.claim(now))?.attempts).toBe(1);
    await outbox.retryLater(c.operationId,now);
    expect(await outbox.claim(now+500)).toBe(null);
    expect((await outbox.claim(now+1200))?.attempts).toBe(2);
    await outbox.delivered(c.operationId);
    expect(await outbox.claim(now+4000)).toBe(null);
    await outbox.close();
  });

  it("rejects any non-test or non-loopback receipt delivery",async()=>{
    const secret="test-only-signed-receipt-secret-more-than-32";
    const file=testFile();
    await expect(deliverOneSandboxReceipt({
      databaseUrl:file,targetUrl:"https://api.hustle.example/api/v1/payments/partner-sandbox/received",secret
    })).rejects.toThrow("LOOPBACK_ONLY");
    await expect(deliverOneSandboxReceipt({
      databaseUrl:file,targetUrl:"http://127.0.0.1:4000/api/v1/payments/webhooks/sandbox-operations",secret
    })).rejects.toThrow("LOOPBACK_ONLY");
  });
});
