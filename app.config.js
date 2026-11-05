// Plain JavaScript (not TypeScript) so that every Expo tool, including
// eas-cli, can read it (DB-01).

/** The PitchPadi project on Expo, set once `eas init` has linked it. */
const EAS_PROJECT_ID = "";

/**
 * Adds what depends on the environment to app.json:
 * - EAS_PROJECT_ID: the Expo project (@mauricemcbig/pitchpadi), needed for
 *   EAS builds and push tokens. Without it the app runs in Expo Go, with push
 *   switched off. The default below is the project `eas init` created.
 * - EXPO_PUBLIC_WEB_URL: the website. When it is a real https address, shared
 *   team links (/b/…), pitch links (/pitches/…) and venue links (/venues/…)
 *   open in the app as verified Android App Links and iOS Universal Links. The
 *   website serves the matching assetlinks.json and
 *   apple-app-site-association files.
 *
 * @param {import("expo/config").ConfigContext} context
 * @returns {import("expo/config").ExpoConfig}
 */
module.exports = ({ config }) => {
  const webUrl = process.env.EXPO_PUBLIC_WEB_URL ?? "";
  const host = /^https:\/\//.test(webUrl) ? new URL(webUrl).host : null;
  const projectId = process.env.EAS_PROJECT_ID || EAS_PROJECT_ID;
  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      ["expo-notifications", { color: "#0B3D2E" }],
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "PitchPadi uses your location to show pitches near you and, for venue owners, to pin the venue on the map.",
        },
      ],
    ],
    extra: {
      ...config.extra,
      ...(projectId ? { eas: { projectId } } : {}),
    },
    ios: {
      ...config.ios,
      ...(host ? { associatedDomains: [`applinks:${host}`] } : {}),
    },
    android: {
      ...config.android,
      ...(host
        ? {
            intentFilters: [
              {
                action: "VIEW",
                autoVerify: true,
                data: ["/b", "/pitches", "/venues"].map((pathPrefix) => ({
                  scheme: "https",
                  host,
                  pathPrefix,
                })),
                category: ["BROWSABLE", "DEFAULT"],
              },
            ],
          }
        : {}),
    },
  };
};
