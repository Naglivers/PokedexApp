import React from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useTheme } from "../../src/theme";
import { Empty } from "../../src/components/ui";
import { dexTrackers } from "../../src/features/tracker/trackers";
import { DexBoxTracker } from "../../src/features/tracker/DexBoxTracker";
import { GamesdexTracker } from "../../src/features/tracker/GamesdexTracker";

export default function DexTrackerRoute() {
  const { tracker } = useLocalSearchParams<{ tracker: string }>();
  const selected = dexTrackers.find(({ slug }) => slug === tracker);
  const { colors: c, ui } = useTheme();
  const { width } = useWindowDimensions();

  if (!selected) return <Redirect href="/dex-tracker/pokedex" />;
  if (selected.slug === "gamesdex") return <GamesdexTracker />;
  if (
    selected.slug === "pokedex" ||
    selected.slug === "shinydex" ||
    selected.slug === "megadex"
  ) {
    return <DexBoxTracker kind={selected.slug} />;
  }
  const { Icon } = selected;

  return (
    <View style={[ui.page, width < 650 && { padding: 18 }]}>
      <View style={ui.between}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[ui.label, { color: c.accent, marginBottom: 7 }]}>
            DEX TRACKER
          </Text>
          <Text style={ui.title}>{selected.title}</Text>
          <Text style={[ui.subtitle, { marginTop: 6 }]}>
            {selected.description}
          </Text>
        </View>
        <Icon size={30} color={c.accent} strokeWidth={1.5} />
      </View>
      <Empty
        title="Em breve"
        description="Este tracker está em preparação. Em breve você poderá registrar sua coleção e acompanhar seu progresso aqui."
      />
    </View>
  );
}
