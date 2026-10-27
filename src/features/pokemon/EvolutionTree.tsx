import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ArrowRight, ArrowLeftRight } from "lucide-react-native";
import {
  EvolutionNode,
  NamedResource,
  idFromUrl,
  spriteUrl,
} from "../../services/api";
import { font, useTheme, useThemedStyles, type ThemeColors } from "../../theme";
import { evolutionCondition, pretty } from "../../utils/pokemon";
import { Art } from "../../components/ui";
export function EvolutionTree({ node }: { node: EvolutionNode }) {
  return (
    <ScrollView
      horizontal
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        padding: 8,
      }}
    >
      <EvolutionBranch node={node} />
    </ScrollView>
  );
}
function EvolutionStep({ details }: { details: Record<string, unknown> }) {
  const { colors: c } = useTheme();
  const s = useThemedStyles(createStyles);
  const router = useRouter();
  const trigger = details.trigger as NamedResource | undefined;
  const item = (details.item ?? details.held_item) as NamedResource | undefined;
  const trade = trigger?.name === "trade";
  const extra = { ...details };
  delete extra.min_level;
  delete extra.item;
  delete extra.held_item;
  delete extra.trigger;
  const additional = evolutionCondition(extra);
  return (
    <View style={s.condition}>
      {trade && (
        <View style={{ alignItems: "center", gap: 3 }}>
          <ArrowLeftRight size={20} color={c.accent} />
          <Text style={s.conditionText}>Precisa de troca</Text>
        </View>
      )}
      {item && (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Ver item ${pretty(item.name)}`}
          onPress={() => router.push(`/catalog/item/${item.name}`)}
          style={{ alignItems: "center" }}
        >
          <Art
            uri={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${item.name}.png`}
            name={pretty(item.name)}
            style={{ width: 36, height: 36 }}
          />
          <Text style={s.conditionText}>
            {details.held_item ? "Segurando " : ""}
            {pretty(item.name)}
          </Text>
        </Pressable>
      )}
      {details.min_level != null && (
        <Text style={s.conditionText}>Nível {String(details.min_level)}</Text>
      )}
      <ArrowRight size={24} color={c.muted} />
      {additional !== "Evolução" && (
        <Text style={s.conditionText}>{additional}</Text>
      )}
      {!trade &&
        !item &&
        details.min_level == null &&
        additional === "Evolução" && (
          <Text style={s.conditionText}>{evolutionCondition(details)}</Text>
        )}
    </View>
  );
}
function EvolutionBranch({ node }: { node: EvolutionNode }) {
  const { colors: c } = useTheme();
  const s = useThemedStyles(createStyles);
  const router = useRouter();
  return (
    <View style={s.tree}>
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push(`/pokemon/${node.species.name}`)}
        style={s.pokemon}
      >
        <Art
          uri={spriteUrl(idFromUrl(node.species.url))}
          name={node.species.name}
          style={s.art}
        />
        <Text style={s.number}>
          #{idFromUrl(node.species.url).padStart(4, "0")}
        </Text>
        <Text style={s.name}>{pretty(node.species.name)}</Text>
      </Pressable>
      {node.evolves_to.length > 0 && (
        <View style={s.branches}>
          {node.evolves_to.map((child) => (
            <View key={child.species.name} style={s.branch}>
              <View style={{ gap: 8, alignItems: "center" }}>
                {child.evolution_details.map((details, i) => (
                  <View key={i} style={{ alignItems: "center", gap: 6 }}>
                    {i > 0 && <Text style={s.conditionText}>ou</Text>}
                    <EvolutionStep details={details} />
                  </View>
                ))}
                {!child.evolution_details.length && (
                  <ArrowRight size={24} color={c.muted} />
                )}
              </View>
              <EvolutionBranch node={child} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    tree: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 8,
    },
    pokemon: {
      borderRadius: 15,
      backgroundColor: c.surface,
      borderColor: c.line,
      borderWidth: 1,
      padding: 15,
      alignItems: "center",
      width: 170,
    },
    art: { height: 100, width: 120 },
    number: { ...font, color: c.muted, fontSize: 9, marginTop: 7 },
    name: {
      ...font,
      color: c.ink,
      fontWeight: "700",
      fontSize: 13,
      marginTop: 6,
    },
    branches: {
      flexDirection: "column",
      justifyContent: "center",
      gap: 20,
    },
    branch: { flexDirection: "row", alignItems: "center", gap: 6 },
    condition: { width: 110, alignItems: "center", gap: 5, padding: 5 },
    conditionText: {
      ...font,
      fontSize: 10,
      color: c.muted,
      lineHeight: 16,
      textAlign: "center",
    },
  });
