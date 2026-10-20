/**
 * Expo SDK 57 autolinking reads this config.
 * The BMONI Android signer is ARM64-only; exclude it on Waydroid x86_64.
 * Physical Android and iOS builds keep the standard native SDK autolinking.
 */
const waydroid = process.env.EXPO_PUBLIC_MONIFLOW_WAYDROID_PREVIEW === "1";

module.exports = waydroid
  ? {
      dependencies: {
        "@bkey-inc/bmoni_embedded_sdk": {
          platforms: {
            android: null
          }
        }
      }
    }
  : { dependencies: {} };
