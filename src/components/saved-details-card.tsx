import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Body, Button, Card, Heading } from "@/components/ui";
import { readPref, removePref } from "@/lib/prefs-store";
import { DETAILS_KEY, parseDetails } from "@/lib/returning";
import { space } from "@/theme/tokens";

const KEY = ["savedDetails"] as const;

/**
 * Checkout details this phone remembers because the player asked (RP-01),
 * with a way to forget them. Shown only when something is saved.
 */
export function SavedDetailsCard() {
  const queryClient = useQueryClient();
  const saved = useQuery({
    queryKey: KEY,
    queryFn: async () => parseDetails(await readPref(DETAILS_KEY)),
    // Checkout may have saved new details since this screen last looked.
    staleTime: 0,
  });
  if (!saved.data) return null;
  const { name, phone, email } = saved.data;
  const summary = [name, phone, email].filter((part) => part.trim()).join(", ");
  return (
    <Card style={{ gap: space.sm }}>
      <Heading level={3}>Details saved on this phone</Heading>
      <Body tone="muted">Checkout fills these in for you: {summary}.</Body>
      <Button
        variant="outline"
        icon="trash-outline"
        label="Forget my details"
        onPress={async () => {
          await removePref(DETAILS_KEY);
          queryClient.setQueryData(KEY, null);
        }}
      />
    </Card>
  );
}
