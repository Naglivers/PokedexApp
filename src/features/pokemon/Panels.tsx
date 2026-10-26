import React, { useState } from "react";
import { Text, View, Pressable } from "react-native";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ArrowUpRight } from "lucide-react-native";
import { colors as c, ui } from "../../theme";
import { types, statNames } from "../../constants/pokemon";
import {
  getByUrl,
  getResource,
  GenericResource,
  NamedResource,
  PokemonDetail,
  TypeDetail,
} from "../../services/api";
import {
  Art,
  Badge,
  Button,
  Empty,
  ErrorState,
  Loading,
  Pagination,
  SearchInput,
  Select,
} from "../../components/ui";
import { ResourceLink } from "../../components/ResourceData";
import {
  baseTotal,
  defensiveMultiplier,
  localText,
  pretty,
} from "../../utils/pokemon";

export function Stats({ pokemon }: { pokemon: PokemonDetail }) {
  return (
    <View style={{ gap: 14 }}>
      {pokemon.stats.map((stat, index) => (
        <View key={stat.stat.name} style={ui.row}>
          <Text style={{ color: c.muted, fontSize: 11, width: 84 }}>
            {statNames[stat.stat.name]}
          </Text>
          <Text
            style={{ fontSize: 12, color: c.ink, width: 29, fontWeight: "700" }}
          >
            {stat.base_stat}
          </Text>
          <View
            style={{
              flex: 1,
              height: 7,
              borderRadius: 5,
              backgroundColor: "#F0F2F6",
            }}
          >
            <View
              style={{
                height: 7,
                borderRadius: 5,
                width: `${Math.min((stat.base_stat / 255) * 100, 100)}%`,
                backgroundColor: [
                  "#C799AF",
                  "#DDA080",
                  "#E5BF7D",
                  "#AA9FCF",
                  "#91ACCD",
                  "#8BB6A8",
                ][index],
              }}
            />
          </View>
        </View>
      ))}
      <View
        style={[
          ui.between,
          { paddingTop: 12, borderTopWidth: 1, borderTopColor: c.line },
        ]}
      >
        <Text style={{ fontSize: 12, color: c.muted }}>
          Total de atributos base
        </Text>
        <Text style={{ fontSize: 21, fontWeight: "800", color: c.ink }}>
          {baseTotal(pokemon)}
        </Text>
      </View>
    </View>
  );
}
export function Defense({ pokemon }: { pokemon: PokemonDetail }) {
  const queries = useQueries({
    queries: pokemon.types.map((type) => ({
      queryKey: ["type", type.type.name],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getResource<TypeDetail>("type", type.type.name, signal),
    })),
  });
  if (queries.some((q) => q.isPending))
    return <Loading text="Calculando relações de tipos…" />;
  if (queries.some((q) => q.isError))
    return <ErrorState retry={() => queries.forEach((q) => q.refetch())} />;
  const relations = queries.flatMap((q) =>
    q.data ? [q.data.damage_relations] : [],
  );
  return (
    <View style={{ gap: 13 }}>
      <Text style={ui.subtitle}>
        Multiplicadores defensivos calculados com os tipos atuais da API.
      </Text>
      <View style={[ui.wrap, { gap: 12 }]}>
        {Object.keys(types).map((type) => {
          const factor = defensiveMultiplier(type, relations);
          return (
            <View key={type} style={{ gap: 6, alignItems: "center" }}>
              <Badge name={type} />
              <Text
                style={{
                  color:
                    factor > 1 ? "#CB6D63" : factor < 1 ? c.green : c.muted,
                  fontSize: 10,
                  fontWeight: "700",
                }}
              >
                {factor}×
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
export function Abilities({ pokemon }: { pokemon: PokemonDetail }) {
  const router = useRouter();
  const results = useQueries({
    queries: pokemon.abilities.map((a) => ({
      queryKey: [
        "resource",
        "ability",
        a.ability.url.match(/\d+/g)?.pop() ?? a.ability.name,
      ],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getByUrl(a.ability.url, signal),
    })),
  });
  return (
    <View style={{ gap: 10 }}>
      {pokemon.abilities.map((ability, i) => (
        <Pressable
          key={ability.ability.name}
          accessibilityRole="link"
          onPress={() =>
            router.push(`/catalog/ability/${ability.ability.name}`)
          }
          style={{
            borderWidth: 1,
            borderColor: c.line,
            borderRadius: 10,
            padding: 15,
            gap: 7,
          }}
        >
          <View style={ui.between}>
            <Text style={{ color: c.ink, fontWeight: "600", fontSize: 13 }}>
              {pretty(ability.ability.name)}
              {ability.is_hidden && (
                <Text style={{ color: c.accent, fontSize: 10 }}> · oculta</Text>
              )}
            </Text>
            <ArrowUpRight size={13} color={c.muted} />
          </View>
          <Text style={[ui.body, { fontSize: 11 }]}>
            {results[i].isPending
              ? "Carregando efeito…"
              : localText(results[i].data?.effect_entries, "short_effect") ||
                localText(results[i].data?.flavor_text_entries) ||
                "Abra para consultar os dados completos."}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
export function Moves({ pokemon }: { pokemon: PokemonDetail }) {
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState("");
  const [version, setVersion] = useState("");
  const [page, setPage] = useState(0);
  const methods = Array.from(
    new Set(
      pokemon.moves.flatMap((m) =>
        m.version_group_details.map((d) => d.move_learn_method.name),
      ),
    ),
  );
  const versions = Array.from(
    new Set(
      pokemon.moves.flatMap((m) =>
        m.version_group_details.map((d) => d.version_group.name),
      ),
    ),
  );
  const filtered = pokemon.moves.filter(
    (m) =>
      m.move.name.includes(query.toLowerCase()) &&
      m.version_group_details.some(
        (d) =>
          (!method || d.move_learn_method.name === method) &&
          (!version || d.version_group.name === version),
      ),
  );
  const visible = filtered.slice(page * 12, page * 12 + 12);
  const details = useQueries({
    queries: visible.map((m) => ({
      queryKey: ["move", m.move.name],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getByUrl(m.move.url, signal),
    })),
  });
  return (
    <View style={{ gap: 16 }}>
      <View style={[ui.row, { flexWrap: "wrap" }]}>
        <View style={{ flex: 1, minWidth: 170 }}>
          <SearchInput
            value={query}
            onChange={(text) => {
              setQuery(text);
              setPage(0);
            }}
            placeholder="Buscar golpes…"
          />
        </View>
        <Select
          label="Método de aprendizado"
          value={method}
          options={[
            { value: "", label: "Todos os métodos" },
            ...methods.map((m) => ({ value: m, label: pretty(m) })),
          ]}
          onChange={(value) => {
            setMethod(value);
            setPage(0);
          }}
        />
        <Select
          label="Jogo"
          value={version}
          options={[
            { value: "", label: "Todos os jogos" },
            ...versions.map((v) => ({ value: v, label: pretty(v) })),
          ]}
          onChange={(value) => {
            setVersion(value);
            setPage(0);
          }}
        />
      </View>
      <Text style={ui.subtitle}>{filtered.length} golpes disponíveis</Text>
      {visible.length === 0 && <Empty />}
      {visible.map((move, i) => {
        const data = details[i].data;
        const learned = move.version_group_details.filter(
          (d) =>
            (!method || d.move_learn_method.name === method) &&
            (!version || d.version_group.name === version),
        );
        const type = data?.type as NamedResource | undefined;
        return (
          <View
            key={move.move.name}
            style={[ui.panel, { borderRadius: 12, padding: 16, gap: 10 }]}
          >
            <View style={ui.between}>
              <ResourceLink url={move.move.url} name={move.move.name} />
              {type && <Badge name={type.name} />}
            </View>
            <View style={ui.wrap}>
              {["power", "accuracy", "pp"].map((key) => (
                <Text key={key} style={{ fontSize: 11, color: c.muted }}>
                  {
                    (
                      {
                        power: "Poder",
                        accuracy: "Precisão",
                        pp: "PP",
                      } as Record<string, string>
                    )[key]
                  }
                  :{" "}
                  <Text style={{ color: c.ink, fontWeight: "600" }}>
                    {data?.[key] === null ? "—" : String(data?.[key] ?? "…")}
                  </Text>
                </Text>
              ))}
              {!!data?.damage_class && (
                <Text style={{ fontSize: 11, color: c.muted }}>
                  {pretty((data.damage_class as NamedResource).name)}
                </Text>
              )}
            </View>
            <Text style={[ui.body, { fontSize: 11 }]}>
              {localText(data?.effect_entries, "short_effect")}
            </Text>
            <Text numberOfLines={3} style={[ui.subtitle, { fontSize: 10 }]}>
              {learned
                .map(
                  (d) =>
                    `${pretty(d.version_group.name)} · ${pretty(d.move_learn_method.name)}${d.level_learned_at ? ` · Nv. ${d.level_learned_at}` : ""}`,
                )
                .join(" / ")}
            </Text>
          </View>
        );
      })}
      <Pagination
        page={page}
        total={filtered.length}
        pageSize={12}
        setPage={setPage}
      />
    </View>
  );
}
type Encounter = {
  location_area: NamedResource;
  version_details: {
    version: NamedResource;
    max_chance: number;
    encounter_details: {
      chance: number;
      min_level: number;
      max_level: number;
      method: NamedResource;
      condition_values: NamedResource[];
    }[];
  }[];
};
export function Encounters({ pokemon }: { pokemon: PokemonDetail }) {
  const query = useQuery({
    queryKey: ["encounters", pokemon.id],
    queryFn: ({ signal }) =>
      getByUrl<Encounter[]>(pokemon.location_area_encounters, signal),
  });
  const [limit, setLimit] = useState(12);
  return query.isPending ? (
    <Loading />
  ) : query.isError ? (
    <ErrorState retry={() => query.refetch()} />
  ) : !query.data.length ? (
    <Empty
      title="Sem encontros registrados"
      description="A PokéAPI não informa encontros selvagens para este Pokémon."
    />
  ) : (
    <View style={{ gap: 14 }}>
      {query.data.slice(0, limit).map((location) => (
        <View style={ui.panel} key={location.location_area.url}>
          <ResourceLink
            url={location.location_area.url}
            name={location.location_area.name}
          />
          {location.version_details.map((version) => (
            <View key={version.version.name} style={{ gap: 8 }}>
              <Text style={{ fontWeight: "700", fontSize: 12, color: c.ink }}>
                {pretty(version.version.name)}
              </Text>
              {version.encounter_details.map((detail, index) => (
                <Text key={index} style={[ui.body, { fontSize: 11 }]}>
                  {pretty(detail.method.name)} · Nv. {detail.min_level}–
                  {detail.max_level} · Chance {detail.chance}%
                  {detail.condition_values.length
                    ? ` · ${detail.condition_values.map((v) => pretty(v.name)).join(", ")}`
                    : ""}
                </Text>
              ))}
            </View>
          ))}
        </View>
      ))}
      {limit < query.data.length && (
        <Button variant="outline" onPress={() => setLimit(limit + 12)}>
          Mostrar mais locais
        </Button>
      )}
    </View>
  );
}
export function Sprites({ pokemon }: { pokemon: PokemonDetail }) {
  const [showAll, setShowAll] = useState(false);
  const artwork = pokemon.sprites.other?.["official-artwork"];
  const basic = [
    { label: "Arte oficial", uri: artwork?.front_default },
    { label: "Arte shiny", uri: artwork?.front_shiny },
    { label: "Frente", uri: pokemon.sprites.front_default },
    { label: "Costas", uri: pokemon.sprites.back_default },
    { label: "Frente shiny", uri: pokemon.sprites.front_shiny },
    { label: "Costas shiny", uri: pokemon.sprites.back_shiny },
  ];
  const collect = (
    tree: unknown,
    prefix = "",
  ): { label: string; uri: string }[] =>
    !tree || typeof tree !== "object"
      ? []
      : Object.entries(tree).flatMap(([key, value]) =>
          typeof value === "string" && value.startsWith("http")
            ? [{ label: `${prefix} ${key.replace(/_/g, " ")}`, uri: value }]
            : collect(value, `${prefix} ${key.replace(/-/g, " ")}`),
        );
  const all = showAll ? collect(pokemon.sprites.versions) : [];
  return (
    <View style={{ gap: 16 }}>
      <View style={ui.wrap}>
        {[...basic, ...all]
          .filter((s) => s.uri)
          .map((sprite, i) => (
            <View
              key={i}
              style={[
                ui.panel,
                { alignItems: "center", width: 150, padding: 13 },
              ]}
            >
              <Art
                uri={sprite.uri}
                name={sprite.label}
                style={{ height: 100, width: 110 }}
              />
              <Text
                style={{ fontSize: 10, color: c.muted, textAlign: "center" }}
              >
                {sprite.label}
              </Text>
            </View>
          ))}
      </View>
      {!showAll && pokemon.sprites.versions && (
        <Button variant="outline" onPress={() => setShowAll(true)}>
          Ver sprites de outros jogos
        </Button>
      )}
    </View>
  );
}
