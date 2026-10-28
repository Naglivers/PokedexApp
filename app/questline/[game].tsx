import React from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "../../src/components/ui";
import { useTheme } from "../../src/theme";
import { resolveTrackerGame } from "../../src/services/gameDex";
import { GameIcons } from "../../src/features/tracker/GameIcons";
import { Questline } from "../../src/features/games/Questline";
export default function QuestlineRoute() {
  const { game: raw } = useLocalSearchParams<{ game: string }>();
  const game = Array.isArray(raw) ? raw[0] : raw;
  const entry = resolveTrackerGame(game);
  const router = useRouter();
  const { ui } = useTheme();
  return (
    <View style={ui.page}>
      <Button small variant="ghost" onPress={() => router.push("/games")}>
        ← Jogos
      </Button>
      {entry && <GameIcons versions={entry.versions} size={64} />}
      <Text style={ui.title}>{entry?.title ?? "Questline"}</Text>
      <Text style={ui.subtitle}>
        História principal · Pós-jogo · Missões secundárias
      </Text>
      {game && (
        <View style={ui.panel}>
          <Questline game={game} />
        </View>
      )}
    </View>
  );
}
