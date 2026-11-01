import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  Archive,
  Egg,
  LockKeyhole,
  Sparkles,
  Upload,
} from "lucide-react-native";
import {
  Art,
  Button,
  Empty,
  ErrorState,
  Loading,
  SearchInput,
} from "../../components/ui";
import { useTheme } from "../../theme";
import { useAuth } from "../auth/AuthProvider";
import {
  getSaveBox,
  importSaveBox,
  listSaveBoxes,
  parseSave,
} from "../../services/saveBoxes";
import { indexOptions } from "../../services/queries";
import { idFromUrl } from "../../services/api";
import { pretty } from "../../utils/pokemon";
import SaveUpload from "./SaveUpload";
import { MAX_SAVE_BYTES, type PokemonEntry, type SaveSnapshot } from "./schema";

export default function SaveBoxesPage() {
  const { colors: c, ui } = useTheme();
  const { session, loading } = useAuth();
  const router = useRouter();
  const cache = useQueryClient();
  const { width } = useWindowDimensions();
  const [selected, setSelected] = useState<string | null>(null);
  const [replaceId, setReplaceId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<SaveSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [box, setBox] = useState(-1);
  const [query, setQuery] = useState("");
  const [shiny, setShiny] = useState(false);
  const [details, setDetails] = useState<PokemonEntry | null>(null);
  const [gridWidth, setGridWidth] = useState(0);
  const [scopedOwner, setScopedOwner] = useState(session?.user.id);
  const controller = useRef<AbortController | null>(null);
  const account = useRef(session?.user.id);
  account.current = session?.user.id;
  useEffect(() => {
    setScopedOwner(session?.user.id);
    controller.current?.abort();
    setSelected(null);
    setReplaceId(null);
    setFile(null);
    setPreview(null);
    setDetails(null);
    setError(null);
    setNotice("");
    setBusy(false);
    setSaving(false);
    return () => controller.current?.abort();
  }, [session?.user.id]);
  const saves = useQuery({
    queryKey: ["save-boxes", session?.user.id],
    queryFn: ({ signal }) => listSaveBoxes(session!.token, signal),
    enabled: !!session,
    retry: false,
  });
  const currentId = selected ?? saves.data?.[0]?.id;
  const collection = useQuery({
    queryKey: ["save-box", session?.user.id, currentId],
    queryFn: ({ signal }) => getSaveBox(session!.token, currentId!, signal),
    enabled: !!session && !!currentId,
    retry: false,
  });
  const species = useQuery({
    ...indexOptions("pokemon-species"),
    enabled: !!session,
  });
  const names = useMemo(
    () =>
      new Map(
        species.data?.results.map((entry) => [
          Number(idFromUrl(entry.url)),
          pretty(entry.name),
        ]) ?? [],
      ),
    [species.data],
  );
  const name = (pk: PokemonEntry) =>
    names.get(pk.species) ?? pk.speciesName ?? `Pokémon #${pk.species}`;
  const active = preview ?? collection.data;
  useEffect(() => {
    setBox(-1);
    setDetails(null);
    setQuery("");
  }, [currentId, preview]);
  const entries =
    active?.pokemon.filter((pk) =>
      box === -1
        ? pk.location === "party"
        : pk.location === "box" && pk.boxIndex === box,
    ) ?? [];
  const bySlot = new Map(entries.map((pk) => [pk.slotIndex, pk]));
  const slots = box === -1 ? 6 : (active?.slotsPerBox ?? 30);
  const columns = Math.max(1, Math.min(6, Math.floor((gridWidth + 6) / 58)));
  const tileWidth = gridWidth ? (gridWidth - (columns - 1) * 6) / columns : 48;
  const matches = (pk: PokemonEntry) =>
    (!shiny || pk.isShiny) &&
    (!query.trim() ||
      `${pk.nickname} ${name(pk)} ${pk.species}`
        .toLowerCase()
        .includes(query.trim().toLowerCase().replace(/^#0*/, "")));
  async function read() {
    if (!file || !session) return;
    const owner = session.user.id;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    const timer = setTimeout(() => request.abort(), 90000);
    setBusy(true);
    setError(null);
    setNotice("");
    try {
      const result = await parseSave(file, request.signal);
      if (account.current !== owner) return;
      const replacing = saves.data?.find((save) => save.id === replaceId);
      if (replacing && replacing.source_key !== result.sourceKey)
        throw new Error(
          "Este arquivo pertence a outro jogo ou treinador. Importe como novo save.",
        );
      setPreview(result);
    } catch (cause) {
      if (account.current === owner)
        setError(
          request.signal.aborted
            ? "A leitura foi interrompida. Tente novamente."
            : cause instanceof Error
              ? cause.message
              : "Não foi possível ler o save.",
        );
    } finally {
      clearTimeout(timer);
      if (account.current === owner) setBusy(false);
    }
  }
  async function confirm() {
    if (!session || !preview || saving) return;
    const owner = session.user.id;
    setSaving(true);
    setError(null);
    try {
      const result = await importSaveBox(session.token, preview, replaceId);
      if (account.current !== owner) return;
      await cache.invalidateQueries({ queryKey: ["save-boxes", owner] });
      await cache.invalidateQueries({
        queryKey: ["save-box", owner, result.id],
      });
      if (account.current !== owner) return;
      setSelected(result.id);
      setPreview(null);
      setFile(null);
      setReplaceId(null);
      setNotice(
        result.reused
          ? "Este arquivo já estava na sua box. Nenhum Pokémon foi duplicado."
          : "Sua box foi salva na sua conta.",
      );
    } catch (cause) {
      if (account.current === owner)
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível salvar a box.",
        );
    } finally {
      if (account.current === owner) setSaving(false);
    }
  }
  if (loading || scopedOwner !== session?.user.id)
    return <Loading text="Carregando sua conta…" />;
  if (!session)
    return (
      <View style={ui.page}>
        <Empty
          title="Sua coleção começa aqui"
          description="Entre na sua conta para importar saves e guardar seus Pokémon em uma box privada."
          action={
            <Button onPress={() => router.push("/login")}>
              Entrar na minha conta
            </Button>
          }
        />
      </View>
    );
  return (
    <View
      style={[
        ui.page,
        width < 650 && { padding: 14 },
        { maxWidth: 1100, minWidth: 0 },
      ]}
    >
      <View style={[ui.panel, { backgroundColor: c.pokemonHero }]}>
        <View style={ui.row}>
          <Archive size={18} color={c.green} />
          <Text style={[ui.label, { color: c.green }]}>
            SEUS POKÉMON, SUA JORNADA
          </Text>
        </View>
        <Text style={ui.title}>Minha box</Text>
        <Text style={ui.body}>
          Reúna os Pokémon dos seus saves em um só lugar. Cada parceiro, cada
          shiny e cada história, na sua conta.
        </Text>
        <View style={ui.row}>
          <LockKeyhole size={14} color={c.green} />
          <Text style={[ui.subtitle, { flex: 1 }]}>
            Coleção privada · Organização original do save
          </Text>
        </View>
      </View>
      <View style={ui.panel}>
        <View style={ui.row}>
          <Upload size={18} color={c.accent} />
          <Text style={ui.sectionTitle}>Importar save</Text>
        </View>
        <Text style={ui.body}>
          Ao tocar em “Ler save”, o arquivo será enviado ao leitor do Pokéatlas
          para identificar equipe e boxes. O leitor não guarda o arquivo
          original. Os Pokémon só serão salvos após sua confirmação.
        </Text>
        <Text style={ui.subtitle}>
          Formatos compatíveis com PKHeX.Core · Até 64 MB · .sav, .dsv, main e
          outros. Envie o save exportado e descriptografado, não a ROM, um ZIP
          ou um save state.
        </Text>
        <View style={[ui.row, { flexWrap: "wrap" }]}>
          <Button
            small
            variant={replaceId ? "outline" : "primary"}
            disabled={busy || saving}
            onPress={() => {
              setReplaceId(null);
              setPreview(null);
            }}
          >
            Novo save
          </Button>
          {currentId && (
            <Button
              small
              variant={replaceId ? "primary" : "outline"}
              disabled={busy || saving}
              onPress={() => {
                setReplaceId(currentId);
                setPreview(null);
              }}
            >
              Atualizar save selecionado
            </Button>
          )}
        </View>
        {replaceId && (
          <Text style={[ui.body, { color: c.accent }]}>
            Confirmar a atualização substituirá os Pokémon deste save pela
            versão importada. Seus outros saves serão preservados.
          </Text>
        )}
        <View style={[ui.row, { flexWrap: "wrap" }]}>
          <SaveUpload
            disabled={busy || saving}
            onSelect={(chosen) => {
              setError(null);
              setPreview(null);
              setNotice("");
              if (!chosen.size || chosen.size > MAX_SAVE_BYTES) {
                setFile(null);
                setError("Escolha um save de até 64 MB.");
              } else setFile(chosen);
            }}
          />
          {file && (
            <Text numberOfLines={2} style={[ui.subtitle, { flexShrink: 1 }]}>
              {file.name} · {(file.size / 1024).toFixed(0)} KB
            </Text>
          )}
          {file && !preview && (
            <Button disabled={busy || saving} onPress={read}>
              {busy ? "Lendo save…" : "Ler save"}
            </Button>
          )}
        </View>
        {busy && (
          <Button
            small
            variant="ghost"
            onPress={() => controller.current?.abort()}
          >
            Cancelar leitura
          </Button>
        )}
        {preview && (
          <View style={{ gap: 12 }}>
            <Text style={ui.sectionTitle}>Prévia · Pokémon {preview.game}</Text>
            <Text style={ui.body}>
              {preview.trainerName || "Treinador"} · Geração{" "}
              {preview.generation} · {preview.pokemon.length} Pokémon ·{" "}
              {preview.pokemon.filter((pk) => pk.isShiny).length} shinies
            </Text>
            {preview.warnings.map((warning, index) => (
              <Text key={index} style={ui.subtitle}>
                {warning}
              </Text>
            ))}
            <Text style={ui.subtitle}>
              Confira os Pokémon abaixo antes de guardar na sua conta.
            </Text>
            <View style={[ui.row, { flexWrap: "wrap" }]}>
              <Button disabled={saving} onPress={confirm}>
                {saving
                  ? "Salvando…"
                  : replaceId
                    ? "Confirmar atualização"
                    : "Guardar na minha box"}
              </Button>
              <Button
                variant="ghost"
                disabled={saving}
                onPress={() => {
                  setPreview(null);
                  setFile(null);
                }}
              >
                Descartar prévia
              </Button>
            </View>
          </View>
        )}
        {error && (
          <Text
            accessibilityRole="alert"
            style={[ui.body, { color: c.accent }]}
          >
            {error}
          </Text>
        )}
        {!!notice && (
          <Text
            accessibilityLiveRegion="polite"
            style={[ui.body, { color: c.green }]}
          >
            {notice}
          </Text>
        )}
      </View>
      {saves.isPending && <Loading text="Carregando seus saves…" />}
      {saves.isError && (
        <ErrorState
          retry={() => {
            void saves.refetch();
          }}
        />
      )}
      {!!saves.data?.length && (
        <View style={{ gap: 12, minWidth: 0 }}>
          <Text style={ui.sectionTitle}>Seus saves</Text>
          <ScrollView
            horizontal
            style={{ flexGrow: 0 }}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10 }}
          >
            {saves.data.map((save) => (
              <Pressable
                key={save.id}
                accessibilityRole="button"
                accessibilityState={{ selected: currentId === save.id }}
                disabled={saving || busy || !!preview}
                onPress={() => {
                  setSelected(save.id);
                  setReplaceId(null);
                }}
                style={[
                  ui.panel,
                  {
                    minWidth: 175,
                    padding: 15,
                    gap: 5,
                    borderColor: currentId === save.id ? c.accent : c.line,
                  },
                ]}
              >
                <Text style={ui.sectionTitle}>Pokémon {save.game}</Text>
                <Text style={ui.subtitle}>
                  {save.trainer_name || "Treinador"}
                </Text>
                <Text style={ui.subtitle}>
                  {save.pokemon_count} Pokémon · {save.shiny_count} shinies
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
      {collection.isPending && currentId && !preview && (
        <Loading text="Abrindo box…" />
      )}
      {collection.isError && !preview && (
        <ErrorState
          retry={() => {
            void collection.refetch();
          }}
        />
      )}
      {active && (
        <View style={ui.panel}>
          <View style={[ui.between, { flexWrap: "wrap" }]}>
            <Text style={ui.sectionTitle}>
              {preview ? "Prévia do save" : "Sua coleção"}
            </Text>
            <Text style={ui.subtitle}>
              {active.pokemon.length} Pokémon · {active.boxCount} boxes
            </Text>
          </View>
          <SearchInput
            large={width < 650}
            value={query}
            onChange={setQuery}
            placeholder="Buscar por apelido, espécie ou número…"
          />
          <Button
            small
            variant={shiny ? "primary" : "outline"}
            icon={<Sparkles size={14} color={shiny ? c.onAccent : c.muted} />}
            onPress={() => setShiny((value) => !value)}
          >
            Somente shinies
          </Button>
          <ScrollView
            horizontal
            style={{ flexGrow: 0 }}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 7 }}
          >
            {[
              { value: -1, label: "Equipe" },
              ...active.boxNames.map((label, index) => ({
                value: index,
                label: label || `Box ${index + 1}`,
              })),
            ].map((option) => (
              <Button
                key={option.value}
                small
                variant={box === option.value ? "primary" : "outline"}
                onPress={() => setBox(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </ScrollView>
          <Text style={ui.subtitle}>
            {box === -1 ? "Equipe" : active.boxNames[box] || `Box ${box + 1}`} ·{" "}
            {entries.filter(matches).length} Pokémon
            {query || shiny ? " correspondentes nesta box" : " nesta box"}
          </Text>
          <View
            onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 6,
              width: "100%",
              minWidth: 0,
            }}
          >
            {Array.from({ length: slots }, (_, slot) => {
              const pk = bySlot.get(slot);
              const show = pk && matches(pk);
              return (
                <Pressable
                  key={slot}
                  accessibilityRole={show ? "button" : undefined}
                  accessibilityLabel={
                    show
                      ? `${pk.nickname || name(pk)}, nível ${pk.level}${pk.isShiny ? ", shiny" : ""}, posição ${slot + 1}`
                      : `Posição ${slot + 1}${pk ? ": oculto pelo filtro" : ": vazia"}`
                  }
                  disabled={!show}
                  onPress={() => pk && setDetails(pk)}
                  style={{
                    width: tileWidth,
                    minHeight: tileWidth + 22,
                    borderWidth: 1,
                    borderColor: show && pk.isShiny ? c.gold : c.line,
                    backgroundColor: show ? c.surfaceAlt : c.bg,
                    borderRadius: 11,
                    padding: 3,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {show ? (
                    <>
                      {pk.isEgg ? (
                        <Egg size={32} color={c.muted} />
                      ) : (
                        <Art
                          name={name(pk)}
                          uri={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pk.isShiny ? "shiny/" : ""}${pk.species}.png`}
                          style={{ width: "100%", height: tileWidth - 6 }}
                        />
                      )}
                      <Text
                        numberOfLines={1}
                        style={{ color: c.body, fontSize: 8, maxWidth: "100%" }}
                      >
                        {pk.isEgg ? "Ovo" : `Nv. ${pk.level}`}
                        {pk.isShiny ? " ✦" : ""}
                      </Text>
                    </>
                  ) : (
                    <Text style={{ color: c.placeholder, fontSize: 10 }}>
                      {slot + 1}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
      {!active && saves.isSuccess && !saves.data.length && (
        <Empty
          title="Uma box cheia de possibilidades"
          description="Importe seu primeiro save para ver sua equipe e seus Pokémon guardados."
        />
      )}
      <Modal
        transparent
        visible={!!details}
        animationType="fade"
        onRequestClose={() => setDetails(null)}
      >
        <View
          style={{
            flex: 1,
            padding: 20,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: c.overlay,
          }}
        >
          {details && (
            <ScrollView
              style={{
                maxHeight: "90%",
                width: "100%",
                maxWidth: 460,
                borderRadius: 20,
                backgroundColor: c.surface,
              }}
              contentContainerStyle={{ padding: 22, gap: 14 }}
            >
              <View style={ui.between}>
                <Text style={[ui.sectionTitle, { flex: 1 }]}>
                  {details.nickname || name(details)}
                </Text>
                <Button small variant="ghost" onPress={() => setDetails(null)}>
                  Fechar
                </Button>
              </View>
              <Art
                name={name(details)}
                uri={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${details.isShiny ? "shiny/" : ""}${details.species}.png`}
                style={{ width: "100%", height: 135 }}
              />
              <Text style={ui.body}>
                {name(details)} · #{details.species} · Forma {details.form} ·{" "}
                {details.isEgg ? "Ovo" : `Nível ${details.level}`}
                {details.isShiny ? " · Shiny" : ""}
              </Text>
              <Text style={ui.body}>
                Natureza: {details.nature} · Gênero:{" "}
                {details.gender === 0
                  ? "Macho"
                  : details.gender === 1
                    ? "Fêmea"
                    : "Sem gênero"}
              </Text>
              <Text style={ui.body}>
                Treinador original: {details.originalTrainer} · ID:{" "}
                {details.trainerId}
              </Text>
              <Text style={ui.body}>
                Habilidade: {details.abilityName || `#${details.ability}`} ·
                Item:{" "}
                {details.heldItem
                  ? details.heldItemName || `#${details.heldItem}`
                  : "Nenhum"}
              </Text>
              <View style={{ gap: 8 }}>
                <View style={ui.between}>
                  <Text style={ui.label}>ATRIBUTO</Text>
                  <Text style={ui.label}>IV / EV</Text>
                </View>
                {(["hp", "atk", "def", "spa", "spd", "spe"] as const).map(
                  (stat) => (
                    <View key={stat} style={ui.between}>
                      <Text style={ui.body}>{stat.toUpperCase()}</Text>
                      <Text style={ui.body}>
                        {details.ivs[stat]} / {details.evs[stat]}
                      </Text>
                    </View>
                  ),
                )}
              </View>
              <Text style={ui.body}>
                Golpes:{" "}
                {(
                  details.moveNames?.filter(Boolean) ??
                  details.moves.filter(Boolean).map((move) => `#${move}`)
                ).join(" · ") || "Nenhum"}
              </Text>
              <Text style={ui.subtitle}>
                Dados lidos do save. A importação não certifica a legalidade dos
                Pokémon e não altera o arquivo original.
              </Text>
              <Button
                variant="outline"
                onPress={() => {
                  const id = details.species;
                  setDetails(null);
                  router.push(`/pokemon/${id}`);
                }}
              >
                Ver espécie na Pokédex
              </Button>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}
