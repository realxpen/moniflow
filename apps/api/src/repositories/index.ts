import type { Sql } from "postgres";

import type { MoneyPlanRepository } from "./money-plan.js";
import {
  PostgresMoneyPlanRepository,
  PostgresUserMappingRepository,
  PostgresWalletOwnershipRepository,
  createPostgresClient,
  ensureMoniflowSchema
} from "./postgres.js";
import { SqliteMoneyPlanRepository } from "./sqlite-money-plan.js";
import { SqliteUserMappingRepository } from "./sqlite-user-mapping.js";
import { SqliteWalletOwnershipRepository } from "./sqlite-wallet-ownership.js";
import type { UserMappingRepository } from "./user-mapping.js";
import type { WalletOwnershipRepository } from "./wallet-ownership.js";

export type RepositorySet = {
  users: UserMappingRepository;
  wallets: WalletOwnershipRepository;
  plans: MoneyPlanRepository;
  ready: Promise<void>;
  close(): Promise<void>;
};

export function createRepositories(databaseUrl: string): RepositorySet {
  if (databaseUrl === ":memory:" || databaseUrl.startsWith("file:")) {
    const users = new SqliteUserMappingRepository(databaseUrl);
    const wallets = new SqliteWalletOwnershipRepository(databaseUrl);
    const plans = new SqliteMoneyPlanRepository(databaseUrl);
    return {
      users,
      wallets,
      plans,
      ready: Promise.resolve(),
      async close() {
        await Promise.all([users.close(), wallets.close(), plans.close()]);
      }
    };
  }

  if (!/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
    throw new Error("DATABASE_URL must be file:, :memory:, postgres://, or postgresql://.");
  }

  const sql: Sql = createPostgresClient(databaseUrl);
  const users = new PostgresUserMappingRepository(sql);
  const wallets = new PostgresWalletOwnershipRepository(sql);
  const plans = new PostgresMoneyPlanRepository(sql);
  return {
    users,
    wallets,
    plans,
    ready: ensureMoniflowSchema(sql),
    async close() {
      await sql.end({ timeout: 5 });
    }
  };
}
