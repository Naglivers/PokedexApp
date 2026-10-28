import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
export type MapPoint = { x: number; y: number };
type State = {
  points: Record<string, MapPoint>;
  setPoint: (key: string, point: MapPoint) => void;
  removePoint: (key: string) => void;
};
export const useMapPoints = create<State>()(
  persist(
    (set) => ({
      points: {},
      setPoint: (key, point) =>
        set((state) => ({
          points: {
            ...state.points,
            [key]: {
              x: Math.max(0, Math.min(1, point.x)),
              y: Math.max(0, Math.min(1, point.y)),
            },
          },
        })),
      removePoint: (key) =>
        set((state) => {
          const points = { ...state.points };
          delete points[key];
          return { points };
        }),
    }),
    {
      name: "pokeatlas-map-points-v1",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
