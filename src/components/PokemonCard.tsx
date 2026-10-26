import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useQueries } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ArrowUpRight, Heart } from "lucide-react-native";
import { colors as c, font, ui } from "../theme";
import { types } from "../constants/pokemon";
import { Art, Badge, Skeleton } from "./ui";
import { pokemonOptions } from "../services/queries";
import { PokemonDetail, idFromUrl, spriteUrl } from "../services/api";
import { pretty } from "../utils/pokemon";
import { useFavorites } from "../store/favorites";
import { LikeButton, LikeCounts } from "../features/community/LikeButton";

export function PokemonCard({
  pokemon,
  id,
  name,
  loading = false,
}: {
  pokemon?: PokemonDetail;
  id: number;
  name?: string;
  loading?: boolean;
}) {
  const router = useRouter();
  const favorite = useFavorites((state) => state.ids.includes(id));
  const toggle = useFavorites((state) => state.toggle);
  const type = types[pokemon?.types[0]?.type.name ?? ""];
  return (
    <View style={s.card}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Ver ${pretty(pokemon?.name ?? name ?? "")}`}
        onPress={() => router.push(`/pokemon/${id}`)}
        style={({
          hovered,
          pressed,
        }: {
          hovered?: boolean;
          pressed: boolean;
        }) => [
          s.cardMain,
          {
            opacity: pressed ? 0.8 : 1,
            backgroundColor: hovered ? "#FCFCFF" : "#FFF",
          },
        ]}
      >
        <View style={[s.artBox, { backgroundColor: type?.bg ?? "#F0F2F6" }]}>
          <View style={s.artCircle} />
          <Text style={s.number}>#{String(id).padStart(4, "0")}</Text>
          <Art
            name={pokemon?.name ?? name ?? "Pokémon"}
            uri={
              pokemon?.sprites.other?.["official-artwork"]?.front_default ??
              spriteUrl(id)
            }
            style={s.art}
          />
        </View>
        <View style={s.copy}>
          <View style={ui.between}>
            <Text numberOfLines={1} style={s.name}>
              {pretty(pokemon?.name ?? name ?? `Pokémon ${id}`)}
            </Text>
            <ArrowUpRight size={13} color="#ADB5C1" />
          </View>
          <View style={[ui.row, { gap: 5, marginTop: 10, flexWrap: "wrap" }]}>
            {pokemon ? (
              pokemon.types.map((t) => (
                <Badge key={t.type.name} name={t.type.name} />
              ))
            ) : loading ? (
              <>
                <Skeleton height={21} width={49} />
                <Skeleton height={21} width={45} />
              </>
            ) : (
              <Text style={[ui.subtitle, { fontSize: 10 }]}>Ver detalhes</Text>
            )}
          </View>
        </View>
      </Pressable>
      <View
        style={{
          marginHorizontal: 15,
          paddingVertical: 7,
          borderTopWidth: 1,
          borderTopColor: c.line,
        }}
      >
        <LikeButton pokemonId={id} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${favorite ? "Remover" : "Adicionar"} ${pretty(pokemon?.name ?? name ?? "")} ${favorite ? "dos" : "aos"} favoritos`}
        accessibilityState={{ selected: favorite }}
        onPress={() => toggle(id)}
        hitSlop={7}
        style={s.favorite}
      >
        <Heart
          size={15}
          strokeWidth={1.6}
          color={favorite ? c.accent : "#8F98A5"}
          fill={favorite ? c.accent : "transparent"}
        />
      </Pressable>
    </View>
  );
}
export function PokemonGrid({
  records,
}: {
  records: { name: string; url: string }[];
}) {
  const { width } = useWindowDimensions();
  const columns =
    width >= 1450
      ? 5
      : width >= 1080
        ? 4
        : width >= 750
          ? 4
          : width >= 520
            ? 3
            : 2;
  const queries = useQueries({
    queries: records.map((record) => pokemonOptions(idFromUrl(record.url))),
  });
  return (
    <LikeCounts ids={records.map((record) => Number(idFromUrl(record.url)))}>
      <View style={s.grid}>
        {records.map((record, index) => (
          <View
            key={record.url}
            style={{ width: `${100 / columns}%`, padding: 7 }}
          >
            <PokemonCard
              id={Number(idFromUrl(record.url))}
              name={record.name}
              pokemon={queries[index].data}
              loading={queries[index].isPending}
            />
          </View>
        ))}
      </View>
    </LikeCounts>
  );
}
export function PokemonSkeletons({ count = 8 }: { count?: number }) {
  return (
    <View style={s.grid}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ width: "25%", minWidth: 140, padding: 7 }}>
          <View style={s.card}>
            <Skeleton height={160} />
            <View style={{ padding: 16, gap: 12 }}>
              <Skeleton width="70%" />
              <Skeleton height={21} width="50%" />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -7 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: "#FFF",
    overflow: "hidden",
  },
  cardMain: { flex: 1 },
  artBox: {
    height: 165,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  artCircle: {
    width: 120,
    height: 120,
    backgroundColor: "#FFFFFF75",
    borderRadius: 70,
    position: "absolute",
    bottom: 13,
  },
  art: { width: "86%", height: 140, marginTop: 15 },
  number: {
    ...font,
    position: "absolute",
    top: 15,
    left: 14,
    fontSize: 10,
    fontWeight: "600",
    color: "#929DA9",
    fontVariant: ["tabular-nums"],
  },
  copy: { padding: 15, paddingTop: 14 },
  name: {
    ...font,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: c.ink,
    flexShrink: 1,
  },
  favorite: {
    position: "absolute",
    right: 10,
    top: 8,
    backgroundColor: "#FFFFFFB0",
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
