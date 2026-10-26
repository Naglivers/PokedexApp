import React, { createContext, useContext } from "react";
import { Pressable, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ThumbsUp } from "lucide-react-native";
import { colors as c } from "../../theme";
import { getLikeCounts, setPokemonLike } from "../../services/community";
import { useCommunity } from "./CommunityProvider";

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
  const { authenticated, connecting, likedIds, error, retry } = useCommunity();
  const counts = useContext(CountContext);
  const client = useQueryClient();
  const liked = likedIds.includes(pokemonId);
  const mutation = useMutation({
    mutationFn: () => setPokemonLike(pokemonId, !liked),
    onSuccess: (data) => {
      client.setQueryData<number[]>(["community", "my-likes"], (old = []) =>
        data.liked
          ? Array.from(new Set([...old, pokemonId]))
          : old.filter((id) => id !== pokemonId),
      );
      client.setQueriesData<Record<number, number>>(
        { queryKey: ["community", "counts"] },
        (old: Record<number, number> | undefined) => ({
          ...old,
          [pokemonId]: Number(data.total),
        }),
      );
      void client.invalidateQueries({ queryKey: ["community", "overview"] });
    },
  });
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
          disabled: !authenticated || mutation.isPending,
        }}
        disabled={!authenticated || mutation.isPending}
        onPress={() => mutation.mutate()}
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
          {mutation.isPending
            ? "Salvando…"
            : connecting
              ? "Conectando…"
              : !authenticated
                ? "Curtir indisponível"
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
      {mutation.isError && (
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
