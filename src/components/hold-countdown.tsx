import { useEffect, useState } from "react";
import { Body } from "@/components/ui";

/**
 * Minutes and seconds left on a hold. Uses the server's clock (serverNow) so a
 * phone with the wrong time still counts down correctly.
 */
export function HoldCountdown({
  expiresAt,
  serverNow,
  onEnd,
  color,
}: {
  expiresAt: string;
  serverNow: string;
  onEnd?: () => void;
  /** Text colour, for the countdown on the pitch-green panel. */
  color?: string;
}) {
  const [offset] = useState(() => new Date(serverNow).getTime() - Date.now());
  const end = new Date(expiresAt).getTime();
  const [left, setLeft] = useState(() =>
    Math.max(0, end - (Date.now() + offset)),
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
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return (
    <Body
      weight="bold"
      size={40}
      accessibilityRole="timer"
      accessibilityLabel={`${minutes} minutes ${seconds} seconds left`}
      style={[
        { fontVariant: ["tabular-nums"], letterSpacing: 1 },
        color ? { color } : null,
      ]}
    >
      {minutes}:{seconds}
    </Body>
  );
}
