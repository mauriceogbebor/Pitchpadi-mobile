import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  SlideInDown,
  useReducedMotion,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Chip } from "@/components/chips";
import { Segmented } from "@/components/segmented";
import { Body, Button, Heading } from "@/components/ui";
import { formatNaira } from "@/lib/format";
import { radius, space } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

export type SortChoice = "recommended" | "cheapest" | "soonest" | "nearest";
export type PitchType = "any" | "5-a-side" | "7-a-side";
export type Filters = {
  sort: SortChoice;
  type: PitchType;
  /** Budget for one game, in kobo; null for any price. */
  maxPrice: number | null;
};

export const NO_FILTERS: Filters = {
  sort: "recommended",
  type: "any",
  maxPrice: null,
};

export const SORT_LABEL: Record<SortChoice, string> = {
  recommended: "Best match",
  cheapest: "Cheapest",
  soonest: "Soonest",
  nearest: "Nearest",
};

/** Budget shortcuts for one game. The API applies the filter to real prices. */
const BUDGETS = [1_500_000, 2_000_000, 3_000_000, 5_000_000];

const TYPES = [
  { value: "any", label: "Any size" },
  { value: "5-a-side", label: "5-a-side" },
  { value: "7-a-side", label: "7-a-side" },
] as const;

/** How many filters differ from the defaults, for the Filters chip. */
export function activeFilters(filters: Filters): number {
  return (
    Number(filters.sort !== "recommended") +
    Number(filters.type !== "any") +
    Number(filters.maxPrice !== null)
  );
}

/**
 * Sort, pitch size and budget, in a sheet from the bottom of the screen.
 * Choices apply straight away, so the list behind is already right on "Done".
 */
export function FilterSheet({
  visible,
  filters,
  onChange,
  onClose,
}: {
  visible: boolean;
  filters: Filters;
  onChange: (filters: Filters) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const reduce = useReducedMotion();
  const insets = useSafeAreaInsets();
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  return (
    <Modal
      visible={visible}
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
          accessibilityLabel="Close filters"
        />
      </Animated.View>
      <Animated.View
        entering={reduce ? undefined : SlideInDown.duration(220)}
        accessibilityViewIsModal
        style={[
          styles.sheet,
          {
            backgroundColor: colors.card,
            paddingBottom: insets.bottom + space.lg,
          },
        ]}
      >
        <View style={[styles.grip, { backgroundColor: colors.border }]} />
        <ScrollView contentContainerStyle={styles.body}>
          <Heading level={2}>Filters</Heading>

          <View style={styles.group}>
            <Body weight="semibold">Sort by</Body>
            <View style={styles.wrap}>
              {(Object.keys(SORT_LABEL) as SortChoice[]).map((sort) => (
                <Chip
                  key={sort}
                  label={SORT_LABEL[sort]}
                  icon={sort === "nearest" ? "navigate-outline" : undefined}
                  selected={filters.sort === sort}
                  onPress={() => set({ sort })}
                />
              ))}
            </View>
            {filters.sort === "nearest" ? (
              <Body tone="muted" size={14}>
                Uses your location, rounded to about 1 km. Venues without a map
                pin come last.
              </Body>
            ) : null}
          </View>

          <View style={styles.group}>
            <Body weight="semibold">Pitch size</Body>
            <Segmented
              label="Pitch size"
              options={TYPES}
              value={filters.type}
              onChange={(type) => set({ type })}
            />
          </View>

          <View style={styles.group}>
            <Body weight="semibold">Budget for one game</Body>
            <View style={styles.wrap}>
              <Chip
                label="Any price"
                selected={filters.maxPrice === null}
                onPress={() => set({ maxPrice: null })}
              />
              {BUDGETS.map((amount) => (
                <Chip
                  key={amount}
                  label={`Up to ${formatNaira(amount)}`}
                  selected={filters.maxPrice === amount}
                  onPress={() => set({ maxPrice: amount })}
                />
              ))}
            </View>
          </View>

          <View style={styles.actions}>
            <Button label="Show pitches" onPress={onClose} />
            {activeFilters(filters) > 0 ? (
              <Button
                variant="ghost"
                label="Clear filters"
                onPress={() => onChange(NO_FILTERS)}
              />
            ) : null}
          </View>
        </ScrollView>
      </Animated.View>
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
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "88%",
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  grip: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: space.sm,
  },
  body: { padding: space.lg, gap: space.xl },
  group: { gap: space.md },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  actions: { gap: space.sm },
});
