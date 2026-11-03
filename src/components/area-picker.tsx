import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  SlideInDown,
  useReducedMotion,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Body,
  Button,
  Field,
  Heading,
  Notice,
  Press,
  Skeleton,
} from "@/components/ui";
import { matchingAreas } from "@/lib/discovery";
import { radius, space, TAP } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

export function AreaPicker({
  areas,
  value,
  onChange,
  onClose,
  loading,
  error,
  onRetry,
}: {
  areas: { name: string; slug: string }[];
  value: string | null;
  onChange: (value: string | null) => void;
  onClose: () => void;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const colors = useColors();
  const reduce = useReducedMotion();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const matches = matchingAreas(areas, query);
  const choose = (slug: string | null) => {
    onChange(slug);
    onClose();
  };
  const row = (slug: string | null, name: string) => (
    <Press
      key={slug ?? "all"}
      accessibilityRole="radio"
      accessibilityState={{ checked: value === slug }}
      aria-checked={value === slug}
      accessibilityLabel={name}
      onPress={() => choose(slug)}
      style={[styles.row, { borderBottomColor: colors.border }]}
    >
      <Body weight={value === slug ? "semibold" : "body"} style={{ flex: 1 }}>
        {name}
      </Body>
      {value === slug && (
        <Ionicons name="checkmark-circle" size={22} color={colors.link} />
      )}
    </Press>
  );
  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        entering={reduce ? undefined : FadeIn.duration(150)}
        style={styles.scrim}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close area chooser"
        />
      </Animated.View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.position}
        pointerEvents="box-none"
      >
        <Animated.View
          entering={reduce ? undefined : SlideInDown.duration(220)}
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              paddingBottom: insets.bottom + space.md,
            },
          ]}
        >
          <View style={styles.top}>
            <Heading level={2} style={{ flex: 1 }}>
              Where do you play?
            </Heading>
            <Button variant="ghost" label="Close" onPress={onClose} />
          </View>
          <View style={{ paddingHorizontal: space.lg }}>
            <Field
              label="Search areas"
              placeholder="Try Lekki or Surulere"
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              autoCapitalize="words"
              returnKeyType="search"
            />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            accessibilityRole="radiogroup"
            accessibilityLabel="Area"
          >
            {row(null, "All of Lagos")}
            {loading ? (
              <Skeleton height={48} count={3} />
            ) : error ? (
              <Notice
                title="We could not load areas"
                action={
                  <Button
                    variant="outline"
                    label="Try again"
                    onPress={onRetry}
                  />
                }
              />
            ) : matches.length ? (
              matches.map((area) => row(area.slug, area.name))
            ) : (
              <Body tone="muted" style={{ paddingVertical: space.lg }}>
                No areas match “{query}”. Try another name or choose All of
                Lagos.
              </Body>
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  position: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    maxHeight: "85%",
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    gap: space.md,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
  },
  list: { paddingHorizontal: space.lg, paddingBottom: space.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: TAP + 8,
    borderBottomWidth: 1,
    paddingVertical: space.md,
  },
});
