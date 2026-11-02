import { StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useReducedMotion,
} from "react-native-reanimated";
import { BookedMark } from "@/components/booked-mark";
import { PitchBand } from "@/components/pitch-band";
import { Body, Button, Card, Divider, Heading } from "@/components/ui";
import { dateParts, formatNaira } from "@/lib/format";
import {
  gameOnText,
  openDirections,
  placeLine,
  shareOnWhatsApp,
} from "@/lib/links";
import { fonts, palette, space } from "@/theme/tokens";

export type BookedGame = {
  reference: string;
  status?: string;
  pitch: {
    facilityName: string;
    name: string;
    areaName: string;
    address: string;
    landmark: string | null;
  };
  localDate: string;
  localStart: string;
  localEnd: string;
  amountMinor: number;
};

const STATUS_NOTE: Record<string, string> = {
  completed: "This game has been played.",
  no_show: "The venue marked this game as a no-show.",
  cancelled: "This booking was cancelled.",
  refunded: "This booking was cancelled and refunded.",
};

/**
 * The booking: on the pitch band, the reference to show at the pitch; then
 * when, where (with directions), what was paid and the terms, and sharing
 * with the team. With `celebrate`, the pitch lines draw and the reference
 * rises once (BookedMark), unless the phone asks for less motion.
 */
export function BookedCard({
  booking,
  policy,
  celebrate = false,
  shared = false,
}: {
  booking: BookedGame;
  policy?: { label: string; summary: string };
  celebrate?: boolean;
  /** Opened from a team link: a teammate, not necessarily who booked it. */
  shared?: boolean;
}) {
  const reduce = useReducedMotion();
  const animate = celebrate && !reduce;
  const day = dateParts(booking.localDate);
  const note = booking.status ? STATUS_NOTE[booking.status] : undefined;
  const active = !note;
  const rise = (delay: number) =>
    animate ? FadeInDown.delay(delay).duration(320) : undefined;

  return (
    <View style={{ gap: space.lg }}>
      <PitchBand markings="none" contentStyle={styles.bandContent}>
        <View style={styles.top}>
          <BookedMark celebrate={celebrate && active} />
          <Animated.View entering={rise(650)} style={{ flex: 1, gap: 2 }}>
            <Heading level={2} style={{ color: palette.white }}>
              {!active ? "Your booking" : shared ? "Game on" : "You're booked"}
            </Heading>
            <Body tone="onBandMuted">
              {note ?? `${day.long}, ${booking.localStart}`}
            </Body>
          </Animated.View>
        </View>
        <Animated.View entering={rise(780)} style={styles.reference}>
          <Body tone="onBandMuted" size={14}>
            Show this reference at the pitch
          </Body>
          <Body
            selectable
            numeric
            style={styles.code}
            accessibilityLabel={`Reference ${booking.reference.split("").join(" ")}`}
          >
            {booking.reference}
          </Body>
        </Animated.View>
        {active && (
          <Animated.View entering={rise(900)}>
            <Button
              variant="onBand"
              icon="logo-whatsapp"
              label="Share on WhatsApp"
              accessibilityLabel="Share with the team on WhatsApp"
              onPress={() =>
                void shareOnWhatsApp(
                  gameOnText({ ...booking, dayLabel: day.long }),
                )
              }
            />
          </Animated.View>
        )}
      </PitchBand>

      <Animated.View
        entering={animate ? FadeIn.delay(950).duration(300) : undefined}
      >
        <Card>
          <Detail label="When">
            {day.long}, {booking.localStart} to {booking.localEnd}
          </Detail>
          <Divider />
          <Detail label="Where">
            {booking.pitch.facilityName}, {booking.pitch.name}
            {"\n"}
            <Body tone="muted">{placeLine(booking.pitch)}</Body>
          </Detail>
          <Button
            variant="outline"
            icon="navigate-outline"
            label="Get directions"
            onPress={() =>
              openDirections({
                facilityName: booking.pitch.facilityName,
                address: booking.pitch.address,
                landmark: booking.pitch.landmark,
                areaName: booking.pitch.areaName,
              })
            }
            accessibilityHint="Opens Google Maps"
          />
          <Divider />
          <Detail label="Paid">
            <Body weight="semibold" numeric>
              {formatNaira(booking.amountMinor)}
            </Body>
          </Detail>
          {policy ? (
            <>
              <Divider />
              <Detail label="If plans change">
                {policy.label}. <Body tone="muted">{policy.summary}</Body>
              </Detail>
            </>
          ) : null}
        </Card>
      </Animated.View>
    </View>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 2, paddingVertical: space.xs }}>
      <Body tone="muted" size={14}>
        {label}
      </Body>
      <Body weight="semibold">{children}</Body>
    </View>
  );
}

const styles = StyleSheet.create({
  bandContent: { gap: space.lg, padding: space.xl },
  top: { flexDirection: "row", alignItems: "center", gap: space.lg },
  reference: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.18)",
    paddingTop: space.md,
    gap: 2,
  },
  code: {
    color: palette.volt,
    fontFamily: fonts.displayHeavy,
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: 1,
  },
});
