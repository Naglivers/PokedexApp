import React, { createContext, useContext, useEffect } from "react";
import { AppState, Platform } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "expo-router";
import {
  ensureCommunitySession,
  getCommunityOverview,
  getMyLikes,
  trackPage,
} from "../../services/community";
import { supabase, supabaseConfigured } from "../../services/supabase";

type State = {
  ready: boolean;
  authenticated: boolean;
  likedIds: number[];
  error: Error | null;
};
const Context = createContext<State>({
  ready: false,
  authenticated: false,
  likedIds: [],
  error: null,
});
export const overviewOptions = {
  queryKey: ["community", "overview"],
  queryFn: getCommunityOverview,
  enabled: supabaseConfigured,
  staleTime: 60000,
  retry: false,
  retryOnMount: false,
};
const tracked = new Set<string>();
export function CommunityProvider({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const client = useQueryClient();
  const overview = useQuery(overviewOptions);
  // No account/session is created until the database schema has been installed.
  const session = useQuery({
    queryKey: ["community", "session"],
    queryFn: ensureCommunitySession,
    enabled: overview.isSuccess,
    staleTime: Infinity,
    retry: false,
    retryOnMount: false,
  });
  const likes = useQuery({
    queryKey: ["community", "my-likes"],
    queryFn: getMyLikes,
    enabled: session.isSuccess,
    staleTime: 60000,
    retry: false,
    retryOnMount: false,
  });
  useEffect(() => {
    if (!session.data || !overview.isSuccess) return;
    const key = `${session.data.user.id}:${new Date().toISOString().slice(0, 10)}:${path}`;
    if (tracked.has(key)) return;
    let active = true;
    trackPage(path)
      .then(() => {
        tracked.add(key);
        if (active)
          void client.invalidateQueries({
            queryKey: ["community", "overview"],
          });
      })
      .catch(() => {
        /* Analytics never prevents navigation or PokéAPI access. */
      });
    return () => {
      active = false;
    };
  }, [path, session.data?.user.id, overview.isSuccess, client]);
  useEffect(() => {
    if (Platform.OS === "web" || !supabase || !session.isSuccess) return;
    const service = supabase;
    if (AppState.currentState === "active") service.auth.startAutoRefresh();
    const listener = AppState.addEventListener("change", (state) =>
      state === "active"
        ? service.auth.startAutoRefresh()
        : service.auth.stopAutoRefresh(),
    );
    return () => {
      listener.remove();
      service.auth.stopAutoRefresh();
    };
  }, [session.isSuccess]);
  return (
    <Context.Provider
      value={{
        ready: overview.isSuccess,
        authenticated: session.isSuccess && likes.isSuccess,
        likedIds: likes.data ?? [],
        error: overview.error ?? session.error ?? likes.error,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useCommunity() {
  return useContext(Context);
}
