import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  View,
  useWindowDimensions,
  type ListRenderItemInfo,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Award, Check, ListChecks, Sparkles } from "lucide-react-native";
import { Button } from "../../components/ui";
import { useTheme, useThemedStyles } from "../../theme";
import { indexOptions } from "../../services/queries";
import {
  getTracker,
  completeTracker,
  setTrackerMarks,
  applyTrackerChanges,
  type TrackerKind,
} from "../../services/tracker";
import { useAuth } from "../auth/AuthProvider";
import { createTrackerBoxes, type BoxPokemon } from "./boxes";
import { TrackerBox, trackerBoxMask } from "./TrackerBox";
import { createTrackerStyles } from "./trackerStyles";
import {
  getGamePokedex,
  type TrackerGame,
  type GamePokedex,
} from "../../services/gameDex";

type TrackerProps = {
  kind: TrackerKind;
  game?: TrackerGame;
  pokedex?: GamePokedex;
  navigation?: React.ReactNode;
};

const boxKey = (box: BoxPokemon[]) => String(box[0].id);
const BoxSeparator = React.memo(function BoxSeparator() {
  return <View style={{ height: 26 }} />;
});

export function DexBoxTracker({
  kind,
  game,
  pokedex,
  navigation,
}: TrackerProps) {
  const { session } = useAuth();
  return (
    <AccountTracker
      key={[kind, session?.user.id ?? "guest", game?.key, pokedex?.key].join(
        ":",
      )}
      kind={kind}
      game={game}
      pokedex={pokedex}
      navigation={navigation}
    />
  );
}

