import Ionicons from "@expo/vector-icons/Ionicons";
import { forwardRef, useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputInstance,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { fonts, motion, radius, space, TAP, type } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * A Pressable that gives way under the thumb: scales to 0.97 on the UI thread,
 * so it stays smooth on budget phones. No scale when the phone asks for less
 * motion; the pressed tint still shows.
 */
export function Press({
  style,
  children,
  scaleTo = 0.97,
  disabled,
  ...props
}: Omit<PressableProps, "style" | "children"> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  scaleTo?: number;
}) {
  const reduce = useReducedMotion();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={(event) => {
        if (!reduce) scale.set(withTiming(scaleTo, { duration: motion.press }));
        props.onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.set(withTiming(1, { duration: motion.quick }));
        props.onPressOut?.(event);
      }}
      style={[style, animated]}
    >
      {children}
    </AnimatedPressable>
  );
}

/** A scrollable page with safe-area padding and the page background. */
export function Screen({
  children,
  scroll = true,
  edges = ["top"],
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: ("top" | "bottom")[];
}) {
  const colors = useColors();
  const inner = scroll ? (
    <ScrollView
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.screenContent, { flex: 1 }]}>{children}</View>
  );
  return (
    <SafeAreaView
      edges={edges}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      {inner}
    </SafeAreaView>
  );
}

type Tone =
  | "default"
  | "muted"
  | "danger"
  | "link"
  | "onPrimary"
  | "success"
  | "onBand"
  | "onBandMuted";

export function Body({
  tone = "default",
  weight = "body",
  size = type.body.size,
  numeric = false,
  style,
  ...props
}: TextProps & {
  tone?: Tone;
  weight?: "body" | "medium" | "semibold" | "bold";
  size?: number;
  /** Scoreboard figures: times, prices and references line up. */
  numeric?: boolean;
}) {
  const colors = useColors();
  const color = {
    default: colors.text,
    muted: colors.textMuted,
    danger: colors.danger,
    link: colors.link,
    onPrimary: colors.onPrimary,
    success: colors.success,
    onBand: colors.onBand,
    onBandMuted: colors.onBandMuted,
  }[tone];
  return (
    <Text
      {...props}
      style={[
        {
          color,
          fontFamily: fonts[weight],
          fontSize: size,
          lineHeight: Math.round(size * 1.42),
        },
        numeric ? { fontVariant: ["tabular-nums"] } : null,
        style,
      ]}
    />
  );
}

export function Heading({
  level = 1,
  style,
  ...props
}: TextProps & { level?: 1 | 2 | 3 }) {
  const colors = useColors();
  const t = { 1: type.title, 2: type.h2, 3: type.h3 }[level];
  return (
    <Text
      accessibilityRole="header"
      {...props}
      style={[
        {
          color: colors.text,
          fontFamily: level === 1 ? fonts.displayHeavy : fonts.display,
          fontSize: t.size,
          lineHeight: t.line,
          letterSpacing: t.tracking,
        },
        style,
      ]}
    />
  );
}

/** A heading for a group on a screen, with an optional action on the right. */
export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <View style={{ gap: space.md }}>
      <View style={styles.sectionTop}>
        <Heading level={3} style={{ flex: 1 }}>
          {title}
        </Heading>
        {action}
      </View>
      {children}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  busy,
  style,
  textColor,
  icon,
  accessibilityLabel,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  /** "onBand": a light button for the pitch band and other dark surfaces. */
  variant?: "primary" | "outline" | "ghost" | "danger" | "onBand";
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
  /** For buttons on a coloured surface, such as the booked card. */
  textColor?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** When the visible label is not enough on its own (several "Approve" buttons). */
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const colors = useColors();
  const palette = {
    primary: {
      bg: colors.primary,
      fg: colors.onPrimary,
      border: colors.primary,
    },
    outline: { bg: colors.card, fg: colors.text, border: colors.border },
    ghost: { bg: "transparent", fg: colors.link, border: "transparent" },
    danger: { bg: colors.danger, fg: "#FFFFFF", border: colors.danger },
    onBand: {
      bg: colors.accent,
      fg: colors.onAccent,
      border: colors.accent,
    },
  }[variant];
  const inactive = disabled || busy;
  const fg = textColor ?? palette.fg;
  return (
    <Press
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!busy }}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      disabled={inactive}
      onPress={onPress}
      style={[
        styles.button,
        variant === "ghost" ? styles.ghost : null,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: inactive && !busy ? 0.5 : 1,
        },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={fg} style={{ marginRight: space.sm }} />
      ) : icon ? (
        <Ionicons
          name={icon}
          size={20}
          color={fg}
          style={{ marginRight: space.sm }}
        />
      ) : null}
      <Text
        style={{
          color: fg,
          fontFamily: fonts.semibold,
          fontSize: 16,
          lineHeight: 20,
        }}
      >
        {label}
      </Text>
    </Press>
  );
}

