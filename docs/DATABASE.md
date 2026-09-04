# MONIFlow Database

## Production choice

The deployed MONIFlow API uses persistent PostgreSQL. Supabase Postgres is the recommended hackathon host. Local development and unit tests may continue to use SQLite through `file:` / `:memory:` URLs.

`DATABASE_URL` is server-only. For serverless deployments use the Supabase transaction pooler connection string and keep prepared statements disabled.

## Security boundary

Provider/application persistence lives in the non-exposed `moniflow_private` schema. The API connects directly to Postgres; mobile/web clients do not receive database credentials and do not access these tables through the Supabase Data API.

Never persist:

- BMONI API keys
- wallet private keys
- device signing PINs
- owner-proof/proposal signing secrets
- BVN/NIN values beyond the transient provider onboarding request

## Tables

### `bmoni_user_mappings`
Durable MONIFlow local user → BMONI user mapping.

### `wallet_ownership`
Public wallet metadata only: owner address, BMONI smart wallet id/address, CNGN currency.

### `bank_accounts`
Future provider-verified Nigerian withdrawal destinations. Store masked account number and provider account id, not credentials.

### `pockets`
Application-level logical allocations. Pockets are not separate BMONI wallets.

### `money_plans`
Persisted plan state, financial consequences, guard verdict, approval/completion timestamps, and optional integrity hash.

### `plan_actions`
Ordered actions belonging to a Money Plan.

### `guard_checks`
Deterministic MONI Guard rule results for auditability.

### `activities`
Provider-backed and MONIFlow-internal activity, explicitly distinguished by `source`.

## Runtime repository selection

- `DATABASE_URL=:memory:` → SQLite tests
- `DATABASE_URL=file:...` → SQLite local development
- `DATABASE_URL=postgres://...` or `postgresql://...` → persistent PostgreSQL

The API repository contracts are asynchronous so local and deployed persistence use the same service boundary.

## Deployment

For a Supabase-backed serverless API, use the transaction-pooler connection string (port 6543). The backend initializes the private schema idempotently on startup. A dedicated migration workflow can replace startup schema creation after the hackathon.
