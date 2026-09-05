import type { Sql } from "postgres";

import type { BankAccountRepository } from "./bank-account.js";
import type { ExecutionRepository } from "./execution.js";
import type { MoneyPlanRepository } from "./money-plan.js";
import { PostgresBankAccountRepository, ensureBankAccountSchema } from "./postgres-bank-account.js";
import { PostgresExecutionRepository, ensureExecutionSchema } from "./postgres-execution.js";
import {
  PostgresMoneyPlanRepository,
  PostgresUserMappingRepository,
  PostgresWalletOwnershipRepository,
  createPostgresClient,
  ensureMoniflowSchema
} from "./postgres.js";
import { SqliteBankAccountRepository } from "./sqlite-bank-account.js";
import { SqliteExecutionRepository } from "./sqlite-execution.js";
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
  executions: ExecutionRepository;
  ready: Promise<void>;
  close(): Promise<void>;
};

function observeReadiness(ready: Promise<void>) {
  // Repository initialization may run in the background after the first
  // repository-backed route is touched. Observe a rejection immediately so
  // a transient database connection failure cannot become an unhandled
  // rejection and terminate unrelated Vercel requests. Callers that await
  // `ready` still receive the original rejection.
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
    return {
      users,
      wallets,
      plans,
      banks,
      executions,
      ready: Promise.resolve(),
      async close() {
        await Promise.all([users.close(), wallets.close(), plans.close(), banks.close(), executions.close()]);
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
  const ready = observeReadiness((async () => {
    await ensureMoniflowSchema(sql);
    await ensureBankAccountSchema(sql);
    await ensureExecutionSchema(sql);
  })());

  return {
    users,
    wallets,
    plans,
    banks,
    executions,
    ready,
    async close() {
      await sql.end({ timeout: 5 });
    }
  };
}
