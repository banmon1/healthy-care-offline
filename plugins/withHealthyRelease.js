const { withAndroidManifest, withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withHealthyRelease(config) {
  config = withAndroidManifest(config, entry => {
    const manifest = entry.modResults.manifest;
    const portrait = 'android.hardware.screen.portrait';
    manifest['uses-feature'] = (manifest['uses-feature'] || [])
      .filter(feature => feature.$['android:name'] !== portrait);
    manifest['uses-feature'].push({ $: { 'android:name': portrait, 'android:required': 'false' } });
    return entry;
  });
  return withAppBuildGradle(config, entry => {
    const marker = /(^\s*release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/m;
    entry.modResults.contents = entry.modResults.contents.replace(marker, '$1signingConfig null');
    return entry;
  });
};
