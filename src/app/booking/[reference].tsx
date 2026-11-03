import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { getPublicBooking } from "@/api/generated";
import { BookedCard } from "@/components/booked-card";
import { HelpCard } from "@/components/help-card";
import { Body, Button, Notice, Screen, Skeleton } from "@/components/ui";

/** One booking from My bookings (or a shared team link opened in the app). */
export default function BookingScreen() {
  const { reference, shared } = useLocalSearchParams<{
    reference: string;
    shared?: string;
  }>();
  const booking = useQuery({
    queryKey: ["booking", reference],
    queryFn: async () => {
      const response = await getPublicBooking(reference);
      if (response.status === 404)
        throw new Error("We could not find this booking.");
      if (response.status !== 200)
        throw new Error("We could not load this booking.");
      return response.data.booking;
    },
  });

  return (
    <Screen edges={["bottom"]}>
      {booking.isPending ? (
        <Skeleton height={320} count={1} />
      ) : booking.isError ? (
        <Notice
          tone="danger"
          title={booking.error.message}
          action={
            <Button
              variant="outline"
              label="Try again"
              onPress={() => void booking.refetch()}
            />
          }
        >
          <Body>Check the reference and your connection.</Body>
        </Notice>
      ) : (
        <>
          <BookedCard
            booking={booking.data}
            shared={shared === "1"}
            // The terms saved when the booking was made (R7), as at checkout.
            policy={booking.data.cancellationPolicy}
          />
          <HelpCard
            reference={booking.data.reference}
            active={booking.data.status === "confirmed"}
          />
          {booking.data.pitch.bookable ? (
            <Button
              variant="outline"
              icon="repeat"
              label="Book this again"
              accessibilityHint="The same pitch, day and time in the coming weeks"
              onPress={() =>
                router.push({
                  pathname: "/rebook",
                  params: {
                    pitchId: booking.data.pitch.id,
                    startsAt: booking.data.startsAt,
                    duration: String(booking.data.durationMinutes),
                  },
                })
              }
            />
          ) : null}
        </>
      )}
    </Screen>
  );
}
