import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Circle, Crosshair, Zap } from "lucide-react-native";
import { getByUrl, getResource, idFromUrl, NamedResource, PokemonDetail } from "../../services/api";
import { colors as c, ui } from "../../theme";
import { Badge, Button, Empty, ErrorState, Loading, SearchInput } from "../../components/ui";
import { pretty } from "../../utils/pokemon";

type Move = {
  name: string; type: NamedResource; power: number | null; accuracy: number | null;
  damage_class: NamedResource;
  machines: { machine: NamedResource; version_group: NamedResource }[];
};
type Learned = { move: NamedResource; level: number };
const methods: Record<string, string> = {
  "level-up": "Golpes por nível", machine: "Golpes por TM / HM",
  egg: "Golpes por reprodução", tutor: "Golpes por tutor",
};
function MoveRow({ entry, method, version }: { entry: Learned; method: string; version: string }) {
  const router = useRouter();
  const query = useQuery({ queryKey: ["move", entry.move.name], queryFn: ({ signal }) => getByUrl<Move>(entry.move.url, signal) });
  const data = query.data;
  const machineUrl = data?.machines?.find((machine) => machine.version_group.name === version)?.machine.url;
  const machine = useQuery({ queryKey: ["move-machine", machineUrl], enabled: method === "machine" && !!machineUrl,
    queryFn: ({ signal }) => getByUrl<{ item: NamedResource }>(machineUrl!, signal) });
  const category = data?.damage_class.name;
  const categoryName = category === "physical" ? "Físico" : category === "special" ? "Especial" : "Status";
  const Icon = category === "physical" ? Zap : category === "special" ? Crosshair : Circle;
  return (
    <View style={[s.row, { borderBottomWidth: 1, borderBottomColor: c.line }]}>
      <Text style={[s.cell, { width: 58, color: c.muted }]}>
        {method === "level-up" ? entry.level : method === "machine" ? machine.data?.item.name.toUpperCase() ?? "—" : "—"}
      </Text>
      <View style={{ width: 160, paddingHorizontal: 8, justifyContent: "center" }}>
        <Pressable accessibilityRole="link" onPress={() => router.push(`/catalog/move/${idFromUrl(entry.move.url)}`)}>
          <Text style={{ color: c.accent, fontSize: 12, fontWeight: "700" }}>{pretty(entry.move.name)}</Text>
        </Pressable>
        {query.isError && <Pressable accessibilityRole="button" onPress={() => { void query.refetch(); }}><Text style={s.retry}>Recarregar dados</Text></Pressable>}
      </View>
      <View style={{ width: 96, justifyContent: "center", paddingHorizontal: 4 }}>{data && <Badge name={data.type.name} onPress={() => router.push(`/catalog/type/${data.type.name}`)} />}</View>
      <View accessibilityLabel={data ? categoryName : "Carregando categoria"} style={{ width: 48, alignItems: "center", justifyContent: "center" }}>
        {data && <Icon size={17} color={category === "physical" ? "#CA633F" : category === "special" ? "#527DB8" : c.muted} />}
      </View>
      <Text style={[s.cell, { width: 56 }]}>{data ? data.power ?? "—" : "…"}</Text>
      <Text style={[s.cell, { width: 60 }]}>{data ? data.accuracy ?? "—" : "…"}</Text>
    </View>
  );
}
function MoveTable({ method, entries, version }: { method: string; entries: Learned[]; version: string }) {
  const [limit, setLimit] = useState(30);
  return (
    <View style={{ flex: 1, minWidth: 0, gap: 12 }}>
      <Text style={ui.sectionTitle}>{methods[method] ?? pretty(method)}</Text>
      <Text style={ui.subtitle}>{entries.length} golpes · {pretty(version)}</Text>
      <ScrollView horizontal>
        <View>
          <View style={[s.row, { backgroundColor: "#EBEDF2" }]}>
            {[{ text: method === "level-up" ? "Nv." : method === "machine" ? "TM/HM" : "—", width: 58 },
              { text: "Golpe", width: 160 }, { text: "Tipo", width: 96 }, { text: "Cat.", width: 48 },
              { text: "Poder", width: 56 }, { text: "Precisão", width: 60 }].map((column) => <Text key={column.text} style={[s.cell, { width: column.width, fontWeight: "700", fontSize: 10 }]}>{column.text}</Text>)}
          </View>
          {entries.slice(0, limit).map((entry) => <MoveRow key={`${entry.move.name}-${entry.level}`} entry={entry} method={method} version={version} />)}
        </View>
      </ScrollView>
      {entries.length > limit && <Button small variant="outline" onPress={() => setLimit(limit + 30)}>Mostrar mais golpes</Button>}
    </View>
  );
}

