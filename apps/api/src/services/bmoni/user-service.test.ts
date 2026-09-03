import { afterEach, describe, expect, it, vi } from "vitest";

import { SqliteUserMappingRepository } from "../../repositories/sqlite-user-mapping.js";

import type { BmoniGateway } from "./gateway.js";
import { BmoniUserService, UserMappingConflictError } from "./user-service.js";

const repositories: SqliteUserMappingRepository[] = [];

afterEach(() => {
  repositories.splice(0).forEach((repository) => repository.close());
});

function createFixture() {
  const createUser = vi.fn<BmoniGateway["createUser"]>().mockResolvedValue({
    bmoniUserId: "bmoni-user-1",
    createdAt: "2026-09-03T12:00:00.000Z",
    email: "ada@example.com",
    firstName: "Ada",
    id: "provider-row-1",
    updatedAt: "2026-09-03T12:00:00.000Z"
  });
  const gateway: BmoniGateway = {
    createUser,
    getSupportedSmartWalletCurrencies: vi.fn()
  };
  const repository = new SqliteUserMappingRepository(":memory:");
  repositories.push(repository);

  return { createUser, service: new BmoniUserService(gateway, repository) };
}

const input = {
  email: "ada@example.com",
  firstName: "Ada",
  localUserId: "11111111-1111-4111-8111-111111111111",
  phoneNumber: "+2348012345678"
};

describe("BmoniUserService", () => {
  it("creates and persists a provider mapping once", async () => {
    const { createUser, service } = createFixture();

    await expect(service.createOrFindMapping(input)).resolves.toMatchObject({
      bmoniUserId: "bmoni-user-1",
      status: "created"
    });
    await expect(service.createOrFindMapping(input)).resolves.toMatchObject({
      bmoniUserId: "bmoni-user-1",
      status: "existing"
    });
    expect(createUser).toHaveBeenCalledTimes(1);
  });

  it("blocks an email from being attached to a second local identity", async () => {
    const { service } = createFixture();
    await service.createOrFindMapping(input);

    await expect(
      service.createOrFindMapping({
        ...input,
        localUserId: "22222222-2222-4222-8222-222222222222"
      })
    ).rejects.toBeInstanceOf(UserMappingConflictError);
  });
});
