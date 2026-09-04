const { withProjectBuildGradle, withGradleProperties } = require('@expo/config-plugins');

module.exports = function withBmoniSdk(config) {
  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') return config;
    const marker = 'https://bkey-inc.github.io/package-distribution/maven';
    if (!config.modResults.contents.includes(marker)) {
      config.modResults.contents = config.modResults.contents.replace(
        /allprojects\s*\{\s*repositories\s*\{/,
        `allprojects {\n    repositories {\n        maven {\n            url "${marker}"\n            content { includeGroup "me.bkey.ip" }\n        }`
      );
    }
    return config;
  });

  config = withGradleProperties(config, (config) => {
    const key = 'reactNativeArchitectures';
    const existing = config.modResults.find((item) => item.type === 'property' && item.key === key);
    if (existing) existing.value = 'arm64-v8a';
    else config.modResults.push({ type: 'property', key, value: 'arm64-v8a' });
    return config;
  });

  return config;
};
