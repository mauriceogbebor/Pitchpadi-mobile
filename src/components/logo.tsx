import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { palette } from "@/theme/tokens";
import { WORDMARK } from "./wordmark-paths";

/*
 * The PitchPadi logo (SV-05): the wordmark, "PitchPadi" with a volt ball for
 * each i's dot, and the mark, a P drawn by the halfway line and half the
 * centre circle with the ball on the centre spot. Both are drawn as vectors,
 * so they stay sharp at any size without an image download. Masters and rules
 * are in pitchpadi-fe/docs/brand.
 */

type Tone = "onDark" | "onLight";

/** The mark alone: the P with the ball on its centre spot. */
export function LogoMark({
  height = 32,
  tone = "onDark",
}: {
  height?: number;
  tone?: Tone;
}) {
  const line = tone === "onDark" ? palette.chalk : palette.pitch;
  return (
    <Svg
      width={(height * 242) / 384}
      height={height}
      viewBox="110 96 242 384"
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path
        d="M192 448 V128 A128 128 0 0 1 192 384"
        fill="none"
        stroke={line}
        strokeWidth={64}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Circle cx={192} cy={256} r={50} fill={palette.volt} />
    </Svg>
  );
}

/**
 * The wordmark. On light surfaces each ball gets a thin pitch-green ring, so
 * it still reads at small sizes.
 */
export function Wordmark({
  height = 32,
  tone = "onDark",
  label = "PitchPadi",
}: {
  height?: number;
  tone?: Tone;
  /** Read by screen readers; the drawing itself is hidden from them. */
  label?: string;
}) {
  const letters = tone === "onDark" ? palette.chalk : palette.pitch;
  const ring = tone === "onLight";
  // The heading role sits on a wrapper: on the web, an Svg given a role renders
  // as that element instead of an <svg>, and draws nothing.
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={label}
      aria-label={label}
    >
      <Svg
        width={(height * WORDMARK.width) / WORDMARK.height}
        height={height}
        viewBox={`0 0 ${WORDMARK.width} ${WORDMARK.height}`}
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Path d={WORDMARK.letters} fill={letters} />
        {WORDMARK.dots.map((cx) => (
          <Circle
            key={cx}
            cx={cx}
            cy={WORDMARK.dotY}
            r={WORDMARK.dotR}
            fill={palette.volt}
            stroke={ring ? palette.pitch : undefined}
            strokeWidth={ring ? 22 : 0}
          />
        ))}
      </Svg>
    </View>
  );
}
