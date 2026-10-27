import React, { useMemo, useState } from "react";
import { Text, TextInput, View, useWindowDimensions } from "react-native";
import { useQueries } from "@tanstack/react-query";
import {
  Button,
  Empty,
  Pagination,
  SearchInput,
  Select,
} from "../../components/ui";
import { useTheme } from "../../theme";
import { getResource, type GenericResource } from "../../services/api";
import { matchesName, pretty } from "../../utils/pokemon";
import { useDebounce } from "../../hooks/useDebounce";
import { ResourceCard } from "./Catalog";
import { moveIndex } from "./moveData";

const defaults = {
  type: "",
  category: "",
  generation: "",
  priority: "",
  powerMode: "",
  accuracyMode: "",
  powerMin: "",
  powerMax: "",
  accuracyMin: "",
  accuracyMax: "",
  ppMin: "",
  ppMax: "",
  sort: "id",
};
type Filters = typeof defaults;
const pageSize = 18;
const categoryNames: Record<string, string> = {
  physical: "Físico",
  special: "Especial",
  status: "Status",
};

export default function MovesCatalog() {
  const { colors: c, types, ui } = useTheme();
  const { width } = useWindowDimensions();
  const [filters, setFilters] = useState<Filters>(defaults);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const query = useDebounce(search);
  const change = (key: keyof Filters, value: string) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
    setPage(0);
  };
  const inRange = (value: number | null, min: string, max: string) =>
    (!min && !max) ||
    (value !== null &&
      (!min || value >= Number(min)) &&
      (!max || value <= Number(max)));
  const invalidRange = (["power", "accuracy", "pp"] as const).some(
    (key) =>
      filters[`${key}Min`] !== "" &&
      filters[`${key}Max`] !== "" &&
      Number(filters[`${key}Min`]) > Number(filters[`${key}Max`]),
  );
  const results = useMemo(() => {
    const filtered = moveIndex.filter(
      (move) =>
        matchesName(move.name, String(move.id), query) &&
        (!filters.type || move.type === filters.type) &&
        (!filters.category || move.category === filters.category) &&
        (!filters.generation ||
          move.generation === Number(filters.generation)) &&
        (!filters.priority ||
          (filters.priority === "positive"
            ? move.priority > 0
            : filters.priority === "negative"
              ? move.priority < 0
              : move.priority === 0)) &&
        (!filters.powerMode ||
          (filters.powerMode === "fixed"
            ? move.power !== null
            : move.power === null)) &&
        (!filters.accuracyMode ||
          (filters.accuracyMode === "check"
            ? move.accuracy !== null
            : move.accuracy === null)) &&
        inRange(move.power, filters.powerMin, filters.powerMax) &&
        inRange(move.accuracy, filters.accuracyMin, filters.accuracyMax) &&
        inRange(move.pp, filters.ppMin, filters.ppMax),
    );
    return filtered.sort((a, b) => {
      if (filters.sort === "name") return a.name.localeCompare(b.name);
      if (filters.sort === "id") return a.id - b.id;
      const key = filters.sort as "power" | "accuracy" | "pp" | "priority";
      const av = a[key],
        bv = b[key];
      if (av === null) return bv === null ? a.id - b.id : 1;
      if (bv === null) return -1;
      return bv - av || a.id - b.id;
    });
  }, [query, filters]);
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(results.length / pageSize) - 1),
  );
  const visible = results.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );
  const details = useQueries({
    queries: visible.map((move) => ({
      queryKey: ["resource", "move", String(move.id)],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getResource<GenericResource>("move", move.id, signal),
    })),
  });
  const columns = width >= 1250 ? 3 : width >= 650 ? 2 : 1;
  const select = (
    label: string,
    key: keyof Filters,
    options: { value: string; label: string }[],
  ) => (
    <View
      style={{ flexGrow: 1, flexBasis: width < 650 ? "100%" : "28%", gap: 6 }}
    >
      <Text style={ui.label}>{label}</Text>
      <Select
        label={label}
        value={filters[key]}
        options={options}
        onChange={(value) => change(key, value)}
      />
    </View>
  );
  const range = (
    label: string,
    key: "power" | "accuracy" | "pp",
    max?: number,
  ) => (
    <View
      style={{ flexGrow: 1, flexBasis: width < 650 ? "100%" : "28%", gap: 6 }}
    >
      <Text style={ui.label}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {(["Min", "Max"] as const).map((bound) => (
          <TextInput
            key={bound}
            accessibilityLabel={`${label} ${bound === "Min" ? "mínimo" : "máximo"}`}
            placeholder={bound === "Min" ? "Mínimo" : "Máximo"}
            placeholderTextColor={c.placeholder}
            keyboardType="number-pad"
            value={filters[`${key}${bound}`]}
            onChangeText={(text) => {
              const digits = text.replace(/\D/g, "").slice(0, 4);
              change(
                `${key}${bound}`,
                digits && max !== undefined
                  ? String(Math.min(Number(digits), max))
                  : digits,
              );
            }}
            style={{
              flex: 1,
              minWidth: 0,
              color: c.ink,
              borderWidth: 1,
              borderColor: c.line,
              backgroundColor: c.surface,
              borderRadius: 10,
              padding: 12,
              fontSize: 13,
            }}
          />
        ))}
      </View>
    </View>
  );
  const active = Object.entries(filters).some(
    ([key, value]) => value !== defaults[key as keyof Filters],
  );
  return (
    <View style={[ui.page, width < 650 && { padding: 18 }]}>
      <View style={{ gap: 6 }}>
        <Text style={[ui.label, { color: c.accent }]}>
          O UNIVERSO ALÉM DA POKÉDEX
        </Text>
        <Text style={ui.title}>Golpes</Text>
        <Text style={ui.subtitle}>
          Encontre o golpe ideal por tipo, categoria e atributos.
        </Text>
      </View>
      <SearchInput
        value={search}
        onChange={(value) => {
          setSearch(value);
          setPage(0);
        }}
        placeholder="Pesquisar golpe por nome ou número…"
      />
      <View style={[ui.panel, { gap: 16 }]}>
        <View style={ui.between}>
          <Text style={ui.sectionTitle}>Filtros dos golpes</Text>
          <Button
            small
            variant="ghost"
            disabled={!active && !search}
            onPress={() => {
              setFilters(defaults);
              setSearch("");
              setPage(0);
            }}
          >
            Limpar filtros
          </Button>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
          {select("Tipo", "type", [
            { value: "", label: "Todos os tipos" },
            ...[...new Set(moveIndex.map((move) => move.type))].map((name) => ({
              value: name,
              label: types[name]?.name ?? pretty(name),
            })),
          ])}
          {select("Categoria", "category", [
            { value: "", label: "Todas as categorias" },
            ...Object.entries(categoryNames).map(([value, label]) => ({
              value,
              label,
            })),
          ])}
          {select("Geração de estreia", "generation", [
            { value: "", label: "Todas as gerações" },
            ...[...new Set(moveIndex.map((move) => move.generation))]
              .sort((a, b) => a - b)
              .map((generation) => ({
                value: String(generation),
                label: `Geração ${generation}`,
              })),
          ])}
          {range("Poder", "power")}
          {range("Precisão (%)", "accuracy", 100)}
          {range("PP", "pp")}
          {select("Poder do golpe", "powerMode", [
            { value: "", label: "Qualquer poder" },
            { value: "fixed", label: "Poder numérico" },
            { value: "variable", label: "Variável / sem poder numérico" },
          ])}
          {select("Teste de precisão", "accuracyMode", [
            { value: "", label: "Qualquer precisão" },
            { value: "check", label: "Com teste de precisão" },
            { value: "none", label: "Sem teste de precisão" },
          ])}
          {select("Prioridade", "priority", [
            { value: "", label: "Qualquer prioridade" },
            { value: "positive", label: "Positiva (antes dos normais)" },
            { value: "zero", label: "Normal (zero)" },
            { value: "negative", label: "Negativa (depois dos normais)" },
          ])}
        </View>
        <Text style={ui.subtitle}>
          Golpes com poder variável ou sem teste de precisão não têm valor
          numérico nesses campos. Eles ficam fora de filtros por mínimo ou
          máximo.
        </Text>
        {invalidRange && (
          <Text style={{ color: c.warningText }}>
            O valor mínimo precisa ser menor ou igual ao máximo.
          </Text>
        )}
      </View>
      <View style={[ui.between, { flexWrap: "wrap", gap: 12 }]}>
        <Text style={ui.subtitle}>
          {results.length} de {moveIndex.length} golpes
        </Text>
        <View style={{ minWidth: 220 }}>
          <Select
            label="Ordenar golpes"
            value={filters.sort}
            onChange={(value) => change("sort", value)}
            options={[
              { value: "id", label: "Número do golpe" },
              { value: "name", label: "Nome (A–Z)" },
              { value: "power", label: "Maior poder" },
              { value: "accuracy", label: "Maior precisão" },
              { value: "pp", label: "Maior PP" },
              { value: "priority", label: "Maior prioridade" },
            ]}
          />
        </View>
      </View>
      {!visible.length ? (
        <Empty
          title="Nenhum golpe encontrado"
          description="Ajuste os filtros ou limpe a pesquisa para ver mais golpes."
        />
      ) : (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", margin: -7 }}>
            {visible.map((move, index) => {
              const fallback: GenericResource = {
                ...move,
                type: { name: move.type },
                damage_class: { name: move.category },
              };
              return (
                <View
                  key={move.id}
                  style={{ width: `${100 / columns}%`, padding: 7 }}
                >
                  <ResourceCard
                    resource="move"
                    id={String(move.id)}
                    name={move.name}
                    data={{ ...details[index].data, ...fallback }}
                    pending={details[index].isPending}
                  />
                </View>
              );
            })}
          </View>
          <Pagination
            page={currentPage}
            total={results.length}
            pageSize={pageSize}
            setPage={setPage}
          />
        </>
      )}
    </View>
  );
}
