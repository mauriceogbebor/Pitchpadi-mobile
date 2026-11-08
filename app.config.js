// Plain JavaScript (not TypeScript) so that every Expo tool, including
// eas-cli, can read it (DB-01).

/** The PitchPadi project on Expo, set once `eas init` has linked it. */
const EAS_PROJECT_ID = "90a95703-36f4-4610-ad18-9b6a2c574992";

/**
 * Adds what depends on the environment to app.json:
 * - EAS_PROJECT_ID: the Expo project (@mauricemcbig/pitchpadi), needed for
 *   EAS builds and push tokens. Without it the app runs in Expo Go, with push
 *   switched off. The default below is the project `eas init` created.
 * - APP_VARIANT=beta: the TestFlight beta (D-061). It has its own identity,
 *   com.mauricemcbig.pitchpadi.beta named "PitchPadi Beta", on the Repitair
 *   Apple team, so com.pitchpadi.app and the name "PitchPadi" stay free for
 *   PitchPadi's own Apple account. Apple only moves released apps between
 *   accounts.
 * - EXPO_PUBLIC_WEB_URL: the website. When it is a real https address, shared
 *   team links (/b/…), pitch links (/pitches/…) and venue links (/venues/…)
 *   open in the app as verified Android App Links and iOS Universal Links. The
 *   website serves the matching assetlinks.json and
 *   apple-app-site-association files.
 *
 * @param {import("expo/config").ConfigContext} context
 * @returns {import("expo/config").ExpoConfig}
 */
const BETA_ID = "com.mauricemcbig.pitchpadi.beta";

module.exports = ({ config }) => {
  const beta = process.env.APP_VARIANT === "beta";
  const webUrl = process.env.EXPO_PUBLIC_WEB_URL ?? "";
  const host = /^https:\/\//.test(webUrl) ? new URL(webUrl).host : null;
  const projectId = process.env.EAS_PROJECT_ID || EAS_PROJECT_ID;
  return {
    ...config,
    ...(beta ? { name: "PitchPadi Beta" } : {}),
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
      [
        "expo-image-picker",
        {
          photosPermission:
            "PitchPadi uses the photos you choose to show players your venue.",
          // Venue photos come from the library only: no camera or microphone.
          cameraPermission: false,
          microphonePermission: false,
        },
      ],
    ],
    extra: {
      ...config.extra,
      ...(projectId ? { eas: { projectId } } : {}),
    },
    ios: {
      ...config.ios,
      ...(beta ? { bundleIdentifier: BETA_ID } : {}),
      // PitchPadi uses only standard HTTPS: no export compliance questions.
      config: { ...config.ios?.config, usesNonExemptEncryption: false },
      ...(host ? { associatedDomains: [`applinks:${host}`] } : {}),
    },
    android: {
      ...config.android,
      ...(beta ? { package: BETA_ID } : {}),
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
