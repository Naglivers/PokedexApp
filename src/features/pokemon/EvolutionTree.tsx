import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ArrowDown } from "lucide-react-native";
import { EvolutionNode, idFromUrl, spriteUrl } from "../../services/api";
import { colors as c, font, ui } from "../../theme";
import { evolutionCondition, pretty } from "../../utils/pokemon";
import { Art } from "../../components/ui";
export function EvolutionTree({ node }: { node: EvolutionNode }) {
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
              <ArrowDown size={20} color="#A6AFBD" />
              <View style={s.condition}>
                {child.evolution_details.map((details, i) => (
                  <Text key={i} style={s.conditionText}>
                    {evolutionCondition(details)}
                  </Text>
                ))}
              </View>
              <EvolutionTree node={child} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  tree: { alignItems: "center", gap: 12, paddingVertical: 8, maxWidth: "100%" },
  pokemon: {
    borderRadius: 15,
    backgroundColor: "#FFF",
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
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 20,
    maxWidth: "100%",
  },
  branch: { alignItems: "center", gap: 6, maxWidth: 260 },
  condition: { maxWidth: 250, gap: 5, padding: 5 },
  conditionText: {
    ...font,
    fontSize: 10,
    color: c.muted,
    lineHeight: 16,
    textAlign: "center",
  },
});
