import React, { useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { ChevronDown, ChevronRight } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { Art, Button, Loading, Pagination } from "../../components/ui";
import { useTheme } from "../../theme";
import { cardImage } from "../../services/tcg";
import {
  listBackgroundCards,
  type BackgroundCard,
} from "../../services/tcgBackground";
export function BackgroundCards({
  pokemonId,
  languages,
  onOpen,
}: {
  pokemonId: number;
  languages: string[];
  onOpen: (card: BackgroundCard) => void;
}) {
  const { ui, colors: c } = useTheme();
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const query = useQuery({
    queryKey: ["tcg-background-cards", pokemonId, languages, page],
    queryFn: () => listBackgroundCards(pokemonId, languages, page),
    enabled: open,
    retry: false,
    staleTime: 60000,
  });
  const columns = width < 520 ? 2 : width < 900 ? 3 : 4;
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: c.line,
        borderRadius: 14,
        backgroundColor: c.surface,
        overflow: "hidden",
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fundo da carta"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        style={{
          padding: 18,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={ui.sectionTitle}>Fundo da carta</Text>
          <Text style={ui.subtitle}>
            Cartas em que este Pokémon aparece como participação na ilustração.
          </Text>
        </View>
        {open ? (
          <ChevronDown size={20} color={c.accent} />
        ) : (
          <ChevronRight size={20} color={c.muted} />
        )}
      </Pressable>
      {open && (
        <View
          style={{
            padding: 14,
            gap: 14,
            borderTopWidth: 1,
            borderTopColor: c.line,
          }}
        >
          {query.isPending ? (
            <Loading text="Carregando participações…" />
          ) : query.isError ? (
            <>
              <Text style={{ color: c.warningText }}>
                {query.error.message}
              </Text>
              <Button
                small
                variant="outline"
                onPress={() => {
                  void query.refetch();
                }}
              >
                Tentar novamente
              </Button>
            </>
          ) : !query.data.cards.length ? (
            <Text style={ui.subtitle}>
              Ainda não há participações identificadas para este Pokémon. Esta
              lista cresce conforme as cartas são analisadas.
            </Text>
          ) : (
            <>
              <View
                style={{ flexDirection: "row", flexWrap: "wrap", margin: -5 }}
              >
                {query.data.cards.map((card) => (
                  <View
                    key={card.language + card.id}
                    style={{ width: `${100 / columns}%`, padding: 5 }}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={"Ampliar " + card.name}
                      onPress={() => onOpen(card)}
                      style={{
                        padding: 10,
                        gap: 8,
                        borderRadius: 10,
                        backgroundColor: c.surfaceAlt,
                      }}
                    >
                      <Art
                        name={card.name}
                        uri={cardImage(card)}
                        style={{ width: "100%", aspectRatio: 600 / 825 }}
                      />
                      <Text
                        style={{
                          color: c.ink,
                          fontSize: 12,
                          fontWeight: "700",
                        }}
                      >
                        {card.name}
                      </Text>
                      <Text style={[ui.subtitle, { fontSize: 11 }]}>
                        {card.set_name} · #{card.localId}
                      </Text>
                      <Text style={[ui.subtitle, { fontSize: 10 }]}>
                        {card.reviewed ? "Revisado" : "Identificado por IA"} ·{" "}
                        {card.language}
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
              {query.data.total > 18 && (
                <Pagination
                  page={page}
                  total={query.data.total}
                  pageSize={18}
                  setPage={setPage}
                />
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}
