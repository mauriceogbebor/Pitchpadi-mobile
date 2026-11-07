// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

/*
 * expo-router loads `expo-symbols` if it is there, for its native-tabs
 * feature, which PitchPadi does not use. Bundling it adds a 950 KB Material
 * Symbols font to every install (PL-01), so it resolves to an empty module.
 * If the app ever moves to native tabs, remove this.
 */
const resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "expo-symbols") return { type: "empty" };
  return (resolveRequest ?? context.resolveRequest)(
    context,
    moduleName,
    platform,
  );
};

module.exports = config;
