import React, { useMemo } from "react";
import { FlatList, Text, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Button, Empty, ErrorState, Loading } from "../../../src/components/ui";
import { useTheme } from "../../../src/theme";
import {
  getPublicTracker,
  publicProfilePath,
} from "../../../src/services/publicProfile";
import { getGamePokedex, trackerGames } from "../../../src/services/gameDex";
import { indexOptions } from "../../../src/services/queries";
import { createMegaBoxes } from "../../../src/features/tracker/megaDex";
import {
  createTrackerBoxes,
  type BoxPokemon,
} from "../../../src/features/tracker/boxes";
import {
  TrackerBox,
  trackerBoxMask,
} from "../../../src/features/tracker/TrackerBox";

const noop = () => {};
export default function PublicCollectionRoute() {
  const params = useLocalSearchParams<{
    nickname: string;
    tracker: string;
    game?: string;
  }>();
  const nickname = typeof params.nickname === "string" ? params.nickname : "";
  const kind =
    params.tracker === "shinydex"
      ? "shinydex"
      : params.tracker === "megadex"
        ? "megadex"
        : params.tracker === "gamesdex"
          ? "gamesdex"
          : "pokedex";
  const game = trackerGames.find((item) => item.key === params.game);
  const valid =
    /^[A-Za-z0-9_]{3,20}$/.test(nickname) &&
    ["pokedex", "shinydex", "megadex", "gamesdex"].includes(params.tracker) &&
    (kind !== "gamesdex" || !!game);
  const { colors: c, ui } = useTheme();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const national = useQuery({
    ...indexOptions("pokemon-species"),
    enabled: valid && kind !== "gamesdex" && kind !== "megadex",
  });
  const regional = useQuery({
    queryKey: ["game-pokedex", game?.key, "obtainable", "regional-order-v1"],
    queryFn: ({ signal }) => getGamePokedex("obtainable", signal, game!.key),
    enabled: valid && kind === "gamesdex",
    staleTime: 86400000,
  });
  const progress = useQuery({
    queryKey: ["public-tracker", nickname.toLowerCase(), kind, game?.key],
    queryFn: ({ signal }) =>
      getPublicTracker(
        nickname,
        kind,
        kind === "gamesdex" ? game?.key : undefined,
        signal,
      ),
    enabled: valid,
    staleTime: 0,
    retry: false,
  });
  const mega = useQuery({
    queryKey: ["mega-catalog"],
    queryFn: async () => createMegaBoxes(),
    enabled: valid && kind === "megadex",
    staleTime: Infinity,
  });
  const boxes = useMemo(
    () =>
      kind === "gamesdex"
        ? (regional.data ?? [])
        : kind === "megadex"
          ? (mega.data ?? [])
          : createTrackerBoxes(national.data?.results ?? []),
    [kind, regional.data, national.data, mega.data],
  );
  const marked = useMemo(() => new Set(progress.data ?? []), [progress.data]);
  const species =
    kind === "gamesdex" ? regional : kind === "megadex" ? mega : national;
  if (!valid)
    return (
      <Empty
        title="Coleção não encontrada"
        description="Confira o treinador e a coleção escolhida."
      />
    );
  if (species.isPending || progress.isPending)
    return <Loading text="Carregando coleção do treinador…" />;
  if (species.isError || progress.isError)
    return (
      <ErrorState
        retry={() => {
          void species.refetch();
          void progress.refetch();
        }}
      />
    );
  const total = boxes.reduce((sum, box) => sum + box.length, 0);
  const captured = boxes.reduce(
    (sum, box) => sum + box.filter((pokemon) => marked.has(pokemon.id)).length,
    0,
  );
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <FlatList<BoxPokemon[]>
        data={boxes}
        keyExtractor={(box) => String(box[0].id)}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 24 }}>
            <Button
              small
              variant="ghost"
              onPress={() => router.push(publicProfilePath(nickname))}
            >
              Voltar ao perfil
            </Button>
            <Text style={ui.title}>
              {game?.title ??
                (kind === "shinydex"
                  ? "Shinydex"
                  : kind === "megadex"
                    ? "Megadex"
                    : "Pokédex")}
            </Text>
            <Text style={ui.subtitle}>
              Coleção de {nickname} · {captured} / {total} capturados · Somente
              leitura
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <TrackerBox
            box={item}
            index={index}
            kind={kind}
            caughtMask={trackerBoxMask(item, marked)}
            selectedMask={0}
            bulkEditing={false}
            disabled={false}
            mobile={width < 650}
            readOnly
            onToggle={noop}
            onToggleBox={noop}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 26 }} />}
        contentContainerStyle={{
          padding: width < 650 ? 18 : 28,
          maxWidth: 1100,
          width: "100%",
          alignSelf: "center",
        }}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={5}
      />
    </View>
  );
}
