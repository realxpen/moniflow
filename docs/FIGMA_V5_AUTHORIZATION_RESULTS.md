# Figma v5 — Authorization, signing, execution and provider outcomes

**Editable design:** https://www.figma.com/design/Ir1EG2ui7qVhVuSrYoU917

Screens 35–39: exact human authorization, device-signing requirements, pending provider status, provider-confirmed example, and failed/unknown provider result.

## Scope

This is a **React Native UI and wording alignment**. The displayed Figma values (including ₦40,000 and the sample GTBank destination) are expressly illustrations. App amounts, bank details and states continue to originate only from the appropriate server snapshots. No Figma values are copied into application data.

The authorization view now visually separates amount, verified destination metadata and consequences. It clears an old authorization while fetching a fresh one, has an explicit APPROVED-vs-AWAITING gate, and says **PLAN APPROVED · NOT SENT** rather than implying completed payment. The existing approved plan fingerprint remains the only accepted approval basis.

The signing view now avoids marking the provider proposal as complete while it is still PREPARING, keeps simulated vs native device-signing paths separate, and avoids a green provider badge merely because a non-demo provider is selected.

The execution and result views use a small pure status-presentation helper. Only an actual `COMPLETED` execution snapshot receives a confirmed success badge. `PROCESSING` and `AWAITING_DEVICE_SIGNATURE` remain unconfirmed. `FAILED` or unknown results never look successful. Provider accounting and activity updates remain gated behind existing provider completion/finalization.

## Boundaries

- No new BMONI endpoints, SDK methods, server calls, database modifications or provider credentials.
- No changes to proposal creation, ownership/KYC checks, saved destinations, plan hashes, PIN handling, signing calls, sandbox signature isolation, signature submission or finalization.
- No automatic retry of failed or ambiguous provider outcomes.
- No production payment enablement, APK build, or deployment.
- Check TypeScript, tests, web bundle export and isolated PostgreSQL in GitHub Actions. Native device UI/accessibility verification remains outstanding.

