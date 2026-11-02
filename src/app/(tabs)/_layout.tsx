import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/auth/auth-context";
import { fonts } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

/**
 * One app, two modes: Play (find and book) for everyone, and Venue (calendar and
 * bookings) for anyone who owns or works at a venue.
 */
export default function TabLayout() {
  const colors = useColors();
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const hasVenue =
    auth.status === "signedIn" && auth.me.organizations.length > 0;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.link,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          // Room for icon and label on phones with no bottom inset (most Androids).
          height: 64 + insets.bottom,
          paddingTop: 4,
          paddingBottom: insets.bottom + 6,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.medium,
          fontSize: 12,
          lineHeight: 16,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Play",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="football-outline"
              size={size}
              color={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Bookings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="ticket-outline"
              size={size}
              color={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="venue"
        options={{
          title: "Venue",
          // Hide the button, not the route, so a reload or link to /venue still works
          // while sign-in is loading; the screen explains when there is no venue.
          tabBarItemStyle: hasVenue ? undefined : { display: "none" },
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="calendar-outline"
              size={size}
              color={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="person-circle-outline"
              size={size}
              color={color as string}
            />
          ),
        }}
      />
    </Tabs>
  );
}
