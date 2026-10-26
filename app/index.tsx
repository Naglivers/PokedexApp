import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Compass,
  Dna,
  Gamepad2,
  Leaf,
  Map,
  Shuffle,
  Sparkles,
  Swords,
  Zap,
} from "lucide-react-native";
import { colors as c, font, ui } from "../src/theme";
import { Art, Badge, Button, ErrorState } from "../src/components/ui";
import { PokemonGrid, PokemonSkeletons } from "../src/components/PokemonCard";
import { getResourceList, spriteUrl } from "../src/services/api";
import { pokemonOptions } from "../src/services/queries";
import { types } from "../src/constants/pokemon";
import { pretty } from "../src/utils/pokemon";

export default function Home() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const mobile = width < 700;
  const [featuredId, setFeaturedId] = useState(25);
  const featured = useQuery(pokemonOptions(featuredId));
  const list = useQuery({
    queryKey: ["pokemon-page", 0, 10],
    queryFn: ({ signal }) => getResourceList("pokemon", 10, 0, signal),
  });
  const generations = useQuery({
    queryKey: ["generations"],
    queryFn: ({ signal }) => getResourceList("generation", 30, 0, signal),
  });
  return (
    <View style={[ui.page, mobile && { padding: 18, gap: 24 }]}>
      <View style={ui.between}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={[ui.row, { gap: 7, marginBottom: 7 }]}>
            <View style={s.smallLine} />
            <Text style={s.eyebrow}>PARA CURIOSOS E TREINADORES</Text>
          </View>
          <Text style={[ui.title, mobile && { fontSize: 26 }]}>
            Um universo para descobrir<Text style={{ color: c.accent }}>.</Text>
          </Text>
          <Text style={[ui.subtitle, { marginTop: 5 }]}>
            Cada Pokémon tem uma história. Encontre a sua próxima favorita.
          </Text>
        </View>
        {!mobile && (
          <View style={s.edition}>
            <Compass size={13} color={c.muted} />
            <Text style={s.editionText}>GUIA DO EXPLORADOR</Text>
          </View>
        )}
      </View>
      <View style={[s.heroRow, mobile && { flexDirection: "column" }]}>
        <View style={s.hero}>
          <View style={s.heroOrb} />
          <View style={s.heroOrb2} />
          <View
            style={{ position: "relative", zIndex: 1, flex: 1, minWidth: 0 }}
          >
            <View style={s.heroBadge}>
              <Sparkles size={11} color="#655A8C" />
              <Text style={s.heroBadgeText}>
                SUA PRÓXIMA AVENTURA COMEÇA AQUI
              </Text>
            </View>
            <Text
              style={[s.heroTitle, mobile && { fontSize: 30, lineHeight: 36 }]}
            >
              Pequenos detalhes.{"\n"}
              <Text style={{ color: "#79649F" }}>Grandes descobertas.</Text>
            </Text>
            <Text style={s.heroCopy}>
              Tipos, habilidades, evoluções e muito mais.{"\n"}O mundo Pokémon,
              organizado para você explorar.
            </Text>
            <View style={{ alignSelf: "flex-start", marginTop: 22 }}>
              <Button
                onPress={() => router.push("/pokedex")}
                icon={<ArrowRight size={15} color="#FFF" />}
              >
                Explorar a Pokédex
              </Button>
            </View>
            <View style={s.heroBottom}>
              <View style={s.liveDot} />
              <Text style={s.heroBottomText}>
                {list.data
                  ? `${list.data.count.toLocaleString("pt-BR")} Pokémon e formas`
                  : "Pokémon e formas"}{" "}
                <Text style={{ color: "#ADA6BB" }}> / </Text> Dados da PokéAPI
              </Text>
            </View>
          </View>
          <View
            style={[
              { pointerEvents: "none" },
              s.heroArtWrap,
              mobile && { opacity: 0.25, right: -20 },
            ]}
          >
            <Text style={s.heroWatermark}>006</Text>
            <Art uri={spriteUrl(6)} name="Charizard" style={s.heroArt} />
            <View style={s.heroArtLabel}>
              <View style={s.heroArtDot} />
              <Text style={s.heroArtText}>
                CHARIZARD{" "}
                <Text style={{ color: "#AD9DB7", fontWeight: "400" }}>
                  {" "}
                  #0006
                </Text>
              </Text>
            </View>
          </View>
        </View>
        <View
          style={[s.spotlight, mobile && { minHeight: 275, flex: undefined }]}
        >
          <View style={ui.between}>
            <Text style={s.spotLabel}>NO RADAR</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sortear outro Pokémon"
              onPress={() =>
                setFeaturedId(Math.floor(Math.random() * 1025) + 1)
              }
              style={s.shuffle}
            >
              <Shuffle size={13} color="#899476" />
            </Pressable>
          </View>
          <View style={s.spotCircle} />
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Ver Pokémon em destaque"
            onPress={() => router.push(`/pokemon/${featuredId}`)}
          >
            <Art
              uri={
                featured.data?.sprites.other?.["official-artwork"]
                  ?.front_default ?? spriteUrl(featuredId)
              }
              name={featured.data?.name ?? "Em destaque"}
              style={s.spotArt}
            />
          </Pressable>
          <View style={ui.between}>
            <View>
              <Text style={s.spotNumber}>
                #{String(featuredId).padStart(4, "0")}
              </Text>
              <Text style={s.spotName}>
                {featured.data ? pretty(featured.data.name) : "Descobrindo…"}
              </Text>
              <View style={[ui.row, { marginTop: 7, gap: 5 }]}>
                {featured.data?.types.map((type) => (
                  <Badge key={type.type.name} name={type.type.name} />
                ))}
              </View>
            </View>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Abrir detalhes do destaque"
              onPress={() => router.push(`/pokemon/${featuredId}`)}
              style={s.spotArrow}
            >
              <ArrowUpRight size={18} color="#6F8157" />
            </Pressable>
          </View>
        </View>
      </View>
      <View style={s.quickGrid}>
        {[
          [
            Swords,
            "Golpes",
            "Encontre a jogada certa",
            "move",
            "#EDF1FC",
            "#8297CD",
          ],
          [
            Sparkles,
            "Habilidades",
            "O talento de cada Pokémon",
            "ability",
            "#FCF0E8",
            "#CE9878",
          ],
          [
            Leaf,
            "Itens e frutas",
            "Um inventário de possibilidades",
            "item",
            "#EAF4EE",
            "#75A68D",
          ],
          [
            Gamepad2,
            "Jogos e gerações",
            "Uma jornada através do tempo",
            "generation",
            "#F3ECF8",
            "#A18CBA",
          ],
        ].map(([Icon, label, subtitle, resource, bg, color]) => {
          const Symbol = Icon as typeof Swords;
          return (
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push(`/catalog/${resource}`)}
              key={String(label)}
              style={({
                hovered,
              }: {
                hovered?: boolean;
                pressed?: boolean;
              }) => [
                s.quickCard,
                {
                  backgroundColor: hovered ? "#FAFBFD" : "#FFF",
                  width: mobile ? "48%" : "23.8%",
                },
              ]}
            >
              <View style={[s.quickIcon, { backgroundColor: String(bg) }]}>
                <Symbol size={18} color={String(color)} strokeWidth={1.6} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.quickTitle}>{String(label)}</Text>
                <Text style={s.quickSub}>{String(subtitle)}</Text>
              </View>
              {!mobile && <ArrowUpRight size={13} color="#ACB3C0" />}
            </Pressable>
          );
        })}
      </View>
      <View>
        <View style={[ui.between, { marginBottom: 13 }]}>
          <View style={ui.row}>
            <BookOpen size={18} color={c.accent} />
            <Text style={ui.sectionTitle}>Encontre seu próximo favorito</Text>
          </View>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push("/pokedex")}
            style={ui.row}
          >
            <Text style={s.viewAll}>
              {mobile ? "Ver todos" : "Ver Pokédex completa"}
            </Text>
            <ArrowRight size={14} color={c.accent} />
          </Pressable>
        </View>
        {list.isError ? (
          <ErrorState retry={() => list.refetch()} />
        ) : list.data ? (
          <PokemonGrid records={list.data.results} />
        ) : (
          <PokemonSkeletons />
        )}
      </View>
      <View style={[s.bottomRow, mobile && { flexDirection: "column" }]}>
        <View style={[ui.panel, { flex: 1.4 }]}>
          <View style={ui.between}>
            <View style={ui.row}>
              <Dna size={18} color="#8A7BAB" />
              <Text style={ui.sectionTitle}>Uma questão de tipo</Text>
            </View>
            <Text style={ui.label}>18 TIPOS</Text>
          </View>
          <Text style={ui.subtitle}>
            Descubra forças, fraquezas e combinações.
          </Text>
          <View style={[ui.wrap, { gap: 10 }]}>
            {Object.keys(types).map((type) => (
              <Badge
                name={type}
                key={type}
                onPress={() => router.push(`/catalog/type/${type}`)}
              />
            ))}
          </View>
        </View>
        <View style={[ui.panel, { flex: 1, backgroundColor: "#EDF2F6" }]}>
          <View style={ui.row}>
            <Map size={18} color="#8193A7" />
            <Text style={ui.sectionTitle}>De Kanto para o mundo</Text>
          </View>
          <Text style={ui.subtitle}>
            Revisite cada capítulo dessa história.
          </Text>
          <View style={ui.wrap}>
            {generations.data?.results.map((gen, index) => (
              <Pressable
                accessibilityRole="link"
                key={gen.name}
                onPress={() => router.push(`/catalog/generation/${index + 1}`)}
                style={s.generation}
              >
                <Text style={s.generationText}>{index + 1}ª geração</Text>
                <ArrowUpRight size={11} color="#7D8CA2" />
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  smallLine: { width: 15, height: 2, backgroundColor: c.accent },
  eyebrow: {
    ...font,
    fontSize: 8,
    letterSpacing: 1.7,
    color: "#9A8490",
    fontWeight: "600",
  },
  edition: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 6,
  },
  editionText: { ...font, fontSize: 8, letterSpacing: 0.8, color: c.muted },
  heroRow: { flexDirection: "row", gap: 18 },
  hero: {
    flex: 3.1,
    minHeight: 306,
    borderRadius: 18,
    backgroundColor: c.lavender,
    padding: 28,
    overflow: "hidden",
    flexDirection: "row",
    position: "relative",
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    borderRadius: 5,
    backgroundColor: "#FFFFFF80",
    padding: 7,
  },
  heroBadgeText: {
    ...font,
    fontSize: 7,
    letterSpacing: 1,
    fontWeight: "700",
    color: "#7B6E94",
  },
  heroTitle: {
    ...font,
    color: "#39334E",
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1.5,
    lineHeight: 43,
    marginTop: 18,
  },
  heroCopy: {
    ...font,
    color: "#8C829C",
    fontSize: 11,
    lineHeight: 19,
    marginTop: 10,
    maxWidth: 380,
  },
  heroBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 23,
  },
  liveDot: { height: 4, width: 4, borderRadius: 3, backgroundColor: "#8C83A6" },
  heroBottomText: { ...font, fontSize: 8, color: "#8F85A2" },
  heroOrb: {
    width: 295,
    height: 295,
    borderRadius: 200,
    borderWidth: 1,
    borderColor: "#DCD5EC",
    position: "absolute",
    right: -15,
    top: 9,
  },
  heroOrb2: {
    width: 245,
    height: 245,
    borderRadius: 150,
    backgroundColor: "#E2DCEE",
    position: "absolute",
    right: 10,
    top: 34,
  },
  heroArtWrap: {
    position: "absolute",
    right: -6,
    top: 4,
    bottom: 0,
    width: "43%",
    alignItems: "center",
    justifyContent: "center",
  },
  heroArt: { width: "100%", height: 260, transform: [{ rotate: "-6deg" }] },
  heroWatermark: {
    ...font,
    fontSize: 115,
    fontWeight: "900",
    color: "#D4CBE5",
    position: "absolute",
    top: 20,
    letterSpacing: -8,
  },
  heroArtLabel: {
    backgroundColor: "#F9F6FFB3",
    borderWidth: 1,
    borderColor: "#FFFFFFAA",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 6,
    padding: 8,
    marginTop: -8,
  },
  heroArtText: {
    ...font,
    fontSize: 8,
    color: "#877593",
    fontWeight: "700",
    letterSpacing: 1,
  },
  heroArtDot: {
    width: 4,
    height: 4,
    backgroundColor: "#D58F73",
    borderRadius: 3,
  },
  spotlight: {
    flex: 1,
    minWidth: 210,
    backgroundColor: "#EDF1E5",
    padding: 20,
    borderRadius: 18,
    position: "relative",
    overflow: "hidden",
    justifyContent: "space-between",
  },
  spotLabel: {
    ...font,
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 2,
    color: "#899578",
  },
  shuffle: { backgroundColor: "#FFFFFF70", padding: 7, borderRadius: 7 },
  spotCircle: {
    width: 140,
    height: 140,
    borderRadius: 90,
    backgroundColor: "#E3E9D5",
    position: "absolute",
    top: 55,
    alignSelf: "center",
  },
  spotArt: { width: "100%", height: 160 },
  spotNumber: { ...font, fontSize: 9, color: "#96A187" },
  spotName: {
    ...font,
    fontWeight: "800",
    fontSize: 21,
    color: "#49573D",
    letterSpacing: -0.5,
    marginTop: 3,
  },
  spotArrow: {
    backgroundColor: "#E0E8D3",
    width: 33,
    height: 33,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  quickCard: {
    borderColor: c.line,
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    gap: 11,
    flexDirection: "row",
    alignItems: "center",
  },
  quickIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  quickTitle: { ...font, fontSize: 11, fontWeight: "700", color: c.ink },
  quickSub: {
    ...font,
    fontSize: 8,
    color: c.muted,
    marginTop: 4,
    lineHeight: 13,
  },
  viewAll: { ...font, fontSize: 10, color: c.accent, fontWeight: "600" },
  bottomRow: { flexDirection: "row", gap: 18 },
  generation: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    padding: 10,
    backgroundColor: "#FFFFFFA0",
    borderRadius: 7,
  },
  generationText: { ...font, fontSize: 10, color: "#718095" },
});
