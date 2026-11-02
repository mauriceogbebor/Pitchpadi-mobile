import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/auth/auth-context";
import { fonts } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

/**
 * One app, two modes: Play (find and book) for everyone, and Venue (calendar and
 * bookings) for anyone who owns or works at a venue.
 */
/** The active tab sits on a soft pill with a filled icon, so where you are is clear. */
function TabIcon({
  name,
  focused,
  color,
}: {
  name: "football" | "ticket" | "calendar" | "person-circle";
  focused: boolean;
  color: string;
}) {
  const colors = useColors();
  return (
    <View
      style={{
        width: 56,
        height: 30,
        borderRadius: 15,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: focused ? colors.tabPill : "transparent",
      }}
    >
      <Ionicons
        name={focused ? name : `${name}-outline`}
        size={22}
        color={color}
      />
    </View>
  );
}

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
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          // Room for icon and label on phones with no bottom inset (most Androids).
          height: 68 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 8,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.semibold,
          fontSize: 12,
          lineHeight: 16,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Play",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="football"
              focused={focused}
              color={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Bookings",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="ticket" focused={focused} color={color as string} />
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
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="calendar"
              focused={focused}
              color={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="person-circle"
              focused={focused}
              color={color as string}
            />
          ),
        }}
      />
    </Tabs>
  );
}
