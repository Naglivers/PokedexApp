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
import berries from "./berryData.json";

const typeNames: Record<number, string> = {
  "1": "normal",
  "2": "fighting",
  "3": "flying",
  "4": "poison",
  "5": "ground",
  "6": "rock",
  "7": "bug",
  "8": "ghost",
  "9": "steel",
  "10": "fire",
  "11": "water",
  "12": "grass",
  "13": "electric",
  "14": "psychic",
  "15": "ice",
  "16": "dragon",
  "17": "dark",
  "18": "fairy",
  "19": "stellar",
  "10001": "unknown",
  "10002": "shadow",
};
const firmnessNames: Record<number, string> = {
  1: "Muito macia",
  2: "Macia",
  3: "Dura",
  4: "Muito dura",
  5: "Superdura",
};
const flavors = ["Picante", "Seco", "Doce", "Amargo", "Azedo"];
const defaults = {
  flavor: "",
  firmness: "",
  type: "",
  growthMin: "",
  growthMax: "",
  harvestMin: "",
  harvestMax: "",
  powerMin: "",
  powerMax: "",
  sizeMin: "",
  sizeMax: "",
  smoothnessMin: "",
  smoothnessMax: "",
  sort: "id",
};
type Filters = typeof defaults;
const pageSize = 18;

