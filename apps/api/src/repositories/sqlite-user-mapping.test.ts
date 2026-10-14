import { afterEach, describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { SqliteUserMappingRepository } from "./sqlite-user-mapping.js";

const repositories: SqliteUserMappingRepository[] = [];
const dirs:string[]=[];

afterEach(async () => {
  await Promise.all(repositories.splice(0).map((repository) => repository.close()));
  dirs.splice(0).forEach(dir=>rmSync(dir,{recursive:true,force:true}));
});

describe("SqliteUserMappingRepository", () => {
  it("persists and finds identity mappings case-insensitively by email", async () => {
    const repository = new SqliteUserMappingRepository(":memory:");
    repositories.push(repository);
    const mapping = {
      bmoniUserId: "bmoni-user-1",
      createdAt: "2026-09-03T12:00:00.000Z",
      email: "Ada@Example.com",
      localUserId: "11111111-1111-4111-8111-111111111111",
      updatedAt: "2026-09-03T12:00:00.000Z"
    };

    await repository.save(mapping);

    await expect(repository.findByLocalUserId(mapping.localUserId)).resolves.toEqual(mapping);
    await expect(repository.findByEmail("ada@example.com")).resolves.toEqual(mapping);
  });
  it("upgrades a real existing hold table without inventing phone fingerprints or deleting legacy data",async()=>{
    const dir=mkdtempSync(join(tmpdir(),"bmoni-hold-migration-"));
    dirs.push(dir);
    const path=join(dir,"legacy.sqlite");
    const old=new DatabaseSync(path);
    old.exec(`
      CREATE TABLE bmoni_user_provisioning_holds_v1 (
        email TEXT PRIMARY KEY COLLATE NOCASE,
        local_user_id TEXT,
        state TEXT NOT NULL CHECK (state IN ('PROVIDER_USER_EXISTS','PROVIDER_OUTCOME_UNKNOWN')),
        created_at TEXT NOT NULL
      ) STRICT;
      INSERT INTO bmoni_user_provisioning_holds_v1 VALUES
        ('legacy@example.com','11111111-1111-4111-8111-111111111111',
          'PROVIDER_USER_EXISTS','2026-10-01T00:00:00.000Z');
    `);
    old.close();
    const db=new SqliteUserMappingRepository("file:"+path);
    repositories.push(db);
    const legacy=await db.findHoldByEmail("legacy@example.com");
    expect(legacy).toMatchObject({state:"PROVIDER_USER_EXISTS",phoneFingerprint:null});
    const fp="a".repeat(64);
    expect(await db.reserveBeforeCreate({
      email:"new@example.com",localUserId:"22222222-2222-4222-8222-222222222222",
      state:"PROVIDER_OUTCOME_UNKNOWN",createdAt:new Date().toISOString(),
      phoneFingerprint:fp
    })).toBe(true);
    expect(await db.reserveBeforeCreate({
      email:"third@example.com",localUserId:"33333333-3333-4333-8333-333333333333",
      state:"PROVIDER_OUTCOME_UNKNOWN",createdAt:new Date().toISOString(),
      phoneFingerprint:fp
    })).toBe(false);
    expect((await db.findHoldByPhoneFingerprint(fp))?.email).toBe("new@example.com");
    const raw=new DatabaseSync(path);
    const cols=raw.prepare("PRAGMA table_info(bmoni_user_provisioning_holds_v1)")
      .all() as Array<{name:string}>;
    expect(cols.some(col=>col.name==="phone_fingerprint")).toBe(true);
    const stored=raw.prepare("SELECT phone_fingerprint FROM bmoni_user_provisioning_holds_v1 WHERE email='legacy@example.com'")
      .get() as {phone_fingerprint:string|null};
    expect(stored.phone_fingerprint).toBe(null);
    raw.close();
  });

});
