import { forwardRef, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputInstance,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fonts, radius, space, TAP } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

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

type Tone = "default" | "muted" | "danger" | "link" | "onPrimary";

export function Body({
  tone = "default",
  weight = "body",
  size = 16,
  style,
  ...props
}: TextProps & {
  tone?: Tone;
  weight?: "body" | "medium" | "semibold" | "bold";
  size?: number;
}) {
  const colors = useColors();
  const color = {
    default: colors.text,
    muted: colors.textMuted,
    danger: colors.danger,
    link: colors.link,
    onPrimary: colors.onPrimary,
  }[tone];
  return (
    <Text
      {...props}
      style={[
        {
          color,
          fontFamily: fonts[weight],
          fontSize: size,
          lineHeight: size * 1.45,
        },
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
  const size = { 1: 34, 2: 24, 3: 19 }[level];
  return (
    <Text
      accessibilityRole="header"
      {...props}
      style={[
        {
          color: colors.text,
          fontFamily: level === 1 ? fonts.displayHeavy : fonts.display,
          fontSize: size,
          lineHeight: size * 1.12,
          letterSpacing: level === 1 ? -0.8 : -0.3,
        },
        style,
      ]}
    />
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
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "ghost" | "danger";
  disabled?: boolean;
  busy?: boolean;
  style?: ViewStyle;
  /** For buttons on a coloured surface, such as the booked card. */
  textColor?: string;
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
  }[variant];
  const inactive = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!busy }}
      accessibilityHint={accessibilityHint}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: inactive ? 0.55 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {busy && (
        <ActivityIndicator
          color={textColor ?? palette.fg}
          style={{ marginRight: space.sm }}
        />
      )}
      <Text
        style={{
          color: textColor ?? palette.fg,
          fontFamily: fonts.semibold,
          fontSize: 16,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export const Field = forwardRef<
  TextInputInstance,
  TextInputProps & { label: string; error?: string | null; hint?: string }
>(function Field({ label, error, hint, style, ...props }, ref) {
  const colors = useColors();
  return (
    <View style={{ gap: space.sm }}>
      <Body weight="semibold">{label}</Body>
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        {...props}
        style={[
          styles.input,
          {
            backgroundColor: colors.card,
            borderColor: error ? colors.danger : colors.border,
            color: colors.text,
          },
          style,
        ]}
      />
      {hint && !error ? <Body tone="muted">{hint}</Body> : null}
      {error ? (
        <Body tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Body>
      ) : null}
    </View>
  );
});

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** A friendly message box for errors and empty states, with an optional action. */
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
  return (
    <View
      style={[styles.notice, { backgroundColor: bg }]}
      accessibilityRole="summary"
    >
      <Body weight="semibold" tone={tone === "danger" ? "danger" : "default"}>
        {title}
      </Body>
      {children}
      {action}
    </View>
  );
}

/** Grey placeholder blocks shaped like the content, instead of a spinner. */
export function Skeleton({
  height = 96,
  count = 3,
}: {
  height?: number;
  count?: number;
}) {
  const colors = useColors();
  return (
    <View
      style={{ gap: space.md }}
      accessibilityLabel="Loading"
      accessibilityRole="progressbar"
    >
      {Array.from({ length: count }, (_, index) => (
        <View
          key={index}
          style={{
            height,
            borderRadius: radius.lg,
            backgroundColor: colors.muted,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    padding: space.lg,
    paddingBottom: space.xxl * 2,
    gap: space.lg,
  },
  button: {
    minHeight: TAP,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space.xl,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  input: {
    minHeight: TAP,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    fontFamily: fonts.body,
    fontSize: 17,
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
  },
  notice: { borderRadius: radius.lg, padding: space.lg, gap: space.sm },
});
