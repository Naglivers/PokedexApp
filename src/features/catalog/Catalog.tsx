import React, { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ArrowUpRight, ArrowLeft, Database, Layers } from "lucide-react-native";
import { colors as c, font, ui } from "../../theme";
import {
  Badge,
  Empty,
  ErrorState,
  Loading,
  Pagination,
  SearchInput,
  Skeleton,
} from "../../components/ui";
import {
  getResource,
  getResourceList,
  idFromUrl,
  GenericResource,
} from "../../services/api";
import { indexOptions } from "../../services/queries";
import { resourceLabels, types } from "../../constants/pokemon";
import { matchesName, pretty, localText } from "../../utils/pokemon";
import { useDebounce } from "../../hooks/useDebounce";
import { Art } from "../../components/ui";
import { resourcePath } from "../../components/ResourceData";

export default function Catalog({ resource }: { resource: string }) {
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const query = useDebounce(search);
  const list = useQuery({
    queryKey: ["resource-list", resource, page],
    queryFn: ({ signal }) => getResourceList(resource, 18, page * 18, signal),
  });
  const index = useQuery({ ...indexOptions(resource), enabled: !!query });
  const results = query
    ? (index.data?.results.filter((item) =>
        matchesName(item.name, idFromUrl(item.url), query),
      ) ?? [])
    : (list.data?.results ?? []);
  const visible = query ? results.slice(page * 18, page * 18 + 18) : results;
  const details = useQueries({
    queries: visible.map((item) => ({
      queryKey: ["resource", resource, idFromUrl(item.url)],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getResource(resource, idFromUrl(item.url), signal),
    })),
  });
  const total = query ? results.length : (list.data?.count ?? 0);
  const pending = query ? index.isPending : list.isPending;
  const error = query ? index.isError : list.isError;
  const columns = width >= 1250 ? 3 : width >= 650 ? 2 : 1;
  return (
    <View style={[ui.page, width < 650 && { padding: 18 }]}>
      <View>
        <Text style={[ui.label, { color: c.accent, marginBottom: 8 }]}>
          O UNIVERSO ALÉM DA POKÉDEX
        </Text>
        <Text style={ui.title}>
          {resourceLabels[resource] ?? pretty(resource)}
        </Text>
        <Text style={[ui.subtitle, { marginTop: 5 }]}>
          Explore os registros e suas conexões com o mundo Pokémon.
        </Text>
      </View>
      <View style={[ui.between, { flexWrap: "wrap" }]}>
        <View style={{ minWidth: 210, maxWidth: 480, flex: 1 }}>
          <SearchInput
            value={search}
            onChange={(text) => {
              setSearch(text);
              setPage(0);
            }}
            placeholder="Pesquisar por nome ou número…"
          />
        </View>
        <Text style={ui.subtitle}>
          {total.toLocaleString("pt-BR")} registros
        </Text>
      </View>
      {error ? (
        <ErrorState
          retry={() => {
            list.refetch();
            if (query) index.refetch();
          }}
        />
      ) : pending ? (
        <Loading />
      ) : !visible.length ? (
        <Empty />
      ) : (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", margin: -7 }}>
            {visible.map((item, i) => (
              <View
                key={item.url}
                style={{ width: `${100 / columns}%`, padding: 7 }}
              >
                <ResourceCard
                  resource={resource}
                  data={details[i].data}
                  name={item.name}
                  id={idFromUrl(item.url)}
                  pending={details[i].isPending}
                />
              </View>
            ))}
          </View>
          <Pagination
            page={page}
            total={total}
            pageSize={18}
            setPage={setPage}
          />
        </>
      )}
    </View>
  );
}
export function ResourceCard({
  resource,
  data,
  name,
  id,
  pending,
}: {
  resource: string;
  data?: GenericResource;
  name: string;
  id: string;
  pending: boolean;
}) {
  const router = useRouter();
  const type = data?.type as { name: string } | undefined;
  const typeMeta =
    resource === "type" ? types[name] : type ? types[type.name] : undefined;
  const description =
    localText(data?.effect_entries, "short_effect") ||
    localText(data?.flavor_text_entries) ||
    localText(data?.descriptions, "description");
  const sprites = data?.sprites as { default?: string } | undefined;
  const facts = [
    "power",
    "accuracy",
    "pp",
    "cost",
    "growth_time",
    "size",
    "order",
  ]
    .filter((key) => typeof data?.[key] === "number")
    .slice(0, 3);
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push(resourcePath(resource, id))}
      style={({ hovered }: { hovered?: boolean; pressed?: boolean }) => [
        s.card,
        { borderColor: hovered ? "#CBD1DE" : c.line },
      ]}
    >
      <View style={ui.between}>
        <View style={[s.icon, { backgroundColor: typeMeta?.bg ?? "#F0EFF8" }]}>
          {sprites?.default ? (
            <Art
              name={name}
              uri={sprites.default}
              style={{ width: 30, height: 30 }}
            />
          ) : (
            <Layers
              size={20}
              color={typeMeta?.color ?? "#8B83A8"}
              strokeWidth={1.5}
            />
          )}
        </View>
        <Text style={s.id}>#{id.padStart(3, "0")}</Text>
      </View>
      <View style={ui.between}>
        <Text style={s.name}>
          {resource === "type"
            ? (types[name]?.name ?? pretty(name))
            : pretty(data?.name ?? name)}
        </Text>
        <ArrowUpRight size={15} color="#9DA6B4" />
      </View>
      {type && (
        <View style={{ alignSelf: "flex-start" }}>
          <Badge name={type.name} />
        </View>
      )}
      {pending ? (
        <Skeleton height={13} width="80%" />
      ) : (
        <Text numberOfLines={2} style={s.description}>
          {description ||
            (resource === "type" && Array.isArray(data?.pokemon)
              ? `${data.pokemon.length} Pokémon associados a este tipo.`
              : "Explore os dados, relações e informações deste registro.")}
        </Text>
      )}
      {facts.length > 0 && (
        <View style={s.facts}>
          {facts.map((key) => (
            <Text key={key} style={s.fact}>
              {
                (
                  {
                    power: "Poder",
                    accuracy: "Precisão",
                    pp: "PP",
                    cost: "Custo",
                    size: "Tamanho",
                    order: "Ordem",
                    growth_time: "Crescimento",
                  } as Record<string, string>
                )[key]
              }{" "}
              <Text style={{ fontWeight: "700", color: c.ink }}>
                {String(data?.[key])}
              </Text>
            </Text>
          ))}
        </View>
      )}
    </Pressable>
  );
}
const s = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    backgroundColor: "#FFF",
    padding: 20,
    gap: 13,
    minHeight: 206,
    flex: 1,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  id: { ...font, color: "#A5ADBA", fontSize: 10 },
  name: {
    ...font,
    fontSize: 17,
    fontWeight: "700",
    color: c.ink,
    flexShrink: 1,
  },
  description: { ...font, fontSize: 11, lineHeight: 19, color: c.muted },
  facts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: c.line,
    paddingTop: 12,
  },
  fact: { ...font, fontSize: 10, color: c.muted },
});
