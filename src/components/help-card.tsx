import { Linking } from "react-native";
import { Body, Button, Card, Heading } from "@/components/ui";
import { supportUrl, supportWhatsApp } from "@/lib/support";

const NUMBER = supportWhatsApp(process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP);

/**
 * "Need help with this booking?" under a booking (R7): how changes and
 * cancellations work and a way to reach PitchPadi support with the
 * reference. Hidden until a support number is configured.
 */
export function HelpCard({
  reference,
  active,
}: {
  reference: string;
  /** False for games already played, cancelled or refunded. */
  active: boolean;
}) {
  if (!NUMBER) return null;
  return (
    <Card style={{ gap: 8 }}>
      <Heading level={3}>Need help with this booking?</Heading>
      <Body tone="muted">
        {active
          ? "To change or cancel, message PitchPadi support with your reference. Any refund follows the terms above."
          : "Questions about this game or a refund? Message PitchPadi support with your reference."}
      </Body>
      <Button
        variant="outline"
        icon="logo-whatsapp"
        label="Message support"
        accessibilityLabel="Message PitchPadi support on WhatsApp"
        accessibilityHint="Opens WhatsApp with your booking reference"
        onPress={() => void Linking.openURL(supportUrl(NUMBER, reference))}
      />
    </Card>
  );
}
