import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getAvailability,
  saveAvailability,
  setPublication,
  type AvailabilityInput,
  type PitchSchedule,
  type PolicySummary,
} from "@/api/generated";
import { useAuth } from "@/auth/auth-context";
import { Chip } from "@/components/chips";
import {
  Body,
  Button,
  Card,
  Field,
  Heading,
  Notice,
  Press,
  Skeleton,
} from "@/components/ui";
import { formatDuration, formatLocalTime } from "@/lib/format";
import { nairaInput, toKobo } from "@/lib/money";
import {
  copyHours,
  hoursProblem,
  stepMinute,
  WEEK_ORDER,
  WEEKDAY_SET,
  WEEKDAYS,
  type HoursRow,
} from "@/lib/setup-rules";
import { radius, space, TAP } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

type ErrorBody = { error?: string; fieldErrors?: Record<string, string[]> };

/** Weekly opening hours, prices, cancellation terms and publishing for one pitch. */
export default function HoursScreen() {
  const { organizationId, pitchId } = useLocalSearchParams<{
    organizationId: string;
    pitchId: string;
  }>();
  const auth = useAuth();
  const userId = auth.status === "signedIn" ? auth.me.user.id : null;
  const colors = useColors();
  const availability = useQuery({
    queryKey: ["availability", userId, organizationId, pitchId],
    queryFn: async () => {
      const response = await getAvailability(organizationId, pitchId);
      if (response.status !== 200)
        throw new Error("We could not load this pitch's hours.");
      return response.data;
    },
  });

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <Stack.Screen
        options={{ title: availability.data?.pitch.name ?? "Hours and prices" }}
      />
      {availability.isPending ? (
        <View style={{ padding: space.lg }}>
          <Skeleton height={80} count={4} />
        </View>
      ) : availability.isError ? (
        <View style={{ padding: space.lg }}>
          <Notice
            tone="danger"
            title={availability.error.message}
            action={
              <Button
                variant="outline"
                label="Try again"
                onPress={() => void availability.refetch()}
              />
            }
          />
        </View>
      ) : (
        <Editor
          key={availability.dataUpdatedAt}
          organizationId={organizationId}
          pitchId={pitchId}
          pitch={availability.data.pitch}
          initial={availability.data.availability}
          policies={availability.data.policies}
        />
      )}
    </SafeAreaView>
  );
}

