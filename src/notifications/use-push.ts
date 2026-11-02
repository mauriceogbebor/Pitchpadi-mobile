import { useCallback, useEffect, useState } from "react";
import { pushState, turnOffPush, turnOnPush, type PushState } from "./push";

/** This phone's notification state, with turn on and off. */
export function usePush() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void pushState()
      .then((next) => alive && setState(next))
      .catch(() => alive && setState({ kind: "off" }));
    return () => {
      alive = false;
    };
  }, []);

  const run = useCallback(async (action: () => Promise<PushState>) => {
    setBusy(true);
    setError(null);
    try {
      setState(await action());
    } catch {
      setError(
        "We could not turn on notifications. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    state,
    busy,
    error,
    turnOn: () => run(turnOnPush),
    turnOff: () => run(turnOffPush),
  };
}
