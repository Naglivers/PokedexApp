import React, { useCallback } from "react";
import {
  FlatList,
  Pressable,
  Text,
  View,
  useWindowDimensions,
  type ListRenderItemInfo,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Award } from "lucide-react-native";
import { Button, Select } from "../../components/ui";
import { useAuth } from "../auth/AuthProvider";
import { useTheme, useThemedStyles } from "../../theme";
import {
  trackerGames,
  resolveTrackerGame,
  type TrackerGame,
} from "../../services/gameDex";
import { getGamesdexSummary } from "../../services/tracker";
import { createTrackerStyles } from "./trackerStyles";
import { DexBoxTracker } from "./DexBoxTracker";
import { GameIcons } from "./GameIcons";

const gameKey = (game: TrackerGame) => game.key;
export function GamesdexTracker() {
  const { game: gameParam, dex: dexParam } = useLocalSearchParams<{
    game?: string;
    dex?: string;
  }>();
  const { session } = useAuth();
  const { colors: c, ui } = useTheme();
  const s = useThemedStyles(createTrackerStyles);
  const { width } = useWindowDimensions();
  const router = useRouter();
  const columns = width >= 1000 ? 4 : 2;
  const summary = useQuery({
    queryKey: ["gamesdex-summary", session?.user.id],
    queryFn: ({ signal }) => getGamesdexSummary(session!.token, signal),
    enabled: !!session,
    staleTime: 60000,
    refetchOnMount: "always",
    retry: false,
    refetchOnWindowFocus: true,
  });
  const selectedGame = resolveTrackerGame(gameParam);
  const selectedDex =
    selectedGame?.dexes.find(({ key }) => key === dexParam) ??
    selectedGame?.dexes[0];
  const openGame = useCallback(
    (game: TrackerGame, dex = game.dexes[0].key) => {
      router.push({
        pathname: "/dex-tracker/gamesdex",
        params: { game: game.key, dex },
      });
    },
    [router],
  );
  const renderGame = useCallback(
    ({ item }: ListRenderItemInfo<TrackerGame>) => {
      const count = Math.min(summary.data?.[item.key] ?? 0, item.total);
      const complete =
        !!session &&
        summary.isSuccess &&
        item.total > 0 &&
        count === item.total;
      const percent = item.total ? Math.floor((count / item.total) * 100) : 0;
      return (
        <View style={{ width: `${100 / columns}%`, padding: 7 }}>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={"Abrir tracker de " + item.title}
            onPress={() => openGame(item)}
            style={({ hovered }: { hovered?: boolean; pressed: boolean }) => ({
              aspectRatio: 1.4,
              padding: width < 650 ? 10 : 14,
              justifyContent: "space-between",
              gap: 6,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: complete ? c.gold : c.line,
              backgroundColor: hovered ? c.surfaceHover : c.surface,
            })}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <GameIcons versions={item.versions} />
              <Text
                numberOfLines={3}
                style={[
                  ui.sectionTitle,
                  { flex: 1, fontSize: width < 650 ? 12 : 14 },
                ]}
              >
                {item.title}
              </Text>
              {complete && (
                <View
                  accessibilityRole="image"
                  accessibilityLabel={"Medalha de " + item.title}
                  style={{
                    padding: 7,
                    borderRadius: 10,
                    backgroundColor: c.goldSoft,
                  }}
                >
                  <Award size={24} color={c.gold} />
                </View>
              )}
            </View>
            <Text
              numberOfLines={2}
              style={[
                s.progressCount,
                { fontSize: width < 650 ? 11 : 13 },
                complete && { color: c.gold },
              ]}
            >
              {session && summary.isPending
                ? "Carregando progresso…"
                : summary.isError
                  ? "Progresso indisponível"
                  : count + " / " + item.total + " · " + percent + "%"}
            </Text>
            <View style={s.progressTrack}>
              <View
                style={[
                  s.progressFill,
                  {
                    width: (percent + "%") as `${number}%`,
                    backgroundColor: complete ? c.gold : c.accent,
                  },
                ]}
              />
            </View>
            <Text
              numberOfLines={2}
              style={[
                s.status,
                { fontSize: 10 },
                complete && { color: c.gold },
              ]}
            >
              {complete
                ? "Conjunto completo!"
                : item.parentGame
                  ? "DLC · progresso independente"
                  : "Jogo base · obtenção normal"}
            </Text>
          </Pressable>
        </View>
      );
    },
    [
      summary.data,
      summary.isSuccess,
      summary.isPending,
      summary.isError,
      session,
      c,
      ui,
      s,
      openGame,
      columns,
      width,
    ],
  );

  if (selectedGame && selectedDex) {
    const complete =
      !!session &&
      summary.isSuccess &&
      (summary.data[selectedGame.key] ?? 0) >= selectedGame.total;
    return (
      <DexBoxTracker
        kind="gamesdex"
        game={selectedGame}
        pokedex={selectedDex}
        navigation={
          <View style={{ gap: 12, marginBottom: 24 }}>
            <View style={{ alignItems: "flex-start" }}>
              <Button
                small
                variant="ghost"
                icon={<ArrowLeft size={14} color={c.muted} />}
                onPress={() => router.replace("/dex-tracker/gamesdex")}
              >
                Todos os conjuntos
              </Button>
            </View>
            <Select
              label="Escolher jogo ou DLC"
              value={selectedGame.key}
              options={trackerGames.map((game) => ({
                value: game.key,
                label: game.title,
              }))}
              onChange={(value) => {
                const game = trackerGames.find(({ key }) => key === value);
                if (game) openGame(game);
              }}
            />
            <Select
              label="Pokédex do jogo"
              value={selectedDex.key}
              options={selectedGame.dexes.map((dex) => ({
                value: dex.key,
                label: dex.title + " · " + dex.total + " Pokémon",
              }))}
              onChange={(value) => openGame(selectedGame, value)}
            />
            {complete && (
              <View style={s.medal}>
                <Award size={26} color={c.gold} />
                <Text style={s.medalTitle}>{selectedGame.title} completo!</Text>
              </View>
            )}
          </View>
        }
      />
    );
  }

  const completed = trackerGames.filter(
    (game) => game.total > 0 && (summary.data?.[game.key] ?? 0) >= game.total,
  ).length;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <FlatList<TrackerGame>
        key={columns}
        data={trackerGames}
        keyExtractor={gameKey}
        renderItem={renderGame}
        numColumns={columns}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 7, gap: 10, marginBottom: 18 }}>
            <Text style={s.eyebrow}>DEX TRACKER</Text>
            <Text style={ui.title}>Livingdex</Text>
            <Text style={ui.subtitle}>
              Escolha um conjunto, como Red / Blue ou Ruby / Sapphire. Yellow e
              Emerald ficam separados. As DLCs têm cards, progresso e medalhas
              próprios. Só contam Pokémon obtidos por captura, presentes, ovos e
              evolução no próprio conjunto, sem eventos ou transferências.
            </Text>
            <Text style={s.progressCount}>
              {completed} / {trackerGames.length} medalhas de conjuntos
            </Text>
            {!session && (
              <Button
                small
                variant="outline"
                onPress={() => router.push("/login")}
              >
                Entre para salvar seu progresso
              </Button>
            )}
            {summary.isError && (
              <View style={s.error}>
                <Text style={s.errorText}>{summary.error.message}</Text>
                <Button
                  small
                  variant="ghost"
                  onPress={() => {
                    void summary.refetch();
                  }}
                >
                  Tentar novamente
                </Button>
              </View>
            )}
          </View>
        }
        contentContainerStyle={{
          padding: width < 650 ? 12 : 24,
          maxWidth: 1100,
          width: "100%",
          alignSelf: "center",
        }}
        initialNumToRender={8}
        maxToRenderPerBatch={4}
        windowSize={5}
      />
    </View>
  );
}
