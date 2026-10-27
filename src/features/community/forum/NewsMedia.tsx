import React, { useState } from "react";
import { Image, Linking, Text, View } from "react-native";
import { Button } from "../../../components/ui";
import { useTheme } from "../../../theme";
import type { ForumPost } from "../../../services/forum";

export function NewsMedia({
  post,
  compact = false,
}: {
  post: ForumPost;
  compact?: boolean;
}) {
  const { ui } = useTheme();
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState(false);
  const image =
    post.image_url &&
    /^https:\/\/[a-zA-Z0-9.-]+\.nintendolife\.com\//.test(post.image_url)
      ? post.image_url
      : null;
  const video =
    post.video_url &&
    /^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/.test(post.video_url)
      ? post.video_url
      : null;
  if (!image && !video) return null;
  return (
    <View style={{ gap: 10 }}>
      {image && !failed && (
        <Image
          source={{ uri: image }}
          accessibilityLabel={post.title}
          resizeMode="cover"
          onError={() => setFailed(true)}
          style={{
            width: "100%",
            aspectRatio: 16 / 9,
            maxHeight: compact ? 240 : 460,
            borderRadius: 12,
          }}
        />
      )}
      {video && (
        <Button
          small
          variant="outline"
          onPress={() => {
            void Linking.openURL(video).catch(() => setError(true));
          }}
        >
          ▶ Assistir vídeo
        </Button>
      )}
      {error && (
        <Text style={ui.subtitle}>Não foi possível abrir o vídeo.</Text>
      )}
    </View>
  );
}
