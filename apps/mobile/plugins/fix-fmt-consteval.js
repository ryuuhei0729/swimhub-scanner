/**
 * Expo config plugin: fmt consteval workaround for Xcode 26
 *
 * RN 0.83 の fmt 11.0.2 が Xcode 26 の Apple Clang で consteval エラーを起こす。
 * FMT_USE_CONSTEVAL=0 を定義して回避する。
 * See: https://github.com/expo/expo/issues/44229
 */
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function fixFmtConsteval(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );
      let podfile = fs.readFileSync(podfilePath, "utf-8");

      const patchCode = `
    # [fix-fmt-consteval] Xcode 26 workaround
    installer.pods_project.targets.each do |target|
      if target.name == 'fmt'
        target.build_configurations.each do |bc|
          defs = bc.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || ['$(inherited)']
          defs.push('FMT_USE_CONSTEVAL=0') unless defs.include?('FMT_USE_CONSTEVAL=0')
          bc.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = defs
        end
      end
    end
`;

      podfile = podfile.replace(
        /react_native_post_install\(/,
        `${patchCode}    react_native_post_install(`
      );

      fs.writeFileSync(podfilePath, podfile);
      return config;
    },
  ]);
};
