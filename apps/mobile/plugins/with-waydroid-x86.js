const { withGradleProperties } = require("@expo/config-plugins");

// Dedicated x86_64 Waydroid UI preview. NO BMONI signer SDK plugin.
// BMONI's official Android library has ARM64 binaries only.
module.exports = function withWaydroidX86(config) {
  return withGradleProperties(config, (config) => {
    const key = "reactNativeArchitectures";
    const existing = config.modResults.find((item) => item.type === "property" && item.key === key);
    if (existing) existing.value = "x86_64";
    else config.modResults.push({ type: "property", key, value: "x86_64" });
    return config;
  });
};
