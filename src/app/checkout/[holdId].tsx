import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getHold,
  getPublicPitch,
  releaseHold,
  startCheckout,
  type Checkout,
  type Hold,
  type PaymentMethod,
} from "@/api/generated";
import { useAuth } from "@/auth/auth-context";
import { BookedCard } from "@/components/booked-card";
import { PitchBand } from "@/components/pitch-band";
import { ProgressSteps } from "@/components/progress-steps";
import { PushCard } from "@/components/push-card";
import { HoldCountdown } from "@/components/hold-countdown";
import {
  Body,
  Button,
  Card,
  Divider,
  Field,
  Heading,
  Notice,
  Press,
  Skeleton,
} from "@/components/ui";
import {
  dateParts,
  formatDuration,
  formatInstantTime,
  formatNaira,
  formatPhone,
} from "@/lib/format";
import { newIdempotencyKey } from "@/lib/ids";
import { readPref, removePref, writePref } from "@/lib/prefs-store";
import { endedMessage, failedPayment, retryChoices } from "@/lib/recovery";
import { DETAILS_KEY, parseDetails } from "@/lib/returning";
import { useHoldSlot } from "@/lib/use-hold";
import { radius, space, TAP } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

type ErrorBody = { error?: string; fieldErrors?: Record<string, string[]> };

const METHODS: { value: PaymentMethod; label: string; hint: string }[] = [
  { value: "card", label: "Card", hint: "Visa, Mastercard or Verve" },
  {
    value: "bank_transfer",
    label: "Bank transfer",
    hint: "Send to a one-time account. We keep your time while the bank confirms.",
  },
  { value: "ussd", label: "USSD", hint: "Dial a code on any phone" },
];
const METHOD_ICON = {
  card: "card-outline",
  bank_transfer: "swap-horizontal-outline",
  ussd: "keypad-outline",
} as const;
const METHOD_NAME: Record<PaymentMethod, string> = {
  card: "card",
  bank_transfer: "bank transfer",
  ussd: "USSD",
};