function Editor({
  organizationId,
  pitchId,
  pitch,
  initial,
  policies,
}: {
  organizationId: string;
  pitchId: string;
  pitch: PitchSchedule;
  initial: AvailabilityInput;
  policies: PolicySummary[];
}) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const [hours, setHours] = useState<HoursRow[]>(initial.hours);
  const [prices, setPrices] = useState(
    initial.prices.map((row) => ({
      durationMinutes: row.durationMinutes,
      enabled: row.enabled,
      text: nairaInput(row.amountMinor),
    })),
  );
  const [policyId, setPolicyId] = useState(initial.cancellationPolicyId);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    tone: "success" | "danger";
    text: string;
  } | null>(null);
  const [priceErrors, setPriceErrors] = useState<Record<number, string>>({});
  const [status, setStatus] = useState(pitch.public_status);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const change = () => {
    setDirty(true);
    setMessage(null);
  };
  const setRow = (weekday: number, patch: Partial<HoursRow>) => {
    setHours((rows) =>
      rows.map((row) => (row.weekday === weekday ? { ...row, ...patch } : row)),
    );
    change();
  };

  function copy(targets: readonly number[], label: string) {
    const result = copyHours(hours, targets);
    if (result.from === null) {
      setMessage({ tone: "danger", text: "Open at least one day first." });
      return;
    }
    setHours(result.hours);
    setDirty(true);
    setMessage({
      tone: "success",
      text: `Copied ${WEEKDAYS[result.from]}'s hours to ${label}. Save to keep them.`,
    });
  }

  async function save() {
    const problem = hoursProblem(hours);
    const errors: Record<number, string> = {};
    const amounts = prices.map((row) => {
      const kobo = toKobo(row.text);
      if (row.enabled && (kobo === null || kobo < 1))
        errors[row.durationMinutes] = "Enter the price in naira, e.g. 25,000";
      return kobo ?? 0;
    });
    setPriceErrors(errors);
    if (problem) {
      setMessage({ tone: "danger", text: problem });
      return;
    }
    if (Object.keys(errors).length) {
      setMessage({ tone: "danger", text: "Check the highlighted prices." });
      return;
    }
    if (!prices.some((row) => row.enabled)) {
      setMessage({ tone: "danger", text: "Offer at least one length." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      // A full replacement: saving the same hours twice changes nothing.
      const response = await saveAvailability(organizationId, pitchId, {
        hours,
        prices: prices.map((row, index) => ({
          durationMinutes: row.durationMinutes as 60 | 90 | 120,
          enabled: row.enabled,
          // Lengths that are switched off keep a placeholder the API accepts.
          amountMinor: amounts[index] || initial.prices[index].amountMinor || 1,
        })),
        bands: initial.bands,
        cancellationPolicyId: policyId,
      });
      if (response.status !== 200) {
        setMessage({
          tone: "danger",
          text:
            (response.data as ErrorBody).error ??
            "We could not save the hours. Try again.",
        });
        return;
      }
      setDirty(false);
      setMessage({
        tone: "success",
        text: "Hours and prices saved. Existing bookings keep the price they were made at.",
      });
      void queryClient.invalidateQueries({ queryKey: ["facilities"] });
      void queryClient.invalidateQueries({ queryKey: ["calendar"] });
    } catch {
      setMessage({
        tone: "danger",
        text: "We could not reach PitchPadi. Check your connection and try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function togglePublication() {
    const next = status === "published" ? "private" : "published";
    setPublishing(true);
    setPublishError(null);
    try {
      const response = await setPublication(organizationId, pitchId, {
        publicStatus: next,
      });
      if (response.status !== 200) {
        setPublishError(
          (response.data as ErrorBody).error ??
            "We could not change this. Try again.",
        );
        return;
      }
      setStatus(next);
      void queryClient.invalidateQueries({ queryKey: ["facilities"] });
    } catch {
      setPublishError("We could not reach PitchPadi. Check your connection.");
    } finally {
      setPublishing(false);
    }
  }

  const approved = pitch.organization_status === "approved";
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: space.xs }}>
          <Heading>Hours and prices</Heading>
          <Body tone="muted">
            {pitch.facility_name}, {pitch.name}. All times are Lagos time.
          </Body>
        </View>

        <Heading level={2}>Opening hours</Heading>
        <View style={styles.wrap}>
          <Body weight="semibold" style={{ alignSelf: "center" }}>
            Copy the first open day to:
          </Body>
          <Chip
            label="Weekdays"
            selected={false}
            onPress={() => copy(WEEKDAY_SET, "the weekdays")}
          />
          <Chip
            label="Every day"
            selected={false}
            onPress={() => copy([0, 1, 2, 3, 4, 5, 6], "every day")}
          />
        </View>
        {WEEK_ORDER.map((weekday) => {
          const row = hours.find((item) => item.weekday === weekday)!;
          return (
            <Card key={weekday}>
              <View style={styles.dayTop}>
                <Body weight="bold" size={17} style={{ flex: 1 }}>
                  {WEEKDAYS[weekday]}
                </Body>
                <Press
                  accessibilityRole="switch"
                  accessibilityState={{ checked: row.enabled }}
                  aria-checked={row.enabled}
                  accessibilityLabel={`${WEEKDAYS[weekday]} open`}
                  onPress={() => setRow(weekday, { enabled: !row.enabled })}
                  style={[
                    styles.toggle,
                    {
                      backgroundColor: row.enabled
                        ? colors.primary
                        : colors.muted,
                    },
                  ]}
                >
                  <Body
                    weight="semibold"
                    tone={row.enabled ? "onPrimary" : "muted"}
                  >
                    {row.enabled ? "Open" : "Closed"}
                  </Body>
                </Press>
              </View>
              {row.enabled && (
                <View style={styles.times}>
                  <TimeStepper
                    label="Opens"
                    day={WEEKDAYS[weekday]}
                    minute={row.startMinute}
                    onChange={(startMinute) => setRow(weekday, { startMinute })}
                    max={1410}
                  />
                  <TimeStepper
                    label="Closes"
                    day={WEEKDAYS[weekday]}
                    minute={row.endMinute}
                    onChange={(endMinute) => setRow(weekday, { endMinute })}
                    min={30}
                  />
                </View>
              )}
            </Card>
          );
        })}

        <Heading level={2}>Prices</Heading>
        <Body tone="muted">
          What a player pays for each length. Changing a price never changes
          bookings already made.
        </Body>
        {prices.map((row, index) => (
          <Card key={row.durationMinutes}>
            <View style={styles.dayTop}>
              <Body weight="bold" size={17} style={{ flex: 1 }}>
                {formatDuration(row.durationMinutes)}
              </Body>
              <Press
                accessibilityRole="switch"
                accessibilityState={{ checked: row.enabled }}
                aria-checked={row.enabled}
                accessibilityLabel={`Offer ${formatDuration(row.durationMinutes)}`}
                onPress={() => {
                  setPrices((list) =>
                    list.map((item, i) =>
                      i === index ? { ...item, enabled: !item.enabled } : item,
                    ),
                  );
                  change();
                }}
                style={[
                  styles.toggle,
                  {
                    backgroundColor: row.enabled
                      ? colors.primary
                      : colors.muted,
                  },
                ]}
              >
                <Body
                  weight="semibold"
                  tone={row.enabled ? "onPrimary" : "muted"}
                >
                  {row.enabled ? "Offered" : "Not offered"}
                </Body>
              </Press>
            </View>
            {row.enabled && (
              <Field
                label="Price (₦)"
                value={row.text}
                onChangeText={(text) => {
                  setPrices((list) =>
                    list.map((item, i) =>
                      i === index ? { ...item, text } : item,
                    ),
                  );
                  setPriceErrors((e) => ({ ...e, [row.durationMinutes]: "" }));
                  change();
                }}
                keyboardType="decimal-pad"
                error={priceErrors[row.durationMinutes] || null}
              />
            )}
          </Card>
        ))}
        {initial.bands.length > 0 && (
          <Notice
            title={`${initial.bands.length} special ${initial.bands.length === 1 ? "price" : "prices"} for certain hours`}
          >
            <Body tone="muted">
              Set on the website (for example peak evenings). Saving here keeps
              them exactly as they are.
            </Body>
          </Notice>
        )}

        <Heading level={2}>If plans change</Heading>
        <Body tone="muted">Players see these terms before they pay.</Body>
        {policies.map((policy) => {
          const selected = policy.id === policyId;
          return (
            <Press
              key={policy.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              aria-checked={selected}
              onPress={() => {
                setPolicyId(policy.id);
                change();
              }}
              style={[
                styles.policy,
                {
                  backgroundColor: colors.card,
                  borderColor: selected ? colors.primary : colors.border,
                  borderWidth: selected ? 2 : 1,
                },
              ]}
            >
              <Ionicons
                name={selected ? "radio-button-on" : "radio-button-off"}
                size={22}
                color={selected ? colors.link : colors.textMuted}
              />
              <View style={{ flex: 1 }}>
                <Body weight="semibold">{policy.label}</Body>
                <Body tone="muted" size={14}>
                  {policy.summary}
                </Body>
              </View>
            </Press>
          );
        })}

        <Card>
          <Heading level={3}>
            {status === "published"
              ? "Your pitch is live"
              : approved
                ? "Ready for players?"
                : "Publishing opens after review"}
          </Heading>
          <Body tone="muted">
            {status === "published"
              ? "Open times are visible to players. You can make the pitch private again."
              : approved
                ? "Save your hours and prices, then publish so players can find and book this pitch."
                : pitch.organization_status === "rejected"
                  ? "PitchPadi asked for changes to your venue. See the note on your venue page."
                  : "PitchPadi is checking your venue, usually within one working day. Save your hours and prices now so you can publish straight after."}
          </Body>
          {approved && (
            <Button
              variant={status === "published" ? "outline" : "primary"}
              label={
                status === "published"
                  ? "Make private"
                  : dirty
                    ? "Save your changes first"
                    : "Publish"
              }
              onPress={togglePublication}
              busy={publishing}
              disabled={status !== "published" && dirty}
            />
          )}
          {publishError ? <Body tone="danger">{publishError}</Body> : null}
        </Card>
      </ScrollView>
      <View
        style={[
          styles.bar,
          { backgroundColor: colors.card, borderTopColor: colors.border },
        ]}
      >
        {message ? (
          <Body
            tone={message.tone === "danger" ? "danger" : "default"}
            accessibilityLiveRegion="polite"
          >
            {message.text}
          </Body>
        ) : null}
        {/* Always available: saving the same hours again is harmless, and a new
            pitch's suggested hours need saving before it can publish. */}
        <Button
          label="Save hours and prices"
          onPress={() => void save()}
          busy={saving}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

/** A time in half-hour steps: big − and + buttons, easy with one thumb. */
function TimeStepper({
  label,
  day,
  minute,
  onChange,
  min = 0,
  max = 1440,
}: {
  label: string;
  day: string;
  minute: number;
  onChange: (minute: number) => void;
  min?: number;
  max?: number;
}) {
  const colors = useColors();
  const display = minute === 1440 ? "Midnight" : formatLocalTime(minute);
  const button = (by: number, icon: "remove" | "add", hint: string) => (
    <Press
      accessibilityRole="button"
      accessibilityLabel={`${hint}, ${day} ${label.toLowerCase()}`}
      onPress={() => onChange(stepMinute(minute, by, min, max))}
      style={[
        styles.step,
        {
          borderColor: colors.border,
          backgroundColor: colors.background,
        },
      ]}
    >
      <Ionicons name={icon} size={22} color={colors.text} />
    </Press>
  );
  return (
    <View style={styles.stepRow}>
      <Body tone="muted" style={{ width: 64 }}>
        {label}
      </Body>
      <View style={[styles.stepper, { flex: 1 }]}>
        {button(-30, "remove", "30 minutes earlier")}
        <Body
          weight="bold"
          size={17}
          numberOfLines={1}
          style={{ flex: 1, textAlign: "center" }}
          accessibilityLiveRegion="polite"
        >
          {display}
        </Body>
        {button(30, "add", "30 minutes later")}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl * 2, gap: space.lg },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  dayTop: { flexDirection: "row", alignItems: "center", gap: space.md },
  toggle: {
    minHeight: 40,
    minWidth: 104,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    alignItems: "center",
    justifyContent: "center",
  },
  times: { gap: space.sm, marginTop: space.xs },
  stepRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  stepper: { flexDirection: "row", alignItems: "center", gap: space.xs },
  step: {
    width: TAP - 4,
    height: TAP - 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  policy: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: TAP + 16,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  bar: { borderTopWidth: 1, padding: space.lg, gap: space.sm },
});
