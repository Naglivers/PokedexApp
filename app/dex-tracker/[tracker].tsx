import React from "react";
import { Redirect, useLocalSearchParams } from "expo-router";
import { dexTrackers } from "../../src/features/tracker/trackers";
import { DexBoxTracker } from "../../src/features/tracker/DexBoxTracker";
import { GamesdexTracker } from "../../src/features/tracker/GamesdexTracker";

export default function DexTrackerRoute() {
  const { tracker } = useLocalSearchParams<{ tracker: string }>();
  const selected = dexTrackers.find(({ slug }) => slug === tracker);

  if (!selected) return <Redirect href="/dex-tracker/pokedex" />;
  if (selected.slug === "gamesdex") return <GamesdexTracker />;
  return <DexBoxTracker kind={selected.slug} />;
}
