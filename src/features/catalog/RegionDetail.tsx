import React from "react";
import { useRouter } from "expo-router";
import { Text, View, useWindowDimensions } from "react-native";
import { Gamepad2, MapPin, ScanLine } from "lucide-react-native";
import { useTheme } from "../../theme";
import { localText, pretty } from "../../utils/pokemon";
import { type NamedResource } from "../../services/api";
import { ResourceLink } from "../../components/ResourceData";
import {
  GenerationEntries,
  GenerationGames,
  GenerationSection,
} from "./GenerationDetail";
import { GamePokedex } from "./GameDetail";

export type RegionData = {
  id: number;
  name: string;
  names?: unknown;
  main_generation: NamedResource | null;
  locations: NamedResource[];
  pokedexes: NamedResource[];
  version_groups: NamedResource[];
};
export function RegionDetail({ data }: { data: RegionData }) {
  const router = useRouter();
  const { ui, colors: c } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 700;
  const name = localText(data.names, "name") || pretty(data.name);
  const stats = [
    {
      label: "Locais para explorar",
      count: data.locations.length,
      Icon: MapPin,
    },
    { label: "Pokédexes", count: data.pokedexes.length, Icon: ScanLine },
    {
      label: "Grupos de jogos",
      count: data.version_groups.length,
      Icon: Gamepad2,
    },
  ];
  return (
    <View style={{ gap: 26 }}>
      <View style={[ui.panel, { gap: 22, padding: compact ? 22 : 30 }]}>
        <View style={{ gap: 12 }}>
          <Text style={[ui.label, { color: c.accent, letterSpacing: 2 }]}>
            REGIÕES POKÉMON
          </Text>
          <Text style={[ui.title, { fontSize: compact ? 32 : 40 }]}>
            {name}
          </Text>
          <Text style={[ui.body, { fontSize: 15, lineHeight: 24 }]}>
            Explore o mapa de {name}, conheça seus locais e descubra os Pokémon
            e jogos da região.
          </Text>
          {data.main_generation && (
            <View
              style={{
                alignSelf: "flex-start",
                padding: 10,
                borderRadius: 12,
                backgroundColor: c.accentSoft,
              }}
            >
              <ResourceLink
                url={data.main_generation.url}
                name={
                  "Geração " +
                  data.main_generation.name
                    .replace("generation-", "")
                    .toUpperCase()
                }
              />
            </View>
          )}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {stats.map(({ label, count, Icon }) => (
            <View
              key={label}
              style={{
                flexGrow: 1,
                flexBasis: compact ? "44%" : "28%",
                padding: 18,
                gap: 8,
                borderRadius: 12,
                backgroundColor: c.surfaceAlt,
              }}
            >
              <Icon size={20} color={c.accent} />
              <Text style={{ color: c.ink, fontSize: 28, fontWeight: "800" }}>
                {count}
              </Text>
              <Text style={[ui.subtitle, { fontSize: 12 }]}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
      <GenerationSection
        title="Locais da região"
        subtitle={
          data.locations.length + " cidades, rotas e pontos de interesse"
        }
        Icon={MapPin}
      >
        <GenerationEntries
          key={data.id + ":locations"}
          entries={data.locations}
          onSelect={(location) =>
            router.push({
              pathname: "/maps",
              params: { region: data.name, location: location.name },
            })
          }
        />
      </GenerationSection>
      <GenerationSection
        title="Pokédexes da região"
        subtitle="Abra uma Pokédex para explorar seus Pokémon"
        Icon={ScanLine}
      >
        {data.pokedexes.map((dex) => (
          <GenerationSection
            key={dex.url}
            title={pretty(dex.name)}
            subtitle="Pokémon em ordem da Pokédex"
            Icon={ScanLine}
          >
            <GamePokedex dex={dex} />
          </GenerationSection>
        ))}
        {!data.pokedexes.length && (
          <Text style={ui.subtitle}>
            Nenhuma Pokédex vinculada a esta região.
          </Text>
        )}
      </GenerationSection>
      <GenerationSection
        title="Jogos da região"
        subtitle="Edições em que você pode explorar esta região"
        Icon={Gamepad2}
      >
        <GenerationGames entries={data.version_groups} />
      </GenerationSection>
    </View>
  );
}
