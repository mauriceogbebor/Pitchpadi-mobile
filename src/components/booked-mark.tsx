import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { Platform, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { palette } from "@/theme/tokens";

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

// Lengths of each chalk line, so each can be drawn from 0 to full.
const OUTLINE = 2 * (60 + 92);
const HALFWAY = 60;
const CIRCLE = Math.round(2 * Math.PI * 13);
const BOXES = 2 * (28 + 12 + 12);

/**
 * The booking moment: a small pitch whose chalk lines draw themselves, then a
 * volt check lands on the centre spot (with a light success buzz on phones).
 * About 0.9 s, once. With reduced motion it appears complete at once.
 */
export function BookedMark({ celebrate }: { celebrate: boolean }) {
  const reduce = useReducedMotion();
  const animate = celebrate && !reduce;
  const draw = useSharedValue(animate ? 0 : 1);
  const land = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (!animate) return;
    draw.set(
      withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) }),
    );
    land.set(withDelay(560, withSpring(1, { damping: 11, stiffness: 180 })));
    if (Platform.OS !== "web") {
      const timer = setTimeout(
        () =>
          void Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          ).catch(() => undefined),
        600,
      );
      return () => clearTimeout(timer);
    }
  }, [animate, draw, land]);

  const outline = useAnimatedProps(() => ({
    strokeDashoffset: OUTLINE * (1 - draw.value),
  }));
  const halfway = useAnimatedProps(() => ({
    strokeDashoffset: HALFWAY * (1 - Math.min(1, draw.value * 1.4)),
  }));
  const circle = useAnimatedProps(() => ({
    strokeDashoffset:
      CIRCLE * (1 - Math.min(1, Math.max(0, draw.value * 1.6 - 0.4))),
  }));
  const boxes = useAnimatedProps(() => ({
    strokeDashoffset: BOXES * (1 - Math.max(0, draw.value * 2 - 1)),
  }));
  const check = useAnimatedStyle(() => ({
    opacity: Math.min(1, land.value * 1.5),
    transform: [{ scale: 0.4 + 0.6 * land.value }],
  }));

  const stroke = { stroke: palette.volt, strokeWidth: 2.5, fill: "none" };
  return (
    <View
      style={{ width: 64, height: 96 }}
      accessible
      accessibilityLabel="Booked"
    >
      <Svg width={64} height={96} viewBox="0 0 64 96">
        <AnimatedRect
          x={2}
          y={2}
          width={60}
          height={92}
          rx={6}
          {...stroke}
          strokeDasharray={OUTLINE}
          animatedProps={outline}
        />
        <AnimatedLine
          x1={2}
          y1={48}
          x2={62}
          y2={48}
          {...stroke}
          strokeDasharray={HALFWAY}
          animatedProps={halfway}
        />
        <AnimatedCircle
          cx={32}
          cy={48}
          r={13}
          {...stroke}
          strokeDasharray={CIRCLE}
          animatedProps={circle}
        />
        <AnimatedPath
          d="M18 2v12h28V2M18 94V82h28v12"
          {...stroke}
          strokeDasharray={BOXES}
          animatedProps={boxes}
        />
      </Svg>
      <Animated.View
        style={[
          {
            position: "absolute",
            left: 21,
            top: 37,
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: palette.volt,
            alignItems: "center",
            justifyContent: "center",
          },
          check,
        ]}
      >
        <Svg width={14} height={14} viewBox="0 0 14 14">
          <Path
            d="M2.5 7.5l3 3 6-7"
            stroke={palette.night}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}