export const Field = forwardRef<
  TextInputInstance,
  TextInputProps & { label: string; error?: string | null; hint?: string }
>(function Field({ label, error, hint, style, ...props }, ref) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: space.sm }}>
      <Body weight="semibold">{label}</Body>
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        {...props}
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        style={[
          styles.input,
          {
            backgroundColor: colors.card,
            borderColor: error
              ? colors.danger
              : focused
                ? colors.borderStrong
                : colors.border,
            borderWidth: focused || error ? 2 : 1,
            paddingHorizontal: focused || error ? space.md - 1 : space.md,
            color: colors.text,
          },
          style,
        ]}
      />
      {hint && !error ? (
        <Body tone="muted" size={type.meta.size}>
          {hint}
        </Body>
      ) : null}
      {error ? (
        <View style={styles.errorRow} accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle" size={16} color={colors.danger} />
          <Body tone="danger" size={type.meta.size} style={{ flex: 1 }}>
            {error}
          </Body>
        </View>
      ) : null}
    </View>
  );
});

export function Card({
  children,
  style,
  variant = "outline",
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** "flat": a quiet fill with no outline. */
  variant?: "outline" | "flat";
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.card,
        variant === "flat"
          ? { backgroundColor: colors.muted, borderColor: colors.muted }
          : { backgroundColor: colors.card, borderColor: colors.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const NOTICE_ICON = {
  muted: "information-circle",
  danger: "alert-circle",
  success: "checkmark-circle",
} as const;

/** A message box for errors, empty states and successes, with an optional action. */
export function Notice({
  tone = "muted",
  title,
  children,
  action,
}: {
  tone?: "muted" | "danger" | "success";
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const colors = useColors();
  const bg = {
    muted: colors.muted,
    danger: colors.dangerSoft,
    success: colors.successSoft,
  }[tone];
  const fg = {
    muted: colors.textMuted,
    danger: colors.danger,
    success: colors.success,
  }[tone];
  return (
    <View
      style={[styles.notice, { backgroundColor: bg }]}
      accessibilityRole="summary"
    >
      <View style={styles.noticeTop}>
        <Ionicons name={NOTICE_ICON[tone]} size={22} color={fg} />
        <Body
          weight="semibold"
          tone={tone === "danger" ? "danger" : "default"}
          style={{ flex: 1 }}
        >
          {title}
        </Body>
      </View>
      {children ? <View style={styles.noticeBody}>{children}</View> : null}
      {action}
    </View>
  );
}

/**
 * Placeholder blocks shaped like the content, instead of a spinner. A slow,
 * gentle pulse shows something is happening; still when motion is reduced.
 */
export function Skeleton({
  height = 96,
  count = 3,
}: {
  height?: number;
  count?: number;
}) {
  const colors = useColors();
  const reduce = useReducedMotion();
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (!reduce)
      pulse.set(
        withRepeat(
          withTiming(0.55, {
            duration: 800,
            easing: Easing.inOut(Easing.quad),
          }),
          -1,
          true,
        ),
      );
  }, [pulse, reduce]);
  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return (
    <View
      style={{ gap: space.md }}
      accessibilityLabel="Loading"
      accessibilityRole="progressbar"
    >
      {Array.from({ length: count }, (_, index) => (
        <Animated.View
          key={index}
          style={[
            {
              height,
              borderRadius: radius.lg,
              backgroundColor: colors.muted,
            },
            animated,
          ]}
        />
      ))}
    </View>
  );
}

/** A hairline between rows. */
export function Divider() {
  const colors = useColors();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.border,
      }}
    />
  );
}

const styles = StyleSheet.create({
  screenContent: {
    padding: space.lg,
    paddingBottom: space.xxl * 2,
    gap: space.xl,
  },
  sectionTop: { flexDirection: "row", alignItems: "center", gap: space.md },
  button: {
    minHeight: TAP + 4,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space.xl,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  ghost: { minHeight: TAP, paddingHorizontal: space.md },
  input: {
    minHeight: TAP + 4,
    borderRadius: radius.md,
    fontFamily: fonts.body,
    fontSize: 17,
  },
  errorRow: { flexDirection: "row", alignItems: "flex-start", gap: space.xs },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
  },
  notice: { borderRadius: radius.lg, padding: space.lg, gap: space.md },
  noticeTop: { flexDirection: "row", alignItems: "center", gap: space.sm },
  noticeBody: { gap: space.xs, paddingLeft: 30 },
});
