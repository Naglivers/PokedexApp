import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import {
  AccountError,
  authenticate,
  fetchAccount,
  revokeAccount,
  updateAccount,
  type AccountSession,
} from "../../services/account";
import {
  cacheSession,
  clearCachedSession,
  readCachedSession,
} from "./sessionCache";
import { supabase } from "../../services/supabase";

type AuthState = {
  session: AccountSession | null;
  loading: boolean;
  syncError: string | null;
  signIn: (n: string, p: string) => Promise<void>;
  signUp: (n: string, p: string) => Promise<void>;
  signOut: () => Promise<void>;
  saveProfile: (email: string, avatar: string | null) => Promise<void>;
  refreshProfile: () => Promise<void>;
};
const Context = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AccountSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const current = useRef<AccountSession | null>(null);
  const generation = useRef(0);
  const commit = useCallback((next: AccountSession | null) => {
    current.current = next;
    setSession(next);
  }, []);
  const refreshProfile = useCallback(async () => {
    const active = current.current;
    if (!active) return;
    try {
      const user = await fetchAccount(active.token);
      if (current.current?.token !== active.token) return;
      const next = { ...active, user };
      await cacheSession(next);
      if (current.current?.token === active.token) {
        commit(next);
        setSyncError(null);
      }
    } catch (error) {
      if (current.current?.token !== active.token) return;
      if (error instanceof AccountError && error.code === "session_expired") {
        commit(null);
        await clearCachedSession();
      }
      setSyncError(
        error instanceof Error
          ? error.message
          : "Não foi possível sincronizar seu perfil.",
      );
    }
  }, [commit]);
  useEffect(() => {
    let mounted = true;
    const revision = generation.current;
    void readCachedSession()
      .then((cached) => {
        if (!mounted || generation.current !== revision) return;
        commit(cached);
        setLoading(false);
        if (cached) void refreshProfile();
      })
      .catch(() => {
        if (mounted) {
          setLoading(false);
          setSyncError("Não foi possível ler o login salvo.");
        }
      });
    return () => {
      mounted = false;
      generation.current++;
    };
  }, [commit, refreshProfile]);
  useEffect(() => {
    if (!session) return;
    // Expired cached logins must disappear even if the device stays offline.
    const remaining = Date.parse(session.expires_at) - Date.now();
    const expiryTimer = setInterval(
      () => {
        if (Date.parse(session.expires_at) <= Date.now()) {
          commit(null);
          void clearCachedSession().catch(() => {});
        }
      },
      Math.max(1000, Math.min(remaining, 60000)),
    );
    const refresh = () => {
      if (AppState.currentState === "active") void refreshProfile();
    };
    if (AppState.currentState === "active") supabase?.auth.startAutoRefresh();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        supabase?.auth.startAutoRefresh();
        refresh();
      } else supabase?.auth.stopAutoRefresh();
    });
    return () => {
      clearInterval(expiryTimer);
      subscription.remove();
      supabase?.auth.stopAutoRefresh();
    };
  }, [session?.token, session?.expires_at, refreshProfile, commit]);
  const enter = async (
    nickname: string,
    password: string,
    register: boolean,
  ) => {
    generation.current++;
    const next = await authenticate(nickname, password, register);
    await cacheSession(next);
    commit(next);
    setSyncError(null);
    // The old local password hash is no longer used after a successful server login.
    await AsyncStorage.multiRemove([
      "pokeatlas-local-account",
      "pokeatlas-local-session",
    ]).catch(() => {});
  };
  const saveProfile = async (email: string, avatar: string | null) => {
    const active = current.current;
    if (!active)
      throw new AccountError(
        "session_expired",
        "Entre novamente para salvar seu perfil.",
      );
    try {
      const user = await updateAccount(active.token, email, avatar);
      if (current.current?.token !== active.token) return;
      const next = { ...active, user };
      await cacheSession(next);
      if (current.current?.token === active.token) {
        commit(next);
        setSyncError(null);
      }
    } catch (error) {
      if (
        error instanceof AccountError &&
        error.code === "session_expired" &&
        current.current?.token === active.token
      ) {
        commit(null);
        await clearCachedSession();
      }
      throw error;
    }
  };
  const signOut = async () => {
    generation.current++;
    const active = current.current;
    commit(null);
    setSyncError(null);
    await clearCachedSession();
    // Going offline must not prevent signing out of this device.
    if (active) await revokeAccount(active.token).catch(() => {});
  };
  return (
    <Context.Provider
      value={{
        session,
        loading,
        syncError,
        signIn: (n, p) => enter(n, p, false),
        signUp: (n, p) => enter(n, p, true),
        signOut,
        saveProfile,
        refreshProfile,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("useAuth requires AuthProvider");
  return value;
}
