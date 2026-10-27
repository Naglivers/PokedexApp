import React, { createContext, useContext } from "react";
import {
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Heart, ThumbsUp } from "lucide-react-native";
import { useTheme } from "../../theme";
import { getLikeCounts } from "../../services/community";
import { useCommunity } from "./CommunityProvider";
import { usePokemonReaction } from "./usePokemonReaction";
import { Button } from "../../components/ui";

const CountContext = createContext<Record<number, number> | null>(null);
export function LikeCounts({
  ids,
  children,
}: {
  ids: number[];
  children: React.ReactNode;
}) {
  const { ready } = useCommunity();
  const counts = useQuery({
    queryKey: ["community", "counts", [...ids].sort((a, b) => a - b)],
    queryFn: () => getLikeCounts(ids),
    enabled: ready && ids.length > 0,
    staleTime: 60000,
    retry: false,
    retryOnMount: false,
  });
  return (
    <CountContext.Provider value={counts.data ?? null}>
      {children}
    </CountContext.Provider>
  );
}
export function LikeButton({ pokemonId }: { pokemonId: number }) {
  const { colors: c } = useTheme();
  const { authenticated, connecting, error, retry } = useCommunity();
  const reaction = usePokemonReaction(pokemonId);
  const counts = useContext(CountContext);
  const liked = reaction.liked;
  return (
    <View style={{ gap: 5 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          authenticated
            ? `${liked ? "Remover curtida de" : "Curtir"} Pokémon ${pokemonId}`
            : "Curtidas indisponíveis no momento"
        }
        accessibilityState={{
          selected: liked,
          disabled: reaction.disabled,
        }}
        disabled={reaction.disabled}
        onPress={reaction.toggle}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          minHeight: 30,
          opacity: authenticated ? 1 : 0.55,
        }}
      >
        <ThumbsUp
          size={14}
          color={liked ? c.accent : c.muted}
          fill={liked ? c.accentSoft : "transparent"}
        />
        <Text style={{ fontSize: 10, color: liked ? c.accent : c.muted }}>
          {reaction.pending
            ? "Salvando…"
            : connecting
              ? "Conectando…"
              : !authenticated
                ? "Entre para curtir"
                : liked
                  ? "Curtido"
                  : "Curtir"}
        </Text>
        <Text style={{ fontSize: 10, color: c.muted }}>
          {counts ? (counts[pokemonId] ?? 0).toLocaleString("pt-BR") : "—"}
        </Text>
      </Pressable>
      {!authenticated && !!error && !connecting && (
        <View style={{ gap: 4 }}>
          <Text style={{ color: c.muted, fontSize: 9, lineHeight: 14 }}>
            A conexão com a comunidade falhou. Nenhuma curtida foi enviada.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reconectar à comunidade"
            onPress={retry}
            style={{ alignSelf: "flex-start", paddingVertical: 6 }}
          >
            <Text style={{ color: c.accent, fontSize: 10, fontWeight: "600" }}>
              Reconectar
            </Text>
          </Pressable>
        </View>
      )}
      {!!reaction.error && (
        <Text
          accessibilityRole="alert"
          style={{ color: c.accent, fontSize: 10, maxWidth: 200 }}
        >
          Não foi possível salvar. Tente novamente.
        </Text>
      )}
    </View>
  );
}

export function FavoriteButton({
  pokemonId,
  name,
  compact = false,
  style,
}: {
  pokemonId: number;
  name: string;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors: c } = useTheme();
  const reaction = usePokemonReaction(pokemonId);
  const { authenticated, connecting, error, retry } = useCommunity();
  const icon = (
    <Heart
      size={15}
      color={reaction.liked ? (compact ? c.accent : c.onAccent) : c.accent}
      fill={reaction.liked ? (compact ? c.accent : c.onAccent) : "transparent"}
    />
  );
  return (
    <View style={style}>
      {compact ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${reaction.liked ? "Remover" : "Adicionar"} ${name} ${reaction.liked ? "dos" : "aos"} favoritos`}
          accessibilityHint="Favoritar também curte. Remover dos favoritos também remove sua curtida."
          accessibilityState={{
            selected: reaction.liked,
            disabled: reaction.disabled,
            busy: reaction.pending,
          }}
          disabled={reaction.disabled}
          onPress={reaction.toggle}
          hitSlop={7}
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            opacity: reaction.disabled ? 0.5 : 1,
          }}
        >
          {icon}
        </Pressable>
      ) : (
        <Button
          disabled={reaction.disabled}
          variant={reaction.liked ? "primary" : "outline"}
          icon={icon}
          onPress={reaction.toggle}
        >
          {reaction.pending
            ? "Salvando…"
            : reaction.liked
              ? "Favoritado"
              : "Favoritar"}
        </Button>
      )}
      {!!reaction.error && (
        <Text
          accessibilityRole="alert"
          style={{ color: c.accent, fontSize: 10 }}
        >
          Não foi possível salvar. Tente novamente.
        </Text>
      )}
      {!compact && !authenticated && !!error && !connecting && (
        <Pressable accessibilityRole="button" onPress={retry}>
          <Text style={{ color: c.accent, fontSize: 10 }}>
            Reconectar para favoritar
          </Text>
        </Pressable>
      )}
    </View>
  );
}
