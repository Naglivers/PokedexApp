import React, { memo, useState } from "react";
import { Image, View } from "react-native";
import { Gamepad2 } from "lucide-react-native";
import { useTheme } from "../../theme";

// Public game icons from RetroAchievements; remaining editions use Pokémon Database box art.
const retroIcons: Record<string, string> = {
  red: "149658",
  blue: "126547",
  yellow: "126549",
  gold: "105481",
  crystal: "105173",
  ruby: "104260",
  emerald: "126553",
  firered: "105044",
  diamond: "104785",
  platinum: "104787",
  heartgold: "063592",
  black: "104482",
  "black-2": "105979",
  x: "079111",
  "alpha-sapphire": "079417",
};

const EditionIcon = memo(function EditionIcon({
  version,
  size,
}: {
  version: string;
  size: number;
}) {
  const { colors: c } = useTheme();
  const [failed, setFailed] = useState(0);
  const retro = retroIcons[version];
  const box =
    version === "legends-za"
      ? "https://img.pokemondb.net/logos/legends-z-a-logo.jpg"
      : `https://img.pokemondb.net/boxes/${version}.jpg`;
  if (failed >= (retro ? 2 : 1))
    return <Gamepad2 size={size} color={c.accent} />;
  return (
    <Image
      accessibilityLabel={`Pokémon ${version}`}
      source={{
        uri:
          retro && failed === 0
            ? `https://media.retroachievements.org/Images/${retro}.png`
            : box,
      }}
      resizeMode="contain"
      onError={() => setFailed((value) => value + 1)}
      style={{ width: size, height: size, borderRadius: 4 }}
    />
  );
});

export const GameIcons = memo(function GameIcons({
  versions,
  size = 32,
}: {
  versions: readonly string[];
  size?: number;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 4,
      }}
    >
      {versions.map((version) => (
        <EditionIcon key={version} version={version} size={size} />
      ))}
    </View>
  );
});
