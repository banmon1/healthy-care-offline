const fs = require('node:fs');
const path = require('node:path');
const { withDangerousMod, withMainApplication } = require('@expo/config-plugins');

module.exports = function withHealthySteps(config) {
  config = withMainApplication(config, entry => {
    const source = entry.modResults.contents;
    const anchor = 'PackageList(this).packages.apply {';
    if (!source.includes('add(HealthyStepsPackage())')) {
      if (!source.includes(anchor)) throw new Error('Cannot register the Healthy Steps native package.');
      entry.modResults.contents = source.replace(anchor, anchor + '\n              add(HealthyStepsPackage())');
    }
    return entry;
  });
  return withDangerousMod(config, ['android', async entry => {
    const root = entry.modRequest.projectRoot;
    const folder = path.join(entry.modRequest.platformProjectRoot, 'app/src/main/java/com/healthy/securehealth');
    fs.mkdirSync(folder, { recursive: true });
    fs.copyFileSync(path.join(root, 'plugins/HealthyStepsPackage.kt'), path.join(folder, 'HealthyStepsPackage.kt'));
    return entry;
  }]);
};
