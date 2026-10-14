# BMONI partner sandbox: credential-pending protocol

MONIFlow's selected provider is separate from MONIFlow's own **simulated** development sandbox.

## While BMONI has not issued a dedicated partner API key

- The documented shared BMONI sandbox key is suitable only for API contract/connection testing where permitted by BMONI. Never present shared-key responses as proof of a dedicated partner account or a funded/settled CNGN wallet.
- A BMONI sandbox user is partner-scoped. An existing email/phone may produce HTTP 409 and may belong to another partner; do **not** make up a provider user ID, create arbitrary extra personas, or assume a 409 means the wallet exists in MONIFlow's account.
- The two previously attempted Nigerian test identities returned 409 without their existing BMONI user IDs. Status remains **RECONCILIATION_REQUIRED** pending BMONI's documented recovery flow/support.
- The MONIFlow Sandbox provider can exercise the canonical ₦300,000 demo workflow and must remain visibly \`simulated: true\`. Money Spaces are internal accounting, not separate BMONI accounts.
- Do not copy a shared BMONI key into the mobile/web app or any \`EXPO_PUBLIC_*\` variable; the API is the only credential holder. Never log it.
- \`/health/provider\` tests provider **readiness only**, not credential ownership, wallet recovery, settled funds, identity/KYC, or approved device signing. The UI must distinguish an unreachable API from a reachable but unavailable BMONI provider.
- Keep real banking/execution guarded by MONI Guard, explicit human approval, provider-confirmed execution, and native device-signature requirements. Shared sandbox credentials are not production credentials.

## When BMONI provides your partner credential

1. Confirm the credential is scoped to the intended MONIFlow partner sandbox and retrieve a supported existing-user recovery or reset procedure from BMONI.
2. Set the dedicated **server-side** \`BMONI_API_KEY\` (and correct sandbox base URL) in the API project's Vercel environment. Do not share the key in ChatGPT, commits, GitHub Actions logs, or screenshots.
3. Test a documented existing persona's provider user ID recovery or authorized creation, then owner proof, managed wallet, CNGN balance, Nigeria rail, virtual account, KYC, account verification, and device signing.
4. Record actual BMONI request IDs and outcomes privately; distinguish verified provider confirmations from MONIFlow's simulated results.
5. Promote to a deliberate API release through the manual GitHub workflow only after CI and the relevant integration gates pass.

BMONI support must clarify partner isolation and recover/reset behavior. A dedicated key **does not guarantee** a previously used phone number is reusable.
