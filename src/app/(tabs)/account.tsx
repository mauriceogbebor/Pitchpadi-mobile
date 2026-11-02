import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useAuth } from "@/auth/auth-context";
import { PushCard } from "@/components/push-card";
import { Body, Button, Card, Heading, Notice, Screen } from "@/components/ui";
import { formatPhone } from "@/lib/format";
import { space, TAP } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

export default function AccountScreen() {
  const auth = useAuth();
  const colors = useColors();

  if (auth.status === "loading")
    return (
      <Screen>
        <Heading>Account</Heading>
      </Screen>
    );

  if (auth.status === "offline")
    return (
      <Screen>
        <Heading>Account</Heading>
        <Notice
          tone="danger"
          title="You're offline"
          action={
            <Button
              variant="outline"
              label="Try again"
              onPress={auth.refresh}
            />
          }
        >
          <Body>
            You are still signed in. We&apos;ll load your account when
            you&apos;re back online.
          </Body>
        </Notice>
      </Screen>
    );

  if (auth.status === "signedOut")
    return (
      <Screen>
        <Heading>Account</Heading>
        <Body tone="muted">
          Sign in with your phone number to see your bookings, or to run your
          venue.
        </Body>
        <Button label="Sign in" onPress={() => router.push("/sign-in")} />
      </Screen>
    );

  const { me } = auth;
  return (
    <Screen>
      <Heading>Account</Heading>
      <Card>
        <Body tone="muted">Signed in as</Body>
        <Body weight="bold" size={20}>
          {formatPhone(me.user.phone)}
        </Body>
      </Card>
      {me.organizations.length > 0 && (
        <Card>
          <Heading level={3}>Your venues</Heading>
          {me.organizations.map((organization) => (
            <Pressable
              key={organization.id}
              accessibilityRole="button"
              accessibilityLabel={`${organization.name}. Manage venue`}
              onPress={() =>
                router.push({
                  pathname: "/venue/manage",
                  params: { organizationId: organization.id },
                })
              }
              style={styles.venue}
            >
              <View style={{ flex: 1 }}>
                <Body weight="semibold">{organization.name}</Body>
                <Body tone="muted">
                  {organization.role === "owner" ? "Owner" : "Staff"}
                  {organization.status !== "approved"
                    ? organization.status === "rejected"
                      ? " · Needs changes"
                      : " · In review"
                    : ""}
                </Body>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textMuted}
              />
            </Pressable>
          ))}
        </Card>
      )}
      <Button
        variant="outline"
        label={
          me.organizations.length ? "Set up another venue" : "Set up your venue"
        }
        accessibilityHint="Add your pitch business so players can book it"
        onPress={() => router.push("/venue/setup")}
      />
      {me.user.isPlatformAdmin && (
        <Button
          variant="outline"
          label="Review venues"
          accessibilityHint="PitchPadi team: approve new venues"
          onPress={() => router.push("/admin/venues")}
        />
      )}
      <PushCard
        title="Turn on notifications"
        detail={
          me.organizations.length
            ? "New bookings at your venue, your booking confirmations and a reminder before kick-off."
            : "Your booking confirmations and a reminder before kick-off."
        }
      />
      <View style={{ gap: space.sm }}>
        <Button
          variant="outline"
          label="Sign out"
          onPress={() => auth.signOut()}
        />
        <Button
          variant="ghost"
          label="Sign out on all devices"
          accessibilityHint="Ends every session for this account, on every phone and computer"
          onPress={() => auth.signOut(true)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  venue: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: TAP,
    paddingVertical: space.xs,
  },
});
