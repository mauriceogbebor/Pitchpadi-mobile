import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { addClosure, listClosures, removeClosure } from "@/api/generated";
import { useAuth } from "@/auth/auth-context";
import { Chip, ChipRow } from "@/components/chips";
import { needsVenue } from "@/components/needs-venue";
import { Segmented } from "@/components/segmented";
import {
  Body,
  Button,
  Card,
  Field,
  Heading,
  Notice,
  Screen,
  Section,
  Skeleton,
} from "@/components/ui";
import { closureLabel, closureTimes, shortDate } from "@/lib/closures";
import { lagosToday, nextDates } from "@/lib/format";
import { venueCalendarKey } from "@/lib/venue";
import { space } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

type ErrorBody = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  games?: { kind: string; localDate: string; localStart: string }[];
};

const LENGTHS = [1, 2, 3, 7] as const;
const TIMES = closureTimes();

/**
 * Close a pitch for whole days or part of a day (Prompt 4, R7-F5): players
 * cannot book those times, and venue bookings are refused there too. The API
 * will not close over a game; it says which games are in the way.
 */
function ClosuresScreen() {
  const { organizationId, pitchId, pitchName } = useLocalSearchParams<{
    organizationId: string;
    pitchId: string;
    pitchName?: string;
  }>();
  const colors = useColors();
  const auth = useAuth();
  const userId = auth.status === "signedIn" ? auth.me.user.id : null;
  const queryClient = useQueryClient();
  const key = ["closures", userId, organizationId, pitchId];
  const closures = useQuery({
    queryKey: key,
    queryFn: async () => {
      const response = await listClosures(organizationId, pitchId);
      if (response.status !== 200)
        throw new Error("We could not load the closures.");
      return response.data.closures;
    },
  });

  const today = lagosToday();
  const [date, setDate] = useState(today);
  const [part, setPart] = useState<"day" | "part">("day");
  const [days, setDays] = useState<number>(1);
  const [from, setFrom] = useState("18:00");
  const [to, setTo] = useState("20:00");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [problem, setProblem] = useState<ErrorBody | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setProblem(null);
    setAdded(null);
    const lastDay = nextDates(date, days).at(-1)!;
    try {
      const response = await addClosure(organizationId, pitchId, {
        date,
        ...(part === "day"
          ? days > 1
            ? { endDate: lastDay }
            : {}
          : { from, to }),
        note: note.trim() || undefined,
      });
      if (response.status === 201) {
        setAdded(closureLabel(response.data.closure));
        setNote("");
        void queryClient.invalidateQueries({ queryKey: key });
        // Today's view and search no longer offer the closed times.
        void queryClient.invalidateQueries({
          queryKey: venueCalendarKey(userId, organizationId),
        });
        return;
      }
      setProblem(response.data as ErrorBody);
    } catch {
      setProblem({
        error:
          "We could not reach PitchPadi. Check your connection and try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function reopen(id: string) {
    setRemoving(id);
    try {
      await removeClosure(organizationId, pitchId, id);
      void queryClient.invalidateQueries({ queryKey: key });
    } finally {
      setRemoving(null);
    }
  }

  const fieldError = (field: string) => problem?.fieldErrors?.[field]?.[0];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Screen edges={["bottom"]}>
        <View style={{ gap: space.xs }}>
          <Heading>Closures</Heading>
          <Body tone="muted">
            {pitchName ? `${pitchName}: ` : ""}players cannot book a pitch while
            it is closed.
          </Body>
        </View>

        <Section title="Coming up">
          {closures.isPending ? (
            <Skeleton height={64} count={1} />
          ) : closures.isError ? (
            <Notice
              tone="danger"
              title={closures.error.message}
              action={
                <Button
                  variant="outline"
                  label="Try again"
                  onPress={() => void closures.refetch()}
                />
              }
            />
          ) : closures.data.length === 0 ? (
            <Body tone="muted">No closures. The pitch follows its hours.</Body>
          ) : (
            closures.data.map((closure) => (
              <Card
                key={closure.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: space.md,
                }}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={22}
                  color={colors.textMuted}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <Body weight="semibold">{closureLabel(closure)}</Body>
                  {closure.note ? (
                    <Body tone="muted" size={14}>
                      {closure.note}
                    </Body>
                  ) : null}
                </View>
                <Button
                  variant="outline"
                  label="Reopen"
                  accessibilityLabel={`Reopen ${closureLabel(closure)}`}
                  busy={removing === closure.id}
                  disabled={removing !== null}
                  onPress={() => void reopen(closure.id)}
                />
              </Card>
            ))
          )}
        </Section>

        <Section title="Close the pitch">
          <ChipRow label="From">
            {nextDates(today, 60).map((day) => (
              <Chip
                key={day}
                label={day === today ? "Today" : shortDate(day)}
                selected={day === date}
                onPress={() => setDate(day)}
              />
            ))}
          </ChipRow>
          <Segmented
            label="How long"
            options={[
              { value: "day", label: "Whole days" },
              { value: "part", label: "Part of the day" },
            ]}
            value={part}
            onChange={setPart}
          />
          {part === "day" ? (
            <ChipRow label="For">
              {LENGTHS.map((count) => (
                <Chip
                  key={count}
                  label={count === 1 ? "1 day" : `${count} days`}
                  selected={count === days}
                  onPress={() => setDays(count)}
                />
              ))}
            </ChipRow>
          ) : (
            <>
              <ChipRow label="Closed from">
                {TIMES.filter((time) => time.value !== "24:00").map((time) => (
                  <Chip
                    key={time.value}
                    label={time.label}
                    selected={time.value === from}
                    onPress={() => {
                      setFrom(time.value);
                      if (to <= time.value)
                        setTo(
                          TIMES[
                            TIMES.findIndex((t) => t.value === time.value) + 2
                          ]?.value ?? "24:00",
                        );
                    }}
                  />
                ))}
              </ChipRow>
              <ChipRow label="Until">
                {TIMES.filter((time) => time.value > from).map((time) => (
                  <Chip
                    key={time.value}
                    label={time.label}
                    selected={time.value === to}
                    onPress={() => setTo(time.value)}
                  />
                ))}
              </ChipRow>
              {fieldError("to") ? (
                <Body tone="danger">{fieldError("to")}</Body>
              ) : null}
            </>
          )}
          <Field
            label="Note for your team (optional)"
            placeholder="e.g. Resurfacing"
            hint="Only you and your staff see this."
            value={note}
            onChangeText={setNote}
            maxLength={80}
            error={fieldError("note")}
          />
          {problem ? (
            <Notice
              tone="danger"
              title={problem.error ?? "We could not close the pitch."}
            >
              {problem.games?.length ? (
                <View style={{ gap: 2 }}>
                  {problem.games.map((game) => (
                    <Body key={`${game.localDate}${game.localStart}`}>
                      {shortDate(game.localDate)}, {game.localStart}
                      {game.kind === "hold" ? " (a player is paying now)" : ""}
                    </Body>
                  ))}
                </View>
              ) : null}
            </Notice>
          ) : null}
          {added ? (
            <Notice tone="success" title="Pitch closed">
              <Body accessibilityLiveRegion="polite">{added}</Body>
            </Notice>
          ) : null}
          <Button
            icon="close-circle-outline"
            label={
              part === "day"
                ? days === 1
                  ? `Close ${date === today ? "today" : shortDate(date)}`
                  : `Close ${days} days`
                : `Close ${TIMES.find((t) => t.value === from)?.label} to ${TIMES.find((t) => t.value === to)?.label}`
            }
            onPress={() => void save()}
            busy={busy}
          />
        </Section>
      </Screen>
    </KeyboardAvoidingView>
  );
}

export default needsVenue(ClosuresScreen);
