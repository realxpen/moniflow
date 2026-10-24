# MONIFlow PWA — One bottom-navigation safe-area Expo Hosting preview

Approval: ONE_EXPO_PWA_NAVIGATION_SAFE_AREA_UPDATE_20261024

The founder has completed real-iPhone testing of the connected MONIFlow sandbox, including restored sign-in, saved ₦300,000 start, actual deterministic Money Plan and MONI Guard, simulated GTBank −₦40,000, Laptop Pocket ₦20,000, ₦240,000 available, two SIMULATED · NOT SETTLED Activity entries and persistence after reopening. The screenshots also show the floating bottom navigation partially hiding long Guard content.

- **Exact reviewed app source:** `ad62c10b9f8e149001120986543bcc4fc6f989ac`, merged [PR #85](https://github.com/realxpen/moniflow/pull/85); [main CI run 40075986508](https://github.com/realxpen/moniflow/actions/runs/40075986508) SUCCESS: TypeScript, Vitest, Expo Router web export, native source safety, PostgreSQL and full real HTTP sandbox demo.
- This is an authorized continuation of MONIFlow's ongoing **iPhone PWA testing** workflow, **not** a financial deployment, BMONI provider activation, native APK build or production release.
- Introduce only this one-shot ticket and the new `iphone-pwa-bottom-tabs-once.yml` workflow. The job must verify that main's prior commit equals the immutable above source; there are no other changes; this is the first ticket introduction; `run_attempt=1`. Detach to the audited source.
- Build using the same Expo Hosting `xpen/moniflow` **development** domain / `mvp-preview` alias and `--environment preview`, **never `--prod`**. This is the **same** Expo Router app/screens with iPhone footer tabs in normal document flow, leaving native Android's floating design unchanged.
- Validate installable PNG icon files, native signer exclusion, Supabase JWT restoration tests, Money Plan and guard regression tests before one web-only `eas deploy`. No EAS native build, Apple signing or App Store interaction.
- Frontend `EXPO_PUBLIC_API_URL` must continue to target the isolated `moniflow-sandbox-staging` preview, and `EXPO_PUBLIC_MONIFLOW_PWA_PREVIEW=1` must keep PWA bank/KYC/BMONI/partner-money mutations disabled.
- A new immutable `*.expo.app` preview host may require **strict exact-origin CORS** activation on the existing isolated Vercel sandbox preview. Do not weaken CORS to wildcard. Any user-saved sandbox financial information remains on the isolated server and must not be overwritten by publishing a new frontend.
- **User acceptance after publication:** on iPhone Safari open the new Expo preview URL, Add to Home Screen (new origin may require sign-in once), revisit the saved simulated ₦240k state, scroll to bottom of MONI Guard and confirm no text is blocked by the footer. Confirm Pockets, Activity and relaunch persistence again. Never present this as a real BMONI transaction.
