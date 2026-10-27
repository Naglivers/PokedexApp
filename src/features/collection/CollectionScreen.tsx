import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Plus, Shuffle, Trash2, Users, X } from "lucide-react-native";
import { useTheme } from "../../theme";
import {
  Art,
  Badge,
  Button,
  Empty,
  IconButton,
  SearchInput,
} from "../../components/ui";
import { useCollection } from "../../store/collection";
import {
  getResource,
  idFromUrl,
  PokemonDetail,
  spriteUrl,
  TypeDetail,
} from "../../services/api";
import { indexOptions, pokemonOptions } from "../../services/queries";
import {
  baseTotal,
  defensiveMultiplier,
  matchesName,
  pretty,
} from "../../utils/pokemon";
import { statNames } from "../../constants/pokemon";
import { useDebounce } from "../../hooks/useDebounce";
import { Stats } from "../pokemon/Panels";

export default function CollectionScreen({
  mode,
}: {
  mode: "compare" | "team";
}) {
  const { colors: c, ui, types } = useTheme();
  const store = useCollection();
  const team = mode === "team";
  const ids = team ? store.team : store.compare;
  const maximum = team ? 6 : 4;
  const [picker, setPicker] = useState(false);
  const { width } = useWindowDimensions();
  const queries = useQueries({ queries: ids.map((id) => pokemonOptions(id)) });
  const pokemon = queries.flatMap((query) => (query.data ? [query.data] : []));
  const remove = (id: number) =>
    team ? store.removeTeam(id) : store.toggleCompare(id);
  return (
    <View style={[ui.page, width < 650 && { padding: 18 }]}>
      <View style={ui.between}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[ui.label, { color: c.accent, marginBottom: 7 }]}>
            {team
              ? "CADA INTEGRANTE FAZ A DIFERENÇA"
              : "LADO A LADO, CADA DETALHE CONTA"}
          </Text>
          <Text style={ui.title}>
            {team ? "Minha equipe" : "Comparador Pokémon"}
          </Text>
          <Text style={[ui.subtitle, { marginTop: 6 }]}>
            {team
              ? "Monte um time de até seis Pokémon. Seu progresso fica salvo."
              : "Escolha até quatro Pokémon e descubra o que torna cada um único."}
          </Text>
        </View>
        {width > 600 &&
          (team ? (
            <Users size={32} color={c.placeholder} />
          ) : (
            <Shuffle size={32} color={c.placeholder} />
          ))}
      </View>
      <View style={ui.between}>
        <Text style={ui.subtitle}>
          {ids.length} de {maximum} selecionados
        </Text>
        <Button
          disabled={ids.length >= maximum}
          icon={<Plus size={15} color={c.onAccent} />}
          onPress={() => setPicker(true)}
        >
          Adicionar Pokémon
        </Button>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
        {ids.map((id) => {
          const p = pokemon.find((p) => p.id === id);
          return (
            <View
              key={id}
              style={[
                ui.panel,
                {
                  width:
                    width < 650
                      ? "100%"
                      : width < 1200
                        ? "47.8%"
                        : team
                          ? "31.8%"
                          : "23.7%",
                  padding: 18,
                },
              ]}
            >
              <View style={ui.between}>
                <Text style={ui.label}>#{String(id).padStart(4, "0")}</Text>
                <IconButton
                  label={`Remover ${p?.name ?? id}`}
                  onPress={() => remove(id)}
                >
                  <Trash2 size={14} color={c.muted} />
                </IconButton>
              </View>
              <Art
                name={p?.name ?? "Pokémon"}
                uri={spriteUrl(id)}
                style={{ height: 120, width: "100%" }}
              />
              <Text
                style={[ui.sectionTitle, { textAlign: "center", fontSize: 17 }]}
              >
                {p ? pretty(p.name) : "Carregando…"}
              </Text>
              <View style={[ui.wrap, { justifyContent: "center" }]}>
                {p?.types.map((t) => (
                  <Badge name={t.type.name} key={t.type.name} />
                ))}
              </View>
              {p && (
                <>
                  <Text
                    style={[ui.subtitle, { textAlign: "center", fontSize: 10 }]}
                  >
                    {p.height / 10} m · {p.weight / 10} kg · Total{" "}
                    {baseTotal(p)}
                  </Text>
                  <Stats pokemon={p} />
                  <Text style={[ui.subtitle, { fontSize: 10 }]}>
                    {p.abilities.map((a) => pretty(a.ability.name)).join(" · ")}
                  </Text>
                </>
              )}
              {queries[ids.indexOf(id)].isError && (
                <Button
                  small
                  variant="outline"
                  onPress={() => queries[ids.indexOf(id)].refetch()}
                >
                  Recarregar Pokémon
                </Button>
              )}
            </View>
          );
        })}
        {ids.length < maximum && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Escolher Pokémon"
            onPress={() => setPicker(true)}
            style={{
              minHeight: 210,
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: c.borderStrong,
              borderRadius: 17,
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              flexGrow: ids.length ? 0 : 1,
              width: ids.length ? (width < 650 ? "100%" : "23.7%") : undefined,
            }}
          >
            <Plus size={26} color={c.placeholder} />
            <Text style={{ fontSize: 12, color: c.muted }}>
              Quem vem com você?
            </Text>
          </Pressable>
        )}
      </View>
      {pokemon.length > 0 && <Analysis pokemon={pokemon} team={team} />}
      <PokemonPicker
        open={picker}
        close={() => setPicker(false)}
        excluded={ids}
        choose={(id) => {
          team ? store.addTeam(id) : store.toggleCompare(id);
          setPicker(false);
        }}
      />
    </View>
  );
}
function PokemonPicker({
  open,
  close,
  choose,
  excluded,
}: {
  open: boolean;
  close: () => void;
  choose: (id: number) => void;
  excluded: number[];
}) {
  const { colors: c, ui } = useTheme();
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search);
  const index = useQuery({ ...indexOptions("pokemon"), enabled: open });
  const list = (index.data?.results ?? [])
    .filter(
      (p) =>
        !excluded.includes(Number(idFromUrl(p.url))) &&
        matchesName(p.name, idFromUrl(p.url), debounced),
    )
    .slice(0, 20);
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={close}
    >
      <Pressable
        onPress={close}
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: c.overlay,
          padding: 20,
        }}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            backgroundColor: c.surface,
            borderRadius: 20,
            padding: 22,
            width: "100%",
            maxWidth: 530,
            maxHeight: "85%",
            gap: 18,
          }}
        >
          <View style={ui.between}>
            <Text style={ui.sectionTitle}>Escolher Pokémon</Text>
            <IconButton label="Fechar seleção" onPress={close}>
              <X size={18} />
            </IconButton>
          </View>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Nome ou número…"
          />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={{ flexShrink: 1 }}
            contentContainerStyle={{ gap: 6 }}
          >
            {list.map((p) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Selecionar ${p.name}`}
                key={p.url}
                onPress={() => choose(Number(idFromUrl(p.url)))}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 16,
                  padding: 8,
                  backgroundColor: c.surfaceAlt,
                  borderRadius: 9,
                }}
              >
                <Art
                  name={p.name}
                  uri={spriteUrl(idFromUrl(p.url))}
                  style={{ width: 42, height: 42 }}
                />
                <Text style={{ color: c.ink, fontSize: 13, flex: 1 }}>
                  {pretty(p.name)}
                </Text>
                <Plus size={16} color={c.muted} />
              </Pressable>
            ))}
            {!list.length && (
              <Empty
                title={
                  index.isPending ? "Carregando Pokémon…" : "Nenhum resultado"
                }
              />
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
function Analysis({
  pokemon,
  team,
}: {
  pokemon: PokemonDetail[];
  team: boolean;
}) {
  const { colors: c, ui, types } = useTheme();
  const names = Array.from(
    new Set(pokemon.flatMap((p) => p.types.map((t) => t.type.name))),
  );
  const queries = useQueries({
    queries: names.map((name) => ({
      queryKey: ["type", name],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getResource<TypeDetail>("type", name, signal),
    })),
  });
  if (queries.some((q) => !q.data)) return null;
  const data = new Map(queries.map((q, i) => [names[i], q.data!]));
  const relations = (p: PokemonDetail) =>
    p.types.map((t) => data.get(t.type.name)!.damage_relations);
  return (
    <View style={ui.panel}>
      <Text style={ui.sectionTitle}>
        {team ? "Cobertura da equipe" : "Comparação defensiva"}
      </Text>
      <Text style={ui.subtitle}>
        Cálculos do app com relações de tipos atuais.{" "}
        {team
          ? "Cobertura ofensiva considera os tipos dos integrantes; golpes individuais podem alterar o resultado."
          : "Cada multiplicador combina os dois tipos, incluindo imunidades."}
      </Text>
      <View style={[ui.wrap, { gap: 12 }]}>
        {Object.keys(types).map((type) => {
          const weak = pokemon.filter(
            (p) => defensiveMultiplier(type, relations(p)) > 1,
          ).length;
          const resist = pokemon.filter(
            (p) => defensiveMultiplier(type, relations(p)) < 1,
          ).length;
          const cover = names.some((name) =>
            data
              .get(name)!
              .damage_relations.double_damage_to.some((t) => t.name === type),
          );
          return (
            <View
              key={type}
              style={{
                borderWidth: 1,
                borderColor: c.line,
                borderRadius: 10,
                padding: 12,
                gap: 8,
                minWidth: 125,
              }}
            >
              <Badge name={type} />
              {team ? (
                <>
                  <Text
                    style={{
                      fontSize: 10,
                      color: weak >= 2 ? c.accent : c.muted,
                    }}
                  >
                    {weak} fraco(s) · {resist} resiste(m)
                  </Text>
                  <Text
                    style={{ fontSize: 10, color: cover ? c.green : c.muted }}
                  >
                    {cover
                      ? "Cobertura superefetiva"
                      : "Sem cobertura por tipo"}
                  </Text>
                </>
              ) : (
                pokemon.map((p) => (
                  <Text key={p.id} style={{ fontSize: 10, color: c.muted }}>
                    {pretty(p.name)}{" "}
                    <Text style={{ fontWeight: "700", color: c.ink }}>
                      {defensiveMultiplier(type, relations(p))}×
                    </Text>
                  </Text>
                ))
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
