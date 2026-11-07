import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Body } from "@/components/ui";
import { LOW_TIME_SECONDS } from "@/lib/recovery";
import { radius } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

/**
 * Minutes and seconds left on a hold, with a bar that drains as time runs out.
 * Uses the server's clock (serverNow), so a phone with the wrong time still
 * counts correctly. The bar moves with the once-a-second tick: no animation
 * loop, nothing extra for a budget phone.
 */
export function HoldCountdown({
  expiresAt,
  serverNow,
  onEnd,
  onLow,
  color,
}: {
  expiresAt: string;
  serverNow: string;
  onEnd?: () => void;
  /** Called once when two minutes or less are left. */
  onLow?: () => void;
  /** Text colour, for the countdown on the pitch band. */
  color?: string;
}) {
  const colors = useColors();
  const [offset] = useState(() => new Date(serverNow).getTime() - Date.now());
  const end = new Date(expiresAt).getTime();
  const [left, setLeft] = useState(() =>
    Math.max(0, end - (Date.now() + offset)),
  );
  // The bar's full width: what was left when the screen opened (at least 10 min).
  const [full] = useState(() =>
    Math.max(end - (Date.now() + offset), 10 * 60_000),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, end - (Date.now() + offset));
      setLeft(remaining);
      if (remaining === 0) {
        clearInterval(timer);
        onEnd?.();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [end, offset, onEnd]);

  const total = Math.ceil(left / 1000);
  const low = total <= LOW_TIME_SECONDS;
  const told = useRef(false);
  useEffect(() => {
    if (low && total > 0 && !told.current) {
      told.current = true;
      onLow?.();
    }
  }, [low, total, onLow]);
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, "0");
  const share = Math.max(0, Math.min(1, left / full));
  return (
    <View style={{ gap: 8 }}>
      <Body
        weight="bold"
        size={44}
        numeric
        accessibilityRole="timer"
        accessibilityLabel={`${minutes} minutes ${seconds} seconds left`}
        style={[{ letterSpacing: 1, lineHeight: 50 }, color ? { color } : null]}
      >
        {minutes}:{seconds}
      </Body>
      <View
        style={[styles.track, { backgroundColor: "rgba(255,255,255,0.18)" }]}
        accessible={false}
      >
        <View
          style={[
            styles.fill,
            {
              width: `${share * 100}%`,
              backgroundColor: low ? "#F6B48F" : colors.accent,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: radius.pill, overflow: "hidden" },
  fill: { height: 6, borderRadius: radius.pill },
});
