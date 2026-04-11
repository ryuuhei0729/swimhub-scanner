const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");

const withFmtFix = (config) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );
      if (!fs.existsSync(podfilePath)) return config;

      let content = fs.readFileSync(podfilePath, "utf-8");
      if (content.includes("FMT_USE_CONSTEVAL")) return config;

      const patchCode = `
    # Fix fmt 11.0.2 consteval compilation error with Xcode 26+
    fmt_base = File.join(installer.sandbox.pod_dir('fmt'), 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base)
      txt = File.read(fmt_base)
      patched = txt.gsub(/^#\\s*define FMT_USE_CONSTEVAL 1$/, '# define FMT_USE_CONSTEVAL 0')
      if patched != txt
        File.chmod(0644, fmt_base)
        File.write(fmt_base, patched)
      end
    end
`;

      // Insert before the closing "end" of post_install block
      // Podfile structure: post_install do |installer| ... end \n end
      content = content.replace(
        /(\s+)(end\s*\nend\s*)$/,
        `\n${patchCode}$1$2`
      );

      fs.writeFileSync(podfilePath, content);
      return config;
    },
  ]);
};

module.exports = withFmtFix;
