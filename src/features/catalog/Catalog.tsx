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
import Svg, { Rect } from "react-native-svg";
import { font, useTheme, useThemedStyles, type ThemeColors } from "../../theme";
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
import { resourceLabels } from "../../constants/pokemon";
import {
  matchesName,
  pretty,
  localText,
  localDescription,
} from "../../utils/pokemon";
import { useDebounce } from "../../hooks/useDebounce";
import { Art } from "../../components/ui";
import { resourcePath } from "../../components/ResourceData";

const regionImages: Record<string, number> = {
  kanto: require("../../../assets/regions/kanto.png"),
  johto: require("../../../assets/regions/johto.png"),
  hoenn: require("../../../assets/regions/hoenn.png"),
  sinnoh: require("../../../assets/regions/sinnoh.png"),
  unova: require("../../../assets/regions/unova.png"),
  hisui: require("../../../assets/regions/hisui.png"),
  kalos: require("../../../assets/regions/kalos.png"),
  paldea: require("../../../assets/regions/paldea.png"),
  alola: require("../../../assets/regions/alola.png"),
  galar: require("../../../assets/regions/galar.png"),
};
const generationConsoles: Record<string, { short: string; label: string }> = {
  "1": { short: "GB", label: "Game Boy" },
  "2": { short: "GBC", label: "Game Boy Color" },
  "3": { short: "GBA", label: "Game Boy Advance" },
  "4": { short: "DS", label: "Nintendo DS" },
  "5": { short: "DS", label: "Nintendo DS" },
  "6": { short: "3DS", label: "Nintendo 3DS" },
  "7": { short: "3DS", label: "Nintendo 3DS" },
  "8": { short: "SW", label: "Nintendo Switch" },
  "9": { short: "SW", label: "Nintendo Switch" },
};
function PixelConsole({ generation }: { generation: string }) {
  const kind = generationConsoles[generation]?.short;
  const isSwitch = kind === "SW";
  const is3ds = kind === "3DS";
  const isDs = kind === "DS";
  const body = isSwitch
    ? "#D96D69"
    : is3ds
      ? "#6F80B8"
      : isDs
        ? "#8B83A8"
        : "#82A98F";
  const dark = isSwitch ? "#9B454F" : "#3E465B";
  return (
    <Svg width={58} height={58} viewBox="0 0 58 58">
      {isSwitch ? (
        <>
          <Rect x="12" y="10" width="34" height="38" rx="2" fill={dark} />
          <Rect x="16" y="14" width="26" height="22" fill="#D7E6D4" />
          <Rect x="19" y="17" width="20" height="16" fill="#8DB5A0" />
          <Rect x="7" y="18" width="7" height="21" fill={body} />
          <Rect x="44" y="18" width="7" height="21" fill={body} />
          <Rect x="9" y="22" width="3" height="3" fill="#F5E8CF" />
          <Rect x="46" y="23" width="3" height="3" fill="#F5E8CF" />
          <Rect x="24" y="41" width="10" height="3" fill="#F5E8CF" />
        </>
      ) : is3ds ? (
        <>
          <Rect x="13" y="7" width="32" height="20" fill={dark} />
          <Rect x="16" y="10" width="26" height="14" fill="#C7D7D8" />
          <Rect x="13" y="29" width="32" height="22" fill={body} />
          <Rect x="18" y="33" width="22" height="10" fill="#B7D3C5" />
          <Rect x="22" y="46" width="3" height="3" fill="#F4D8A8" />
          <Rect x="34" y="46" width="3" height="3" fill="#F4D8A8" />
        </>
      ) : isDs ? (
        <>
          <Rect x="13" y="8" width="32" height="19" fill={dark} />
          <Rect x="17" y="11" width="24" height="13" fill="#C7D7D8" />
          <Rect x="13" y="29" width="32" height="20" fill={body} />
          <Rect x="18" y="33" width="22" height="10" fill="#B7D3C5" />
          <Rect x="22" y="46" width="3" height="2" fill="#F4D8A8" />
          <Rect x="34" y="46" width="3" height="2" fill="#F4D8A8" />
        </>
      ) : (
        <>
          <Rect x="12" y="12" width="34" height="34" fill={body} />
          <Rect x="17" y="17" width="20" height="13" fill="#C7D7D8" />
          <Rect x="20" y="20" width="14" height="7" fill="#8DB5A0" />
          <Rect x="39" y="19" width="4" height="4" fill="#F4D8A8" />
          <Rect x="39" y="27" width="4" height="4" fill="#F4D8A8" />
          <Rect x="20" y="36" width="4" height="4" fill="#F4D8A8" />
          <Rect x="28" y="36" width="4" height="4" fill="#F4D8A8" />
        </>
      )}
    </Svg>
  );
}

export default function Catalog({ resource }: { resource: string }) {
  const { colors: c, ui } = useTheme();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const query = useDebounce(search);
  const list = useQuery({
    queryKey: ["resource-list", resource, page],
    queryFn: ({ signal }) => getResourceList(resource, 18, page * 18, signal),
  });
  const index = useQuery({ ...indexOptions(resource), enabled: !!query });
  const allResults = query
    ? (index.data?.results.filter((item) =>
        matchesName(item.name, idFromUrl(item.url), query),
      ) ?? [])
    : (list.data?.results ?? []);
  const results = allResults;
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
  const { colors: c, ui, types } = useTheme();
  const s = useThemedStyles(createStyles);
  const router = useRouter();
  const type = data?.type as { name: string } | undefined;
  const typeMeta =
    resource === "type" ? types[name] : type ? types[type.name] : undefined;
  const description = localDescription(data);
  const sprites = data?.sprites as { default?: string } | undefined;
  const regionImage = resource === "region" ? regionImages[name] : undefined;
  const consoleInfo =
    resource === "generation" ? generationConsoles[id] : undefined;
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
        { borderColor: hovered ? c.borderStrong : c.line },
      ]}
    >
      <View style={ui.between}>
        <View style={[s.icon, { backgroundColor: typeMeta?.bg ?? c.lavender }]}>
          {consoleInfo ? (
            <PixelConsole generation={id} />
          ) : regionImage || sprites?.default ? (
            <Art
              name={name}
              uri={regionImage ?? sprites?.default}
              style={{ width: 55, height: 55 }}
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
        <ArrowUpRight size={15} color={c.muted} />
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
      {consoleInfo && <Text style={s.consoleLabel}>{consoleInfo.label}</Text>}
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
const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      borderWidth: 1,
      borderRadius: 14,
      backgroundColor: c.surface,
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
    consoleLabel: {
      ...font,
      color: c.muted,
      fontSize: 10,
      marginTop: -4,
    },
    id: { ...font, color: c.muted, fontSize: 10 },
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
