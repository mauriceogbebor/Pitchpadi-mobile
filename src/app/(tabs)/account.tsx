import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useAuth } from "@/auth/auth-context";
import { PushCard } from "@/components/push-card";
import { PitchBand } from "@/components/pitch-band";
import {
  Body,
  Button,
  Card,
  Heading,
  Notice,
  Press,
  Screen,
  Section,
  Skeleton,
} from "@/components/ui";
import { formatPhone } from "@/lib/format";
import { radius, space, TAP } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

export default function AccountScreen() {
  const auth = useAuth();
  const colors = useColors();

  if (auth.status === "loading")
    return (
      <Screen>
        <Heading>Account</Heading>
        <Skeleton height={72} count={2} />
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
        <PitchBand markings="centre" contentStyle={styles.band}>
          <Heading level={2} style={{ color: colors.onBand }}>
            Play or run a venue
          </Heading>
          <Body tone="onBandMuted">
            Sign in with your phone number to see your bookings, or to run your
            venue.
          </Body>
          <Button
            variant="onBand"
            label="Sign in"
            onPress={() => router.push("/sign-in")}
          />
        </PitchBand>
      </Screen>
    );

  const { me } = auth;
  return (
    <Screen>
      <Heading>Account</Heading>
      <Card style={styles.who}>
        <View style={[styles.avatar, { backgroundColor: colors.chosen }]}>
          <Ionicons name="person" size={22} color={colors.onChosen} />
        </View>
        <View style={{ flex: 1 }}>
          <Body tone="muted" size={14}>
            Signed in as
          </Body>
          <Body weight="bold" size={19} numeric>
            {formatPhone(me.user.phone)}
          </Body>
        </View>
      </Card>

      <Section title={me.organizations.length ? "Your venues" : "Run a venue"}>
        <Card style={styles.list}>
          {me.organizations.map((organization, index) => (
            <Row
              key={organization.id}
              first={index === 0}
              icon="business-outline"
              title={organization.name}
              detail={`${organization.role === "owner" ? "Owner" : "Staff"}${
                organization.status !== "approved"
                  ? organization.status === "rejected"
                    ? ", needs changes"
                    : ", in review"
                  : ""
              }`}
              accessibilityLabel={`${organization.name}. Manage venue`}
              onPress={() =>
                router.push({
                  pathname: "/venue/manage",
                  params: { organizationId: organization.id },
                })
              }
            />
          ))}
          <Row
            first={me.organizations.length === 0}
            icon="add-circle-outline"
            title={
              me.organizations.length
                ? "Set up another venue"
                : "Set up your venue"
            }
            detail="Add your pitch business so players can book it"
            onPress={() => router.push("/venue/setup")}
          />
          {me.user.isPlatformAdmin && (
            <Row
              first={false}
              icon="shield-checkmark-outline"
              title="Review venues"
              detail="PitchPadi team: approve new venues"
              onPress={() => router.push("/admin/venues")}
            />
          )}
        </Card>
      </Section>

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
          icon="log-out-outline"
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

/** One line in a list card: icon, title and detail, then a chevron. */
function Row({
  icon,
  title,
  detail,
  first,
  onPress,
  accessibilityLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
  first: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const colors = useColors();
  return (
    <Press
      scaleTo={0.985}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={detail}
      onPress={onPress}
      style={[
        styles.row,
        !first && { borderTopWidth: 1, borderTopColor: colors.border },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.muted }]}>
        <Ionicons name={icon} size={20} color={colors.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Body weight="semibold">{title}</Body>
        <Body tone="muted" size={14}>
          {detail}
        </Body>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Press>
  );
}

const styles = StyleSheet.create({
  band: { padding: space.xl, gap: space.md },
  who: { flexDirection: "row", alignItems: "center", gap: space.md },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { padding: 0, paddingHorizontal: space.md, gap: 0 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: TAP + 24,
    paddingVertical: space.md,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
