import React from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import {
  Award,
  ChevronRight,
  Gem,
  ScanLine,
  Sparkles,
} from "lucide-react-native";
import { trackerGames } from "../../services/gameDex";
import type { PublicProfile } from "../../services/publicProfile";
import { useTheme } from "../../theme";
import { GameIcons } from "../tracker/GameIcons";
import { megaTotal } from "../tracker/megaDex";

export function ProfilePokedexes({
  profile,
  total,
}: {
  profile: PublicProfile;
  total: number;
}) {
  const { colors: c, ui } = useTheme();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const collections = [
    {
      key: "megadex",
      title: "Megadex Tracker",
      kind: "megadex",
      count: profile.trackers.megadex,
      total: megaTotal,
      icon: <Gem size={25} color={c.accent} />,
      game: undefined,
    },
    {
      key: "pokedex",
      title: "Pokédex Tracker",
      kind: "pokedex",
      count: profile.trackers.pokedex,
      total,
      icon: <ScanLine size={25} color={c.accent} />,
      game: undefined,
    },
    {
      key: "shinydex",
      title: "Shinydex Tracker",
      kind: "shinydex",
      count: profile.trackers.shinydex,
      total,
      icon: <Sparkles size={25} color={c.accent} />,
      game: undefined,
    },
    ...trackerGames.map((game) => ({
      key: game.key,
      title: game.title,
      kind: "gamesdex",
      count: profile.games[game.key] ?? 0,
      total: game.total,
      icon: <GameIcons versions={game.versions} />,
      game: game.key,
    })),
  ];
  return (
    <View style={{ gap: 16 }}>
      <Text style={ui.sectionTitle}>Pokédexes de {profile.nickname}</Text>
      <Text style={ui.subtitle}>
        Clique em uma coleção para ver os Pokémon capturados por este treinador.
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {collections.map((item) => {
          const complete = item.total > 0 && item.count >= item.total;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="link"
              accessibilityLabel={`Ver ${item.title} de ${profile.nickname}`}
              onPress={() =>
                router.push({
                  pathname: "/u/[nickname]/collection",
                  params: {
                    nickname: profile.nickname,
                    tracker: item.kind,
                    ...(item.game ? { game: item.game } : {}),
                  },
                })
              }
              style={({ pressed }) => ({
                width: width >= 850 ? "48%" : "100%",
                padding: 18,
                borderWidth: 1,
                borderColor: complete ? c.gold : c.line,
                borderRadius: 14,
                backgroundColor: pressed ? c.surfaceHover : c.surface,
                gap: 12,
              })}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                {item.icon}
                <Text style={[ui.sectionTitle, { flex: 1, fontSize: 13 }]}>
                  {item.title}
                </Text>
                {complete && <Award size={20} color={c.gold} />}
                <ChevronRight size={16} color={c.muted} />
              </View>
              <Text style={ui.subtitle}>
                {Math.min(item.count, item.total)} / {item.total} capturados
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
