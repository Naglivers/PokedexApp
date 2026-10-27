import React, { useMemo, useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import {
  ChevronDown,
  ChevronRight,
  Gamepad2,
  Image as ImageIcon,
} from "lucide-react-native";
import { Art, Button } from "../../components/ui";
import type { PokemonDetail } from "../../services/api";
import { useTheme } from "../../theme";
import { pretty } from "../../utils/pokemon";

type Sprite = { key: string; label: string; uri: string };
type Group = {
  key: string;
  title: string;
  games: { name: string; sprites: Sprite[] }[];
};
const generations: Record<string, number> = {
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
  viii: 8,
  ix: 9,
  x: 10,
};
const games: Record<string, string> = {
  "red-blue": "Red / Blue",
  yellow: "Yellow",
  gold: "Gold",
  silver: "Silver",
  crystal: "Crystal",
  "ruby-sapphire": "Ruby / Sapphire",
  emerald: "Emerald",
  "firered-leafgreen": "FireRed / LeafGreen",
  "diamond-pearl": "Diamond / Pearl",
  platinum: "Platinum",
  "heartgold-soulsilver": "HeartGold / SoulSilver",
  "black-white": "Black / White",
  "black-2-white-2": "Black 2 / White 2",
  "x-y": "X / Y",
  "omegaruby-alphasapphire": "Omega Ruby / Alpha Sapphire",
  "omega-ruby-alpha-sapphire": "Omega Ruby / Alpha Sapphire",
  "ultra-sun-ultra-moon": "Ultra Sun / Ultra Moon",
  "sun-moon": "Sun / Moon",
  "lets-go-pikachu-lets-go-eevee": "Let's Go Pikachu / Eevee",
  "sword-shield": "Sword / Shield",
  "scarlet-violet": "Scarlet / Violet",
  icons: "Ícones dos jogos",
};
function label(key: string) {
  const words: Record<string, string> = {
    front: "Frente",
    back: "Costas",
    default: "Normal",
    shiny: "Shiny",
    female: "Fêmea",
    male: "Macho",
    gray: "Escala de cinza",
    transparent: "Transparente",
    animated: "Animado",
  };
  return key
    .split(/[_.-]/)
    .map((word) => words[word] ?? pretty(word))
    .join(" · ");
}
function collect(value: unknown, path = ""): Sprite[] {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const name = path ? `${path}.${key}` : key;
    return typeof child === "string" && /^https?:\/\//.test(child)
      ? [{ key: name, label: label(name), uri: child }]
      : collect(child, name);
  });
}
export function Sprites({ pokemon }: { pokemon: PokemonDetail }) {
  const { colors: c, ui } = useTheme();
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(["artwork", "default"]),
  );
  const groups = useMemo(() => {
    const result: Group[] = [];
    const artwork = collect(pokemon.sprites.other?.["official-artwork"]);
    if (artwork.length)
      result.push({
        key: "artwork",
        title: "Arte oficial",
        games: [{ name: "Ilustrações oficiais", sprites: artwork }],
      });
    const defaults = collect(
      Object.fromEntries(
        Object.entries(pokemon.sprites).filter(
          ([key]) => key !== "other" && key !== "versions",
        ),
      ),
    );
    if (defaults.length)
      result.push({
        key: "default",
        title: "Sprites padrão",
        games: [
          {
            name: "Imagens principais disponibilizadas para este Pokémon",
            sprites: defaults,
          },
        ],
      });
    const versionGroups = Object.entries(pokemon.sprites.versions ?? {}).sort(
      ([a], [b]) =>
        (generations[a.replace("generation-", "")] ?? 999) -
        (generations[b.replace("generation-", "")] ?? 999),
    );
    for (const [generation, versions] of versionGroups) {
      if (!versions || typeof versions !== "object") continue;
      const gameGroups = Object.entries(versions)
        .map(([name, tree]) => ({
          name: games[name] ?? pretty(name),
          sprites: collect(tree),
        }))
        .filter((game) => game.sprites.length > 0);
      if (gameGroups.length)
        result.push({
          key: generation,
          title: generations[generation.replace("generation-", "")]
            ? `Geração ${generations[generation.replace("generation-", "")]}`
            : pretty(generation),
          games: gameGroups,
        });
    }
    for (const [source, tree] of Object.entries(pokemon.sprites.other ?? {})) {
      if (source === "official-artwork") continue;
      const sprites = collect(tree);
      if (sprites.length)
        result.push({
          key: `other-${source}`,
          title:
            (
              {
                home: "Pokémon HOME",
                "dream-world": "Dream World",
                showdown: "Showdown",
              } as Record<string, string>
            )[source] ?? pretty(source),
          games: [{ name: "Outras fontes de imagens", sprites }],
        });
    }
    return result;
  }, [pokemon.sprites]);
  const spriteCount = groups.reduce(
    (sum, group) =>
      sum + group.games.reduce((count, game) => count + game.sprites.length, 0),
    0,
  );
  return (
    <View style={{ gap: 16 }}>
      <View style={[ui.between, { flexWrap: "wrap" }]}>
        <Text style={ui.subtitle}>
          {spriteCount} imagens · agrupadas por geração e jogo
        </Text>
        <View style={ui.wrap}>
          <Button
            small
            variant="ghost"
            onPress={() => setOpen(new Set(groups.map((group) => group.key)))}
          >
            Expandir tudo
          </Button>
          <Button small variant="ghost" onPress={() => setOpen(new Set())}>
            Recolher tudo
          </Button>
        </View>
      </View>
      <Text style={ui.subtitle}>
        Cada geração mostra apenas as imagens disponíveis para este Pokémon.
        Arte oficial, HOME e outras fontes ficam em coleções separadas.
      </Text>
      {groups.map((group) => {
        const expanded = open.has(group.key);
        const isGeneration = group.key.startsWith("generation-");
        const Icon = isGeneration ? Gamepad2 : ImageIcon;
        const count = group.games.reduce(
          (sum, game) => sum + game.sprites.length,
          0,
        );
        return (
          <View
            key={group.key}
            style={{
              borderWidth: 1,
              borderColor: c.line,
              borderRadius: 14,
              overflow: "hidden",
              backgroundColor: c.surface,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={group.title}
              accessibilityState={{ expanded }}
              onPress={() =>
                setOpen((previous) => {
                  const next = new Set(previous);
                  if (next.has(group.key)) next.delete(group.key);
                  else next.add(group.key);
                  return next;
                })
              }
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                padding: 16,
                backgroundColor: pressed ? c.surfaceHover : c.surface,
              })}
            >
              <Icon size={20} color={c.accent} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[ui.sectionTitle, { fontSize: 15 }]}>
                  {group.title}
                </Text>
                <Text numberOfLines={2} style={[ui.subtitle, { fontSize: 11 }]}>
                  {isGeneration
                    ? group.games.map((game) => game.name).join(" · ")
                    : `${count} imagens`}
                </Text>
              </View>
              {expanded ? (
                <ChevronDown size={18} color={c.accent} />
              ) : (
                <ChevronRight size={18} color={c.muted} />
              )}
            </Pressable>
            {expanded && (
              <View
                style={{
                  gap: 20,
                  padding: width < 650 ? 12 : 18,
                  borderTopWidth: 1,
                  borderTopColor: c.line,
                }}
              >
                {group.games.map((game) => (
                  <View key={game.name} style={{ gap: 12 }}>
                    <Text style={[ui.label, { color: c.accent }]}>
                      {game.name}
                    </Text>
                    <View style={ui.wrap}>
                      {game.sprites.map((sprite) => (
                        <View
                          key={sprite.key}
                          style={{
                            width: width < 650 ? 120 : 140,
                            padding: 10,
                            gap: 9,
                            borderRadius: 12,
                            backgroundColor: c.surfaceAlt,
                            alignItems: "center",
                          }}
                        >
                          <Art
                            uri={sprite.uri}
                            name={`${group.title} · ${game.name} · ${sprite.label}`}
                            style={{ height: 100, width: 100 }}
                          />
                          <Text
                            style={{
                              color: c.muted,
                              fontSize: 10,
                              lineHeight: 16,
                              textAlign: "center",
                            }}
                          >
                            {sprite.label}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
      {!groups.length && (
        <Text style={ui.subtitle}>
          Nenhuma imagem disponível para este Pokémon.
        </Text>
      )}
    </View>
  );
}
