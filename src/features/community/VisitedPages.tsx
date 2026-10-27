import React from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ArrowUpRight } from "lucide-react-native";
import { Art } from "../../components/ui";
import { useTheme } from "../../theme";
import { getResource, spriteUrl } from "../../services/api";
import { pretty } from "../../utils/pokemon";

type Entry = { path: string; views: number };
function VisitedCard({
  entry,
  rank,
  width,
}: {
  entry: Entry;
  rank: number;
  width: number;
}) {
  const { colors: c, ui } = useTheme();
  const router = useRouter();
  const parts = entry.path.split("/");
  const resource = parts[1] === "pokemon" ? "pokemon" : parts[2];
  const id = parts[parts.length - 1];
  const detail = useQuery({
    queryKey: ["visited-page-detail", resource, id],
    queryFn: ({ signal }) => getResource(resource, id, signal),
  });
  const sprites = detail.data?.sprites as
    | {
        default?: string;
        front_default?: string;
        other?: { "official-artwork"?: { front_default?: string } };
      }
    | undefined;
  const category = (
    {
      pokemon: "Pokémon",
      item: "Item",
      move: "Golpe",
      ability: "Habilidade",
    } as Record<string, string>
  )[resource];
  const image =
    resource === "pokemon"
      ? (sprites?.other?.["official-artwork"]?.front_default ??
        sprites?.front_default ??
        spriteUrl(id))
      : resource === "item"
        ? sprites?.default
        : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${resource === "move" ? "tm-normal" : "ability-patch"}.png`;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Abrir ${detail.data?.name ? pretty(detail.data.name) : category + " " + id}`}
      onPress={() => router.push(entry.path)}
      style={{
        width,
        borderWidth: 1,
        borderColor: c.line,
        backgroundColor: c.surface,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          height: 165,
          backgroundColor: c.lavender,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={[ui.label, { position: "absolute", top: 14, left: 14 }]}>
          #{rank}
        </Text>
        <Art
          name={
            resource === "move"
              ? "TM"
              : resource === "ability"
                ? "Ability Patch"
                : category
          }
          uri={image}
          style={{
            width: resource === "pokemon" ? 145 : 96,
            height: resource === "pokemon" ? 145 : 96,
          }}
        />
      </View>
      <View style={{ padding: 16, gap: 10 }}>
        <View style={ui.between}>
          <Text
            numberOfLines={1}
            style={{ flex: 1, color: c.ink, fontSize: 15, fontWeight: "700" }}
          >
            {detail.data?.name ? pretty(detail.data.name) : `${category} ${id}`}
          </Text>
          <ArrowUpRight size={14} color={c.muted} />
        </View>
        <Text style={[ui.subtitle, { fontSize: 11 }]}>
          {category} · {Number(entry.views).toLocaleString("pt-BR")} visitas
        </Text>
      </View>
    </Pressable>
  );
}
export function VisitedPages({ pages }: { pages: Entry[] }) {
  const { width } = useWindowDimensions();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        flexDirection: "row",
        gap: 14,
        paddingBottom: 6,
        flexGrow: 1,
      }}
    >
      {pages.map((entry, index) => (
        <VisitedCard
          key={entry.path}
          entry={entry}
          rank={index + 1}
          width={width < 650 ? 190 : 220}
        />
      ))}
    </ScrollView>
  );
}
