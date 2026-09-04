import { afterEach, describe, expect, it } from "vitest";

import { SqliteUserMappingRepository } from "./sqlite-user-mapping.js";

const repositories: SqliteUserMappingRepository[] = [];

afterEach(async () => {
  await Promise.all(repositories.splice(0).map((repository) => repository.close()));
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
});
