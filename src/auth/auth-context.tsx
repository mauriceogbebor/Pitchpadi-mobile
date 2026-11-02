import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getMe, logout, logoutEverywhere, type Me } from "@/api/generated";
import { setSignedOutHandler } from "@/api/fetch";
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
    setSignedOutHandler(() => setState({ status: "signedOut" }));
    // State changes only after reading secure storage and the network (async),
    // never synchronously during this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    return () => setSignedOutHandler(null);
  }, [refresh]);

  const signIn = useCallback(
    async (token: string) => {
      await saveToken(token);
      await refresh();
    },
    [refresh],
  );

  const signOut = useCallback(async (everywhere = false) => {
    try {
      await (everywhere ? logoutEverywhere() : logout());
    } catch {
      // Signing out on this phone must work offline; the server session expires.
    }
    await clearToken();
    setState({ status: "signedOut" });
  }, []);

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
