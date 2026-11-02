import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getMe, logout, logoutEverywhere, type Me } from "@/api/generated";
import { setSignedOutHandler } from "@/api/fetch";
import { forgetPushOnThisPhone } from "@/notifications/push";
import { clearToken, readToken, saveToken } from "./token-store";

type AuthState =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "signedIn"; me: Me }
  /** Signed in, but we could not reach the API to load the account. */
  | { status: "offline" };

type Auth = AuthState & {
  signIn: (token: string) => Promise<void>;
  signOut: (everywhere?: boolean) => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });
  const queryClient = useQueryClient();
  // Cached answers can hold one account's bookings, holds and venue calendars.
  // Drop them whenever the account changes, so the next person on this phone
  // never sees them, even for the moment a refresh takes.
  const forgetAccountData = useCallback(() => {
    void queryClient.cancelQueries();
    queryClient.clear();
  }, [queryClient]);

  const refresh = useCallback(async () => {
    const token = await readToken();
    if (!token) return setState({ status: "signedOut" });
    try {
      const response = await getMe();
      if (response.status === 200)
        setState({ status: "signedIn", me: response.data });
      else setState({ status: "signedOut" });
    } catch {
      // Keep the token: the network is down, not the session.
      setState({ status: "offline" });
    }
  }, []);

  useEffect(() => {
    setSignedOutHandler(() => {
      forgetAccountData();
      setState({ status: "signedOut" });
    });
    // State changes only after reading secure storage and the network (async),
    // never synchronously during this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    return () => setSignedOutHandler(null);
  }, [refresh, forgetAccountData]);

  const signIn = useCallback(
    async (token: string) => {
      forgetAccountData();
      await saveToken(token);
      await refresh();
    },
    [refresh, forgetAccountData],
  );

  const signOut = useCallback(
    async (everywhere = false) => {
      // First, while still signed in: this phone stops getting this account's
      // notifications, even if the sign-out request below cannot reach PitchPadi.
      await forgetPushOnThisPhone().catch(() => undefined);
      try {
        await (everywhere ? logoutEverywhere() : logout());
      } catch {
        // Signing out on this phone must work offline; the server session expires.
      }
      await clearToken();
      forgetAccountData();
      setState({ status: "signedOut" });
    },
    [forgetAccountData],
  );

  const value = useMemo(
    () => ({ ...state, signIn, signOut, refresh }),
    [state, signIn, signOut, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
