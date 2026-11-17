const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withHealthyRelease(config) {
  return withAppBuildGradle(config, entry => {
    const marker = /(^\s*release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/m;
    entry.modResults.contents = entry.modResults.contents.replace(marker, '$1signingConfig null');
    return entry;
  });
};
