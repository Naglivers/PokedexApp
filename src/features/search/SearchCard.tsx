import React, { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ArrowUpRight, Sparkles } from "lucide-react-native";
import { Art, Badge } from "../../components/ui";
import { resourcePath } from "../../components/ResourceData";
import { font, useTheme, useThemedStyles, type ThemeColors } from "../../theme";
import {
  getResource,
  idFromUrl,
  spriteUrl,
  type GenericResource,
  type NamedResource,
} from "../../services/api";
import { pokemonOptions } from "../../services/queries";
import { localDescription, pretty } from "../../utils/pokemon";
import { TypeSymbol } from "../catalog/TypeSymbol";
import { MoveTMIcon } from "../catalog/MoveTMIcon";
import { GameIcons } from "../tracker/GameIcons";
import { categories, type SearchCategory } from "./searchStyles";

const regions: Record<string, number> = {
  kanto: require("../../../assets/regions/kanto.png"),
  johto: require("../../../assets/regions/johto.png"),
  hoenn: require("../../../assets/regions/hoenn.png"),
  sinnoh: require("../../../assets/regions/sinnoh.png"),
  unova: require("../../../assets/regions/unova.png"),
  kalos: require("../../../assets/regions/kalos.png"),
  alola: require("../../../assets/regions/alola.png"),
  galar: require("../../../assets/regions/galar.png"),
  hisui: require("../../../assets/regions/hisui.png"),
  paldea: require("../../../assets/regions/paldea.png"),
};
const starters: Record<string, number> = {
  "1": 1,
  "2": 152,
  "3": 252,
  "4": 387,
  "5": 495,
  "6": 650,
  "7": 722,
  "8": 810,
  "9": 906,
};
const generationNames: Record<string, string> = {
  "1": "Kanto",
  "2": "Johto",
  "3": "Hoenn",
  "4": "Sinnoh",
  "5": "Unova",
  "6": "Kalos",
  "7": "Alola",
  "8": "Galar / Hisui",
  "9": "Paldea",
};
const romans = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];

function GameCover({ version }: { version: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [version]);
  return failed ? (
    <GameIcons versions={[version]} size={88} />
  ) : (
    <Image
      source={{ uri: `https://img.pokemondb.net/boxes/${version}.jpg` }}
      accessibilityLabel={`Capa de Pokémon ${pretty(version)}`}
      resizeMode="contain"
      onError={() => setFailed(true)}
      style={{ width: 96, height: 110, marginTop: 12, borderRadius: 5 }}
    />
  );
}

