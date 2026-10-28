import React, { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useTheme } from "../../theme";
import { Art, Button } from "../../components/ui";
import { useAuth } from "../auth/AuthProvider";
import { getForumAccess } from "../../services/forum";
import { indexOptions } from "../../services/queries";
import { idFromUrl } from "../../services/api";
import { pretty } from "../../utils/pokemon";
import {
  analyzeCardBackground,
  correctCardBackground,
  getCardBackground,
} from "../../services/tcgBackground";

export function CardBackground({
  cardId,
  language,
}: {
  cardId: string;
  language: string;
}) {
  const { ui, colors: c } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [numbers, setNumbers] = useState("");
  const access = useQuery({
    queryKey: ["forum", "access", session?.user.id],
    queryFn: () => getForumAccess(session!.token),
    enabled: !!session,
    retry: false,
  });
  const query = useQuery({
    queryKey: ["tcg-background", cardId, language],
    queryFn: () => getCardBackground(cardId, language),
    retry: false,
    staleTime: 60000,
    refetchInterval: (query) =>
      query.state.data?.status === "pending" &&
      Date.now() - Date.parse(query.state.data.updated_at) < 300000
        ? 5000
        : false,
  });
  const species = useQuery({
    ...indexOptions("pokemon-species"),
    enabled: !!query.data?.pokemon_ids.length,
  });
  function refresh() {
    void client.invalidateQueries({ queryKey: ["tcg-background"] });
    void client.invalidateQueries({ queryKey: ["tcg-background-cards"] });
  }
  const analyze = useMutation({
    mutationFn: () => analyzeCardBackground(session!.token, cardId, language),
    onSuccess: refresh,
    onError: refresh,
  });
  const ids = numbers.trim() ? numbers.split(/[,;\s]+/).map(Number) : [];
  const valid =
    ids.length <= 20 &&
    ids.every((id) => Number.isInteger(id) && id >= 1 && id <= 20000);
  const save = useMutation({
    mutationFn: () =>
      correctCardBackground(session!.token, cardId, language, ids),
    onSuccess: () => {
      setEditing(false);
      refresh();
    },
  });
  const done = query.data?.status === "done";
  const processing =
    query.data?.status === "pending" &&
    Date.now() - Date.parse(query.data.updated_at) < 300000;
  return (
    <View
      style={{
        width: "100%",
        padding: 16,
        gap: 12,
        borderRadius: 14,
        backgroundColor: c.surfaceAlt,
        borderWidth: 1,
        borderColor: c.line,
      }}
    >
      <Text style={ui.sectionTitle}>Fundo da carta</Text>
      <Text style={ui.subtitle}>
        Pokémon que aparecem na ilustração além do personagem principal.
      </Text>
      {query.isPending ? (
        <Text style={ui.subtitle}>Carregando identificações…</Text>
      ) : query.isError ? (
        <Text style={{ color: c.warningText }}>{query.error.message}</Text>
      ) : done ? (
        <>
          <Text style={[ui.subtitle, { fontSize: 11 }]}>
            {query.data!.reviewed
              ? "Identificação revisada pela administração."
              : "Identificação por IA; pode conter erros."}
          </Text>
          {!query.data!.pokemon_ids.length && (
            <Text style={ui.body}>
              Nenhum outro Pokémon identificado nesta arte.
            </Text>
          )}
          <View style={ui.wrap}>
            {query.data!.pokemon_ids.map((id) => {
              const name = species.data?.results.find(
                (p) => Number(idFromUrl(p.url)) === id,
              )?.name;
              return (
                <View
                  key={id}
                  style={{ alignItems: "center", gap: 6, padding: 8 }}
                >
                  <Art
                    name={name ?? "Pokémon " + id}
                    uri={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`}
                    style={{ width: 64, height: 64 }}
                  />
                  <Button
                    small
                    variant="ghost"
                    onPress={() => router.push("/pokemon/" + id)}
                  >
                    {name ? pretty(name) : "#" + id}
                  </Button>
                </View>
              );
            })}
          </View>
        </>
      ) : (
        <Text style={ui.subtitle}>
          {processing
            ? "Análise em andamento…"
            : query.data?.status === "error" || query.data?.status === "pending"
              ? "A análise anterior não foi concluída."
              : "Esta carta ainda não foi analisada."}
        </Text>
      )}
      {access.data && !done && (
        <Button
          small
          variant="outline"
          disabled={analyze.isPending || processing}
          onPress={() => analyze.mutate()}
        >
          {analyze.isPending ? "Analisando imagem…" : "Analisar fundo da carta"}
        </Button>
      )}
      {analyze.isError && (
        <Text style={{ color: c.warningText }}>{analyze.error.message}</Text>
      )}
      {access.data && done && (
        <Button
          small
          variant="ghost"
          onPress={() => {
            setNumbers(query.data!.pokemon_ids.join(", "));
            setEditing((value) => !value);
          }}
        >
          Corrigir identificação
        </Button>
      )}
      {editing && (
        <View style={{ gap: 10 }}>
          <Text style={ui.subtitle}>
            Informe os números nacionais dos Pokémon do fundo, separados por
            vírgula. Deixe vazio se não houver nenhum.
          </Text>
          <TextInput
            accessibilityLabel="Números dos Pokémon no fundo"
            value={numbers}
            onChangeText={setNumbers}
            maxLength={150}
            style={ui.input}
            placeholder="Ex.: 1, 25, 133"
            placeholderTextColor={c.muted}
          />
          <Button
            small
            disabled={!valid || save.isPending}
            onPress={() => save.mutate()}
          >
            {save.isPending ? "Salvando…" : "Salvar correção"}
          </Button>
          {save.isError && (
            <Text style={{ color: c.warningText }}>{save.error.message}</Text>
          )}
        </View>
      )}
    </View>
  );
}
