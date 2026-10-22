# MONIFlow post-Figma Waydroid x86_64 preview — Build and QA

**Owner-approved:** one separate Waydroid UI-only Expo build using the exact reviewed source `c1db693b8740798320613d1f5071bd7d69b76451`. See the [native test issue](https://github.com/realxpen/moniflow/issues/62) and [Figma screens](https://www.figma.com/design/Ir1EG2ui7qVhVuSrYoU917).

## Why this build is needed

The older October 20 Waydroid APK opened and showed the heading **“Your money, when ready.”** The up-to-date Figma v6 source uses **“Your money, in focus.”** and distinct Home, Pockets, Activity and Profile presentations. The finished October 22 ARM64 phone APK crashed in x86_64 Waydroid, which expects x86_64 native libraries.

## Automatic merge-triggered checks

- Workflow starts only on the initial addition of a new approval ticket on `main`, provided `main` had exactly the approved parent SHA. If the source moves, stop and require another review.
- Preflight runs TypeScript, unit tests, Expo web export, sandbox isolation tests and checks unauthenticated API endpoints and disabled BMONI financial flags.
- Validate Waydroid Expo project, `com.realxpen.moniflow.waydroid` package, x86_64 Gradle architecture, BMONI SDK exclusion from Android autolinking, and preservation of the physical ARM64 app profile.
- Submit **one** internal EAS APK for `waydroid-x86-apk`, wait for an actual FINISHED result and then inspect ZIP and `lib/x86_64/libreactnative.so`. Reject ARM64 native libraries.
- Publish the Expo build page, GitHub source SHA and APK SHA-256 metadata without uploading a private Expo artifact URL or rehosting the APK.

## Acceptance after Expo finishes

Install the `MONIFlow Waydroid` APK on Waydroid, not the original ARM64 `MONIFlow` package. Check it launches without a native-library crash. Confirm welcome/sign-in and distinct signed-in Home, Pockets, Activity and Profile, scrollability, readiness gate messaging, bottom navigation, offline educational Operator, and no balance or activity claims. Test 100%, 150% and 200% text, screen-reader navigation when available, sign out, network loss and resumption.

Use test accounts only. **Do not enter a wallet PIN, initialize/sign a BMONI device wallet, approve real money, make provider financial requests, or run KYC.** The preview's native signer is excluded and MONIFlow API mutations are blocked. Green CI and installed Waydroid UI do not prove provider settlement or a signed financial transaction.

If the install warns of signature mismatch, avoid uninstalling an existing app that may have locally stored data. Record a redacted screenshot rather than bypassing user data protection. Android physical-device native signer validation remains independent and blocked without evidence.

No terminal work is required for the GitHub workflow; screenshots of the running preview can be shared after installation.
