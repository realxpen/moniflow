# Phase 30 incident — authenticated workspace HTTP 503 (2026-10-16)

## Reproduction and evidence

The owner launched the completed Phase 30 native iOS Simulator build through Appetize, signed in to a disposable Supabase test account and opened Home. The native app showed "Your account workspace could not be verified. No financial data was loaded" and displayed all mapping/wallet statuses as **unavailable** rather than guessed empty states.

Read-only Vercel runtime logs for production deployment `dpl_DmFkrEt62BE1eEKu6q7C1wCTEpZ9` showed repeated **GET /api/workspace/overview → 503**, while the same authenticated session had **GET /api/auth/session → 200**. Therefore JWT verification and the native API URL work; the issue occurs inside the data-readiness lookup. Original `authenticatedWorkspaceRoutes` swallowed the database exception before Vercel could report a category, so the actual driver error code cannot yet be proven. DO NOT claim a particular DB credential, role or SQL error is confirmed.

The connected MONIFlow Supabase project's `moniflow_private` mapping, wallet and finance tables exist and have no rows. Empty tables are expected for a new signed-in user and SHOULD produce `mapping=not_linked`, `wallet=not_created` and 200 **when the API can reach its configured database**. The Vercel `DATABASE_URL` is configured as a **sensitive** environment variable, and its actual decrypted target cannot be independently inspected through the connected Vercel API. Do not reveal, rotate, copy to GitHub, guess or overwrite it without a confirmed diagnosis.

## Patch

- The authenticated workspace route now **awaits `getRepositoryReady`** (the existing lazy repository/schema-initialization promise) before querying account mappings. Previously a fresh serverless process could race the first workspace SELECT against schema readiness.
- On any failure, retain the same safe `503 WORKSPACE_READ_UNAVAILABLE` response. Record only `event=workspace_storage_read_failed`, the stage (`schema_ready`, `mapping_read`, `wallet_read`) and one allowlisted DB code category: authentication, permission, schema, connection, unavailable or unclassified. Never log PostgreSQL Error objects, SQL text, email, UUID, DB URL or provider credentials.
- Unit tests cover awaiting readiness, fail-closed initialization errors and strict sanitized diagnostics. Existing no-provider-call/no-wallet-proof behavior stays.
- Deploy API-only after CI, then have owner tap **Refresh account status** in Appetize. Inspect the production Vercel runtime log for the new safe `workspace_storage_read_failed` category to determine any further remediation. If the view becomes green with "Not linked", that is truthful empty readiness; not a funded wallet.
- No new native EAS build is needed for this API-only fix: the current native client already understands both 200 empty-readiness and safe 503 responses.

## Separate database security review (NOT applied in this incident)

Supabase schema introspection reports that the nine MONIFlow `moniflow_private` tables have **RLS disabled**. A separate SQL permissions check also confirms that `anon` and `authenticated` roles currently lack USAGE on the private schema and SELECT on its mapping table, so the generic advisory's assertion of immediate client visibility is not proven for this locked-down schema. Nonetheless, absent RLS means missing defense in depth if privileges or exposed-schema settings change. Review all grants and Supabase exposed schemas, and adopt per-table RLS or explicit deny-by-default policies under a separately authorized schema change. **Do not enable RLS here**: doing so without mapping required backend role and policies may interrupt production access. Do not grant private schema access to anon/authenticated users.

Use the [official Supabase RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security) for a later review. No user data, BMONI wallet, KYC, financial flags or funds were modified in this incident.
