import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useAuth } from "../features/auth/AuthProvider";

export type FavoriteResource = "move" | "ability" | "item";
export type ResourceFavorite = {
  resource: FavoriteResource;
  id: string;
  name: string;
};
export function isFavoriteResource(value: string): value is FavoriteResource {
  return value === "move" || value === "ability" || value === "item";
}
type State = {
  accounts: Record<string, ResourceFavorite[]>;
  toggle: (account: string, entry: ResourceFavorite) => void;
};
const empty: ResourceFavorite[] = [];
export const useResourceFavorites = create<State>()(
  persist(
    (set) => ({
      accounts: {},
      toggle: (account, entry) =>
        set((state) => {
          const entries = state.accounts[account] ?? empty;
          const exists = entries.some(
            (value) =>
              value.resource === entry.resource && value.id === entry.id,
          );
          return {
            accounts: {
              ...state.accounts,
              [account]: exists
                ? entries.filter(
                    (value) =>
                      value.resource !== entry.resource ||
                      value.id !== entry.id,
                  )
                : [...entries, entry],
            },
          };
        }),
    }),
    {
      name: "pokeatlas-resource-favorites-v1",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export function useSavedResources() {
  const { session } = useAuth();
  const account = session?.user.id ?? "guest";
  const entries = useResourceFavorites(
    (state) => state.accounts[account] ?? empty,
  );
  const toggle = useResourceFavorites((state) => state.toggle);
  return {
    entries,
    toggle: (entry: ResourceFavorite) => toggle(account, entry),
  };
}
