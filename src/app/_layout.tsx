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
import { useCallback, useEffect, useState } from "react";
import * as Linking from "expo-linking";
import { AppState, Platform, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { AuthProvider } from "@/auth/auth-context";
import { Welcome } from "@/components/welcome";
import { openedFromLink } from "@/lib/app-path";
import { startPlay, type WelcomeChoice, welcomeMode } from "@/lib/welcome";
import { markWelcomeSeen, welcomeSeen } from "@/lib/welcome-store";
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
  const reducedMotion = useReducedMotion();
  // The first-launch welcome (SV-02). Null until we know whether this phone
  // has seen it and whether the app was opened from a shared link.
  const [entry, setEntry] = useState<{
    seen: boolean;
    openedFromLink: boolean;
  } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let active = true;
    // Opened from a shared link: go straight to it. The welcome waits for an
    // ordinary launch, so it is not marked as seen (R9 finding 3).
    Promise.all([welcomeSeen(), Linking.getInitialURL().catch(() => null)])
      .then(([seen, url]) => {
        if (active) setEntry({ seen, openedFromLink: openedFromLink(url) });
      })
      .catch(() => {
        if (active) setEntry({ seen: true, openedFromLink: false });
      });
    return () => {
      active = false;
    };
  }, []);

  const finishWelcome = useCallback((choice: WelcomeChoice) => {
    setDismissed(true);
    void markWelcomeSeen();
    startPlay(choice);
  }, []);
  const introReady = entry !== null;
  const mode =
    entry && !dismissed ? welcomeMode({ ...entry, reducedMotion }) : "hidden";
  const showIntro = mode !== "hidden";

  useEffect(() => {
    if ((loaded || error) && introReady) SplashScreen.hideAsync();
  }, [loaded, error, introReady]);
  if ((!loaded && !error) || !introReady) return null;

  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <PushBridge />
        <StatusBar style={dark || showIntro ? "light" : "dark"} />
        {/* While the welcome shows, screen readers stay on it (R9). */}
        <View
          style={{ flex: 1 }}
          accessibilityElementsHidden={showIntro}
          importantForAccessibility={showIntro ? "no-hide-descendants" : "auto"}
          aria-hidden={showIntro}
        >
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
            <Stack.Screen name="rebook" options={{ title: "Book again" }} />
            <Stack.Screen
              name="venues/[facilityId]"
              options={{ title: "Venue" }}
            />
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
            <Stack.Screen
              name="venue/manage"
              options={{ title: "Your venue" }}
            />
            <Stack.Screen
              name="venue/details"
              options={{ title: "Venue details" }}
            />
            <Stack.Screen name="venue/pin" options={{ title: "Map pin" }} />
            <Stack.Screen
              name="venue/closures"
              options={{ title: "Closures" }}
            />
            <Stack.Screen name="venue/staff" options={{ title: "Team" }} />
            <Stack.Screen
              name="venue/add-pitch"
              options={{ title: "Add a pitch" }}
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
        </View>
        {showIntro && (
          <Welcome motion={mode === "video"} onDone={finishWelcome} />
        )}
      </AuthProvider>
    </QueryClientProvider>
  );
}
