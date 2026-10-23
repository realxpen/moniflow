# MONIFlow iPhone PWA: One Expo Hosting Preview

Approval: ONE_ISOLATED_EXPO_IPHONE_PWA_PREVIEW_NO_NATIVE_BUILD_20261023

The user explicitly chose **PWA as the primary testing method for the current MONIFlow Figma MVP** on iPhone and desktop. This first web-preview publication uses the already connected Expo account/project (not a new Apple or Google App Store build). Vercel's separate test project cannot deploy today due HTTP 402 daily request limit; using Expo's designated PWA Hosting **preview** is permitted under the user's product testing request.

**Exact immutable source:** `1c02c91ecdda2828f06ed27c17604032f4c58f49`, merged PWA PR #79. This ticket + workflow are the only new files in the build-triggering merge.

The single GitHub Action:
- Validates current main HEAD's one direct parent equals the pinned source and the new one-shot ticket was absent from that parent; refuses reruns and unreviewed source changes.
- Runs full TypeScript, Vitest and `expo export --platform web` for the Expo Router Figma app, then checks real installable manifest, Safari icon and HTML.
- Uses **preview-only client public env**: `EXPO_PUBLIC_MONIFLOW_PWA_PREVIEW=1`, isolated `moniflow-sandbox` API, public Supabase Auth URL and public anon key. No API secret, bank token, backend private HMAC or BMONI credential is shipped into the browser.
- Uses the already authorized `xpen/moniflow` Expo project and one `eas deploy --non-interactive --dev-domain xpen-moniflow-pwa-202610 --alias mvp-preview --environment preview --json` command. **No `--prod`**, EAS Build, native iOS/Android build, store signing, or app release.
- Reports the verified output URL in GitHub Actions summary and preserves CI logs; never prints raw auth tokens or a signed user session.

**Limitations:** iOS Safari PWA installability does not prove signed-in persistence automatically. User accepts installation on iPhone from the actual preview URL: Safari → Share → Add to Home Screen. PWA auth tokens intentionally remain memory-only; re-open may require sign-in. Browser BMONI signing and all real financial routes are disabled. The isolated sandbox API allows authenticated test operations but its current CORS origin allowlist may require a separate exact-origin preview update before cross-origin browser calls will work. We must not claim that local demo success confirms server persistence until genuine user-session evidence is seen.

Other previously installed Waydroid/ARM64 builds are unchanged, and the native SDK is not used by this PWA.
