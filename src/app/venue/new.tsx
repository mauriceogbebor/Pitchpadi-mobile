import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  createManualBooking,
  quoteManualBooking,
  type ManualQuote,
} from "@/api/generated";
import { useAuth } from "@/auth/auth-context";
import { Chip, ChipRow, TimeChip } from "@/components/chips";
import {
  Body,
  Button,
  Field,
  Heading,
  Notice,
  Skeleton,
} from "@/components/ui";
import {
  dateParts,
  formatDuration,
  formatInstantTime,
  formatLocalTime,
  formatNaira,
  lagosMinute,
  lagosToday,
  nextDates,
} from "@/lib/format";
import { newIdempotencyKey } from "@/lib/ids";
import { nairaInput, toKobo } from "@/lib/money";
import {
  lagosInstant,
  REPEAT_CHOICES,
  repeatSummary,
  weeklyDates,
  type WeekResult,
} from "@/lib/repeat";
import {
  CHANNELS,
  useVenueCalendar,
  venueCalendarKey,
  type Channel,
} from "@/lib/venue";
import { radius, space } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";
import { needsVenue } from "@/components/needs-venue";

type ErrorBody = { error?: string; fieldErrors?: Record<string, string[]> };
type Payment = "unpaid" | "cash" | "pos" | "bank_transfer";

const PAYMENTS: { value: Payment; label: string }[] = [
  { value: "unpaid", label: "Not paid yet" },
  { value: "cash", label: "Paid cash" },
  { value: "pos", label: "Paid by POS" },
  { value: "bank_transfer", label: "Paid by transfer" },
];
const LENGTHS = [60, 90, 120, 30, 150, 180, 240, 300];
const DAY_STARTS = Array.from({ length: 36 }, (_, i) => 360 + i * 30); // 6:00 am – 11:30 pm
const NIGHT_STARTS = Array.from({ length: 12 }, (_, i) => i * 30); // 12:00 – 5:30 am

