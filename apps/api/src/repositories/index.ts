import type { Sql } from "postgres";

import { PostgresUserMappingRepository, PostgresWalletOwnershipRepository, createPostgresClient, ensureMoniflowSchema } from "./postgres.js";
import { SqliteUserMappingRepository } from "./sqlite-user-mapping.js";
import { SqliteWalletOwnershipRepository } from "./sqlite-wallet-ownership.js";
import type { UserMappingRepository } from "./user-mapping.js";
import type { WalletOwnershipRepository } from "./wallet-ownership.js";

export type RepositorySet = {
  users: UserMappingRepository;
  wallets: WalletOwnershipRepository;
  ready: Promise<void>;
  close(): Promise<void>;
};

export function createRepositories(databaseUrl: string): RepositorySet {
  if (databaseUrl === ":memory:" || databaseUrl.startsWith("file:")) {
    const users = new SqliteUserMappingRepository(databaseUrl);
    const wallets = new SqliteWalletOwnershipRepository(databaseUrl);
    return {
      users,
      wallets,
      ready: Promise.resolve(),
      async close() {
        await Promise.all([users.close(), wallets.close()]);
      }
    };
  }

  if (!/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
    throw new Error("DATABASE_URL must be file:, :memory:, postgres://, or postgresql://.");
  }

  const sql: Sql = createPostgresClient(databaseUrl);
  const users = new PostgresUserMappingRepository(sql);
  const wallets = new PostgresWalletOwnershipRepository(sql);
  return {
    users,
    wallets,
    ready: ensureMoniflowSchema(sql),
    async close() {
      await sql.end({ timeout: 5 });
    }
  };
}
