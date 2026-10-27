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
import {
  itemIndex,
  itemCategories,
  itemPockets,
  itemFlags,
  categoryLabels,
  pocketLabels,
  flagLabels,
} from "./itemData";

const defaults = {
  category: "",
  pocket: "",
  flag: "",
  price: "",
  minCost: "",
  maxCost: "",
  fling: "",
  minFling: "",
  maxFling: "",
  sort: "id",
};
type Filters = typeof defaults;
const pageSize = 18;
export default function ItemsCatalog() {
  const { colors: c, ui } = useTheme();
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
    return itemIndex
      .filter(
        (item) =>
          matchesName(item.name, String(item.id), query) &&
          (!filters.category || item.category === Number(filters.category)) &&
          (!filters.pocket || item.pocket === Number(filters.pocket)) &&
          (!filters.flag || item.flags.includes(Number(filters.flag))) &&
          (!filters.price ||
            (filters.price === "priced" ? item.cost > 0 : item.cost === 0)) &&
          (!filters.fling ||
            (filters.fling === "yes"
              ? item.flingPower !== null
              : item.flingPower === null)) &&
          inRange(item.cost, filters.minCost, filters.maxCost) &&
          inRange(item.flingPower, filters.minFling, filters.maxFling),
      )
      .sort((a, b) => {
        if (filters.sort === "name") return a.name.localeCompare(b.name);
        if (filters.sort === "costAsc") return a.cost - b.cost || a.id - b.id;
        if (filters.sort === "costDesc") return b.cost - a.cost || a.id - b.id;
        if (filters.sort === "fling")
          return (b.flingPower ?? -1) - (a.flingPower ?? -1) || a.id - b.id;
        return a.id - b.id;
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
    queries: visible.map((item) => ({
      queryKey: ["resource", "item", String(item.id)],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getResource<GenericResource>("item", item.id, signal),
    })),
  });
  const columns = width >= 1250 ? 3 : width >= 650 ? 2 : 1;
  const categoryOptions = Object.entries(itemCategories)
    .filter(
      ([, category]) =>
        !filters.pocket || category.pocket === Number(filters.pocket),
    )
    .map(([id, category]) => ({
      value: id,
      label: categoryLabels[category.name] ?? pretty(category.name),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
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
        onChange={(value) => {
          if (key === "pocket") {
            setFilters((previous) => ({
              ...previous,
              pocket: value,
              category:
                previous.category &&
                value &&
                itemCategories[Number(previous.category)]?.pocket !==
                  Number(value)
                  ? ""
                  : previous.category,
            }));
            setPage(0);
          } else change(key, value);
        }}
      />
    </View>
  );
  const range = (label: string, min: keyof Filters, max: keyof Filters) => (
    <View
      style={{ flexGrow: 1, flexBasis: width < 650 ? "100%" : "28%", gap: 6 }}
    >
      <Text style={ui.label}>{label}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[min, max].map((key, index) => (
          <TextInput
            key={key}
            accessibilityLabel={`${label} ${index === 0 ? "mínimo" : "máximo"}`}
            placeholder={index === 0 ? "Mínimo" : "Máximo"}
            placeholderTextColor={c.placeholder}
            keyboardType="number-pad"
            value={filters[key]}
            onChangeText={(text) =>
              change(key, text.replace(/\D/g, "").slice(0, 8))
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
  const invalidRange = [
    [filters.minCost, filters.maxCost],
    [filters.minFling, filters.maxFling],
  ].some(([min, max]) => min !== "" && max !== "" && Number(min) > Number(max));
  const active = Object.entries(filters).some(
    ([key, value]) => value !== defaults[key as keyof Filters],
  );
  return (
    <View style={[ui.page, width < 650 && { padding: 18 }]}>
      <View style={{ gap: 6 }}>
        <Text style={[ui.label, { color: c.accent }]}>
          O UNIVERSO ALÉM DA POKÉDEX
        </Text>
        <Text style={ui.title}>Itens</Text>
        <Text style={ui.subtitle}>
          Explore os itens por categoria, utilidade e atributos.
        </Text>
      </View>
      <SearchInput
        value={search}
        onChange={(value) => {
          setSearch(value);
          setPage(0);
        }}
        placeholder="Pesquisar item por nome ou número…"
      />
      <View style={[ui.panel, { gap: 16 }]}>
        <View style={ui.between}>
          <Text style={ui.sectionTitle}>Filtros dos itens</Text>
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
          {select("Bolso da mochila", "pocket", [
            { value: "", label: "Todos os bolsos" },
            ...Object.entries(itemPockets).map(([id, name]) => ({
              value: id,
              label: pocketLabels[name] ?? pretty(name),
            })),
          ])}
          {select("Categoria", "category", [
            { value: "", label: "Todas as categorias" },
            ...categoryOptions,
          ])}
          {select("Atributo", "flag", [
            { value: "", label: "Todos os atributos" },
            ...Object.entries(itemFlags).map(([id, name]) => ({
              value: id,
              label: flagLabels[name] ?? pretty(name),
            })),
          ])}
          {range("Preço cadastrado", "minCost", "maxCost")}
          {select("Preço", "price", [
            { value: "", label: "Qualquer preço" },
            { value: "priced", label: "Com preço cadastrado" },
            { value: "unpriced", label: "Sem preço cadastrado" },
          ])}
          {select("Fling (Arremesso)", "fling", [
            { value: "", label: "Todos os itens" },
            { value: "yes", label: "Com poder de Fling" },
            { value: "no", label: "Sem poder de Fling" },
          ])}
          {range("Poder de Fling", "minFling", "maxFling")}
        </View>
        <Text style={ui.subtitle}>
          Preço zero indica ausência de preço cadastrado. Valores podem variar
          entre jogos. Itens sem poder de Fling ficam fora dos filtros numéricos
          desse atributo.
        </Text>
        {invalidRange && (
          <Text style={{ color: c.warningText }}>
            O valor mínimo precisa ser menor ou igual ao máximo.
          </Text>
        )}
      </View>
      <View style={[ui.between, { flexWrap: "wrap", gap: 12 }]}>
        <Text style={ui.subtitle}>
          {results.length} de {itemIndex.length} itens
        </Text>
        <View style={{ minWidth: 220 }}>
          <Select
            label="Ordenar itens"
            value={filters.sort}
            onChange={(value) => change("sort", value)}
            options={[
              { value: "id", label: "Número do item" },
              { value: "name", label: "Nome (A–Z)" },
              { value: "costAsc", label: "Menor preço" },
              { value: "costDesc", label: "Maior preço" },
              { value: "fling", label: "Maior poder de Fling" },
            ]}
          />
        </View>
      </View>
      {!visible.length ? (
        <Empty
          title="Nenhum item encontrado"
          description="Ajuste os filtros ou limpe a pesquisa para ver mais itens."
        />
      ) : (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", margin: -7 }}>
            {visible.map((item, index) => {
              const category = itemCategories[item.category];
              const fallback: GenericResource = {
                id: item.id,
                name: item.name,
                cost: item.cost,
                fling_power: item.flingPower,
                catalog_category_label:
                  categoryLabels[category?.name] ??
                  pretty(category?.name ?? "item"),
                sprites: {
                  default: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${item.name}.png`,
                },
              };
              return (
                <View
                  key={item.id}
                  style={{ width: `${100 / columns}%`, padding: 7 }}
                >
                  <ResourceCard
                    resource="item"
                    id={String(item.id)}
                    name={item.name}
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
