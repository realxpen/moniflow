import { describe, expect, it } from "vitest";

import { SqliteUserMappingRepository } from "./sqlite-user-mapping.js";

const me = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";

describe("Phase 32 local subject-scoped hold lookup", () => {
  it("selects only the authenticated subject's reservation and never guesses a legacy null owner", async () => {
    const repo = new SqliteUserMappingRepository(":memory:");
    try {
      await repo.createHold({
        email: "me@example.test", localUserId: me, state: "PROVIDER_OUTCOME_UNKNOWN",
        createdAt: new Date("2026-10-19").toISOString()
      });
      await repo.createHold({
        email: "legacy@example.test", localUserId: null, state: "PROVIDER_USER_EXISTS",
        createdAt: new Date("2026-10-19").toISOString()
      });
      const mine = await repo.findHoldByLocalUserId(me);
      expect(mine).toMatchObject({ localUserId: me, state: "PROVIDER_OUTCOME_UNKNOWN" });
      expect(await repo.findHoldByLocalUserId(other)).toBeNull();
      expect(await repo.findHoldByLocalUserId("")).toBeNull();
      expect(await repo.findHoldByEmail("legacy@example.test")).toMatchObject({ localUserId: null });
    } finally { await repo.close(); }
  });
});
