import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Line, Rect } from "react-native-svg";
import { radius, space } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

const STRIPES = 8;

/**
 * PitchPadi's signature surface: deep pitch green with faint mowing stripes and
 * thin chalk markings, used only where a moment matters (the top of Play, the
 * pitch page, the hold, the booking). A small SVG, no image to download.
 */
export function PitchBand({
  children,
  markings = "centre",
  style,
  contentStyle,
}: {
  children: ReactNode;
  /** "centre": halfway line and centre circle at the right; "box": a penalty box. */
  markings?: "centre" | "box" | "none";
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  return (
    <View style={[styles.band, { backgroundColor: colors.band }, style]}>
      <Svg
        style={StyleSheet.absoluteFill}
        width="100%"
        height="100%"
        viewBox="0 0 400 220"
        preserveAspectRatio="xMidYMid slice"
        accessible={false}
      >
        {Array.from({ length: STRIPES }, (_, i) =>
          i % 2 ? (
            <Rect
              key={i}
              x={(400 / STRIPES) * i}
              y={0}
              width={400 / STRIPES}
              height={220}
              fill={colors.bandStripe}
            />
          ) : null,
        )}
        {markings === "centre" && (
          <>
            <Line
              x1={330}
              y1={0}
              x2={330}
              y2={220}
              stroke={colors.bandLine}
              strokeWidth={2}
            />
            <Circle
              cx={330}
              cy={110}
              r={62}
              fill="none"
              stroke={colors.bandLine}
              strokeWidth={2}
            />
            <Circle cx={330} cy={110} r={4} fill={colors.bandLine} />
          </>
        )}
        {markings === "box" && (
          <>
            <Rect
              x={250}
              y={40}
              width={160}
              height={140}
              fill="none"
              stroke={colors.bandLine}
              strokeWidth={2}
            />
            <Rect
              x={340}
              y={80}
              width={70}
              height={60}
              fill="none"
              stroke={colors.bandLine}
              strokeWidth={2}
            />
            <Circle cx={300} cy={110} r={4} fill={colors.bandLine} />
          </>
        )}
      </Svg>
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  band: { borderRadius: radius.xl, overflow: "hidden" },
  content: { padding: space.xl, gap: space.sm },
});
