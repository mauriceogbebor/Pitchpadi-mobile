import { useEffect, useRef } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewInstance,
} from "react-native";
import { Body, Press } from "@/components/ui";
import { chosenState } from "@/lib/a11y";
import { dateParts } from "@/lib/format";
import { radius, space } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

const TILE = 58;
const GAP = space.sm;

/**
 * Days as a fixtures calendar: the weekday over a big date number. The chosen
 * day is a solid tile and stays in view.
 */
export function DateStrip({
  days,
  value,
  today,
  onChange,
  onBand = false,
}: {
  days: string[];
  value: string;
  today: string;
  onChange: (day: string) => void;
  /** On the pitch band: light tiles on green. */
  onBand?: boolean;
}) {
  const colors = useColors();
  const scroller = useRef<ScrollViewInstance>(null);
  const index = Math.max(0, days.indexOf(value));
  useEffect(() => {
    scroller.current?.scrollTo({
      x: Math.max(0, index * (TILE + GAP) - TILE),
      animated: false,
    });
    // Only when the list of days changes, not on every choice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);
  return (
    <ScrollView
      ref={scroller}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: GAP }}
      accessibilityLabel="Day"
    >
      {days.map((day) => {
        const parts = dateParts(day);
        const chosen = day === value;
        const bg = chosen
          ? onBand
            ? colors.accent
            : colors.chosen
          : onBand
            ? "rgba(255,255,255,0.08)"
            : colors.card;
        const fg = chosen
          ? onBand
            ? colors.onAccent
            : colors.onChosen
          : onBand
            ? colors.onBand
            : colors.text;
        const sub = chosen
          ? fg
          : onBand
            ? colors.onBandMuted
            : colors.textMuted;
        return (
          <Press
            key={day}
            accessibilityRole="button"
            {...chosenState(chosen)}
            accessibilityLabel={parts.long}
            onPress={() => onChange(day)}
            style={[
              styles.tile,
              {
                backgroundColor: bg,
                borderColor: chosen
                  ? bg
                  : onBand
                    ? "rgba(255,255,255,0.16)"
                    : colors.border,
              },
            ]}
          >
            <Body size={13} weight="medium" style={{ color: sub }}>
              {day === today ? "Today" : parts.weekday}
            </Body>
            <Body size={22} weight="bold" numeric style={{ color: fg }}>
              {parts.day}
            </Body>
            <View style={{ height: 14 }}>
              {parts.day === "1" || day === days[0] ? (
                <Body size={11} weight="medium" style={{ color: sub }}>
                  {parts.month}
                </Body>
              ) : null}
            </View>
          </Press>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: TILE,
    minHeight: 76,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: space.xs,
  },
});
