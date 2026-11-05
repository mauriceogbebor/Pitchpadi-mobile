import Ionicons from "@expo/vector-icons/Ionicons";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { listAreas, searchVenues } from "@/api/generated";
import { Chip } from "@/components/chips";
import {
  activeFilters,
  FilterSheet,
  type Filters,
  NO_FILTERS,
  SORT_LABEL,
} from "@/components/filter-sheet";
import { DateBlock } from "@/components/date-block";
import { DateStrip } from "@/components/date-strip";
import { AreaPicker } from "@/components/area-picker";
import { VenueResultCard } from "@/components/venue-result-card";
import { PitchBand } from "@/components/pitch-band";
import { PlayAgain } from "@/components/play-again";
import { Segmented } from "@/components/segmented";
import { LoadingLine, StaleBanner } from "@/components/stale-banner";
import {
  Body,
  Button,
  Card,
  Heading,
  Notice,
  Press,
  Skeleton,
} from "@/components/ui";
import {
  addDays,
  dateParts,
  formatInstantTime,
  lagosToday,
  nextDates,
  TIMES_OF_DAY,
  type TimeOfDay,
} from "@/lib/format";
import { nearParam } from "@/lib/geo";
import { useDeviceCheckouts } from "@/lib/use-device-checkouts";
import { useMyBookings } from "@/lib/my-bookings";
import {
  type PlaySelection,
  playSelectionKey,
  playSelectionLabel,
  resultsView,
} from "@/lib/stale-results";
import { mergePages, openLine, shownLine } from "@/lib/search-pages";
import { useNearMe } from "@/lib/use-near-me";
import { radius, space, TAP } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

const TIME_OPTIONS = TIMES_OF_DAY.map((item) => ({
  value: item.value,
  label: item.value === "any" ? "Any time" : item.label,
}));

/**
 * Play, the marketplace: open pitches across Lagos for a day, narrowed by
 * area, time of day, size and budget, sorted by best match, price, kick-off
 * or distance. The API does the filtering and sorting (MK-01).
 */
