/**
 * Default Expo config stays identical to app.json.
 * Only the explicit Waydroid EAS profile switches to x86_64 UI-only mode.
 */
module.exports = ({ config }) => {
  if (process.env.EXPO_PUBLIC_MONIFLOW_SANDBOX_PREVIEW === "1" &&
      process.env.EXPO_PUBLIC_MONIFLOW_WAYDROID_PREVIEW !== "1") {
    throw new Error("Connected sandbox preview must use the signer-free x86 Waydroid profile.");
  }
  if (process.env.EXPO_PUBLIC_MONIFLOW_WAYDROID_PREVIEW !== "1") return config;

  // Use a separate package name so installing the connected *sandbox*
  // never overwrites the existing read-only Waydroid app.
  const dedicatedSandbox = process.env.EXPO_PUBLIC_MONIFLOW_SANDBOX_PREVIEW === "1";
  return {
    ...config,
    name: dedicatedSandbox ? "MONIFlow Sandbox" : "MONIFlow Waydroid",
    scheme: dedicatedSandbox ? "moniflow-sandbox" : "moniflow-waydroid",
    android: {
      ...config.android,
      package: dedicatedSandbox ? "com.realxpen.moniflow.sandbox" : "com.realxpen.moniflow.waydroid"
    },
    plugins: [
      ...(config.plugins ?? []).filter((plugin) => plugin !== "./plugins/with-bmoni-sdk.js"),
      "./plugins/with-waydroid-x86.js"
    ],
    // Expo SDK 57 may ignore a project react-native.config.js android:null
    // when the package supplies its own config. Explicit autolinking
    // exclusion is enforced before React Native module resolution.
    autolinking: {
      ...config.autolinking,
      android: {
        ...config.autolinking?.android,
        exclude: [
          ...new Set([...(config.autolinking?.android?.exclude ?? []), "@bkey-inc/bmoni_embedded_sdk"])
        ]
      }
    },
    extra: {
      ...config.extra,
      buildVariant: dedicatedSandbox ? "waydroid-x86-authenticated-sandbox" : "waydroid-x86-ui-only",
      nativeWalletFeaturesEnabled: false
    }
  };
};
