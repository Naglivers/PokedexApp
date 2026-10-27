import React, { useState } from "react";
import { Image } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { useTheme } from "../../theme";

export function MoveTMIcon({
  type,
  size = 40,
}: {
  type: string;
  size?: number;
}) {
  const { colors: c, types } = useTheme();
  const [missing, setMissing] = useState(false);
  return !missing ? (
    <Image
      accessibilityLabel={`TM do tipo ${types[type]?.name ?? type}`}
      source={{
        uri: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-${type}.png`,
      }}
      resizeMode="contain"
      style={{ width: size, height: size }}
      onError={() => setMissing(true)}
    />
  ) : (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      accessibilityLabel={`TM ${type}`}
    >
      <Circle
        cx="20"
        cy="20"
        r="17"
        fill={types[type]?.color ?? c.accent}
        stroke={c.line}
        strokeWidth="2"
      />
      <Path
        d="M8 15L25 6M15 33L33 22"
        stroke="white"
        strokeWidth="4"
        opacity={0.35}
      />
      <Circle
        cx="20"
        cy="20"
        r="6"
        fill={c.surface}
        stroke={c.line}
        strokeWidth="2"
      />
    </Svg>
  );
}
