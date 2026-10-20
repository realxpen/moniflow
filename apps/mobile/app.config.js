/**
 * Default Expo config stays identical to app.json.
 * Only the explicit Waydroid EAS profile switches to x86_64 UI-only mode.
 */
module.exports = ({ config }) => {
  if (process.env.EXPO_PUBLIC_MONIFLOW_WAYDROID_PREVIEW !== "1") return config;

  return {
    ...config,
    name: "MONIFlow Waydroid",
    scheme: "moniflow-waydroid",
    android: {
      ...config.android,
      package: "com.realxpen.moniflow.waydroid"
    },
    plugins: [
      ...(config.plugins ?? []).filter((plugin) => plugin !== "./plugins/with-bmoni-sdk.js"),
      "./plugins/with-waydroid-x86.js"
    ],
    extra: {
      ...config.extra,
      buildVariant: "waydroid-x86-ui-only",
      nativeWalletFeaturesEnabled: false
    }
  };
};