function AccountTracker({ kind, game, pokedex, navigation }: TrackerProps) {
  const { session, loading: authLoading } = useAuth();
  const { colors: c, ui } = useTheme();
  const s = useThemedStyles(createTrackerStyles);
  const router = useRouter();
  const client = useQueryClient();
  const { width } = useWindowDimensions();
  const mobile = width < 650;
  const saving = useRef(false);
  const [bulkEditing, setBulkEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const initialMarks = useRef<Set<number>>(new Set());
  const national = useQuery({
    ...indexOptions("pokemon-species"),
    enabled: kind !== "gamesdex",
  });
  const regional = useQuery({
    queryKey: ["game-pokedex", game?.key, pokedex?.key, "regional-order-v1"],
    queryFn: ({ signal }) => getGamePokedex(pokedex!.key, signal, game?.key),
    enabled: kind === "gamesdex" && !!pokedex,
    staleTime: 24 * 60 * 60 * 1000,
  });
  const species = kind === "gamesdex" ? regional : national;
  const boxes = useMemo(
    () =>
      kind === "gamesdex"
        ? (regional.data ?? [])
        : createTrackerBoxes(national.data?.results ?? []),
    [kind, regional.data, national.data],
  );
  const allIds = useMemo(
    () => boxes.flatMap((box) => box.map(({ id }) => id)),
    [boxes],
  );
  const queryKey = useMemo(
    () => ["dex-tracker", session?.user.id, kind, game?.key, "dlc-split-v1"],
    [session?.user.id, kind, game?.key],
  );
  const progress = useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      getTracker(session!.token, kind, signal, game?.key),
    enabled: !!session,
    staleTime: 60000,
    refetchOnMount: "always",
    retry: false,
    refetchOnWindowFocus: true,
  });
  const marked = useMemo(
    () => new Set(session ? (progress.data ?? []) : []),
    [!!session, progress.data],
  );
  const changes = useMemo(() => {
    const added: number[] = [];
    const removed: number[] = [];
    if (bulkEditing)
      for (const id of allIds) {
        if (selectedIds.has(id) && !initialMarks.current.has(id))
          added.push(id);
        else if (!selectedIds.has(id) && initialMarks.current.has(id))
          removed.push(id);
      }
    return { added, removed, count: added.length + removed.length };
  }, [allIds, selectedIds, bulkEditing]);
  const mutation = useMutation({
    mutationKey: [...queryKey, "save"],
    mutationFn: ({
      ids,
      caught,
      complete,
      bulk,
      removedIds,
    }: {
      ids: number[];
      caught: boolean;
      complete?: boolean;
      bulk?: boolean;
      removedIds?: number[];
    }) =>
      bulk
        ? applyTrackerChanges(
            session!.token,
            kind,
            ids,
            removedIds ?? [],
            game?.key,
          )
        : complete
          ? completeTracker(session!.token, kind, ids, game?.key)
          : setTrackerMarks(session!.token, kind, ids, caught, game?.key),
    onMutate: () => client.cancelQueries({ queryKey }),
    onSuccess: (ids, variables) => {
      client.setQueryData(queryKey, ids);
      if (variables.bulk) {
        setSelectedIds(new Set());
        setBulkEditing(false);
      }
      void client.invalidateQueries({
        queryKey: ["public-profile", session!.user.nickname.toLowerCase()],
      });
      if (game)
        void client.invalidateQueries({
          queryKey: ["gamesdex-summary", session!.user.id],
        });
    },
    onSettled: () => {
      saving.current = false;
    },
  });
  const busy =
    authLoading || mutation.isPending || (!!session && progress.isPending);
  const unavailable = !!session && progress.isError;
  const mutate = mutation.mutate;
  const setMarks = useCallback(
    (ids: number[], caught: boolean, complete = false) => {
      if (!session) {
        router.push("/login");
        return;
      }
      if (busy || unavailable || saving.current) return;
      saving.current = true;
      mutate({ ids, caught, complete });
    },
    [session, router, busy, unavailable, mutate],
  );

  const selectPokemon = useCallback(
    (ids: number[], selected: boolean) => {
      if (busy || saving.current) return;
      setSelectedIds((previous) => {
        const next = new Set(previous);
        let changed = false;
        for (const id of ids) {
          if (selected && !next.has(id)) {
            next.add(id);
            changed = true;
          } else if (!selected && next.has(id)) {
            next.delete(id);
            changed = true;
          }
        }
        return changed ? next : previous;
      });
    },
    [busy],
  );

  const togglePokemon = useCallback(
    (id: number, caught: boolean, selected: boolean) => {
      if (bulkEditing) selectPokemon([id], !selected);
      else setMarks([id], !caught);
    },
    [bulkEditing, selectPokemon, setMarks],
  );
  const toggleBox = useCallback(
    (ids: number[], desired: boolean, bulk: boolean) => {
      if (bulk) selectPokemon(ids, desired);
      else setMarks(ids, desired);
    },
    [selectPokemon, setMarks],
  );
  const renderBox = useCallback(
    ({ item, index }: ListRenderItemInfo<BoxPokemon[]>) => (
      <TrackerBox
        box={item}
        index={index}
        kind={kind}
        caughtMask={trackerBoxMask(item, marked)}
        selectedMask={bulkEditing ? trackerBoxMask(item, selectedIds) : 0}
        bulkEditing={bulkEditing}
        disabled={busy || unavailable}
        mobile={mobile}
        onToggle={togglePokemon}
        onToggleBox={toggleBox}
      />
    ),
    [
      kind,
      marked,
      selectedIds,
      bulkEditing,
      busy,
      unavailable,
      mobile,
      togglePokemon,
      toggleBox,
    ],
  );

  const total = allIds.length;
  const totalMarked = useMemo(
    () => allIds.reduce((count, id) => count + (marked.has(id) ? 1 : 0), 0),
    [allIds, marked],
  );
  const complete =
    !!session &&
    species.isSuccess &&
    progress.isSuccess &&
    total > 0 &&
    totalMarked === total;
  const percent = complete
    ? 100
    : total
      ? Math.floor((totalMarked / total) * 100)
      : 0;
  const collectionName =
    kind === "shinydex"
      ? "Shinydex"
      : pokedex?.key === "obtainable"
        ? "Coleção"
        : pokedex
          ? "Pokédex " + pokedex.title
          : "Pokédex";

  const beginBulkEdit = () => {
    if (!session) {
      router.push("/login");
      return;
    }
    if (busy || unavailable || saving.current) return;
    mutation.reset();
    initialMarks.current = new Set(marked);
    setSelectedIds(new Set(marked));
    setBulkEditing(true);
  };
  const saveSelection = () => {
    if (!session || busy || unavailable || saving.current || !changes.count)
      return;
    saving.current = true;
    mutate({
      ids: changes.added,
      removedIds: changes.removed,
      caught: true,
      bulk: true,
    });
  };
  const cancelBulkEdit = () => {
    if (busy || saving.current) return;
    setSelectedIds(new Set());
    setBulkEditing(false);
    mutation.reset();
  };
  const bulkToolbar = () => (
    <View style={s.bulkToolbar}>
      <View style={{ gap: 6 }}>
        <Text style={s.bulkToolbarTitle}>
          Edição em lote · {changes.added.length} capturas e{" "}
          {changes.removed.length} remoções
        </Text>
        <Text style={s.status}>
          Marcado: capturado. Desmarcado: não capturado. As alterações só vão
          para o banco ao salvar.
        </Text>
      </View>
      <View style={s.bulkActions}>
        <Button
          small
          disabled={busy || unavailable || !changes.count}
          icon={<Check size={14} color={c.onAccent} />}
          onPress={saveSelection}
        >
          {mutation.isPending && mutation.variables?.bulk
            ? "Salvando…"
            : "Salvar alterações"}
        </Button>
        <Button
          small
          variant="outline"
          disabled={busy}
          onPress={cancelBulkEdit}
        >
          Cancelar
        </Button>
        <Button
          small
          variant="ghost"
          disabled={busy || !total}
          onPress={() => selectPokemon(allIds, true)}
        >
          Marcar todos
        </Button>
        <Button
          small
          variant="ghost"
          disabled={busy}
          onPress={() => setSelectedIds(new Set())}
        >
          Desmarcar todos
        </Button>
        <Button
          small
          variant="ghost"
          disabled={busy || !changes.count}
          onPress={() => setSelectedIds(new Set(initialMarks.current))}
        >
          Reverter alterações
        </Button>
      </View>
    </View>
  );
  const header = (
    <View>
      {navigation}
      <View style={s.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.eyebrow}>DEX TRACKER</Text>
          <Text style={ui.title}>
            {game
              ? game.title
              : kind === "shinydex"
                ? "Shinydex Tracker"
                : "Pokedex Tracker"}
          </Text>
          <Text style={[ui.subtitle, { marginTop: 8 }]}>
            {bulkEditing
              ? "Marque o que capturou, desmarque o que não capturou e salve as alterações."
              : pokedex
                ? "Pokédex " +
                  pokedex.title +
                  " · Toque para marcar ou desmarcar sua captura."
                : "Toque em um Pokémon para marcar ou desmarcar sua captura."}
          </Text>
        </View>
        {kind === "shinydex" && <Sparkles size={28} color={c.accent} />}
      </View>
      <View style={s.actions}>
        {complete ? (
          <View
            accessibilityRole="image"
            accessibilityLabel={collectionName + " completa: medalha de 100%"}
            style={s.medal}
          >
            <Award size={28} color={c.gold} />
            <View>
              <Text style={s.medalTitle}>{collectionName} completa!</Text>
              <Text style={s.medalDescription}>100% da coleção capturada</Text>
            </View>
          </View>
        ) : !bulkEditing ? (
          <Button
            disabled={busy || unavailable || !total || !species.isSuccess}
            icon={<Check size={16} color={c.onAccent} />}
            onPress={() => setMarks(allIds, true, true)}
          >
            {mutation.isPending && mutation.variables?.complete
              ? "Completando…"
              : "Completar " + collectionName}
          </Button>
        ) : null}
        {!bulkEditing && (
          <Button
            variant="outline"
            disabled={busy || unavailable || !total || !species.isSuccess}
            icon={<ListChecks size={16} color={c.accent} />}
            onPress={beginBulkEdit}
          >
            Edição em lote
          </Button>
        )}
      </View>
      {bulkEditing && bulkToolbar()}
      {!session && !authLoading && (
        <View style={s.notice}>
          <Text
            accessibilityRole="link"
            style={s.noticeText}
            onPress={() => router.push("/login")}
          >
            Entre na sua conta para salvar sua coleção e continuar de onde
            parou.
          </Text>
        </View>
      )}
      {!!session && (
        <View style={s.progressCard}>
          <View style={s.progressRow}>
            <Text style={s.progressCount}>
              {totalMarked} / {total} capturados · {percent}%
            </Text>
            <View style={s.sync}>
              {busy ? (
                <ActivityIndicator size="small" color={c.accent} />
              ) : bulkEditing && changes.count > 0 ? (
                <ListChecks size={14} color={c.accent} />
              ) : !progress.isError && !mutation.isError ? (
                <Check size={14} color={c.green} />
              ) : null}
              <Text accessibilityLiveRegion="polite" style={s.status}>
                {busy
                  ? "Sincronizando…"
                  : mutation.isError
                    ? "Falha ao salvar"
                    : progress.isError
                      ? "Falha ao carregar"
                      : bulkEditing && changes.count > 0
                        ? "Seleção ainda não salva"
                        : "Salvo na sua conta"}
              </Text>
            </View>
          </View>
          <View style={s.progressTrack}>
            <View
              style={[
                s.progressFill,
                { width: (percent + "%") as `${number}%` },
              ]}
            />
          </View>
        </View>
      )}
      {progress.isError && (
        <View style={s.error}>
          <Text accessibilityRole="alert" style={s.errorText}>
            {progress.error.message}
          </Text>
          <Button
            small
            variant="ghost"
            onPress={() => {
              void progress.refetch();
            }}
          >
            Tentar novamente
          </Button>
          {"code" in progress.error &&
            progress.error.code === "session_expired" && (
              <Button
                small
                variant="outline"
                onPress={() => router.push("/login")}
              >
                Entrar novamente
              </Button>
            )}
        </View>
      )}
      {mutation.isError && (
        <View style={s.error}>
          <Text accessibilityRole="alert" style={s.errorText}>
            {mutation.error.message} Sua marcação não foi alterada.
          </Text>
        </View>
      )}
      {species.isPending ? (
        <View style={s.loading}>
          <ActivityIndicator color={c.accent} />
          <Text style={s.status}>Carregando Pokémon…</Text>
        </View>
      ) : species.isError ? (
        <View style={s.error}>
          <Text style={s.errorText}>Não foi possível carregar os Pokémon.</Text>
          <Button
            small
            variant="ghost"
            onPress={() => {
              void species.refetch();
            }}
          >
            Tentar novamente
          </Button>
        </View>
      ) : (
        <Text style={[s.legend, { marginBottom: 20 }]}>
          {bulkEditing
            ? "Destaques indicam alterações pendentes: capturas e remoções"
            : "✓ Capturado"}{" "}
          · {boxes.length} boxes de até 30 Pokémon
        </Text>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <FlatList<BoxPokemon[]>
        data={boxes}
        renderItem={renderBox}
        keyExtractor={boxKey}
        ListHeaderComponent={header}
        ListFooterComponent={
          <View style={{ marginTop: 24 }}>
            {bulkEditing && bulkToolbar()}
            <Text
              style={[s.status, { textAlign: "center", paddingVertical: 20 }]}
            >
              Feito para quem nunca deixou de explorar.
            </Text>
          </View>
        }
        ItemSeparatorComponent={BoxSeparator}
        contentContainerStyle={{
          padding: mobile ? 16 : 28,
          width: "100%",
          maxWidth: 1056,
          alignSelf: "center",
        }}
        style={{ flex: 1 }}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={5}
        updateCellsBatchingPeriod={32}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}