export default function PlayScreen() {
  const colors = useColors();
  const reduce = useReducedMotion();
  const today = lagosToday();
  const days = useMemo(() => nextDates(today, 14), [today]);
  const [date, setDate] = useState(today);
  const [duration, setDuration] = useState<60 | 90 | 120>(60);
  const [areaOpen, setAreaOpen] = useState(false);
  const [area, setArea] = useState<string | null>(null);
  const [time, setTime] = useState<TimeOfDay>("any");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { nearMe, turnOn, turnOff } = useNearMe();
  const near = nearMe.status === "on" ? nearParam(nearMe.point) : undefined;

  const areas = useQuery({
    queryKey: ["areas"],
    queryFn: async () => {
      const response = await listAreas();
      if (response.status !== 200) throw new Error("We could not load areas.");
      return response.data.areas;
    },
    staleTime: 60 * 60 * 1000,
  });
  const areaName = areas.data?.find((item) => item.slug === area)?.name;
  // Nearest needs a location; until there is one, keep the best match.
  const sort =
    filters.sort === "nearest" && !near ? "recommended" : filters.sort;
  const selection: PlaySelection = {
    date,
    duration,
    area,
    time,
    type: filters.type,
    maxPrice: filters.maxPrice,
    sort,
    near: near ?? null,
  };
  const selectionKey = playSelectionKey(selection);
  const search = useInfiniteQuery({
    queryKey: ["search", selectionKey],
    queryFn: async ({ pageParam }) => {
      // Remember what this answer is for, so it is never shown as the answer
      // to a later choice (review of 3 November).
      const tag = {
        selectionKey,
        selectionLabel: playSelectionLabel({ ...selection, areaName }, today),
      };
      const response = await searchVenues({
        date,
        duration,
        area: area ?? undefined,
        time,
        type: filters.type === "any" ? undefined : filters.type,
        maxPrice: filters.maxPrice ?? undefined,
        sort,
        near,
        page: pageParam,
      });
      if (response.status !== 200)
        throw new Error(
          (response.data as { error?: string }).error ??
            "We could not load pitches.",
        );
      return { ...response.data, ...tag };
    },
    initialPageParam: 1,
    // 10 venues per page, each with all its matching pitches; "Show more
    // venues" asks for the next (R7 review, by venue since R9).
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    // Keep the last answer on screen while a new choice loads (slow networks),
    // but only labelled and with booking paused: see `view` below.
    placeholderData: (previous) => previous,
  });

  const pages = search.data?.pages ?? [];
  const view = resultsView({
    wanted: selectionKey,
    shown: pages[0],
    // A failed "Show more" keeps the pages already shown (handled below).
    isError: search.isError && !search.isFetchNextPageError,
  });
  const stale = view.kind === "stale";
  const merged = mergePages(pages);
  const venues = merged.venues;
  const open = merged.openPitches;
  const partial = shownLine(venues.length, merged.matchedVenues);
  const filterCount = activeFilters(filters);

  async function toggleNearMe() {
    if (nearMe.status === "on") {
      turnOff();
      if (filters.sort === "nearest")
        setFilters({ ...filters, sort: "recommended" });
      return;
    }
    const ok = await turnOn();
    if (ok && filters.sort === "recommended")
      setFilters({ ...filters, sort: "nearest" });
  }

  async function changeFilters(next: Filters) {
    setFilters(next);
    if (next.sort === "nearest" && nearMe.status !== "on") {
      const ok = await turnOn();
      if (!ok) setFilters({ ...next, sort: "recommended" });
    }
  }
  const day = dateParts(date);

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={search.isRefetching}
            onRefresh={() => void search.refetch()}
          />
        }
      >
        <PitchBand contentStyle={{ padding: space.lg, gap: space.sm }}>
          <Heading style={{ color: colors.onBand }}>Find a pitch</Heading>
          <View>
            <DateStrip
              days={days}
              value={date}
              today={today}
              onChange={setDate}
              onBand
            />
          </View>
        </PitchBand>

        <NextGame />

        <View style={{ gap: space.md }}>
          <View style={styles.tools}>
            <Press
              accessibilityRole="button"
              accessibilityLabel={`Choose area. ${areaName ?? "All of Lagos"}`}
              onPress={() => setAreaOpen(true)}
              style={[
                styles.area,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Ionicons name="location-outline" size={17} color={colors.link} />
              <Body
                weight="semibold"
                size={15}
                numberOfLines={1}
                style={{ flex: 1 }}
              >
                {areaName ?? "All of Lagos"}
              </Body>
              <Ionicons
                name="chevron-down"
                size={14}
                color={colors.textMuted}
              />
            </Press>
            <Chip
              icon={nearMe.status === "on" ? "navigate" : "navigate-outline"}
              label="Near me"
              busy={nearMe.status === "finding"}
              selected={nearMe.status === "on"}
              onPress={() => void toggleNearMe()}
              accessibilityLabel={
                nearMe.status === "on"
                  ? "Near me is on. Turn it off"
                  : "Show distances from where you are"
              }
            />
            <Press
              accessibilityRole="button"
              onPress={() => setSheetOpen(true)}
              accessibilityLabel={`Filters${filterCount ? `, ${filterCount} on` : ""}. Sort, pitch size and budget`}
              style={[
                styles.filter,
                {
                  borderColor: filterCount ? colors.primary : colors.border,
                  backgroundColor: filterCount ? colors.primary : colors.card,
                },
              ]}
            >
              <Ionicons
                name="options-outline"
                size={20}
                color={filterCount ? colors.onPrimary : colors.text}
              />
              {filterCount > 0 && (
                <Body size={12} weight="semibold" tone="onPrimary">
                  {filterCount}
                </Body>
              )}
            </Press>
          </View>
          <Segmented
            label="Game length"
            options={[
              { value: "60", label: "1 hour" },
              { value: "90", label: "1½ hours" },
              { value: "120", label: "2 hours" },
            ]}
            value={String(duration)}
            onChange={(value) => setDuration(Number(value) as 60 | 90 | 120)}
          />
          <Segmented
            label="Time of day"
            options={TIME_OPTIONS}
            value={time}
            onChange={setTime}
          />
          {nearMe.status === "denied" || nearMe.status === "unavailable" ? (
            <Body tone="muted" size={14} accessibilityLiveRegion="polite">
              {nearMe.status === "denied"
                ? "Location is off for PitchPadi. Turn it on in your phone's settings to see pitches near you."
                : "We could not find your location. Try again outside or with location turned on."}
            </Body>
          ) : null}
        </View>

        {view.kind === "loading" ? (
          <View style={{ gap: space.md }}>
            <LoadingLine
              text={`Loading pitches for ${playSelectionLabel({ ...selection, areaName }, today)}`}
            />
            <Skeleton height={176} count={3} />
          </View>
        ) : view.kind === "error" ? (
          <Notice
            tone="danger"
            title="We could not load pitches"
            action={
              <Button
                variant="outline"
                label="Try again"
                onPress={() => void search.refetch()}
              />
            }
          >
            <Body>
              {search.error?.message ?? "We could not load pitches."} Check your
              connection.
            </Body>
          </Notice>
        ) : (
          <Animated.View
            key={pages[0]?.selectionKey}
            entering={reduce || stale ? undefined : FadeIn.duration(180)}
            style={{ gap: space.md }}
          >
            {stale ? (
              <StaleBanner
                loading={`Loading pitches for ${playSelectionLabel({ ...selection, areaName }, today)}`}
                showing={`Still showing ${view.label}. Booking is paused until the new times arrive.`}
              />
            ) : (
              <Body tone="muted" accessibilityLiveRegion="polite">
                <Body weight="semibold">
                  {openLine(open, merged.openVenues)}
                </Body>{" "}
                {date === today
                  ? "today"
                  : `on ${day.weekday} ${day.day} ${day.month}`}
                {areaName ? ` in ${areaName}` : " across Lagos"}
                {filters.sort !== "recommended" &&
                (filters.sort !== "nearest" || near)
                  ? `, ${SORT_LABEL[filters.sort].toLowerCase()} first`
                  : near
                    ? ", nearest first"
                    : ""}
              </Body>
            )}
            {stale ? (
              <View
                style={styles.stale}
                aria-hidden
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                {venues.map((item) => (
                  <VenueResultCard
                    key={item.venue.id}
                    results={item.pitches}
                    date={date}
                    duration={duration}
                    disabled
                  />
                ))}
              </View>
            ) : venues.length === 0 ? (
              <Notice
                title={
                  filterCount
                    ? "No pitches match these filters"
                    : "No open games for this search"
                }
                action={
                  filterCount ? (
                    <Button
                      variant="outline"
                      label="Clear filters"
                      onPress={() => setFilters(NO_FILTERS)}
                    />
                  ) : area ? (
                    <Button
                      variant="outline"
                      label="Show all of Lagos"
                      onPress={() => setArea(null)}
                    />
                  ) : (
                    <Button
                      variant="outline"
                      label="Try the next day"
                      onPress={() => setDate(addDays(date, 1))}
                    />
                  )
                }
              >
                <Body tone="muted">
                  {filterCount
                    ? "Try a different game length, higher budget or any pitch size."
                    : "Try another day, area or game length."}
                </Body>
              </Notice>
            ) : (
              <>
                {open === 0 ? (
                  <Card variant="flat" style={{ gap: space.md }}>
                    <Body>
                      {date === today
                        ? "Nothing is open for the rest of today"
                        : "Nothing is open on this day"}
                      {time !== "any" ? " at this time of day" : ""}. The next
                      day may have room.
                    </Body>
                    <Button
                      variant="outline"
                      icon="calendar-outline"
                      label={`See ${date === today ? "tomorrow" : "the next day"}`}
                      onPress={() => setDate(addDays(date, 1))}
                    />
                  </Card>
                ) : null}
                {venues.map((item) => (
                  <VenueResultCard
                    key={item.venue.id}
                    results={item.pitches}
                    date={date}
                    duration={duration}
                  />
                ))}
                {partial ? (
                  <View style={{ gap: space.sm }}>
                    <Body
                      tone="muted"
                      size={14}
                      style={{ textAlign: "center" }}
                      accessibilityLiveRegion="polite"
                    >
                      {partial}
                    </Body>
                    {search.isFetchNextPageError ? (
                      <Body
                        tone="danger"
                        size={14}
                        style={{ textAlign: "center" }}
                      >
                        We could not load more venues. Check your connection and
                        try again.
                      </Body>
                    ) : null}
                    {search.hasNextPage ? (
                      <Button
                        variant="outline"
                        icon="chevron-down"
                        label={
                          search.isFetchNextPageError
                            ? "Try again"
                            : "Show more venues"
                        }
                        accessibilityLabel={`Show more venues. ${partial}`}
                        busy={search.isFetchingNextPage}
                        disabled={search.isFetchingNextPage}
                        onPress={() => void search.fetchNextPage()}
                      />
                    ) : null}
                  </View>
                ) : null}
              </>
            )}
          </Animated.View>
        )}
      </ScrollView>
      <FilterSheet
        visible={sheetOpen}
        filters={filters}
        onChange={(next) => void changeFilters(next)}
        onClose={() => setSheetOpen(false)}
      />
      {areaOpen && (
        <AreaPicker
          areas={areas.data ?? []}
          value={area}
          onChange={setArea}
          onClose={() => setAreaOpen(false)}
          loading={areas.isPending}
          error={areas.isError}
          onRetry={() => void areas.refetch()}
        />
      )}
    </SafeAreaView>
  );
}

