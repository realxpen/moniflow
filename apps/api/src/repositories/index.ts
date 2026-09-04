import type { Sql } from "postgres";

import type { BankAccountRepository } from "./bank-account.js";
import type { MoneyPlanRepository } from "./money-plan.js";
import { PostgresBankAccountRepository, ensureBankAccountSchema } from "./postgres-bank-account.js";
import {
  PostgresMoneyPlanRepository,
  PostgresUserMappingRepository,
  PostgresWalletOwnershipRepository,
  createPostgresClient,
  ensureMoniflowSchema
} from "./postgres.js";
import { SqliteBankAccountRepository } from "./sqlite-bank-account.js";
import { SqliteMoneyPlanRepository } from "./sqlite-money-plan.js";
import { SqliteUserMappingRepository } from "./sqlite-user-mapping.js";
import { SqliteWalletOwnershipRepository } from "./sqlite-wallet-ownership.js";
import type { UserMappingRepository } from "./user-mapping.js";
import type { WalletOwnershipRepository } from "./wallet-ownership.js";

export type RepositorySet = {
  users: UserMappingRepository;
  wallets: WalletOwnershipRepository;
  plans: MoneyPlanRepository;
  banks: BankAccountRepository;
  ready: Promise<void>;
  close(): Promise<void>;
};

export function createRepositories(databaseUrl: string): RepositorySet {
  if (databaseUrl === ":memory:" || databaseUrl.startsWith("file:")) {
    const users = new SqliteUserMappingRepository(databaseUrl);
    const wallets = new SqliteWalletOwnershipRepository(databaseUrl);
    const plans = new SqliteMoneyPlanRepository(databaseUrl);
    const banks = new SqliteBankAccountRepository(databaseUrl);
    return {
      users,
      wallets,
      plans,
      banks,
      ready: Promise.resolve(),
      async close() {
        await Promise.all([users.close(), wallets.close(), plans.close(), banks.close()]);
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
  const banks = new PostgresBankAccountRepository(sql);
  return {
    users,
    wallets,
    plans,
    banks,
    ready: (async () => {
      await ensureMoniflowSchema(sql);
      await ensureBankAccountSchema(sql);
    })(),
    async close() {
      await sql.end({ timeout: 5 });
    }
  };
}
