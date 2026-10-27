import React, { useEffect, useState } from "react";
import { Image } from "react-native";

export function ProfileAvatar({
  uri,
  size = 34,
}: {
  uri?: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  return (
    <Image
      source={
        uri && !failed
          ? { uri }
          : require("../../../assets/brand/profile-placeholder.png")
      }
      style={{ width: size, height: size, borderRadius: size / 2 }}
      resizeMode="cover"
      onError={() => setFailed(true)}
      accessibilityLabel={uri && !failed ? "Foto de perfil" : "Avatar padrão"}
    />
  );
}
