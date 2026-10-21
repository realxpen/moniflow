# Figma v2 — read-only Pockets and Activity

**Product reference:** `docs/MONIFLOW_PRODUCT_SOURCE.md` and `AGENTS.md`  
**Figma:** https://www.figma.com/design/Ir1EG2ui7qVhVuSrYoU917  
**Screens:** 27 · Signed-in Pockets / withheld; 28 · Signed-in Activity / withheld

## Goal

Bring the **authenticated** Pockets and Activity tabs closer to the warm-ivory/lilac Figma language without claiming any personal financial information that the current backend does not authorize us to read.

These screens are different from the sample-filled Figma concept screens. The code deliberately avoids invented balances, pocket names, transfer states and transaction dates.

## Change

- Use a reusable `ReadOnlyFinancialPanel` in `AuthenticatedWorkspace` for the Pockets and Activity tabs.
- Make the unavailable-account status visually prominent: **Not available yet** rather than **₦0** or **No transactions**.
- Explain that Pockets are MONIFlow internal allocations, not separate provider funds or deposits.
- Explain three **future UI classifications**, not recorded events: provider-confirmed movement, internal Pocket allocation and processing without completion.
- Provide a carefully labeled educational entry: Pockets → offline `/learn/playground`; Activity → offline `/demo/walkthrough`.
- Keep the existing owner-scoped account status, refresh action, KYC/ownership caveats and authentication controls unchanged.

## Safety invariants

1. No calls to provider, wallet, bank, ledger, allocation or activity APIs are added.
2. No account IDs, money values, payees, transfers or private financial data are passed to the new component.
3. Unknown allocations are not zero; unavailable history is not proof of zero transactions.
4. Practice views never imply an actual account financial operation.
5. Neither signed-in nor locally recorded mapping means verified BMONI identity, KYC, device ownership or permission to read financial records.
6. No BMONI integration, API, schema, build, deployment, production permissions or signing code changes.

## QA gates

- Compile/typecheck, Expo web export and existing Vitest suite through GitHub Actions.
- Targeted tests validate the semantics of both withheld states and offline-only navigation.
- Before a native release, inspect safe-area layout, text wrapping, touch targets and account-switch isolation on a physical device or compatible simulator.
- Keep this PR as a review candidate; merging and deployment remain distinct decisions.
