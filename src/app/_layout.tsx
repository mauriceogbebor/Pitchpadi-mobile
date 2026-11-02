import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from "@expo-google-fonts/bricolage-grotesque";
import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
} from "@expo-google-fonts/geist";
import {
  focusManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import { AuthProvider } from "@/auth/auth-context";
import { PushBridge } from "@/notifications/push-bridge";
import { useColors, useIsDark } from "@/theme/use-theme";
import { fonts } from "@/theme/tokens";

SplashScreen.preventAutoHideAsync();

// Refresh what is on screen when the player comes back to the app, for example
// after paying in another app or checking WhatsApp.
if (Platform.OS !== "web")
  focusManager.setEventListener((setFocused) => {
    const subscription = AppState.addEventListener("change", (state) =>
      setFocused(state === "active"),
    );
    return () => subscription.remove();
  });

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
  });
  // Cached answers keep the app usable on a flaky connection; retries are gentle.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 2, gcTime: 24 * 60 * 60 * 1000 },
        },
      }),
  );
  const colors = useColors();
  const dark = useIsDark();

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);
  if (!loaded && !error) return null;

  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <PushBridge />
        <StatusBar style={dark ? "light" : "dark"} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerTitleStyle: { fontFamily: fonts.semibold },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="sign-in"
            options={{ presentation: "modal", title: "Sign in" }}
          />
          <Stack.Screen name="pitch/[pitchId]" options={{ title: "Pitch" }} />
          <Stack.Screen
            name="checkout/[holdId]"
            options={{ title: "Checkout" }}
          />
          <Stack.Screen
            name="pay/test/[attemptId]"
            options={{ presentation: "modal", title: "Pay" }}
          />
          <Stack.Screen
            name="booking/[reference]"
            options={{ title: "Booking" }}
          />
          <Stack.Screen name="venue/new" options={{ title: "Add booking" }} />
          <Stack.Screen
            name="venue/setup"
            options={{ title: "Set up your venue" }}
          />
          <Stack.Screen name="venue/manage" options={{ title: "Your venue" }} />
          <Stack.Screen
            name="venue/details"
            options={{ title: "Venue details" }}
          />
          <Stack.Screen
            name="venue/hours"
            options={{ title: "Hours and prices" }}
          />
          <Stack.Screen
            name="admin/venues"
            options={{ title: "Review venues" }}
          />
          <Stack.Screen
            name="venue/booking/[reservationId]"
            options={{ title: "Booking" }}
          />
        </Stack>
      </AuthProvider>
    </QueryClientProvider>
  );
}
