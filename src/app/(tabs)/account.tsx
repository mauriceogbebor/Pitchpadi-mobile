import { router } from "expo-router";
import { View } from "react-native";
import { useAuth } from "@/auth/auth-context";
import { Body, Button, Card, Heading, Notice, Screen } from "@/components/ui";
import { formatPhone } from "@/lib/format";
import { space } from "@/theme/tokens";

export default function AccountScreen() {
  const auth = useAuth();

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
            <Body key={organization.id}>
              {organization.name}
              <Body tone="muted">
                {" "}
                · {organization.role === "owner" ? "Owner" : "Staff"}
                {organization.status !== "approved"
                  ? organization.status === "rejected"
                    ? " · Needs changes"
                    : " · In review"
                  : ""}
              </Body>
            </Body>
          ))}
        </Card>
      )}
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
