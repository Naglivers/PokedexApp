import React from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ArrowUpRight, BarChart3, ThumbsUp } from "lucide-react-native";
import { colors as c, ui } from "../src/theme";
import { Button, Empty, Loading } from "../src/components/ui";
import { PokemonGrid } from "../src/components/PokemonCard";
import {
  overviewOptions,
  useCommunity,
} from "../src/features/community/CommunityProvider";
import { supabaseConfigured } from "../src/services/supabase";
import { resourceLabels } from "../src/constants/pokemon";

export default function Community() {
  const { width } = useWindowDimensions();
  const query = useQuery(overviewOptions);
  const community = useCommunity();
  const client = useQueryClient();
  const router = useRouter();
  const refresh = () => {
    void query.refetch();
    void client.resetQueries({ queryKey: ["community", "session"] });
    void client.resetQueries({ queryKey: ["community", "my-likes"] });
  };
  const pageName = (path: string) =>
    path === "/"
      ? "Visão geral"
      : ((
          {
            "/pokedex": "Pokédex nacional",
            "/favorites": "Favoritos",
            "/compare": "Comparador",
            "/team-builder": "Minha equipe",
            "/api-explorer": "API Explorer",
            "/community": "Comunidade",
            "/search": "Pesquisa",
          } as Record<string, string>
        )[path] ??
        (path.startsWith("/pokemon/")
          ? `Pokémon ${path.split("/")[2]}`
          : path.startsWith("/catalog/")
            ? `${resourceLabels[path.split("/")[2]] ?? "Catálogo"}${path.split("/")[3] ? ` · #${path.split("/")[3]}` : ""}`
            : path));
  return (
    <View style={[ui.page, width < 650 && { padding: 18 }]}>
      <View>
        <Text style={[ui.label, { color: c.accent, marginBottom: 8 }]}>
          AS DESCOBERTAS DE TODO MUNDO
        </Text>
        <Text style={ui.title}>Comunidade Pokéatlas</Text>
        <Text style={[ui.subtitle, { marginTop: 6 }]}>
          Os Pokémon mais curtidos e os caminhos mais explorados.
        </Text>
      </View>
      {!supabaseConfigured || query.isError ? (
        <View style={ui.panel}>
          <Empty
            title="A comunidade está em preparação"
            description="Os rankings aparecerão quando o serviço estiver disponível. A Pokédex e seus favoritos continuam funcionando normalmente."
            action={
              <Button variant="outline" onPress={refresh}>
                Tentar novamente
              </Button>
            }
          />
        </View>
      ) : query.isPending ? (
        <Loading />
      ) : (
        <>
          {community.error && (
            <View style={ui.panel}>
              <Text style={ui.body}>
                Os rankings estão disponíveis, mas não foi possível iniciar sua
                sessão para curtir e registrar visitas.
              </Text>
              <Button variant="outline" onPress={refresh}>
                Tentar novamente
              </Button>
            </View>
          )}
          <View style={ui.wrap}>
            <View style={[ui.panel, { flex: 1, minWidth: 170 }]}>
              <ThumbsUp size={20} color={c.accent} />
              <Text style={ui.title}>
                {Number(query.data.total_likes).toLocaleString("pt-BR")}
              </Text>
              <Text style={ui.subtitle}>curtidas da comunidade</Text>
            </View>
            <View style={[ui.panel, { flex: 1, minWidth: 170 }]}>
              <BarChart3 size={20} color={c.green} />
              <Text style={ui.title}>
                {Number(query.data.total_visits).toLocaleString("pt-BR")}
              </Text>
              <Text style={ui.subtitle}>visitas registradas</Text>
            </View>
          </View>
          <Text style={ui.sectionTitle}>Pokémon mais curtidos</Text>
          {query.data.likes.length ? (
            <>
              <View style={ui.wrap}>
                {query.data.likes.map((entry, index) => (
                  <Text
                    key={entry.pokemon_id}
                    style={[ui.subtitle, { fontSize: 11 }]}
                  >
                    #{index + 1} · Pokémon {entry.pokemon_id} · {entry.total}{" "}
                    curtidas
                  </Text>
                ))}
              </View>
              <PokemonGrid
                records={query.data.likes.map((entry) => ({
                  name: `Pokémon ${entry.pokemon_id}`,
                  url: `https://pokeapi.co/api/v2/pokemon/${entry.pokemon_id}/`,
                }))}
              />
            </>
          ) : (
            <Empty
              title="Quem será o primeiro favorito da comunidade?"
              description="As curtidas dos Pokémon aparecerão aqui."
              action={
                <Button onPress={() => router.push("/pokedex")}>
                  Explorar Pokémon
                </Button>
              }
            />
          )}
          <Text style={ui.sectionTitle}>Páginas mais acessadas</Text>
          <Text style={ui.subtitle}>
            Uma visita por identidade, por página e por dia UTC. Recarregar a
            página no mesmo dia não aumenta a contagem.
          </Text>
          {query.data.pages.length ? (
            <View style={[ui.panel, { padding: 0, gap: 0 }]}>
              {query.data.pages.map((page, i) => (
                <Pressable
                  accessibilityRole="link"
                  key={page.path}
                  onPress={() => router.push(page.path)}
                  style={{
                    padding: 18,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    borderTopWidth: i ? 1 : 0,
                    borderTopColor: c.line,
                  }}
                >
                  <Text style={ui.label}>{String(i + 1).padStart(2, "0")}</Text>
                  <Text style={{ flex: 1, color: c.ink, fontSize: 13 }}>
                    {pageName(page.path)}
                  </Text>
                  <Text style={ui.subtitle}>
                    {page.views.toLocaleString("pt-BR")}
                  </Text>
                  <ArrowUpRight size={13} color={c.muted} />
                </Pressable>
              ))}
            </View>
          ) : (
            <Empty
              title="Sua jornada pode abrir esse caminho"
              description="As primeiras visitas aparecerão aqui."
            />
          )}
        </>
      )}
    </View>
  );
}