export default function BerriesCatalog() {
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
  const results = useMemo(() => {
    const inRange = (value: number | null, min: string, max: string) =>
      (!min && !max) ||
      (value !== null &&
        (!min || value >= Number(min)) &&
        (!max || value <= Number(max)));
    return berries
      .filter(
        (berry) =>
          matchesName(
            berry.name,
            String(berry.id),
            query.replace(/-berry$/i, ""),
          ) &&
          (!filters.flavor ||
            (berry.flavors[Number(filters.flavor) - 1] ?? 0) > 0) &&
          (!filters.firmness ||
            (filters.firmness === "unknown"
              ? berry.firmness === null
              : berry.firmness === Number(filters.firmness))) &&
          (!filters.type || berry.type === Number(filters.type)) &&
          inRange(berry.growth, filters.growthMin, filters.growthMax) &&
          inRange(berry.harvest, filters.harvestMin, filters.harvestMax) &&
          inRange(berry.power, filters.powerMin, filters.powerMax) &&
          inRange(berry.size, filters.sizeMin, filters.sizeMax) &&
          inRange(
            berry.smoothness,
            filters.smoothnessMin,
            filters.smoothnessMax,
          ),
      )
      .sort((a, b) => {
        if (filters.sort === "name") return a.name.localeCompare(b.name);
        if (filters.sort === "id") return a.id - b.id;
        const key = filters.sort as
          "growth" | "harvest" | "power" | "size" | "smoothness";
        const av = a[key],
          bv = b[key];
        if (av === null) return bv === null ? a.id - b.id : 1;
        if (bv === null) return -1;
        return (
          (key === "growth" || key === "size" ? av - bv : bv - av) ||
          a.id - b.id
        );
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
    queries: visible.map((berry) => ({
      queryKey: ["resource", "berry", String(berry.id)],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getResource<GenericResource>("berry", berry.id, signal),
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
    key: "growth" | "harvest" | "power" | "size" | "smoothness",
  ) => (
    <View
      style={{ flexGrow: 1, flexBasis: width < 650 ? "100%" : "28%", gap: 6 }}
    >
      <Text style={ui.label}>{label}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["Min", "Max"] as const).map((bound) => (
          <TextInput
            key={bound}
            accessibilityLabel={`${label} ${bound === "Min" ? "mínimo" : "máximo"}`}
            placeholder={bound === "Min" ? "Mínimo" : "Máximo"}
            placeholderTextColor={c.placeholder}
            keyboardType="number-pad"
            value={filters[`${key}${bound}`]}
            onChangeText={(text) =>
              change(`${key}${bound}`, text.replace(/\D/g, "").slice(0, 5))
            }
            style={{
              flex: 1,
              minWidth: 0,
              padding: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: c.line,
              backgroundColor: c.surface,
              color: c.ink,
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
  const invalidRange = (
    ["growth", "harvest", "power", "size", "smoothness"] as const
  ).some(
    (key) =>
      filters[`${key}Min`] !== "" &&
      filters[`${key}Max`] !== "" &&
      Number(filters[`${key}Min`]) > Number(filters[`${key}Max`]),
  );
  return (
    <View style={[ui.page, width < 650 && { padding: 18 }]}>
      <View style={{ gap: 6 }}>
        <Text style={[ui.label, { color: c.accent }]}>
          O UNIVERSO ALÉM DA POKÉDEX
        </Text>
        <Text style={ui.title}>Frutas</Text>
        <Text style={ui.subtitle}>
          Encontre frutas por sabor, firmeza, cultivo e atributos.
        </Text>
      </View>
      <SearchInput
        value={search}
        onChange={(value) => {
          setSearch(value);
          setPage(0);
        }}
        placeholder="Pesquisar fruta por nome ou número…"
      />
      <View style={[ui.panel, { gap: 16 }]}>
        <View style={ui.between}>
          <Text style={ui.sectionTitle}>Filtros das frutas</Text>
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
          {select("Sabor", "flavor", [
            { value: "", label: "Todos os sabores" },
            ...flavors.map((label, index) => ({
              value: String(index + 1),
              label,
            })),
          ])}
          {select("Firmeza", "firmness", [
            { value: "", label: "Todas as firmezas" },
            ...Object.entries(firmnessNames).map(([value, label]) => ({
              value,
              label,
            })),
            { value: "unknown", label: "Não informada" },
          ])}
          {select("Tipo de Natural Gift", "type", [
            { value: "", label: "Todos os tipos" },
            ...[...new Set(berries.map((berry) => berry.type))]
              .filter((id): id is number => id !== null)
              .map((id) => ({
                value: String(id),
                label: types[typeNames[id]]?.name ?? pretty(typeNames[id]),
              })),
          ])}
          {range("Crescimento por estágio (h)", "growth")}
          {range("Colheita máxima", "harvest")}
          {range("Poder de Natural Gift", "power")}
          {range("Tamanho (mm)", "size")}
          {range("Suavidade", "smoothness")}
        </View>
        <Text style={ui.subtitle}>
          Dados não informados ficam fora dos filtros numéricos. O crescimento
          corresponde a cada estágio de cultivo; valores e mecânicas podem
          variar entre jogos.
        </Text>
        {invalidRange && (
          <Text style={{ color: c.warningText }}>
            O valor mínimo precisa ser menor ou igual ao máximo.
          </Text>
        )}
      </View>
      <View style={[ui.between, { flexWrap: "wrap", gap: 12 }]}>
        <Text style={ui.subtitle}>
          {results.length} de {berries.length} frutas
        </Text>
        <View style={{ minWidth: 220 }}>
          <Select
            label="Ordenar frutas"
            value={filters.sort}
            onChange={(value) => change("sort", value)}
            options={[
              { value: "id", label: "Número da fruta" },
              { value: "name", label: "Nome (A–Z)" },
              { value: "growth", label: "Crescimento mais rápido" },
              { value: "harvest", label: "Maior colheita" },
              { value: "power", label: "Maior poder de Natural Gift" },
              { value: "size", label: "Menor tamanho" },
              { value: "smoothness", label: "Maior suavidade" },
            ]}
          />
        </View>
      </View>
      {!visible.length ? (
        <Empty
          title="Nenhuma fruta encontrada"
          description="Ajuste os filtros ou limpe a pesquisa para ver mais frutas."
        />
      ) : (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", margin: -7 }}>
            {visible.map((berry, index) => {
              const taste = berry.flavors
                .map((potency, flavor) =>
                  potency > 0 ? `${flavors[flavor]} (${potency})` : "",
                )
                .filter(Boolean)
                .join(" · ");
              const fallback: GenericResource = {
                id: berry.id,
                name: berry.name,
                growth_time: berry.growth,
                size: berry.size,
                max_harvest: berry.harvest,
                ...(berry.type !== null
                  ? { type: { name: typeNames[berry.type] } }
                  : {}),
                catalog_category_label:
                  berry.firmness !== null
                    ? firmnessNames[berry.firmness]
                    : "Firmeza não informada",
                catalog_description: taste
                  ? `Sabores: ${taste}.`
                  : "Sabores não informados.",
                sprites: {
                  default: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${berry.item}.png`,
                },
              };
              return (
                <View
                  key={berry.id}
                  style={{ width: `${100 / columns}%`, padding: 7 }}
                >
                  <ResourceCard
                    resource="berry"
                    id={String(berry.id)}
                    name={berry.name}
                    data={{ ...details[index].data, ...fallback }}
                    pending={false}
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
