import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createPostgresClient, ensureMoniflowSchema, PostgresUserMappingRepository } from "./postgres.js";
import { PostgresBmoniEvidenceStore } from "../services/bmoni/webhook-evidence-store.js";
import { phoneIdentityFingerprint, phoneIdentityKeyGuard } from "../services/bmoni/phone-identity-fingerprint.js";

// NEVER run against a real, remote or shared project database. Only an
// explicitly named disposable local GitHub Actions/Postgres CI database.
const databaseUrl = process.env.MONIFLOW_TEST_POSTGRES_URL;
const safe = (()=>{
  if (!databaseUrl || process.env.NODE_ENV !== "test" ||
      process.env.MONIFLOW_B2_DISPOSABLE_DB_TESTS !== "true") return false;
  try {
    const url = new URL(databaseUrl);
    return ["postgres:","postgresql:"].includes(url.protocol) &&
      ["127.0.0.1","localhost"].includes(url.hostname) &&
      url.pathname === "/moniflow_b2_ci" &&
      !url.username.includes("%");
  } catch { return false; }
})();
const suite = safe ? describe : describe.skip;
const KEY="B2-disposable-only-server-phone-key-very-long";
const id=()=>randomUUID();
const now=()=>new Date().toISOString();

suite("B2 provider-independent PostgreSQL integration with a disposable local database",()=>{
  if (!databaseUrl) return;
  const sql=createPostgresClient(databaseUrl);
  const otherSql=createPostgresClient(databaseUrl);
  const first=new PostgresUserMappingRepository(sql);
  const second=new PostgresUserMappingRepository(otherSql);

  beforeAll(async()=>{
    await ensureMoniflowSchema(sql);
    // This exact DB name is reserved for disposable local CI. Never use a
    // live/test-project DB with this suite, and never call external BMONI.
    await sql`TRUNCATE moniflow_private.bmoni_user_provisioning_holds_v1,
      moniflow_private.bmoni_phone_key_guard_v1,
      moniflow_private.bmoni_user_mappings CASCADE`;
  });

  afterAll(async()=>{await Promise.all([sql.end({timeout:5}),otherSql.end({timeout:5})]);});

  it("enrolls the same key concurrently and rejects a rotation before any provider work",async()=>{
    const key=phoneIdentityKeyGuard(KEY);
    await Promise.all([
      first.assertPhoneKeyContinuity(key),
      second.assertPhoneKeyContinuity(key)
    ]);
    await expect(second.assertPhoneKeyContinuity(phoneIdentityKeyGuard(KEY+"-rotated")))
      .rejects.toThrow("BMONI_PHONE_KEY_CONTINUITY_MISMATCH");
    await first.assertPhoneKeyContinuity(key);
    const rows=await sql`SELECT count(*)::integer AS n FROM moniflow_private.bmoni_phone_key_guard_v1`;
    expect(rows[0]?.n).toBe(1);
  });

  it("reserves one E164 phone across two PostgreSQL connections and competing emails",async()=>{
    const fp=phoneIdentityFingerprint("+2348010000001",KEY);
    const firstLocal=id(),otherLocal=id();
    const a={email:"b2-first@example.invalid",localUserId:firstLocal,
      phoneFingerprint:fp,state:"PROVIDER_OUTCOME_UNKNOWN" as const,createdAt:now()};
    const b={...a,email:"b2-other@example.invalid",localUserId:otherLocal};
    const results=await Promise.all([
      first.reserveBeforeCreate(a),
      second.reserveBeforeCreate(b)
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    const winner=await first.findHoldByPhoneFingerprint(fp);
    expect(winner?.email).toMatch(/^b2-(first|other)@example\.invalid$/);
    expect(winner?.phoneFingerprint).toBe(fp);
    expect(await first.reserveBeforeCreate({...a,email:"third@example.invalid",localUserId:id()}))
      .toBe(false);
  });

  it("holds provider conflicts permanently without inventing BMONI user identity",async()=>{
    const email="b2-conflict@example.invalid",fingerprint=phoneIdentityFingerprint("+2348010000002",KEY);
    expect(await first.reserveBeforeCreate({email,localUserId:id(),
      phoneFingerprint:fingerprint,state:"PROVIDER_OUTCOME_UNKNOWN",createdAt:now()})).toBe(true);
    await first.markProviderUserExists(email);
    const row=await second.findHoldByEmail(email);
    expect(row).toMatchObject({email,state:"PROVIDER_USER_EXISTS",phoneFingerprint:fingerprint});
    expect(await second.reserveBeforeCreate({email,localUserId:id(),
      phoneFingerprint:phoneIdentityFingerprint("+2348010000003",KEY),
      state:"PROVIDER_OUTCOME_UNKNOWN",createdAt:now()})).toBe(false);
    // Never turn a hold into a fabricated provider user ID.
    expect(await first.findByEmail(email)).toBe(null);
  });

  it("persists real Postgres TEST_OBSERVATION digests, deduplicates and rejects conflicting event IDs",async()=>{
    const eventId=id();
    const store=new PostgresBmoniEvidenceStore(databaseUrl);
    try {
      const original={eventId,eventType:"employee.deposit.completed" as const,
        sourceEventId:null,bodyDigest:"a".repeat(64),occurredAt:now()};
      expect(await store.record(original)).toMatchObject({eventId,duplicate:false});
      expect(await store.record(original)).toMatchObject({eventId,duplicate:true});
      await expect(store.record({...original,bodyDigest:"b".repeat(64)}))
        .rejects.toThrow("BMONI_EVENT_CONFLICT");
      const row=await sql`
        SELECT evidence_kind,body_digest
        FROM moniflow_private.bmoni_sandbox_webhook_observations_v1
        WHERE event_id=${eventId}
      `;
      expect(row[0]).toMatchObject({evidence_kind:"TEST_OBSERVATION",body_digest:"a".repeat(64)});
    } finally {await store.close();}
  });
});