export function SearchCard({
  resource,
  record,
  mobile = false,
}: {
  resource: SearchCategory;
  record: NamedResource;
  mobile?: boolean;
}) {
  const { colors: c, types } = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const id = idFromUrl(record.url) || record.name;
  const pokemon = useQuery({
    ...pokemonOptions(id),
    enabled: resource === "pokemon",
  });
  const detail = useQuery({
    queryKey: ["resource", resource, id],
    queryFn: ({ signal }) => getResource<GenericResource>(resource, id, signal),
    enabled: resource === "move" || resource === "ability",
  });
  const moveType = (detail.data?.type as NamedResource | undefined)?.name;
  const primaryType =
    resource === "pokemon"
      ? pokemon.data?.types[0]?.type.name
      : resource === "type"
        ? record.name
        : moveType;
  const type = primaryType ? types[primaryType] : undefined;
  const compact = resource === "move" || resource === "ability";
  const backdrop =
    type?.bg ??
    (resource === "item"
      ? c.goldSoft
      : resource === "version"
        ? c.lavender
        : resource === "region"
          ? c.mint
          : c.surfaceAlt);
  const name =
    resource === "type"
      ? (types[record.name]?.name ?? pretty(record.name))
      : resource === "generation"
        ? `Geração ${romans[Number(id)] ?? id}`
        : pretty(record.name);
  const group = categories.find((entry) => entry.resource === resource)!;
  const Icon = group.Icon;
  const description = localDescription(detail.data);
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Ver ${name}`}
      onPress={() => router.push(resourcePath(resource, id))}
      style={({
        hovered,
        pressed,
      }: {
        hovered?: boolean;
        pressed: boolean;
      }) => [
        s.card,
        {
          borderColor: hovered ? (type?.color ?? c.borderStrong) : c.line,
          backgroundColor: hovered ? c.surfaceHover : c.surface,
          opacity: pressed ? 0.75 : 1,
          transform: [{ translateY: hovered ? -3 : 0 }],
        },
      ]}
    >
      <View
        style={[
          s.imageBox,
          mobile && { height: 122 },
          { backgroundColor: backdrop },
          compact && s.compactImage,
        ]}
      >
        {!compact && resource !== "region" && <View style={s.halo} />}
        {resource === "pokemon" ? (
          <Art
            name={name}
            uri={
              pokemon.data?.sprites.other?.["official-artwork"]
                ?.front_default ?? spriteUrl(id)
            }
            style={[s.pokemon, mobile && { height: 102 }]}
          />
        ) : resource === "item" ? (
          <Art
            name={name}
            uri={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${record.name}.png`}
            style={s.item}
          />
        ) : resource === "type" ? (
          <TypeSymbol name={record.name} size={66} />
        ) : resource === "version" ? (
          <GameCover version={record.name} />
        ) : resource === "region" ? (
          <Art
            name={`Mapa de ${name}`}
            uri={regions[record.name]}
            style={s.region}
          />
        ) : resource === "generation" ? (
          <Art
            name={`Pokémon inicial de ${generationNames[id] ?? name}`}
            uri={starters[id] ? spriteUrl(starters[id]) : undefined}
            style={s.pokemon}
          />
        ) : resource === "move" && moveType ? (
          <MoveTMIcon type={moveType} size={46} />
        ) : resource === "ability" ? (
          <Sparkles size={30} color={c.purpleText} strokeWidth={1.5} />
        ) : (
          <Icon size={30} color={c.muted} strokeWidth={1.5} />
        )}
        {!compact && (
          <Text style={s.id}>
            {/^\d+$/.test(id)
              ? `#${id.padStart(resource === "pokemon" ? 4 : 3, "0")}`
              : resource === "version"
                ? "POKÉMON"
                : group.label.toLocaleUpperCase("pt-BR")}
          </Text>
        )}
      </View>
      <View style={[s.copy, mobile && { padding: 10, gap: 8 }]}>
        <View style={s.nameRow}>
          <Text numberOfLines={2} style={s.name}>
            {name}
          </Text>
          <ArrowUpRight size={13} color={c.muted} />
        </View>
        {resource === "pokemon" ? (
          <View style={s.badges}>
            {pokemon.data ? (
              pokemon.data.types.map(({ type: element }) => (
                <Badge key={element.name} name={element.name} />
              ))
            ) : (
              <Text style={s.meta}>Pokédex · Ver detalhes</Text>
            )}
          </View>
        ) : resource === "move" ? (
          <View style={s.badges}>
            {moveType && <Badge name={moveType} />}
            {typeof detail.data?.power === "number" && (
              <Text style={s.meta}>Poder {detail.data.power}</Text>
            )}
          </View>
        ) : resource === "ability" ? (
          <Text numberOfLines={2} style={s.description}>
            {description || "Habilidade · Ver detalhes"}
          </Text>
        ) : (
          <Text style={s.meta}>
            {resource === "generation"
              ? (generationNames[id] ?? "Ver detalhes")
              : resource === "version"
                ? "Explorar jogo"
                : resource === "region"
                  ? "Explorar região"
                  : resource === "type"
                    ? "Vantagens e fraquezas"
                    : "Ver detalhes do item"}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
const styles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      flexGrow: 1,
      minWidth: 0,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: 14,
      overflow: "hidden",
      backgroundColor: c.surface,
    },
    imageBox: {
      height: 144,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
    },
    compactImage: { height: 80, alignItems: "flex-start", paddingLeft: 17 },
    halo: {
      position: "absolute",
      width: 104,
      height: 104,
      borderRadius: 60,
      backgroundColor: c.glass,
      top: 27,
    },
    pokemon: { width: "86%", height: 118, marginTop: 13 },
    item: { width: 78, height: 78, marginTop: 8 },
    region: { width: "100%", height: "100%" },
    id: {
      ...font,
      position: "absolute",
      top: 10,
      left: 11,
      fontSize: 8,
      letterSpacing: 0.5,
      fontWeight: "600",
      color: c.body,
      backgroundColor: c.glassStrong,
      paddingHorizontal: 5,
      paddingVertical: 3,
      borderRadius: 4,
      overflow: "hidden",
    },
    copy: { padding: 13, gap: 9, flexGrow: 1, minWidth: 0 },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      justifyContent: "space-between",
    },
    name: {
      ...font,
      color: c.ink,
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: -0.2,
      fontWeight: "700",
      flex: 1,
      minWidth: 0,
    },
    badges: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 4,
      minHeight: 22,
    },
    meta: { ...font, color: c.muted, fontSize: 9, lineHeight: 15 },
    description: {
      ...font,
      color: c.muted,
      fontSize: 10,
      lineHeight: 16,
      minHeight: 32,
    },
  });
