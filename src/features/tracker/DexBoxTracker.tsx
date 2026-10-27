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
  type TrackerKind,
} from "../../services/tracker";
import { useAuth } from "../auth/AuthProvider";
import { createTrackerBoxes, type BoxPokemon } from "./boxes";
import { TrackerBox, trackerBoxMask } from "./TrackerBox";
import { createTrackerStyles } from "./trackerStyles";

const boxKey = (box: BoxPokemon[]) => String(box[0].id);
const BoxSeparator = React.memo(function BoxSeparator() {
  return <View style={{ height: 26 }} />;
});

export function DexBoxTracker({ kind }: { kind: TrackerKind }) {
  const { session } = useAuth();
  return (
    <AccountTracker
      key={kind + ":" + (session?.user.id ?? "guest")}
      kind={kind}
    />
  );
}

function AccountTracker({ kind }: { kind: TrackerKind }) {
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
  const species = useQuery(indexOptions("pokemon-species"));
  const boxes = useMemo(
    () => createTrackerBoxes(species.data?.results ?? []),
    [species.data],
  );
  const allIds = useMemo(
    () => boxes.flatMap((box) => box.map(({ id }) => id)),
    [boxes],
  );
  const queryKey = useMemo(
    () => ["dex-tracker", session?.user.id, kind],
    [session?.user.id, kind],
  );
  const progress = useQuery({
    queryKey,
    queryFn: ({ signal }) => getTracker(session!.token, kind, signal),
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
  const mutation = useMutation({
    mutationKey: [...queryKey, "save"],
    mutationFn: ({
      ids,
      caught,
      complete,
      bulk,
    }: {
      ids: number[];
      caught: boolean;
      complete?: boolean;
      bulk?: boolean;
    }) =>
      complete || bulk
        ? completeTracker(session!.token, kind, ids)
        : setTrackerMarks(session!.token, kind, ids, caught),
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
  const collectionName = kind === "shinydex" ? "Shinydex" : "Pokédex";

  const beginBulkEdit = () => {
    if (!session) {
      router.push("/login");
      return;
    }
    if (busy || unavailable || saving.current) return;
    mutation.reset();
    setSelectedIds(new Set());
    setBulkEditing(true);
  };
  const saveSelection = () => {
    if (!session || busy || unavailable || saving.current || !selectedIds.size)
      return;
    saving.current = true;
    mutate({ ids: [...selectedIds], caught: true, bulk: true });
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
          Edição em lote · {selectedIds.size} selecionados
        </Text>
        <Text style={s.status}>
          Selecione os Pokémon nas boxes. Nada é enviado até você salvar.
        </Text>
      </View>
      <View style={s.bulkActions}>
        <Button
          small
          disabled={busy || unavailable || !selectedIds.size}
          icon={<Check size={14} color={c.onAccent} />}
          onPress={saveSelection}
        >
          {mutation.isPending && mutation.variables?.bulk
            ? "Salvando…"
            : "Salvar capturados"}
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
          Selecionar todos
        </Button>
        <Button
          small
          variant="ghost"
          disabled={busy || !selectedIds.size}
          onPress={() => setSelectedIds(new Set())}
        >
          Limpar seleção
        </Button>
      </View>
    </View>
  );
  const header = (
    <View>
      <View style={s.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.eyebrow}>DEX TRACKER</Text>
          <Text style={ui.title}>
            {kind === "shinydex" ? "Shinydex Tracker" : "Pokedex Tracker"}
          </Text>
          <Text style={[ui.subtitle, { marginTop: 8 }]}>
            {bulkEditing
              ? "Selecione os Pokémon que você capturou e salve tudo de uma vez."
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
              ) : bulkEditing && selectedIds.size > 0 ? (
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
                      : bulkEditing && selectedIds.size > 0
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
            ? "Seleção destacada: pendente de salvar · ✓: já capturado"
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
