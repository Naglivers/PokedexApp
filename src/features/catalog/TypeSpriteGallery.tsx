import React from "react";
import { Text, View } from "react-native";
import { Image as ImageIcon } from "lucide-react-native";
import { Art } from "../../components/ui";
import { useTheme } from "../../theme";
import { pretty } from "../../utils/pokemon";
import { GenerationSection } from "./GenerationDetail";

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
const gameNames: Record<string, string> = {
  "black-white": "Black / White",
  "black-2-white-2": "Black 2 / White 2",
  "x-y": "X / Y",
  "omega-ruby-alpha-sapphire": "Omega Ruby / Alpha Sapphire",
  "sun-moon": "Sun / Moon",
  "ultra-sun-ultra-moon": "Ultra Sun / Ultra Moon",
  "sword-shield": "Sword / Shield",
  "brilliant-diamond-and-shining-pearl": "Brilliant Diamond / Shining Pearl",
  "scarlet-violet": "Scarlet / Violet",
  "legends-arceus": "Legends: Arceus",
  "lets-go-pikachu-lets-go-eevee": "Let's Go, Pikachu! / Eevee!",
};
const generations = [
  "i",
  "ii",
  "iii",
  "iv",
  "v",
  "vi",
  "vii",
  "viii",
  "ix",
  "x",
];
export function TypeSpriteGallery({ sprites }: { sprites: unknown }) {
  const { ui, colors: c } = useTheme();
  const groups = Object.entries(object(sprites))
    .map(([generation, games]) => ({
      generation,
      games: Object.entries(object(games))
        .map(([game, icons]) => ({
          game,
          icons: Object.entries(object(icons)).filter(
            (entry): entry is [string, string] =>
              typeof entry[1] === "string" &&
              /^https?:\/\/.+\.(png|gif|jpe?g|webp)([?#].*)?$/i.test(entry[1]),
          ),
        }))
        .filter((game) => game.icons.length),
    }))
    .filter((group) => group.games.length)
    .sort(
      (a, b) =>
        generations.indexOf(a.generation.replace("generation-", "")) -
        generations.indexOf(b.generation.replace("generation-", "")),
    );
  if (!groups.length) return null;
  return (
    <GenerationSection
      title="Imagens do tipo"
      subtitle="Ícones e símbolos organizados por geração e jogo"
      Icon={ImageIcon}
    >
      {groups.map((group) => (
        <GenerationSection
          key={group.generation}
          title={
            "Geração " +
            group.generation.replace("generation-", "").toUpperCase()
          }
          subtitle={group.games.length + " jogos e conjuntos"}
          Icon={ImageIcon}
        >
          {group.games.map((game) => (
            <View key={game.game} style={{ gap: 12 }}>
              <Text style={[ui.sectionTitle, { fontSize: 16 }]}>
                {gameNames[game.game] ?? pretty(game.game)}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                {game.icons.map(([key, uri]) => (
                  <View
                    key={key}
                    style={{
                      flexGrow: 1,
                      flexBasis: 180,
                      maxWidth: 280,
                      padding: 16,
                      gap: 12,
                      borderRadius: 12,
                      backgroundColor: c.surfaceAlt,
                      borderWidth: 1,
                      borderColor: c.line,
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: 8,
                        padding: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        height: 92,
                      }}
                    >
                      <Art
                        name={
                          key === "name_icon"
                            ? "Nome do tipo"
                            : "Símbolo do tipo"
                        }
                        uri={uri}
                        style={{ width: "100%", height: 64 }}
                      />
                    </View>
                    <Text
                      style={[
                        ui.subtitle,
                        { fontSize: 12, textAlign: "center" },
                      ]}
                    >
                      {key === "name_icon"
                        ? "Nome do tipo"
                        : key === "symbol_icon"
                          ? "Símbolo do tipo"
                          : pretty(key.replace(/_/g, "-"))}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </GenerationSection>
      ))}
    </GenerationSection>
  );
}
