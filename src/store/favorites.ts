import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
type FavoritesState = {
  ids: number[];
  toggle: (id: number) => void;
  has: (id: number) => boolean;
};
export const useFavorites = create<FavoritesState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) =>
        set((state) => ({
          ids: state.ids.includes(id)
            ? state.ids.filter((value) => value !== id)
            : [...state.ids, id],
        })),
      has: (id) => get().ids.includes(id),
    }),
    {
      name: "pokedex-favorites",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
