import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Body, Card } from "@/components/ui";
import { space } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

/** "Loading pitches for …" with a small spinner, announced to screen readers. */
export function LoadingLine({ text }: { text: string }) {
  const colors = useColors();
  return (
    <View style={styles.line} accessibilityLiveRegion="polite" accessible>
      <ActivityIndicator size="small" color={colors.link} />
      <Body tone="muted" style={{ flex: 1 }}>
        {text}
      </Body>
    </View>
  );
}

/**
 * Above results that belong to an earlier choice (review of 3 November):
 * what is loading, what is still on screen, and that booking is paused.
 */
export function StaleBanner({
  loading,
  showing,
}: {
  loading: string;
  showing: string;
}) {
  const colors = useColors();
  return (
    <View
      accessibilityLiveRegion="polite"
      accessible
      accessibilityLabel={`${loading}. ${showing}`}
      aria-live="polite"
    >
      <Card
        variant="flat"
        style={[styles.banner, { borderColor: colors.borderStrong }]}
      >
        <View style={styles.line}>
          <ActivityIndicator size="small" color={colors.link} />
          <Body weight="semibold" style={{ flex: 1 }}>
            {loading}
          </Body>
        </View>
        <Body tone="muted" size={14}>
          {showing}
        </Body>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: "row", alignItems: "center", gap: space.sm },
  banner: { gap: space.xs, borderWidth: 1 },
});
