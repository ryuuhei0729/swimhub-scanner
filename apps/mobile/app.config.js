const baseConfig = require("./app.json");

module.exports = {
  ...baseConfig.expo,
  updates: {
    url: "https://u.expo.dev/d123c26f-8ad7-4505-b6f2-11d82a741b99",
  },
  runtimeVersion: {
    policy: "appVersion",
  },
  extra: {
    ...baseConfig.expo.extra,
    eas: {
      projectId: baseConfig.expo.extra?.eas?.projectId || "",
    },
  },
};