/** The hold, the player's details and payment, then the booking. */
export default function CheckoutScreen() {
  const { holdId } = useLocalSearchParams<{ holdId: string }>();
  const colors = useColors();
  const queryClient = useQueryClient();

  const hold = useQuery({
    queryKey: ["hold", holdId],
    queryFn: async () => {
      const response = await getHold(holdId);
      if (response.status === 404)
        throw new Error("We could not find this booking.");
      if (response.status !== 200)
        throw new Error("We could not load your booking.");
      return response.data.hold;
    },
    // While a payment is open, check every few seconds until the webhook lands.
    refetchInterval: (query) =>
      query.state.data && awaitingPayment(query.state.data) ? 3000 : false,
  });

  const booked =
    hold.data &&
    (hold.data.status === "confirmed" || hold.data.status === "completed") &&
    hold.data.booking;
  useEffect(() => {
    if (booked)
      void queryClient.invalidateQueries({ queryKey: ["myBookings"] });
  }, [booked, queryClient]);

  const onEnd = useCallback(() => void hold.refetch(), [hold]);

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <Stack.Screen
        options={{
          title: booked ? "Booked" : "Checkout",
          headerBackTitle: "Back",
        }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          // A new scroll view when the booking lands, so the confirmation
          // starts at the top instead of where the payment form was.
          key={booked ? "booked" : "checkout"}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {hold.isPending ? (
            <Skeleton height={160} count={2} />
          ) : !hold.data ? (
            // Only when there is nothing to show: a failed refresh keeps the
            // last known hold on screen (below), with a note.
            <Notice
              tone="danger"
              title={hold.error?.message ?? "We could not load your booking."}
              action={
                <Button
                  variant="outline"
                  label="Try again"
                  onPress={() => void hold.refetch()}
                />
              }
            >
              <Body>Nothing has changed on our side.</Body>
            </Notice>
          ) : booked ? (
            <>
              <ProgressSteps current={3} />
              <BookedCard
                booking={{
                  reference: hold.data.booking!.reference,
                  pitch: hold.data.pitch,
                  localDate: hold.data.localDate,
                  localStart: hold.data.localStart,
                  localEnd: hold.data.localEnd,
                  amountMinor: hold.data.amountDueMinor,
                }}
                policy={hold.data.cancellationPolicy}
                celebrate={justBooked(hold.data)}
              />
              <PushCard
                variant="prompt"
                title="Get a reminder before kick-off"
                detail="We'll send one two hours before the game, with the address."
              />
            </>
          ) : isLive(hold.data) ? (
            <>
              {hold.isRefetchError ? (
                <Notice
                  title="We can't reach PitchPadi right now"
                  action={
                    <Button
                      variant="outline"
                      label="Check again"
                      onPress={() => void hold.refetch()}
                    />
                  }
                >
                  <Body>
                    Your time is still held until{" "}
                    {formatInstantTime(hold.data.expiresAt!)}. If you have paid,
                    the booking shows here once you are back online.
                  </Body>
                </Notice>
              ) : null}
              <LiveHold hold={hold.data} onEnd={onEnd} onChanged={onEnd} />
            </>
          ) : (
            <EndedHold hold={hold.data} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Confirmed in the last two minutes (server clock): celebrate; older: just show it. */
function justBooked(hold: Hold) {
  if (!hold.booking) return false;
  return (
    new Date(hold.serverNow).getTime() -
      new Date(hold.booking.confirmedAt).getTime() <
    2 * 60_000
  );
}

function isLive(hold: Hold) {
  return (
    (hold.status === "held" || hold.status === "pending_payment") &&
    hold.expiresAt !== null
  );
}

function awaitingPayment(hold: Hold) {
  return isLive(hold) && hold.payment?.status === "checkout_open";
}

/** Opens the payment page: the in-app test page, or the provider in a browser. */
/**
 * Opens the payment page for an open payment: the in-app test screen when the
 * API's test provider sent one, otherwise the provider's page in the in-app
 * browser. Returns false when there is no page to open (the payment is not open,
 * or the provider never gave a link), so the caller can say so instead.
 */
async function openPayment(payment: {
  attemptId: string;
  status: string;
  checkoutUrl: string | null;
}): Promise<boolean> {
  if (payment.status !== "checkout_open" || !payment.checkoutUrl) return false;
  if (payment.checkoutUrl.startsWith("/pay/test/")) {
    router.push({
      pathname: "/pay/test/[attemptId]",
      params: { attemptId: payment.attemptId },
    });
    return true;
  }
  if (!/^https:\/\//.test(payment.checkoutUrl)) return false;
  await WebBrowser.openBrowserAsync(payment.checkoutUrl);
  return true;
}

const NO_PAYMENT_PAGE =
  "The payment page did not open. Your time is still held; try again.";

function LiveHold({
  hold,
  onEnd,
  onChanged,
}: {
  hold: Hold;
  onEnd: () => void;
  onChanged: () => void;
}) {
  const colors = useColors();
  // A guest finds this checkout again only on this phone (R7).
  const signedIn = useAuth().status === "signedIn";
  const day = dateParts(hold.localDate);
  const until = hold.expiresAt ? formatInstantTime(hold.expiresAt) : "";
  const [payAnotherWay, setPayAnotherWay] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const awaiting =
    awaitingPayment(hold) && !payAnotherWay ? hold.payment : null;
  const [releasing, setReleasing] = useState(false);
  // Kept here, not in the form, so details typed before a failed payment are
  // still there when the form comes back.
  const auth = useAuth();
  const accountPhone =
    auth.status === "signedIn" ? formatPhone(auth.me.user.phone) : "";
  const [draft, setDraft] = useState<Draft>(() => ({
    name: "",
    phone: accountPhone,
    email: "",
    method: "card",
    remember: false,
  }));
  // Details the player asked this phone to remember (RP-01). They only fill
  // empty fields, so nothing typed already is overwritten.
  useEffect(() => {
    let active = true;
    void readPref(DETAILS_KEY).then((raw) => {
      const saved = parseDetails(raw);
      if (!active || !saved) return;
      setDraft((current) => ({
        ...current,
        name: current.name || saved.name,
        phone: current.phone || saved.phone,
        email: current.email || saved.email,
        remember: true,
      }));
    });
    return () => {
      active = false;
    };
  }, []);
  const failed = failedPayment(hold, until);
  const [lowTime, setLowTime] = useState(false);
  const onLow = useCallback(() => setLowTime(true), []);

  async function changeTime() {
    setReleasing(true);
    try {
      await releaseHold(hold.id);
    } catch {
      // The hold ends by itself anyway; never trap the player here.
    } finally {
      setReleasing(false);
    }
    router.replace({
      pathname: "/pitch/[pitchId]",
      params: { pitchId: hold.pitch.id, date: hold.localDate },
    });
  }

  return (
    <>
      <ProgressSteps current={awaiting ? 2 : 1} />
      <PitchBand markings="centre">
        <Heading level={2} style={{ color: colors.onBand }}>
          {awaiting ? "Waiting for your payment" : "Your time is held"}
        </Heading>
        <HoldCountdown
          expiresAt={hold.expiresAt!}
          serverNow={hold.serverNow}
          onEnd={onEnd}
          onLow={onLow}
          color={colors.onBand}
        />
        {lowTime ? (
          <Body
            tone="onBand"
            weight="semibold"
            accessibilityLiveRegion="polite"
          >
            Under 2 minutes left to {awaiting ? "finish paying" : "pay"}.
          </Body>
        ) : null}
        <Body tone="onBandMuted">
          {awaiting
            ? `Finish paying by ${until} and ${hold.localStart} on ${day.long} is yours. This screen updates by itself when the payment arrives.`
            : `Nobody else can book ${hold.localStart} on ${day.long} until ${until}.`}
        </Body>
        <View style={styles.testMode}>
          <Ionicons name="flask-outline" size={15} color={colors.onBandMuted} />
          <Body tone="onBandMuted" size={13}>
            Test mode: no real money moves.
          </Body>
        </View>
      </PitchBand>

      <Card>
        <Heading level={3}>{hold.pitch.facilityName}</Heading>
        <Body tone="muted">
          {hold.pitch.name}, {hold.pitch.type}, {hold.pitch.areaName}
        </Body>
        <Divider />
        <Row label="When">
          {day.long}, {hold.localStart} to {hold.localEnd} (
          {formatDuration(hold.durationMinutes)})
        </Row>
        <Row label="To pay now">
          <Body weight="bold" size={19} numeric>
            {formatNaira(hold.amountDueMinor)}
          </Body>
        </Row>
        <Row label="If plans change">
          {hold.cancellationPolicy.label}.{" "}
          <Body weight="body" tone="muted">
            {hold.cancellationPolicy.summary}
          </Body>
        </Row>
      </Card>

      {awaiting ? (
        <View style={{ gap: space.md }}>
          <View style={styles.waiting}>
            <ActivityIndicator color={colors.link} />
            <Heading level={3} style={{ flex: 1 }}>
              Paying by {METHOD_NAME[awaiting.method]}
            </Heading>
          </View>
          <Body tone="muted">
            {awaiting.method === "bank_transfer"
              ? signedIn
                ? "Bank transfers can take a few minutes to confirm. You can leave this screen: it stays under Not finished in My bookings until the payment lands."
                : "Bank transfers can take a few minutes to confirm. You can leave this screen: on this phone, it stays under My bookings until the payment lands."
              : "Already paid? Your booking shows here as soon as the payment is confirmed."}
          </Body>
          {openError ? (
            <Body tone="danger" accessibilityLiveRegion="assertive">
              {openError}
            </Body>
          ) : null}
          <Button
            label="Open the payment page"
            onPress={async () => {
              setOpenError(null);
              if (!(await openPayment(awaiting))) setOpenError(NO_PAYMENT_PAGE);
              // Back from the payment page: check straight away.
              onChanged();
            }}
          />
          <Button
            variant="ghost"
            label="Pay another way"
            onPress={() => setPayAnotherWay(true)}
            accessibilityHint="Shows the payment form again"
          />
        </View>
      ) : (
        <>
          {failed ? (
            <Notice title={failed.title}>
              <Body accessibilityLiveRegion="polite">{failed.detail}</Body>
            </Notice>
          ) : null}
          <DetailsForm
            hold={hold}
            draft={draft}
            onDraft={setDraft}
            onStarted={() => {
              setPayAnotherWay(false);
              onChanged();
            }}
          />
        </>
      )}

      <Press
        onPress={changeTime}
        disabled={releasing}
        accessibilityRole="button"
        style={styles.textButton}
      >
        <Ionicons name="arrow-back" size={18} color={colors.link} />
        <Body tone="link" weight="semibold">
          {releasing ? "Letting this time go…" : "Choose a different time"}
        </Body>
      </Press>
    </>
  );
}

type Draft = {
  name: string;
  phone: string;
  email: string;
  method: PaymentMethod;
  /** Keep name, phone and email on this phone for next time (opt-in). */
  remember: boolean;
};

function DetailsForm({
  hold,
  draft,
  onDraft,
  onStarted,
}: {
  hold: Hold;
  draft: Draft;
  onDraft: (update: (draft: Draft) => Draft) => void;
  onStarted: () => void;
}) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { name, phone, email, method } = draft;
  const set =
    <K extends keyof Draft>(field: K) =>
    (value: Draft[K]) =>
      onDraft((current) => ({ ...current, [field]: value }));
  const setName = set("name");
  const setPhone = set("phone");
  const setEmail = set("email");
  const setMethod = set("method");
  const setRemember = set("remember");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  // Same key for retries of the same method; a new method needs a new key.
  const key = useRef<{ method: PaymentMethod; value: string } | null>(null);
  // A payment that failed is finished: the next tap is a new attempt.
  const failedId =
    hold.payment?.status === "failed" ? hold.payment.attemptId : null;
  useEffect(() => {
    if (failedId) key.current = null;
  }, [failedId]);

  async function pay() {
    if (key.current?.method !== method)
      key.current = { method, value: newIdempotencyKey() };
    setBusy(true);
    setError(null);
    setErrors({});
    try {
      const response = await startCheckout(
        hold.id,
        { name, phone, email: email.trim() || null, method },
        { headers: { "idempotency-key": key.current.value } },
      );
      if (response.status === 200 || response.status === 201) {
        const checkout: Checkout = response.data.checkout;
        // Only what the player typed, and only if they asked; unticking
        // forgets what was saved before.
        if (draft.remember)
          await writePref(
            DETAILS_KEY,
            JSON.stringify({ name, phone, email: email.trim() }),
          );
        else await removePref(DETAILS_KEY);
        void queryClient.invalidateQueries({ queryKey: ["savedDetails"] });
        onStarted();
        if (!(await openPayment(checkout))) {
          // Never treat a payment without a page as started: the next try
          // uses a new key, so it cannot replay this one.
          key.current = null;
          setError(NO_PAYMENT_PAGE);
        }
        // Back from the payment page: check straight away.
        onStarted();
        return;
      }
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
      else setError(body.error ?? "We could not start the payment.");
      if (response.status === 409) onStarted();
    } catch {
      setError(
        "We could not reach PitchPadi. Your time is still held; try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: space.lg }}>
      <Heading level={3}>Your details</Heading>
      <Field
        label="Name for the booking"
        value={name}
        onChangeText={setName}
        autoComplete="name"
        textContentType="name"
        autoCapitalize="words"
        error={errors.name}
      />
      <Field
        label="Phone number"
        hint="The venue calls this number if anything changes."
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        error={errors.phone}
      />
      <Field
        label="Email (optional)"
        hint="For a receipt."
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        autoCapitalize="none"
        error={errors.email}
      />
      <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
        <Body weight="semibold">How do you want to pay?</Body>
        {METHODS.map((item) => {
          const selected = item.value === method;
          return (
            <Press
              key={item.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              aria-checked={selected}
              onPress={() => setMethod(item.value)}
              style={[
                styles.method,
                {
                  backgroundColor: colors.card,
                  borderColor: selected ? colors.borderStrong : colors.border,
                  borderWidth: selected ? 2 : 1,
                  paddingHorizontal: selected ? space.md - 1 : space.md,
                },
              ]}
            >
              <View
                style={[
                  styles.methodIcon,
                  { backgroundColor: selected ? colors.chosen : colors.muted },
                ]}
              >
                <Ionicons
                  name={METHOD_ICON[item.value]}
                  size={20}
                  color={selected ? colors.onChosen : colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Body weight="semibold">{item.label}</Body>
                <Body tone="muted" size={14}>
                  {item.hint}
                </Body>
              </View>
            </Press>
          );
        })}
        {errors.method ? <Body tone="danger">{errors.method}</Body> : null}
      </View>
      <Press
        accessibilityRole="checkbox"
        accessibilityState={{ checked: draft.remember }}
        aria-checked={draft.remember}
        accessibilityLabel="Remember my details on this phone"
        accessibilityHint="Fills in your name, phone and email next time. You can forget them in Account."
        onPress={() => setRemember(!draft.remember)}
        style={styles.remember}
      >
        <Ionicons
          name={draft.remember ? "checkbox" : "square-outline"}
          size={24}
          color={draft.remember ? colors.link : colors.textMuted}
        />
        <View style={{ flex: 1 }}>
          <Body weight="semibold">Remember my details on this phone</Body>
          <Body tone="muted" size={14}>
            Your name, phone and email fill in next time. Forget them any time
            in Account.
          </Body>
        </View>
      </Press>
      {error ? (
        <Body tone="danger" accessibilityLiveRegion="assertive">
          {error}
        </Body>
      ) : null}
      <Button
        label={`Pay ${formatNaira(hold.amountDueMinor)}`}
        onPress={pay}
        busy={busy}
      />
    </View>
  );
}

function EndedHold({ hold }: { hold: Hold }) {
  return (
    <View style={{ gap: space.lg }}>
      <Notice title="This hold has ended">
        <Body>{endedMessage(hold)}</Body>
      </Notice>
      <Card>
        <Heading level={3}>{hold.pitch.facilityName}</Heading>
        <Body tone="muted">
          {hold.pitch.name}, {dateParts(hold.localDate).long}, {hold.localStart}{" "}
          to {hold.localEnd}
        </Body>
      </Card>
      <HoldAgain hold={hold} />
    </View>
  );
}

/**
 * The quickest way back in after a hold ends: the same time again in one tap
 * if it is still open, otherwise the nearest open times of the same length.
 * The API decides what is open and what it costs.
 */
function HoldAgain({ hold }: { hold: Hold }) {
  const day = useQuery({
    queryKey: ["pitch", hold.pitch.id, hold.localDate],
    queryFn: async () => {
      const response = await getPublicPitch(hold.pitch.id, {
        date: hold.localDate,
      });
      if (response.status !== 200) throw new Error("unavailable");
      return response.data;
    },
  });
  const slot = useHoldSlot(() => void day.refetch());
  const allTimes = () =>
    router.replace({
      pathname: "/pitch/[pitchId]",
      params: {
        pitchId: hold.pitch.id,
        date: hold.localDate,
        duration: String(hold.durationMinutes),
      },
    });
  const again = (startsAt: string) =>
    void slot.hold(
      {
        pitchId: hold.pitch.id,
        startsAt,
        durationMinutes: hold.durationMinutes,
      },
      { fresh: true, replace: true },
    );

  if (day.isPending) return <Skeleton height={56} count={1} />;
  const choices = day.isError
    ? null
    : retryChoices(day.data.startTimes, hold.startsAt, hold.durationMinutes);
  const length = formatDuration(hold.durationMinutes);

  return (
    <View style={{ gap: space.sm }}>
      {choices?.same ? (
        <>
          <Body>
            {hold.localStart} is still open. Hold it again and you get a fresh
            clock.
          </Body>
          <Button
            label={`Hold ${hold.localStart} again, ${formatNaira(choices.same.offer.amountDueMinor)}`}
            busy={slot.isHolding({
              pitchId: hold.pitch.id,
              startsAt: hold.startsAt,
              durationMinutes: hold.durationMinutes,
            })}
            disabled={slot.holding}
            onPress={() => again(hold.startsAt)}
          />
        </>
      ) : choices && choices.nearby.length > 0 ? (
        <>
          <Heading level={3}>
            {hold.localStart} has been taken. Nearest open times ({length})
          </Heading>
          {choices.nearby.map((item) => (
            <Button
              key={item.startsAt}
              variant="outline"
              label={`Hold ${item.localStart}, ${formatNaira(item.offer.amountDueMinor)}`}
              busy={slot.isHolding({
                pitchId: hold.pitch.id,
                startsAt: item.startsAt,
                durationMinutes: hold.durationMinutes,
              })}
              disabled={slot.holding}
              onPress={() => again(item.startsAt)}
            />
          ))}
        </>
      ) : choices ? (
        <Body>
          No {length} times are open at this pitch on that day any more. Try
          another day or a different length.
        </Body>
      ) : null}
      {slot.error ? (
        <Body tone="danger" accessibilityLiveRegion="assertive">
          {slot.error}
        </Body>
      ) : null}
      <Button
        variant={choices?.same || choices?.nearby.length ? "ghost" : "primary"}
        label="See all times at this pitch"
        onPress={allTimes}
      />
    </View>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 2, marginTop: space.sm }}>
      <Body tone="muted" size={14}>
        {label}
      </Body>
      <Body weight="semibold">{children}</Body>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl * 2, gap: space.lg },
  testMode: { flexDirection: "row", alignItems: "center", gap: 6 },
  waiting: { flexDirection: "row", alignItems: "center", gap: space.md },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  method: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: TAP + 16,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  remember: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.sm,
    minHeight: TAP,
    paddingVertical: space.xs,
  },
  textButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    minHeight: TAP,
    alignSelf: "flex-start",
  },
});