export function Moves({ pokemon }: { pokemon: PokemonDetail }) {
  const { width } = useWindowDimensions();
  const [selectedGeneration, setGeneration] = useState("");
  const [selectedVersion, setVersion] = useState("");
  const [search, setSearch] = useState("");
  const versions = Array.from(new Set(pokemon.moves.flatMap((move) => move.version_group_details.map((detail) => detail.version_group.name))));
  const groups = useQueries({ queries: versions.map((version) => ({ queryKey: ["move-version-group", version],
    queryFn: ({ signal }: { signal: AbortSignal }) => getResource<{ generation: NamedResource; order: number }>("version-group", version, signal),
  })) });
  const available = versions.map((name, index) => ({ name, data: groups[index].data })).filter((group) => !!group.data)
    .sort((a, b) => b.data!.order - a.data!.order);
  const generations = Array.from(new Set(available.map((group) => group.data!.generation.url)))
    .sort((a, b) => Number(idFromUrl(a)) - Number(idFromUrl(b)));
  const generation = generations.includes(selectedGeneration) ? selectedGeneration : available[0]?.data?.generation.url;
  const games = available.filter((group) => group.data!.generation.url === generation);
  const version = games.some((group) => group.name === selectedVersion) ? selectedVersion : games[0]?.name;
  const entries: Record<string, Learned[]> = {};
  for (const move of pokemon.moves) {
    if (!move.move.name.includes(search.trim().toLowerCase().replace(/\s+/g, "-"))) continue;
    for (const detail of move.version_group_details) {
      if (detail.version_group.name !== version) continue;
      const method = detail.move_learn_method.name;
      const list = entries[method] ??= [];
      if (!list.some((entry) => entry.move.name === move.move.name && entry.level === detail.level_learned_at))
        list.push({ move: move.move, level: detail.level_learned_at });
    }
  }
  const orderedMethods = Object.keys(entries).sort((a, b) => {
    const order = ["level-up", "machine", "egg", "tutor"];
    return (order.includes(a) ? order.indexOf(a) : 99) - (order.includes(b) ? order.indexOf(b) : 99);
  });
  Object.entries(entries).forEach(([method, list]) => list.sort((a, b) => method === "level-up" ? a.level - b.level || a.move.name.localeCompare(b.move.name) : a.move.name.localeCompare(b.move.name)));
  return (
    <View style={{ gap: 20 }}>
      <Text style={ui.sectionTitle}>Golpes de {pretty(pokemon.name)}</Text>
      {!versions.length ? <Empty title="Sem golpes registrados" /> : groups.some((group) => group.isPending) ? <Loading /> : groups.some((group) => group.isError) ? <ErrorState retry={() => groups.forEach((group) => { if (group.isError) void group.refetch(); })} /> : <>
        <View style={[ui.panel, { backgroundColor: "#EAF2FF", padding: 16 }]}>
          <Text style={ui.label}>GERAÇÕES</Text>
          <View style={ui.wrap}>{generations.map((url) => <Button key={url} small variant={generation === url ? "primary" : "ghost"} onPress={() => { setGeneration(url); setVersion(""); }}>{idFromUrl(url)}</Button>)}</View>
        </View>
        <ScrollView horizontal><View style={[ui.row, { gap: 8 }]}>{games.map((game) => <Button key={game.name} small variant={version === game.name ? "primary" : "outline"} onPress={() => setVersion(game.name)}>{pretty(game.name)}</Button>)}</View></ScrollView>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar golpes neste jogo…" />
        <Text style={ui.subtitle}>Categorias: ⚡ físico · ◎ especial · ○ status. — indica valor não informado ou não aplicável. Poder e precisão são os valores atuais da PokéAPI.</Text>
        {!orderedMethods.length && <Empty title="Nenhum golpe encontrado neste jogo" />}
        <View style={{ flexDirection: width >= 1450 ? "row" : "column", flexWrap: "wrap", gap: 24 }}>
          {orderedMethods.map((method) => <View key={`${version}-${method}`} style={{ width: width >= 1450 ? "48%" : "100%" }}><MoveTable method={method} entries={entries[method]} version={version!} /></View>)}
        </View>
      </>}
    </View>
  );
}
const s = StyleSheet.create({
  row: { flexDirection: "row", minHeight: 40 },
  cell: { paddingHorizontal: 5, paddingVertical: 12, fontSize: 12, color: c.ink, textAlign: "center" },
  retry: { fontSize: 9, color: c.accent, marginTop: 3 },
});
