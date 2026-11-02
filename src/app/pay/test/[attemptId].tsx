import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { getTestPayment, simulateTestPayment } from "@/api/generated";
import { ProgressSteps } from "@/components/progress-steps";
import {
  Body,
  Button,
  Card,
  Divider,
  Heading,
  Notice,
  Screen,
  Skeleton,
} from "@/components/ui";
import { dateParts, formatNaira } from "@/lib/format";
import { space } from "@/theme/tokens";

const METHOD_NAME = {
  card: "Card",
  bank_transfer: "Bank transfer",
  ussd: "USSD",
} as const;

/**
 * Test mode only: stands in for the payment provider's page until Paystack is
 * connected (L-03). The API answers 404 here outside test mode. Paying sends a
 * signed provider event, so the booking is confirmed exactly as a real payment
 * would confirm it: by the webhook, never by the app.
 */
export default function TestPaymentScreen() {
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<"success" | "failure" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const payment = useQuery({
    queryKey: ["testPayment", attemptId],
    queryFn: async () => {
      const response = await getTestPayment(attemptId);
      if (response.status !== 200)
        throw new Error("Test payments are switched off.");
      return response.data.payment;
    },
  });

  async function send(outcome: "success" | "failure") {
    setBusy(outcome);
    setError(null);
    try {
      const response = await simulateTestPayment(attemptId, { outcome });
      if (response.status !== 200) {
        setError(
          (response.data as { error?: string }).error ??
            "That did not work. Try again.",
        );
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: ["hold", response.data.holdId],
      });
      if (router.canGoBack()) router.back();
    } catch {
      setError("We could not reach PitchPadi. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen edges={["bottom"]}>
      <ProgressSteps current={2} />
      <Notice title="Test payment">
        <Body>
          This screen stands in for Paystack while PitchPadi is in test mode. No
          real money moves.
        </Body>
      </Notice>
      {payment.isPending ? (
        <Skeleton height={140} count={1} />
      ) : payment.isError ? (
        <Notice tone="danger" title={payment.error.message} />
      ) : (
        <>
          <Card>
            <Body tone="muted" size={14}>
              Paying {payment.data.facilityName}
            </Body>
            <Heading style={{ fontVariant: ["tabular-nums"] }}>
              {formatNaira(payment.data.amountMinor)}
            </Heading>
            <Divider />
            <Body numeric>
              {dateParts(payment.data.localDate).long},{" "}
              {payment.data.localStart}
            </Body>
            <Body tone="muted" numeric size={14}>
              {METHOD_NAME[payment.data.method]}, reference{" "}
              {payment.data.reference}
            </Body>
          </Card>
          {payment.data.status !== "checkout_open" ? (
            <Notice title="This payment is already finished">
              <Button
                variant="outline"
                label="Back to your booking"
                onPress={() => router.back()}
              />
            </Notice>
          ) : (
            <View style={{ gap: space.sm }}>
              {error ? (
                <Body tone="danger" accessibilityLiveRegion="assertive">
                  {error}
                </Body>
              ) : null}
              <Button
                label={`Pay ${formatNaira(payment.data.amountMinor)}`}
                onPress={() => void send("success")}
                busy={busy === "success"}
                disabled={busy !== null}
              />
              <Button
                variant="outline"
                label="Make the payment fail"
                onPress={() => void send("failure")}
                busy={busy === "failure"}
                disabled={busy !== null}
              />
            </View>
          )}
        </>
      )}
    </Screen>
  );
}
