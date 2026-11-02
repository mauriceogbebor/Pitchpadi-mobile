import { Redirect, useLocalSearchParams } from "expo-router";

/** A shared pitch link (…/pitches/<id>?date=…) opened in the app. */
export default function PitchLink() {
  const { pitchId, date, start } = useLocalSearchParams<{
    pitchId: string;
    date?: string;
    start?: string;
  }>();
  return (
    <Redirect
      href={{
        pathname: "/pitch/[pitchId]",
        params: {
          pitchId,
          ...(date ? { date } : {}),
          ...(start ? { start } : {}),
        },
      }}
    />
  );
}
