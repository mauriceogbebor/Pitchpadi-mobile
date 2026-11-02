import Constants from "expo-constants";

/**
 * Where the PitchPadi API lives. Set EXPO_PUBLIC_API_URL in .env. On a real phone
 * in development, use your computer's network address (http://192.168.x.x:4000),
 * not localhost, which on the phone means the phone itself.
 */
function defaultApiUrl(): string {
  // In Expo Go, the dev server's host is the computer running `npx expo start`.
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  return host ? `http://${host}:4000` : "http://localhost:4000";
}

export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || defaultApiUrl()
).replace(/\/$/, "");
