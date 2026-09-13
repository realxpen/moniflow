import type { Sql } from "postgres";

import type { ActivityRepository } from "./activity.js";
import type { BankAccountRepository } from "./bank-account.js";
import type { ExecutionRepository } from "./execution.js";
import type { MoneyPlanRepository } from "./money-plan.js";
import type { PocketRepository } from "./pocket.js";
import { PostgresActivityRepository, ensureActivitySchema } from "./postgres-activity.js";
import { PostgresBankAccountRepository, ensureBankAccountSchema } from "./postgres-bank-account.js";
import { PostgresExecutionRepository, ensureExecutionSchema } from "./postgres-execution.js";
import { PostgresPocketRepository, ensurePocketSchema } from "./postgres-pocket.js";
import {
  PostgresMoneyPlanRepository,
  PostgresUserMappingRepository,
  PostgresWalletOwnershipRepository,
  createPostgresClient,
  ensureMoniflowSchema
} from "./postgres.js";
import { SqliteActivityRepository } from "./sqlite-activity.js";
import { SqliteBankAccountRepository } from "./sqlite-bank-account.js";
import { SqliteExecutionRepository } from "./sqlite-execution.js";
import { SqliteMoneyPlanRepository } from "./sqlite-money-plan.js";
import { SqlitePocketRepository } from "./sqlite-pocket.js";
import { SqliteUserMappingRepository } from "./sqlite-user-mapping.js";
import { SqliteWalletOwnershipRepository } from "./sqlite-wallet-ownership.js";
import type { UserMappingRepository } from "./user-mapping.js";
import type { WalletOwnershipRepository } from "./wallet-ownership.js";

export type RepositorySet = {
  users: UserMappingRepository;
  wallets: WalletOwnershipRepository;
  plans: MoneyPlanRepository;
  banks: BankAccountRepository;
  executions: ExecutionRepository;
  pockets: PocketRepository;
  activities: ActivityRepository;
  ready: Promise<void>;
  close(): Promise<void>;
};

function observeReadiness(ready: Promise<void>) {
  void ready.catch(() => undefined);
  return ready;
}

export function createRepositories(databaseUrl: string): RepositorySet {
  if (databaseUrl === ":memory:" || databaseUrl.startsWith("file:")) {
    const users = new SqliteUserMappingRepository(databaseUrl);
    const wallets = new SqliteWalletOwnershipRepository(databaseUrl);
    const plans = new SqliteMoneyPlanRepository(databaseUrl);
    const banks = new SqliteBankAccountRepository(databaseUrl);
    const executions = new SqliteExecutionRepository(databaseUrl);
    const pockets = new SqlitePocketRepository(databaseUrl);
    const activities = new SqliteActivityRepository(databaseUrl);
    return {
      users, wallets, plans, banks, executions, pockets, activities,
      ready: Promise.resolve(),
      async close() {
        await Promise.all([
          users.close(), wallets.close(), plans.close(), banks.close(), executions.close(), pockets.close(), activities.close()
        ]);
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
  const executions = new PostgresExecutionRepository(sql);
  const pockets = new PostgresPocketRepository(sql);
  const activities = new PostgresActivityRepository(sql);
  const ready = observeReadiness((async () => {
    await ensureMoniflowSchema(sql);
    await ensureBankAccountSchema(sql);
    await ensureExecutionSchema(sql);
    await ensurePocketSchema(sql);
    await ensureActivitySchema(sql);
  })());

  return {
    users, wallets, plans, banks, executions, pockets, activities, ready,
    async close() { await sql.end({ timeout: 5 }); }
  };
}
