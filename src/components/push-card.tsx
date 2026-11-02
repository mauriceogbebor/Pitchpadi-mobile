import { Body, Button, Card, Heading, Notice } from "@/components/ui";
import { usePush } from "@/notifications/use-push";

/**
 * Turn notifications on or off for this phone. `prompt` shows only while they
 * are off and possible (the Venue tab, the booked card); the full card also
 * explains when they cannot work here and how to switch them off (Account).
 */
export function PushCard({
  variant = "full",
  title,
  detail,
}: {
  variant?: "full" | "prompt";
  title: string;
  detail: string;
}) {
  const push = usePush();
  const state = push.state;
  if (!state) return null;
  if (variant === "prompt" && state.kind !== "off") return null;

  if (state.kind === "unsupported")
    return (
      <Card>
        <Heading level={3}>Notifications</Heading>
        <Body tone="muted">{state.reason}</Body>
      </Card>
    );
  if (state.kind === "blocked")
    return (
      <Card>
        <Heading level={3}>Notifications are off for PitchPadi</Heading>
        <Body tone="muted">
          Turn them on in your phone&apos;s settings, under Apps, PitchPadi,
          Notifications.
        </Body>
      </Card>
    );
  if (state.kind === "on")
    return (
      <Card>
        <Heading level={3}>Notifications are on</Heading>
        <Body tone="muted">{detail}</Body>
        <Button
          variant="outline"
          label="Turn off on this phone"
          onPress={() => void push.turnOff()}
          busy={push.busy}
        />
      </Card>
    );
  return (
    <Notice
      title={title}
      action={
        <Button
          label="Turn on notifications"
          onPress={() => void push.turnOn()}
          busy={push.busy}
        />
      }
    >
      <Body tone="muted">{detail}</Body>
      {push.error ? <Body tone="danger">{push.error}</Body> : null}
    </Notice>
  );
}
