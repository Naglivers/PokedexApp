import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ArrowUpRight, ChevronDown, ChevronRight } from "lucide-react-native";
import { colors as c, font, ui } from "../theme";
import { idFromUrl, resourceFromUrl } from "../services/api";
import { pretty } from "../utils/pokemon";
import { Button } from "./ui";

export function resourcePath(resource: string, id: string) {
  return resource === "pokemon"
    ? `/pokemon/${id}`
    : `/catalog/${resource}/${id}`;
}
export function ResourceLink({ url, name }: { url: string; name?: string }) {
  const router = useRouter();
  const resource = resourceFromUrl(url);
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push(resourcePath(resource, idFromUrl(url)))}
      style={s.link}
    >
      <Text style={s.linkText}>{pretty(name ?? `#${idFromUrl(url)}`)}</Text>
      <ArrowUpRight size={12} color={c.accent} />
    </Pressable>
  );
}
const fieldLabels: Record<string, string> = {
  name: "Nome",
  id: "ID",
  effect_entries: "Efeitos",
  flavor_text_entries: "Descrições por jogo e idioma",
  pokemon: "Pokémon associados",
  names: "Traduções",
  moves: "Golpes",
  generation: "Geração",
  damage_relations: "Relações de dano",
  past_damage_relations: "Relações históricas de dano",
  abilities: "Habilidades",
  pokemon_species: "Espécies de Pokémon",
  version_groups: "Grupos de jogos",
  locations: "Localizações",
  pokedexes: "Pokédexes",
  pokemon_entries: "Entradas da Pokédex",
  game_indices: "Índices nos jogos",
  attributes: "Atributos",
  held_by_pokemon: "Pokémon que seguram este item",
  evolution_details: "Condições de evolução",
  evolves_to: "Próximas evoluções",
  sprites: "Imagens",
  category: "Categoria",
  cost: "Custo",
  power: "Poder",
  accuracy: "Precisão",
  pp: "PP",
  priority: "Prioridade",
  type: "Tipo",
  damage_class: "Classe de dano",
  effect_chance: "Chance de efeito",
  target: "Alvo",
  machines: "Máquinas",
  learned_by_pokemon: "Pokémon que aprendem",
  contest_combos: "Combinações de concurso",
  meta: "Detalhes de batalha",
  stat_changes: "Mudanças de atributos",
  past_values: "Valores em jogos anteriores",
  item: "Item",
  version_group: "Grupo de jogos",
  region: "Região",
  areas: "Áreas",
  encounter_method_rates: "Taxas de encontro",
  pokemon_encounters: "Encontros de Pokémon",
  descriptions: "Descrições",
  flavor_text: "Descrição",
  short_effect: "Efeito resumido",
  effect: "Efeito completo",
};
export function ResourceData({ data }: { data: Record<string, unknown> }) {
  return (
    <View style={{ gap: 9 }}>
      {Object.entries(data)
        .filter(([key]) => !["id", "name", "names"].includes(key))
        .map(([key, value]) => (
          <Field
            key={key}
            name={fieldLabels[key] ?? pretty(key.replace(/_/g, "-"))}
            value={value}
          />
        ))}
    </View>
  );
}
function Field({ name, value }: { name: string; value: unknown }) {
  const expandable = !!value && typeof value === "object";
  const [open, setOpen] = useState(false);
  if (
    expandable &&
    !Array.isArray(value) &&
    "url" in value &&
    typeof value.url === "string"
  )
    return (
      <View style={s.simpleField}>
        <Text style={s.fieldName}>{name}</Text>
        <ResourceLink
          url={value.url}
          name={"name" in value ? String(value.name) : undefined}
        />
      </View>
    );
  return (
    <View style={s.field}>
      <Pressable
        disabled={!expandable}
        accessibilityRole={expandable ? "button" : undefined}
        onPress={() => setOpen(!open)}
        style={s.fieldHeader}
      >
        <Text style={s.fieldName}>{name}</Text>
        {expandable ? (
          <View style={ui.row}>
            <Text style={s.count}>
              {Array.isArray(value) ? value.length : Object.keys(value).length}{" "}
              {Array.isArray(value) ? "registros" : "campos"}
            </Text>
            {open ? (
              <ChevronDown size={15} color={c.muted} />
            ) : (
              <ChevronRight size={15} color={c.muted} />
            )}
          </View>
        ) : (
          <Text selectable style={s.scalar}>
            {value === null
              ? "Não informado pela API"
              : typeof value === "boolean"
                ? value
                  ? "Sim"
                  : "Não"
                : String(value)}
          </Text>
        )}
      </Pressable>
      {open && (
        <View style={s.nested}>
          <Value value={value} />
        </View>
      )}
    </View>
  );
}
function Value({ value }: { value: unknown }) {
  const [limit, setLimit] = useState(15);
  if (Array.isArray(value))
    return (
      <View style={{ gap: 8 }}>
        {!value.length && (
          <Text style={ui.subtitle}>Nenhum registro disponível.</Text>
        )}
        {value.slice(0, limit).map((item, index) => (
          <View key={index} style={s.arrayItem}>
            <Value value={item} />
          </View>
        ))}
        {value.length > limit && (
          <Button small variant="outline" onPress={() => setLimit(limit + 30)}>
            Mostrar mais {Math.min(value.length - limit, 30)} registros
          </Button>
        )}
      </View>
    );
  if (value && typeof value === "object") {
    if ("url" in value && typeof value.url === "string")
      return (
        <ResourceLink
          url={value.url}
          name={"name" in value ? String(value.name) : undefined}
        />
      );
    return <ResourceData data={value as Record<string, unknown>} />;
  }
  return (
    <Text selectable style={ui.body}>
      {value === null ? "Não informado" : String(value)}
    </Text>
  );
}
const s = StyleSheet.create({
  link: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
    paddingVertical: 4,
    maxWidth: "100%",
  },
  linkText: { ...font, color: c.accent, fontSize: 12, flexShrink: 1 },
  field: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 10,
    overflow: "hidden",
  },
  fieldHeader: {
    padding: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldName: { ...font, fontSize: 12, fontWeight: "600", color: c.ink },
  count: { ...font, fontSize: 10, color: c.muted },
  scalar: { ...font, fontSize: 12, color: "#778193", maxWidth: "100%" },
  nested: {
    borderTopWidth: 1,
    borderTopColor: c.line,
    padding: 14,
    backgroundColor: "#FAFBFC",
  },
  arrayItem: { paddingBottom: 5 },
  simpleField: {
    padding: 16,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
});
