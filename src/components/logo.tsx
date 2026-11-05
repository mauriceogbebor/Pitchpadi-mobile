import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { fonts, palette } from "@/theme/tokens";

/*
 * The PitchPadi mark (SV-04): a P drawn as a floodlight, the pole as its stem
 * and four lit lamps in its bowl. The masters and icon set are in
 * pitchpadi-fe/docs/brand; this draws the same geometry, so it stays sharp at
 * any size without an image download.
 */

const LAMPS = [
  [244, 158],
  [306, 158],
  [244, 222],
  [306, 222],
] as const;

/** The mark alone. "onDark" is chalk with volt lamps; "onLight" is pitch green. */
export function LogoMark({
  height = 32,
  tone = "onDark",
}: {
  height?: number;
  tone?: "onDark" | "onLight";
}) {
  const body = tone === "onDark" ? palette.chalk : palette.pitch;
  return (
    <Svg
      width={(height * 224) / 312}
      height={height}
      viewBox="148 100 224 312"
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Rect x={148} y={100} width={60} height={312} rx={30} fill={body} />
      <Path d="M178 100 H282 A90 90 0 0 1 282 280 H178 Z" fill={body} />
      {LAMPS.map(([cx, cy]) => (
        <Circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r={23}
          fill={palette.volt}
        />
      ))}
    </Svg>
  );
}

/** Mark and name together, for dark surfaces such as the welcome screen. */
export function Logo({ height = 30 }: { height?: number }) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="header"
      accessibilityLabel="PitchPadi"
    >
      <LogoMark height={height} />
      <Text style={[styles.name, { fontSize: height * 0.86 }]}>
        Pitch<Text style={styles.accent}>Padi</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  name: {
    color: palette.white,
    fontFamily: fonts.displayHeavy,
    letterSpacing: -0.8,
  },
  accent: { color: palette.volt },
});
