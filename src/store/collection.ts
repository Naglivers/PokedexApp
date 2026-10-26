import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
type Collection = {
  compare: number[];
  team: number[];
  toggleCompare: (id: number) => void;
  addTeam: (id: number) => void;
  removeTeam: (id: number) => void;
  clearCompare: () => void;
};
export const useCollection = create<Collection>()(
  persist(
    (set) => ({
      compare: [],
      team: [],
      toggleCompare: (id) =>
        set((s) => ({
          compare: s.compare.includes(id)
            ? s.compare.filter((x) => x !== id)
            : s.compare.length < 4
              ? [...s.compare, id]
              : s.compare,
        })),
      addTeam: (id) =>
        set((s) => ({
          team:
            s.team.includes(id) || s.team.length === 6
              ? s.team
              : [...s.team, id],
        })),
      removeTeam: (id) =>
        set((s) => ({ team: s.team.filter((x) => x !== id) })),
      clearCompare: () => set({ compare: [] }),
    }),
    {
      name: "atlas-collection-v2",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