/** The player's next game, or a checkout they have not finished: one tap back. */
function NextGame() {
  const colors = useColors();
  const bookings = useMyBookings();
  // Guests' unfinished checkouts are remembered on this phone (R7).
  const device = useDeviceCheckouts();
  const { refresh: refreshDevice } = device;
  useFocusEffect(
    useCallback(() => {
      void refreshDevice();
    }, [refreshDevice]),
  );
  const unfinished = bookings.data?.inProgress[0] ?? device.data?.resume[0];
  const next = bookings.data?.upcoming[0];
  if (!unfinished && !next) return <PlayAgain compact />;
  const today = lagosToday();
  const label = (date: string) =>
    date === today
      ? "Today"
      : date === addDays(today, 1)
        ? "Tomorrow"
        : `${dateParts(date).weekday} ${dateParts(date).day} ${dateParts(date).month}`;

  if (unfinished)
    return (
      <Press
        accessibilityRole="button"
        accessibilityLabel={`Finish paying for ${unfinished.pitch.facilityName}, ${label(unfinished.localDate)} at ${unfinished.localStart}`}
        onPress={() =>
          router.push({
            pathname: "/checkout/[holdId]",
            params: { holdId: unfinished.id },
          })
        }
      >
        <Card style={[styles.shortcut, { borderColor: colors.borderStrong }]}>
          <Ionicons name="time-outline" size={26} color={colors.link} />
          <View style={{ flex: 1 }}>
            <Body weight="semibold">Finish paying</Body>
            <Body tone="muted" numeric>
              {unfinished.pitch.facilityName}, {label(unfinished.localDate)} at{" "}
              {unfinished.localStart}
              {unfinished.expiresAt
                ? `. Held until ${formatInstantTime(unfinished.expiresAt)}`
                : ""}
            </Body>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Card>
      </Press>
    );

  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={`Your next game: ${next!.pitch.facilityName}, ${label(next!.localDate)} at ${next!.localStart}. Open booking`}
      onPress={() =>
        router.push({
          pathname: "/booking/[reference]",
          params: { reference: next!.reference },
        })
      }
    >
      <Card style={styles.shortcut}>
        <DateBlock date={next!.localDate} strong />
        <View style={{ flex: 1 }}>
          <Body tone="muted" size={14}>
            Your next game
          </Body>
          <Body weight="semibold" numeric>
            {["Today", "Tomorrow"].includes(label(next!.localDate))
              ? `${label(next!.localDate)}, ${next!.localStart}`
              : next!.localStart}
          </Body>
          <Body tone="muted" numberOfLines={1}>
            {next!.pitch.facilityName}
          </Body>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Card>
    </Press>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl * 2, gap: space.lg },
  shortcut: { flexDirection: "row", alignItems: "center", gap: space.md },
  tools: { flexDirection: "row", gap: space.sm, alignItems: "center" },
  area: {
    flex: 1,
    minWidth: 0,
    minHeight: TAP,
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    paddingHorizontal: space.md,
    borderWidth: 1,
    borderRadius: radius.pill,
  },
  filter: {
    minWidth: TAP,
    minHeight: TAP,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    borderWidth: 1,
    borderRadius: radius.pill,
  },
  stale: { gap: space.md, opacity: 0.45 },
});
