import { Redirect, useLocalSearchParams } from "expo-router";

/**
 * A team link shared on WhatsApp (pitchpadi.…/b/PP-…), opened in the app via
 * App Links or Universal Links: show the booking.
 */
export default function TeamLink() {
  const { reference } = useLocalSearchParams<{ reference: string }>();
  return (
    <Redirect
      href={{
        pathname: "/booking/[reference]",
        params: { reference, shared: "1" },
      }}
    />
  );
}
