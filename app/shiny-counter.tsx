import React, { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Sparkles } from "lucide-react-native";
import {
  Button,
  Select,
  SearchInput,
  Loading,
  Art,
} from "../src/components/ui";
import { useTheme } from "../src/theme";
import { useAuth } from "../src/features/auth/AuthProvider";
import { indexOptions } from "../src/services/queries";
import { trackerGames } from "../src/services/gameDex";
import { idFromUrl } from "../src/services/api";
import { pretty } from "../src/utils/pokemon";
import {
  listShinyHunts,
  saveShinyHunt,
  type ShinyHunt,
} from "../src/services/shinyHunts";

export default function ShinyCounter() {
  const { session } = useAuth();
  return <Counter key={session?.user.id ?? "guest"} />;
}
function Counter() {
  const { session } = useAuth();
  const { ui, colors: c } = useTheme();
  const router = useRouter();
  const client = useQueryClient();
  const [game, setGame] = useState(trackerGames[0].key);
  const [search, setSearch] = useState("");
  const [pokemon, setPokemon] = useState<{ id: number; name: string } | null>(
    null,
  );
  const [history, setHistory] = useState(false);
  const species = useQuery(indexOptions("pokemon-species"));
  const key = ["shiny-hunts", session?.user.id];
  const hunts = useQuery({
    queryKey: key,
    queryFn: () => listShinyHunts(session!.token),
    enabled: !!session,
    retry: false,
    staleTime: 30000,
  });
  const create = useMutation({
    mutationFn: () =>
      saveShinyHunt(session!.token, {
        action: "create",
        game,
        pokemonId: pokemon!.id,
        encounters: 0,
      }),
    onSuccess: (hunt) => {
      client.setQueryData<ShinyHunt[]>(key, (old) => [hunt, ...(old ?? [])]);
      setPokemon(null);
      setSearch("");
    },
  });
  if (!session)
    return (
      <View style={ui.page}>
        <Text style={ui.title}>Contador Shiny</Text>
        <Text style={ui.subtitle}>
          Entre na sua conta para guardar suas caças e atualizar a Shinydex.
        </Text>
        <Button onPress={() => router.push("/login")}>Login</Button>
      </View>
    );
  const results = search.trim().length
    ? (species.data?.results
        .filter(
          (p) =>
            p.name.includes(search.trim().toLowerCase().replace(/ /g, "-")) ||
            idFromUrl(p.url) === search.trim().replace("#", ""),
        )
        .slice(0, 12) ?? [])
    : [];
  const active = hunts.data?.filter((h) => !h.found_at) ?? [];
  const finished = hunts.data?.filter((h) => !!h.found_at) ?? [];
  return (
    <View style={ui.page}>
      <View style={ui.between}>
        <Text style={ui.title}>Contador Shiny</Text>
        <Sparkles color={c.accent} size={28} />
      </View>
      <Text style={ui.subtitle}>
        Conte seus encontros. Quando encontrar o shiny, toque em Achei! para
        adicioná-lo à Shinydex.
      </Text>
      <View style={[ui.panel, { gap: 14 }]}>
        <Text style={ui.sectionTitle}>Nova caça</Text>
        <Select
          label="Jogo"
          value={game}
          onChange={setGame}
          options={trackerGames.map((g) => ({ value: g.key, label: g.title }))}
        />
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPokemon(null);
          }}
          placeholder="Buscar Pokémon por nome ou número"
        />
        {species.isPending && (
          <Text style={ui.subtitle}>Carregando Pokémon…</Text>
        )}
        {species.isError && (
          <Button
            small
            variant="outline"
            onPress={() => {
              void species.refetch();
            }}
          >
            Recarregar Pokémon
          </Button>
        )}
        {!pokemon &&
          results.map((p) => (
            <Button
              key={p.url}
              small
              variant="outline"
              onPress={() => {
                setPokemon({ id: Number(idFromUrl(p.url)), name: p.name });
                setSearch(pretty(p.name));
              }}
            >
              {pretty(p.name)} #{idFromUrl(p.url)}
            </Button>
          ))}
        {pokemon && (
          <Text style={ui.subtitle}>Selecionado: {pretty(pokemon.name)}</Text>
        )}
        <Button
          disabled={!pokemon || create.isPending}
          onPress={() => create.mutate()}
        >
          {create.isPending ? "Criando…" : "Começar caça"}
        </Button>
        {create.isError && (
          <Text style={{ color: c.warningText }}>{create.error.message}</Text>
        )}
      </View>
      <View style={ui.wrap}>
        <Button
          small
          variant={!history ? "primary" : "outline"}
          onPress={() => setHistory(false)}
        >
          Em andamento ({active.length})
        </Button>
        <Button
          small
          variant={history ? "primary" : "outline"}
          onPress={() => setHistory(true)}
        >
          Encontrados ({finished.length})
        </Button>
        <Button
          small
          variant="ghost"
          onPress={() => {
            void hunts.refetch();
          }}
        >
          Recarregar caças
        </Button>
      </View>
      {hunts.isPending ? (
        <Loading />
      ) : hunts.isError ? (
        <Text style={{ color: c.warningText }}>{hunts.error.message}</Text>
      ) : (
        <>
          {!(history ? finished : active).length && (
            <Text style={ui.subtitle}>
              {history
                ? "Nenhum shiny encontrado ainda."
                : "Comece uma caça para contar os encontros."}
            </Text>
          )}
          {(history ? finished : active).map((hunt) => (
            <HuntCard
              key={hunt.id + ":" + hunt.revision}
              hunt={hunt}
              token={session.token}
              accountId={session.user.id}
              nickname={session.user.nickname}
              name={
                species.data?.results.find(
                  (p) => Number(idFromUrl(p.url)) === hunt.pokemon_id,
                )?.name ?? `Pokémon ${hunt.pokemon_id}`
              }
            />
          ))}
        </>
      )}
    </View>
  );
}
function HuntCard({
  hunt,
  token,
  accountId,
  nickname,
  name,
}: {
  hunt: ShinyHunt;
  token: string;
  accountId: string;
  nickname: string;
  name: string;
}) {
  const { ui, colors: c } = useTheme();
  const client = useQueryClient();
  const [count, setCount] = useState(String(hunt.encounters));
  const lock = useRef(false);
  const value = Number(count);
  const valid = /^\d{1,9}$/.test(count) && value <= 999999999;
  const dirty = valid && value !== hunt.encounters;
  const save = useMutation({
    mutationFn: (found: boolean) =>
      saveShinyHunt(token, {
        action: found ? "finish" : "save",
        id: hunt.id,
        encounters: value,
        revision: hunt.revision,
      }),
    onSuccess: (updated) => {
      client.setQueryData<ShinyHunt[]>(["shiny-hunts", accountId], (old) =>
        old?.map((h) => (h.id === updated.id ? updated : h)),
      );
      if (updated.found_at) {
        void client.invalidateQueries({
          queryKey: ["dex-tracker", accountId, "shinydex"],
        });
        void client.invalidateQueries({
          queryKey: ["public-profile", nickname.toLowerCase()],
        });
        void client.invalidateQueries({
          queryKey: ["public-tracker", nickname.toLowerCase()],
        });
      }
    },
    onSettled: () => {
      lock.current = false;
    },
  });
  function commit(found: boolean) {
    if (lock.current || !valid) return;
    lock.current = true;
    save.mutate(found);
  }
  useEffect(() => {
    if (!dirty || hunt.found_at || save.isPending || save.isError) return;
    const timeout = setTimeout(() => commit(false), 1000);
    return () => clearTimeout(timeout);
  }, [count, hunt.encounters, save.isPending, save.isError]);
  const busy = save.isPending;
  return (
    <View
      style={[ui.panel, { gap: 22, alignItems: "center", paddingVertical: 30 }]}
    >
      <View style={{ alignItems: "center", gap: 16, width: "100%" }}>
        <View
          style={{
            width: 224,
            maxWidth: "100%",
            aspectRatio: 1,
            borderRadius: 112,
            backgroundColor: c.accentSoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Art
            name={name}
            uri={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${hunt.pokemon_id}.png`}
            style={{ width: "95%", height: "95%" }}
          />
        </View>
        <View style={{ alignItems: "center", gap: 6 }}>
          <Text
            style={[ui.sectionTitle, { fontSize: 26, textAlign: "center" }]}
          >
            {pretty(name)}
          </Text>
          <Text style={[ui.subtitle, { textAlign: "center" }]}>
            {trackerGames.find((g) => g.key === hunt.game)?.title ?? hunt.game}
          </Text>
        </View>
      </View>
      {hunt.found_at ? (
        <>
          <Text style={[ui.title, { color: c.accent }]}>
            {hunt.encounters.toLocaleString()} encontros
          </Text>
          <Text style={ui.subtitle}>
            Shiny encontrado em {new Date(hunt.found_at).toLocaleDateString()} ·
            Adicionado à Shinydex
          </Text>
        </>
      ) : (
        <>
          <View style={{ alignItems: "center", gap: 5, width: "100%" }}>
            <Text style={[ui.label, { letterSpacing: 2 }]}>ENCONTROS</Text>
            <TextInput
              accessibilityLabel="Número de encontros"
              keyboardType="number-pad"
              value={count}
              editable={!busy}
              maxLength={9}
              onChangeText={setCount}
              style={[
                ui.input,
                {
                  width: "100%",
                  maxWidth: 300,
                  backgroundColor: "transparent",
                  borderWidth: 0,
                  textAlign: "center",
                  fontSize: count.length > 6 ? 40 : 58,
                  fontWeight: "800",
                  paddingVertical: 0,
                },
              ]}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Adicionar um encontro"
            disabled={busy || !valid || value === 999999999}
            onPress={() => setCount(String(value + 1))}
            style={({ pressed }) => ({
              width: 190,
              height: 190,
              maxWidth: "100%",
              borderRadius: 95,
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              backgroundColor: c.accent,
              opacity:
                busy || !valid || value === 999999999
                  ? 0.5
                  : pressed
                    ? 0.82
                    : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }],
              shadowColor: c.accent,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.22,
              shadowRadius: 18,
              elevation: 4,
            })}
          >
            <Text
              style={{
                color: c.onAccent,
                fontSize: 68,
                lineHeight: 76,
                fontWeight: "700",
              }}
            >
              +1
            </Text>
            <Text
              style={{ color: c.onAccent, fontSize: 12, fontWeight: "600" }}
            >
              NOVO ENCONTRO
            </Text>
          </Pressable>
          <Button
            small
            label="Diminuir um encontro"
            variant="ghost"
            disabled={busy || !valid || value === 0}
            onPress={() => setCount(String(value - 1))}
          >
            − Corrigir encontro
          </Button>
          <Text style={ui.subtitle}>
            {busy
              ? "Salvando…"
              : save.isError
                ? "Não salvo. Tente novamente."
                : dirty
                  ? "Salvando em instantes…"
                  : "Encontros salvos"}
          </Text>
          <View style={[ui.wrap, { justifyContent: "center" }]}>
            <Button
              small
              variant="outline"
              disabled={busy || !valid}
              onPress={() => commit(true)}
            >
              ✨ Achei!
            </Button>
            {save.isError && (
              <Button
                variant="outline"
                disabled={busy || !valid}
                onPress={() => commit(false)}
              >
                Tentar salvar novamente
              </Button>
            )}
          </View>
          {!valid && (
            <Text style={{ color: c.warningText }}>
              Informe um número de 0 a 999.999.999.
            </Text>
          )}
          {save.isError && (
            <Text style={{ color: c.warningText }}>{save.error.message}</Text>
          )}
        </>
      )}
    </View>
  );
}