/** Record a phone, WhatsApp or walk-in booking, with a live check of the time. */
function AddBookingScreen() {
  const params = useLocalSearchParams<{
    organizationId: string;
    date?: string;
  }>();
  const organizationId = params.organizationId;
  const colors = useColors();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const today = lagosToday();
  const [date, setDate] = useState(
    params.date && params.date >= today ? params.date : today,
  );
  const calendar = useVenueCalendar(organizationId, today);
  const pitches = calendar.data?.pitches ?? [];
  const [pitchId, setPitchId] = useState<string | null>(null);
  const pitch = pitches.find((item) => item.id === pitchId) ?? pitches[0];
  const [start, setStart] = useState<number | null>(null);
  const [length, setLength] = useState(60);
  const [night, setNight] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState<Channel>("phone");
  const [payment, setPayment] = useState<Payment>("unpaid");
  const [price, setPrice] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [repeat, setRepeat] = useState<number>(1);
  const [saved, setSaved] = useState<{
    label: string;
    customer: string;
    weeks: WeekResult[];
  } | null>(null);

  const startsAt = start === null ? null : lagosInstant(date, start);
  // One key per pitch, time and length: a retry after a lost answer returns the
  // same booking; a different choice is a different booking.
  const keys = useRef(new Map<string, string>());
  const keyFor = (id: string) => {
    const existing = keys.current.get(id);
    if (existing) return existing;
    const key = newIdempotencyKey();
    keys.current.set(id, key);
    return key;
  };

  const quote = useQuery({
    queryKey: ["manualQuote", organizationId, pitch?.id, startsAt, length],
    enabled: !!pitch && !!startsAt,
    staleTime: 0,
    queryFn: async (): Promise<ManualQuote> => {
      const response = await quoteManualBooking(organizationId, pitch!.id, {
        startsAt: startsAt!,
        durationMinutes: length,
      });
      if (response.status !== 200)
        throw new Error(
          (response.data as ErrorBody).error ?? "We could not check this time.",
        );
      return response.data.quote;
    },
  });

  const nowMinute = lagosMinute(new Date());
  const starts = useMemo(
    () =>
      (night ? [...NIGHT_STARTS, ...DAY_STARTS] : DAY_STARTS).filter(
        (minute) => date !== today || minute > nowMinute,
      ),
    [night, date, today, nowMinute],
  );

  const standard = quote.data?.standardAmountMinor ?? null;
  const priceText = price ?? (standard !== null ? nairaInput(standard) : "");
  const blocked = !!quote.data && (quote.data.closed || !!quote.data.clash);

  function resetForAnother() {
    setSaved(null);
    setRepeat(1);
    setStart(null);
    setName("");
    setPhone("");
    setNote("");
    setPrice(null);
    setPayment("unpaid");
    setErrors({});
    setFormError(null);
  }

  /** The request for one week. Only the first week takes the payment. */
  function bodyFor(week: { startsAt: string }, first: boolean, kobo: number) {
    return {
      pitchId: pitch!.id,
      startsAt: week.startsAt,
      durationMinutes: length,
      customerName: name.trim(),
      customerPhone: phone.trim() || undefined,
      channel,
      paymentStatus: (first && payment !== "unpaid" ? "paid" : "unpaid") as
        "paid" | "unpaid",
      ...(first && payment !== "unpaid" ? { paymentMethod: payment } : {}),
      // A special price applies to every week; otherwise each week gets its
      // own standard price from the API.
      ...(kobo !== standard ? { amountMinor: kobo } : {}),
      note: note.trim() || undefined,
    };
  }

  /**
   * Saves the later weeks one by one. Each is its own booking, checked by the
   * API; a taken week is reported and the rest carry on. If the connection
   * drops, the weeks not yet sent stay "unsent" for a retry with the same keys.
   */
  async function saveWeeks(
    weeks: { date: string; startsAt: string }[],
    kobo: number,
  ): Promise<WeekResult[]> {
    const results: WeekResult[] = [];
    let offline = false;
    for (const week of weeks) {
      if (offline) {
        results.push({ date: week.date, state: "unsent" });
        continue;
      }
      const id = `${pitch!.id}:${week.startsAt}:${length}`;
      try {
        const response = await createManualBooking(
          organizationId,
          bodyFor(week, false, kobo),
          { headers: { "idempotency-key": keyFor(id) } },
        );
        if (response.status === 200 || response.status === 201) {
          keys.current.delete(id);
          results.push({
            date: week.date,
            state: "saved",
            reference: response.data.reference,
          });
        } else {
          keys.current.delete(id);
          results.push({
            date: week.date,
            state: "refused",
            reason:
              (response.data as ErrorBody).error ??
              "This week could not be saved.",
          });
        }
      } catch {
        offline = true;
        results.push({ date: week.date, state: "unsent" });
      }
    }
    return results;
  }

  function refreshDay() {
    const userId = auth.status === "signedIn" ? auth.me.user.id : null;
    void queryClient.invalidateQueries({
      queryKey: venueCalendarKey(userId, organizationId),
    });
  }

  async function save() {
    if (!pitch || !startsAt || start === null) return;
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.customerName = "Enter the customer's name";
    const kobo = priceText ? toKobo(priceText) : null;
    if (!priceText) next.amountMinor = "Enter the price";
    else if (kobo === null)
      next.amountMinor = "Enter the price in naira, e.g. 25,000";
    setErrors(next);
    if (Object.keys(next).length || kobo === null) return;

    const [first, ...later] = weeklyDates(date, start, repeat);
    const id = `${pitch.id}:${first.startsAt}:${length}`;
    setSaving(true);
    setFormError(null);
    try {
      const response = await createManualBooking(
        organizationId,
        bodyFor(first, true, kobo),
        { headers: { "idempotency-key": keyFor(id) } },
      );
      if (response.status === 200 || response.status === 201) {
        keys.current.delete(id);
        const rest = await saveWeeks(later, kobo);
        setSaved({
          label: `${dateParts(date).long}, ${formatLocalTime(start)} to ${formatLocalTime(start + length)}`,
          customer: name.trim(),
          weeks: [
            {
              date: first.date,
              state: "saved",
              reference: response.data.reference,
            },
            ...rest,
          ],
        });
        refreshDay();
        return;
      }
      keys.current.delete(id);
      const body = response.data as ErrorBody;
      if (body.fieldErrors)
        setErrors(
          Object.fromEntries(
            Object.entries(body.fieldErrors).map(([field, list]) => [
              field,
              list[0],
            ]),
          ),
        );
      setFormError(body.error ?? "We could not save this booking.");
      if (response.status === 409) void quote.refetch();
    } catch {
      // Keep the key: the booking may have been saved before the answer was lost.
      setFormError(
        "We could not reach PitchPadi. Check your connection and try again; it will not be saved twice.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function retryUnsent() {
    if (!saved || start === null) return;
    const kobo = toKobo(priceText);
    if (kobo === null) return;
    const unsent = saved.weeks
      .filter((week) => week.state === "unsent")
      .map((week) => ({
        date: week.date,
        startsAt: lagosInstant(week.date, start),
      }));
    setSaving(true);
    const retried = await saveWeeks(unsent, kobo);
    setSaving(false);
    const byDate = new Map(retried.map((week) => [week.date, week]));
    setSaved({
      ...saved,
      weeks: saved.weeks.map((week) => byDate.get(week.date) ?? week),
    });
    refreshDay();
  }

  if (saved) {
    const repeated = saved.weeks.length > 1;
    const unsent = saved.weeks.some((week) => week.state === "unsent");
    const allSaved = saved.weeks.every((week) => week.state === "saved");
    return (
      <SafeAreaView
        edges={["bottom"]}
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Notice
            tone={allSaved ? "success" : undefined}
            title={repeatSummary(saved.weeks)}
          >
            <Body>
              {repeated
                ? `Every ${dateParts(date).long.split(" ")[0]}, ${formatLocalTime(start!)} to ${formatLocalTime(start! + length)}`
                : saved.label}
            </Body>
            <Body weight="semibold">
              {saved.customer}
              {repeated
                ? ""
                : `, ${(saved.weeks[0] as { reference: string }).reference}`}
            </Body>
            <Body tone="muted">
              {repeated
                ? "Saved weeks are blocked for players straight away. Later weeks are saved as not paid yet."
                : "The time is blocked for players straight away."}
            </Body>
          </Notice>
          {repeated ? (
            <View style={{ gap: space.xs }}>
              {saved.weeks.map((week) => (
                <View key={week.date} style={styles.week}>
                  <Body weight="semibold" numeric style={{ width: 132 }}>
                    {shortDay(week.date)}
                  </Body>
                  <Body
                    style={{ flex: 1 }}
                    tone={week.state === "saved" ? undefined : "danger"}
                  >
                    {week.state === "saved"
                      ? `Saved, ${week.reference}`
                      : week.state === "refused"
                        ? week.reason
                        : "Not sent: no connection"}
                  </Body>
                </View>
              ))}
            </View>
          ) : null}
          {unsent ? (
            <Button
              label="Try the unsent weeks again"
              onPress={() => void retryUnsent()}
              busy={saving}
            />
          ) : null}
          <Button
            variant={unsent ? "outline" : "primary"}
            label="Back to the day"
            onPress={() => router.back()}
          />
          <Button
            variant="outline"
            label="Add another booking"
            onPress={resetForAnother}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {calendar.isPending ? (
            <Skeleton height={120} count={2} />
          ) : calendar.isError ? (
            <Notice
              tone="danger"
              title={calendar.error.message}
              action={
                <Button
                  variant="outline"
                  label="Try again"
                  onPress={() => void calendar.refetch()}
                />
              }
            />
          ) : pitches.length === 0 ? (
            <Notice title="This venue has no pitches yet">
              <Body tone="muted">Add one from Manage, on the Venue tab.</Body>
            </Notice>
          ) : (
            <>
              {pitches.length > 1 && (
                <ChipRow label="Pitch">
                  {pitches.map((item) => (
                    <Chip
                      key={item.id}
                      label={`${item.name}, ${item.type}`}
                      selected={item.id === pitch?.id}
                      onPress={() => setPitchId(item.id)}
                    />
                  ))}
                </ChipRow>
              )}
              <ChipRow label="Day">
                {nextDates(today, 30).map((day) => {
                  const parts = dateParts(day);
                  return (
                    <Chip
                      key={day}
                      selected={day === date}
                      onPress={() => {
                        setDate(day);
                        setStart(null);
                      }}
                      label={
                        day === today
                          ? "Today"
                          : `${parts.weekday} ${parts.day}`
                      }
                      accessibilityLabel={parts.long}
                    />
                  );
                })}
              </ChipRow>

              <View style={{ gap: space.sm }}>
                <Body weight="semibold">Kick-off</Body>
                <View style={styles.wrap}>
                  {starts.map((minute) => (
                    <TimeChip
                      key={minute}
                      label={formatLocalTime(minute)}
                      selected={minute === start}
                      accessibilityLabel={`Kick off at ${formatLocalTime(minute)}`}
                      onPress={() => setStart(minute)}
                    />
                  ))}
                </View>
                <Button
                  variant="ghost"
                  label={
                    night
                      ? "Hide times after midnight"
                      : "Show times after midnight"
                  }
                  onPress={() => setNight((value) => !value)}
                  style={{ alignSelf: "flex-start", paddingHorizontal: 0 }}
                />
              </View>

              <ChipRow label="How long?">
                {LENGTHS.map((minutes) => (
                  <Chip
                    key={minutes}
                    label={formatDuration(minutes)}
                    selected={minutes === length}
                    onPress={() => setLength(minutes)}
                  />
                ))}
              </ChipRow>

              {start !== null && (
                <TimeCheck
                  checking={quote.isFetching}
                  quote={quote.data ?? null}
                  error={quote.isError ? quote.error.message : null}
                  start={start}
                  length={length}
                />
              )}

              <Heading level={3}>Customer</Heading>
              <Field
                label="Name"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  setErrors((e) => ({ ...e, customerName: "" }));
                }}
                autoCapitalize="words"
                error={errors.customerName || null}
              />
              <Field
                label="Phone (optional)"
                hint="So you can call them if anything changes."
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                error={errors.customerPhone || null}
              />
              <ChoiceRow
                label="How did they book?"
                options={CHANNELS}
                value={channel}
                onChange={setChannel}
              />
              <Field
                label="Price (₦)"
                hint={
                  standard !== null
                    ? `Your standard price is ${formatNaira(standard)}. Change it for a discount.`
                    : "This length has no standard price. Enter what you charged."
                }
                value={priceText}
                onChangeText={(text) => {
                  setPrice(text);
                  setErrors((e) => ({ ...e, amountMinor: "" }));
                }}
                keyboardType="decimal-pad"
                error={errors.amountMinor || null}
              />
              <ChoiceRow
                label="Have they paid?"
                options={PAYMENTS}
                value={payment}
                onChange={setPayment}
              />
              <ChipRow label="Repeat every week">
                {REPEAT_CHOICES.map((weeks) => (
                  <Chip
                    key={weeks}
                    label={weeks === 1 ? "Just this day" : `${weeks} weeks`}
                    selected={weeks === repeat}
                    onPress={() => setRepeat(weeks)}
                  />
                ))}
              </ChipRow>
              {repeat > 1 ? (
                <Body tone="muted" size={14} style={{ marginTop: -space.sm }}>
                  {`Every ${dateParts(date).long.split(" ")[0]} until ${shortDay(weeklyDates(date, 0, repeat).at(-1)!.date)}. Each week is checked on its own; taken weeks are skipped. Later weeks are saved as not paid yet.`}
                </Body>
              ) : null}
              <Field
                label="Note (optional)"
                placeholder="e.g. Regular Thursday team"
                value={note}
                onChangeText={setNote}
                maxLength={300}
                error={errors.note || null}
              />
            </>
          )}
        </ScrollView>
        {pitch && (
          <View
            style={[
              styles.bar,
              { backgroundColor: colors.card, borderTopColor: colors.border },
            ]}
          >
            {formError ? (
              <Body tone="danger" accessibilityLiveRegion="assertive">
                {formError}
              </Body>
            ) : null}
            <Button
              label={
                start === null
                  ? "Choose a kick-off time"
                  : blocked
                    ? "This time is taken. Choose another."
                    : repeat > 1
                      ? `Save ${repeat} weeks`
                      : "Save booking"
              }
              onPress={() => void save()}
              busy={saving}
              disabled={start === null || blocked || quote.isFetching}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** What the API says about the chosen time, in words (same as the website). */
function TimeCheck({
  checking,
  quote,
  error,
  start,
  length,
}: {
  checking: boolean;
  quote: ManualQuote | null;
  error: string | null;
  start: number;
  length: number;
}) {
  const colors = useColors();
  const range = `${formatLocalTime(start)} to ${formatLocalTime(start + length)}`;
  let tone: "ok" | "warn" | "bad" | "muted" = "muted";
  let message = "Checking this time…";
  if (error) {
    tone = "bad";
    message = `${error} Check your connection.`;
  } else if (quote && !checking) {
    if (quote.closed) {
      tone = "bad";
      message = `The pitch is closed during ${range}. Choose another time.`;
    } else if (quote.clash?.kind === "booking") {
      tone = "bad";
      message = `Already booked from ${quote.clash.localStart} to ${quote.clash.localEnd}. Choose another time.`;
    } else if (quote.clash) {
      tone = "bad";
      message = `A player is paying online for ${quote.clash.localStart} to ${quote.clash.localEnd}${
        quote.clash.holdExpiresAt
          ? `. It frees up at ${formatInstantTime(quote.clash.holdExpiresAt)} if they don't pay.`
          : "."
      }`;
    } else if (!quote.withinOpeningHours) {
      tone = "warn";
      message = `${range} is free, but outside your opening hours. You can still book it.`;
    } else {
      tone = "ok";
      message = `${range} is free.`;
    }
  }
  const look = {
    ok: { bg: colors.successSoft, fg: colors.text },
    warn: { bg: colors.warningSoft, fg: colors.warningText },
    bad: { bg: colors.dangerSoft, fg: colors.danger },
    muted: { bg: colors.muted, fg: colors.textMuted },
  }[tone];
  return (
    <View
      style={[styles.check, { backgroundColor: look.bg }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="summary"
    >
      <Body weight="semibold" style={{ color: look.fg }}>
        {message}
      </Body>
    </View>
  );
}

function ChoiceRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
      <Body weight="semibold">{label}</Body>
      <View style={styles.wrap}>
        {options.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={option.value === value}
            onPress={() => onChange(option.value)}
          />
        ))}
      </View>
    </View>
  );
}

/** "Thu 26 Nov" */
function shortDay(date: string) {
  const parts = dateParts(date);
  return `${parts.weekday} ${parts.day} ${parts.month}`;
}

const styles = StyleSheet.create({
  week: { flexDirection: "row", gap: space.sm, alignItems: "flex-start" },
  content: { padding: space.lg, paddingBottom: space.xxl * 2, gap: space.lg },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  check: { borderRadius: radius.md, padding: space.md },
  bar: { borderTopWidth: 1, padding: space.lg, gap: space.sm },
});

export default needsVenue(AddBookingScreen);
