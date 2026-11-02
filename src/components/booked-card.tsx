import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, View } from "react-native";
import Animated, {
  FadeInDown,
  useReducedMotion,
  ZoomIn,
} from "react-native-reanimated";
import { Body, Button, Heading } from "@/components/ui";
import { dateParts, formatNaira } from "@/lib/format";
import {
  gameOnText,
  openDirections,
  placeLine,
  shareOnWhatsApp,
} from "@/lib/links";
import { fonts, palette, radius, space } from "@/theme/tokens";

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
 * The booking on the pitch-green card: the reference to show at the pitch, when,
 * where (with directions), what was paid, and sharing with the team. With
 * `celebrate`, the check mark lands once, unless the phone asks for less motion.
 */
export function BookedCard({
  booking,
  policy,
  celebrate = false,
}: {
  booking: BookedGame;
  policy?: { label: string; summary: string };
  celebrate?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const animate = celebrate && !reduceMotion;
  const day = dateParts(booking.localDate);
  const note = booking.status ? STATUS_NOTE[booking.status] : undefined;
  const active = !note;

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Animated.View
          entering={animate ? ZoomIn.springify().damping(12) : undefined}
          style={styles.mark}
          accessible={false}
        >
          <Ionicons name="checkmark" size={30} color={palette.night} />
        </Animated.View>
        <Animated.View
          entering={animate ? FadeInDown.delay(250).duration(400) : undefined}
          style={{ flex: 1 }}
        >
          <Heading style={styles.white}>
            {active ? "You're booked" : "Your booking"}
          </Heading>
        </Animated.View>
      </View>

      {note ? (
        <Body style={styles.soft}>{note}</Body>
      ) : (
        <Body style={styles.soft} size={17}>
          Show this reference at the pitch.
        </Body>
      )}
      <Body
        selectable
        style={styles.reference}
        accessibilityLabel={`Reference ${booking.reference.split("").join(" ")}`}
      >
        {booking.reference}
      </Body>

      <View style={styles.details}>
        <Detail label="When">
          {day.long}, {booking.localStart} to {booking.localEnd}
        </Detail>
        <Detail label="Paid">{formatNaira(booking.amountMinor)}</Detail>
        <Detail label="Where">
          {booking.pitch.facilityName}, {booking.pitch.name}
          {"\n"}
          <Body style={styles.soft}>{placeLine(booking.pitch)}</Body>
        </Detail>
        {policy ? (
          <Detail label="If plans change">
            {policy.label}. <Body style={styles.soft}>{policy.summary}</Body>
          </Detail>
        ) : null}
      </View>

      <View style={{ gap: space.sm }}>
        {active && (
          <Button
            label="Tell the team on WhatsApp"
            onPress={() =>
              void shareOnWhatsApp(
                gameOnText({ ...booking, dayLabel: day.long }),
              )
            }
            style={{ backgroundColor: palette.volt, borderColor: palette.volt }}
            textColor={palette.night}
          />
        )}
        <Button
          variant="outline"
          label="Get directions"
          onPress={() =>
            openDirections({
              facilityName: booking.pitch.facilityName,
              address: booking.pitch.address,
              landmark: booking.pitch.landmark,
              areaName: booking.pitch.areaName,
            })
          }
          style={{
            backgroundColor: "transparent",
            borderColor: "rgba(255,255,255,0.35)",
          }}
          textColor={palette.white}
          accessibilityHint="Opens Google Maps"
        />
      </View>
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
    <View style={{ gap: 2 }}>
      <Body style={styles.label} size={14}>
        {label}
      </Body>
      <Body weight="semibold" style={styles.white}>
        {children}
      </Body>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.pitch,
    borderRadius: radius.lg,
    padding: space.xl,
    gap: space.md,
  },
  top: { flexDirection: "row", alignItems: "center", gap: space.md },
  mark: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: palette.volt,
    alignItems: "center",
    justifyContent: "center",
  },
  white: { color: palette.white },
  soft: { color: "rgba(255,255,255,0.85)", fontFamily: fonts.body },
  label: { color: "rgba(255,255,255,0.7)" },
  reference: {
    color: palette.volt,
    fontFamily: fonts.displayHeavy,
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: 1.5,
  },
  details: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
    paddingTop: space.lg,
    gap: space.md,
  },
});
