import { router, Stack } from "expo-router";
import { Body, Button, Heading, Screen } from "@/components/ui";

/** A link the app does not know, perhaps from an old message. */
export default function NotFound() {
  return (
    <Screen>
      <Stack.Screen options={{ title: "Not found" }} />
      <Heading>We could not find that</Heading>
      <Body tone="muted">
        The link may be old or mistyped. You can find pitches and your bookings
        from here.
      </Body>
      <Button label="Find a pitch" onPress={() => router.replace("/")} />
    </Screen>
  );
}
