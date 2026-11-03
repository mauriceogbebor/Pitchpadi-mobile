import * as Location from "expo-location";
import { useCallback, useState } from "react";
import { type Point, roughPoint } from "@/lib/geo";

export type NearMe =
  | { status: "off" }
  | { status: "finding" }
  | { status: "on"; point: Point }
  | { status: "denied" }
  | { status: "unavailable" };

const TIMEOUT_MS = 10_000;

/**
 * "Near me" for Play (MK-01). Asks for location only when the player taps it,
 * keeps only a rounded point (about 1 km) in memory, and never stores it.
 * A recent last-known position is used first, because it is instant and
 * spares the battery on budget phones.
 */
export function useNearMe() {
  const [state, setState] = useState<NearMe>({ status: "off" });

  const turnOn = useCallback(async (): Promise<boolean> => {
    setState({ status: "finding" });
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setState({ status: "denied" });
        return false;
      }
      const last = await Location.getLastKnownPositionAsync({
        maxAge: 15 * 60 * 1000,
        requiredAccuracy: 3000,
      }).catch(() => null);
      const position =
        last ??
        (await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }),
          new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), TIMEOUT_MS),
          ),
        ]));
      if (!position) {
        setState({ status: "unavailable" });
        return false;
      }
      setState({ status: "on", point: roughPoint(position.coords) });
      return true;
    } catch {
      setState({ status: "unavailable" });
      return false;
    }
  }, []);

  const turnOff = useCallback(() => setState({ status: "off" }), []);
  return { nearMe: state, turnOn, turnOff };
}
