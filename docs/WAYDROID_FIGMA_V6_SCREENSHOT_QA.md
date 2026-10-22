# Waydroid Figma v6 UI acceptance follow-up — 22 October 2026

The owner installed the **post-Figma x86_64 Waydroid UI-only APK** (GitHub Actions run `39763802259`, merge `d2ea5fb`) and provided screenshots of the signed-in Home, Pockets, Activity, Profile, and read-only API session.

## Evidence from the screenshots

- **PASS (user screenshot):** latest Home headline `Your money, in focus.` and the offline Operator card render. The app is no longer crashing at launch in Waydroid.
- **PASS (user screenshot):** Pockets has its own allocation explanation and educational CTA; Activity has provider movement/internal allocation/processing explanations; Profile exposes staged readiness and session controls.
- **PASS (user screenshot):** read-only API session recognizes the signed-in account. This is **not** evidence of provider identity, BMONI wallet ownership, KYC, balances, signing or money movement.
- **UX finding:** Pockets/Activity display full account identity and readiness cards **before** their tab-specific content. Their main content is pushed far down the scroll.
- **UX finding:** the floating navigation visually overlaps the Android system navigation region. The API-session view's final action is also close to the lower edge.
- The Pockets/Activity/Profile screenshots were captured at varying scroll positions; they do **not** prove that switching tabs preserves the previous tab's scroll position or that a fresh tab always starts scrolled.

## Changes in this review PR

- Show complete signed-in identity and readiness cards on **Home** only; continue to show the dedicated five-stage journey in **Profile**.
- Place Pockets/Activity educational panels before a compact, owner-safe **ACCOUNT ACCESS · READ-ONLY** note with a link to Profile.
- Lift the floating tab bar above the Android bottom safe-area inset and announce each tab's name to screen readers.
- Give all `Screen` scroll views a bottom safe-area inset so the Android system navigation region does not conceal trailing content, including the API-session screen.
- Preserve the existing owner-scoped request fences, session checks, withheld financial data, provider gates, and separate sign-out.
- Add focused source-level tests.

## Remaining release blockers

**No new build, installation, native accessibility test, provider verification or financial activation** is included in this UI-only PR. GitHub CI can typecheck and web-export these changes. Visual verification requires **another separately owner-approved Waydroid APK build** from its eventual merged source; previously used one-time build tickets cannot be reused. An x86_64 UI-only preview can never prove native BMONI wallet signing. Avoid re-uploading screenshots containing email addresses without redaction.

QA issue: https://github.com/realxpen/moniflow/issues/62
