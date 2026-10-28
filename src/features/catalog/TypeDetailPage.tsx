import React from "react";
import { Text, View, useWindowDimensions } from "react-native";
import {
  History,
  ScanLine,
  Shield,
  Sparkles,
  Swords,
} from "lucide-react-native";
import { useTheme } from "../../theme";
import { Badge } from "../../components/ui";
import { ResourceData, ResourceLink } from "../../components/ResourceData";
import type {
  DamageRelations,
  NamedResource,
  TypeDetail,
} from "../../services/api";
import { pretty } from "../../utils/pokemon";
import { GenerationEntries, GenerationSection } from "./GenerationDetail";
import { TypePokemon } from "./TypePokemon";
import { TypeSymbol } from "./TypeSymbol";
import { TypeSpriteGallery } from "./TypeSpriteGallery";

type TypePageData = TypeDetail & {
  generation: NamedResource;
  move_damage_class: NamedResource | null;
  past_damage_relations?: {
    generation: NamedResource;
    damage_relations: DamageRelations;
  }[];
  game_indices?: unknown[];
  sprites?: unknown;
};
export function TypeDetailPage({ data }: { data: TypePageData }) {
  const { ui, colors: c, types } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 700;
  const name = types[data.name]?.name ?? pretty(data.name);
  const relations = data.damage_relations;
  const stats = [
    { label: "Pokémon e formas", value: data.pokemon.length, Icon: ScanLine },
    { label: "Golpes", value: data.moves.length, Icon: Swords },
    {
      label: "Fraquezas",
      value: relations.double_damage_from.length,
      Icon: Shield,
    },
  ];
  return (
    <View style={{ gap: 26 }}>
      <View style={[ui.panel, { padding: compact ? 22 : 30, gap: 24 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
          <View style={{ flex: 1, gap: 12 }}>
            <Text style={[ui.label, { color: c.accent, letterSpacing: 2 }]}>
              TIPOS POKÉMON
            </Text>
            <Text style={[ui.title, { fontSize: compact ? 32 : 40 }]}>
              {name}
            </Text>
            <Text style={[ui.body, { fontSize: 15, lineHeight: 24 }]}>
              Veja as vantagens em batalha e explore os Pokémon e golpes deste
              tipo.
            </Text>
            <ResourceLink
              url={data.generation.url}
              name={
                "Introduzido na geração " +
                data.generation.name.replace("generation-", "").toUpperCase()
              }
            />
          </View>
          {
            <View
              style={{
                backgroundColor: types[data.name]?.bg ?? c.surfaceAlt,
                borderRadius: compact ? 16 : 24,
                padding: compact ? 12 : 24,
              }}
            >
              <TypeSymbol
                name={data.name}
                id={data.id}
                sprites={data.sprites}
                size={compact ? 48 : 72}
              />
            </View>
          }
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {stats.map(({ label, value, Icon }) => (
            <View
              key={label}
              style={{
                flexGrow: 1,
                flexBasis: compact ? "44%" : "28%",
                gap: 8,
                padding: 16,
                borderRadius: 12,
                backgroundColor: c.surfaceAlt,
              }}
            >
              <Icon size={18} color={c.accent} />
              <Text style={{ fontSize: 28, fontWeight: "800", color: c.ink }}>
                {value}
              </Text>
              <Text style={[ui.subtitle, { fontSize: 12 }]}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={{ gap: 16 }}>
        <View style={{ gap: 6 }}>
          <Text style={ui.sectionTitle}>Defesa · Ao receber golpes</Text>
          <Text style={ui.subtitle}>
            Quanto dano um Pokémon do tipo {name} recebe de cada tipo.
          </Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          <Matchup
            title="Fraquezas"
            description="Recebe o dobro do dano"
            multiplier="2×"
            entries={relations.double_damage_from}
            tone="weak"
          />
          <Matchup
            title="Resistências"
            description="Recebe metade do dano"
            multiplier="½×"
            entries={relations.half_damage_from}
            tone="resist"
          />
          <Matchup
            title="Imunidades"
            description="Não recebe dano"
            multiplier="0×"
            entries={relations.no_damage_from}
            tone="immune"
          />
        </View>
      </View>
      <View style={{ gap: 16 }}>
        <View style={{ gap: 6 }}>
          <Text style={ui.sectionTitle}>Ataque · Ao usar golpes</Text>
          <Text style={ui.subtitle}>
            Como os golpes do tipo {name} atingem os outros tipos.
          </Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          <Matchup
            title="Super eficaz"
            description="Causa o dobro do dano"
            multiplier="2×"
            entries={relations.double_damage_to}
            tone="resist"
          />
          <Matchup
            title="Pouco eficaz"
            description="Causa metade do dano"
            multiplier="½×"
            entries={relations.half_damage_to}
            tone="weak"
          />
          <Matchup
            title="Sem efeito"
            description="Não causa dano"
            multiplier="0×"
            entries={relations.no_damage_to}
            tone="immune"
          />
        </View>
      </View>
      <Text style={[ui.subtitle, { fontSize: 12, lineHeight: 20 }]}>
        Os tipos não listados têm dano normal (1×). As relações consideram
        apenas este tipo; o tipo secundário e as habilidades podem alterar o
        resultado.
      </Text>
      <GenerationSection
        title={"Pokémon do tipo " + name}
        subtitle={
          data.pokemon.length +
          " Pokémon e formas · Tipos primário e secundário"
        }
        Icon={ScanLine}
        initialOpen
      >
        <TypePokemon
          key={data.id}
          name={data.name}
          pokemon={data.pokemon}
          showHeading={false}
        />
      </GenerationSection>
      <GenerationSection
        title={"Golpes do tipo " + name}
        subtitle={data.moves.length + " golpes · Busque por nome ou número"}
        Icon={Swords}
      >
        <GenerationEntries key={data.id + ":moves"} entries={data.moves} />
      </GenerationSection>
      {!!data.past_damage_relations?.length && (
        <GenerationSection
          title="Relações em gerações anteriores"
          subtitle="Mudanças de efetividade ao longo dos jogos"
          Icon={History}
        >
          {data.past_damage_relations.map((past) => (
            <View key={past.generation.url} style={{ gap: 14 }}>
              <Text style={ui.sectionTitle}>
                Até a geração{" "}
                {past.generation.name.replace("generation-", "").toUpperCase()}
              </Text>
              <Text style={ui.subtitle}>Defesa</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                <Matchup
                  title="Fraquezas"
                  description="Dano recebido"
                  multiplier="2×"
                  entries={past.damage_relations.double_damage_from}
                  tone="weak"
                />
                <Matchup
                  title="Resistências"
                  description="Dano recebido"
                  multiplier="½×"
                  entries={past.damage_relations.half_damage_from}
                  tone="resist"
                />
                <Matchup
                  title="Imunidades"
                  description="Dano recebido"
                  multiplier="0×"
                  entries={past.damage_relations.no_damage_from}
                  tone="immune"
                />
              </View>
              <Text style={ui.subtitle}>Ataque</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                <Matchup
                  title="Super eficaz"
                  description="Dano causado"
                  multiplier="2×"
                  entries={past.damage_relations.double_damage_to}
                  tone="resist"
                />
                <Matchup
                  title="Pouco eficaz"
                  description="Dano causado"
                  multiplier="½×"
                  entries={past.damage_relations.half_damage_to}
                  tone="weak"
                />
                <Matchup
                  title="Sem efeito"
                  description="Dano causado"
                  multiplier="0×"
                  entries={past.damage_relations.no_damage_to}
                  tone="immune"
                />
              </View>
            </View>
          ))}
        </GenerationSection>
      )}
      <TypeSpriteGallery sprites={data.sprites} />
      <GenerationSection
        title="Informações adicionais"
        subtitle="Dados históricos do tipo"
        Icon={Sparkles}
      >
        {data.move_damage_class && (
          <View style={{ gap: 8 }}>
            <Text style={ui.sectionTitle}>
              Classe dos golpes até a geração III
            </Text>
            <ResourceLink
              url={data.move_damage_class.url}
              name={
                data.move_damage_class.name === "physical"
                  ? "Físico"
                  : data.move_damage_class.name === "special"
                    ? "Especial"
                    : pretty(data.move_damage_class.name)
              }
            />
            <Text style={ui.subtitle}>
              A partir da geração IV, cada golpe tem sua própria classe de dano.
            </Text>
          </View>
        )}
        <ResourceData
          data={{
            ...(data.game_indices?.length
              ? { game_indices: data.game_indices }
              : {}),
          }}
        />
      </GenerationSection>
    </View>
  );
}
function Matchup({
  title,
  description,
  multiplier,
  entries,
  tone,
}: {
  title: string;
  description: string;
  multiplier: string;
  entries: NamedResource[];
  tone: "weak" | "resist" | "immune";
}) {
  const { ui, colors: c } = useTheme();
  const { width } = useWindowDimensions();
  const accent =
    tone === "weak" ? c.warningText : tone === "resist" ? c.green : c.accent;
  return (
    <View
      style={[
        ui.panel,
        {
          flexGrow: 1,
          flexBasis: width < 800 ? "100%" : "29%",
          padding: 18,
          gap: 14,
        },
      ]}
    >
      <View style={[ui.between, { gap: 12 }]}>
        <Text style={[ui.sectionTitle, { fontSize: 17, flex: 1 }]}>
          {title}
        </Text>
        <Text style={{ fontSize: 24, fontWeight: "800", color: accent }}>
          {multiplier}
        </Text>
      </View>
      <Text style={[ui.subtitle, { fontSize: 12 }]}>{description}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {entries.map((type) => (
          <Badge key={type.name} name={type.name} />
        ))}
        {!entries.length && <Text style={ui.body}>Nenhum tipo</Text>}
      </View>
    </View>
  );
}
