import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * Adds what depends on the environment to app.json:
 * - EAS_PROJECT_ID: the Expo project, needed for push tokens (set up with the
 *   store accounts, M5). Without it the app runs, with push switched off.
 * - EXPO_PUBLIC_WEB_URL: the website. When it is a real https address, shared
 *   team links (/b/…), pitch links (/pitches/…) and venue links (/venues/…) open in the app as verified
 *   Android App Links and iOS Universal Links. The website serves the matching
 *   assetlinks.json and apple-app-site-association files.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const webUrl = process.env.EXPO_PUBLIC_WEB_URL ?? "";
  const host = /^https:\/\//.test(webUrl) ? new URL(webUrl).host : null;
  const projectId = process.env.EAS_PROJECT_ID;
  return {
    ...(config as ExpoConfig),
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
