import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { MapPin, Minus, Plus, RotateCcw } from "lucide-react-native";
import {
  Art,
  Button,
  ErrorState,
  Loading,
  Pagination,
  SearchInput,
  Select,
} from "../../components/ui";
import { ResourceLink } from "../../components/ResourceData";
import { getByUrl, idFromUrl, type NamedResource } from "../../services/api";
import { useTheme } from "../../theme";
import { localText, pretty } from "../../utils/pokemon";
import { useMapPoints, type MapPoint } from "../../store/mapPoints";
import { regionMaps } from "../catalog/GenerationDetail";
import {
  encounterMethodLabels,
  initialMapPoints,
  mapDimensions,
} from "./mapData";

type Region = { locations: NamedResource[] };
type Location = { name: string; names: unknown; areas: NamedResource[] };
type Encounter = {
  min_level: number;
  max_level: number;
  chance: number;
  method: NamedResource;
  condition_values: NamedResource[];
};
type VersionEncounters = {
  version: NamedResource;
  max_chance: number;
  encounter_details: Encounter[];
};
type Area = {
  name: string;
  names: unknown;
  pokemon_encounters: {
    pokemon: NamedResource;
    version_details: VersionEncounters[];
  }[];
};
export function InteractiveRegionMap({
  region,
  versions = [],
  initialLocation = "",
}: {
  region: NamedResource;
  versions?: string[];
  initialLocation?: string;
}) {
  const { ui, colors: c } = useTheme();
  const { width } = useWindowDimensions();
  const [selected, setSelected] = useState<NamedResource | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [placing, setPlacing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(600);
  const [showPoints, setShowPoints] = useState(true);
  const points = useMapPoints((state) => state.points);
  const setPoint = useMapPoints((state) => state.setPoint);
  const removePoint = useMapPoints((state) => state.removePoint);
  const regionQuery = useQuery({
    queryKey: ["interactive-region", region.url],
    queryFn: ({ signal }) => getByUrl<Region>(region.url, signal),
    staleTime: 86400000,
  });
  const source = regionMaps[region.name];
  const dimensions = mapDimensions[region.name] ?? { width: 800, height: 600 };
  const horizontal = useRef<ScrollView>(null);
  const vertical = useRef<ScrollView>(null);
  const locations = regionQuery.data?.locations ?? [];
  const initialSelectionDone = useRef(false);
  useEffect(() => {
    if (!initialLocation || initialSelectionDone.current || !regionQuery.data)
      return;
    const location = regionQuery.data.locations.find(
      (entry) =>
        entry.name === initialLocation ||
        idFromUrl(entry.url) === initialLocation,
    );
    initialSelectionDone.current = true;
    if (location) setSelected(location);
  }, [initialLocation, regionQuery.data]);
  const keyFor = (location: NamedResource) => region.name + ":" + location.name;
  const pointFor = (location: NamedResource): MapPoint | undefined =>
    points[keyFor(location)] ?? initialMapPoints[region.name]?.[location.name];
  const markers = locations.flatMap((location) => {
    const point = pointFor(location);
    return point ? [{ location, point }] : [];
  });
  const filtered = locations
    .filter((location) => {
      const name = location.name.toLowerCase();
      const matches = name.includes(
        search.trim().toLowerCase().replace(/ /g, "-"),
      );
      const town = /city|town|island|plateau/.test(name);
      const route = /route-?\d|route-/.test(name);
      return (
        matches &&
        (category === "all" ||
          (category === "town" && town) ||
          (category === "route" && route) ||
          (category === "other" && !town && !route))
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / 15) - 1),
  );
  const mapWidth = Math.max(1, canvasWidth) * zoom;
  const mapHeight = (mapWidth * dimensions.height) / dimensions.width;
  const selectedPoint = selected ? pointFor(selected) : undefined;
  const initialCentered = useRef(false);
  useEffect(() => {
    if (!initialLocation || !selectedPoint || initialCentered.current) return;
    const timer = setTimeout(() => {
      focus();
      initialCentered.current = true;
    }, 150);
    return () => clearTimeout(timer);
  }, [initialLocation, selectedPoint?.x, selectedPoint?.y, canvasWidth]);
  function choose(location: NamedResource) {
    setSelected(location);
    setPlacing(false);
  }
  function focus() {
    if (selectedPoint) {
      horizontal.current?.scrollTo({
        x: Math.max(0, selectedPoint.x * mapWidth - canvasWidth / 2),
        animated: true,
      });
      vertical.current?.scrollTo({
        y: Math.max(0, selectedPoint.y * mapHeight - 190),
        animated: true,
      });
    }
  }
  function renderCanvas(fullscreen = false) {
    const displayWidth = fullscreen
      ? Math.max(240, width - 70) * zoom
      : mapWidth;
    const displayHeight = (displayWidth * dimensions.height) / dimensions.width;
    return (
      <View
        style={{
          width: displayWidth,
          height: displayHeight,
          position: "relative",
        }}
      >
        <Pressable
          disabled={!placing || !selected || fullscreen}
          accessibilityRole={placing ? "button" : undefined}
          accessibilityLabel={
            placing ? "Toque para posicionar o local" : "Mapa da região"
          }
          onPress={(event) => {
            if (!placing || !selected) return;
            const { locationX, locationY } = event.nativeEvent;
            setPoint(keyFor(selected), {
              x: locationX / displayWidth,
              y: locationY / displayHeight,
            });
            setPlacing(false);
          }}
          style={{ width: "100%", height: "100%" }}
        >
          <Image
            pointerEvents="none"
            source={source}
            resizeMode="stretch"
            accessibilityLabel={"Mapa de " + pretty(region.name)}
            style={{ width: "100%", height: "100%" }}
          />
        </Pressable>
        {showPoints &&
          !placing &&
          markers.map(({ location, point }) => (
            <Pressable
              key={location.url}
              accessibilityRole="button"
              accessibilityLabel={"Explorar " + pretty(location.name)}
              onPress={() => choose(location)}
              style={{
                position: "absolute",
                left: point.x * displayWidth - 15,
                top: point.y * displayHeight - 15,
                width: 30,
                height: 30,
                borderRadius: 15,
                borderWidth: 2,
                borderColor: "#FFFFFF",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor:
                  selected?.url === location.url ? c.green : c.accent,
                shadowColor: "#000000",
                shadowOpacity: 0.25,
                shadowRadius: 3,
                shadowOffset: { width: 0, height: 2 },
                elevation: 3,
              }}
            >
              <MapPin size={17} color={c.onAccent} />
            </Pressable>
          ))}
      </View>
    );
  }
  return (
    <View style={{ gap: 18 }}>
      <View style={[ui.wrap, { alignItems: "center" }]}>
        <Button
          small
          variant="outline"
          label="Diminuir zoom"
          disabled={zoom <= 1}
          onPress={() => setZoom((value) => Math.max(1, value - 0.5))}
          icon={<Minus size={16} color={c.accent} />}
        >
          Menos zoom
        </Button>
        <Text style={ui.subtitle}>{Math.round(zoom * 100)}%</Text>
        <Button
          small
          variant="outline"
          label="Aumentar zoom"
          disabled={zoom >= 3}
          onPress={() => setZoom((value) => Math.min(3, value + 0.5))}
          icon={<Plus size={16} color={c.accent} />}
        >
          Mais zoom
        </Button>
        <Button
          small
          variant="ghost"
          onPress={() => {
            setZoom(1);
            horizontal.current?.scrollTo({ x: 0 });
            vertical.current?.scrollTo({ y: 0 });
          }}
          icon={<RotateCcw size={15} color={c.muted} />}
        >
          Restaurar
        </Button>
        {source && (
          <Button small variant="ghost" onPress={() => setExpanded(true)}>
            Tela cheia
          </Button>
        )}
      </View>
      {source ? (
        <View
          onLayout={(event) => setCanvasWidth(event.nativeEvent.layout.width)}
          style={{
            borderWidth: 1,
            borderColor: placing ? c.accent : c.line,
            borderRadius: 14,
            overflow: "hidden",
            backgroundColor: c.surfaceAlt,
          }}
        >
          <ScrollView
            ref={horizontal}
            horizontal
            nestedScrollEnabled
            style={{ height: Math.min(440, mapHeight) }}
            showsHorizontalScrollIndicator={zoom > 1}
          >
            <ScrollView
              ref={vertical}
              nestedScrollEnabled
              style={{ width: mapWidth, height: Math.min(440, mapHeight) }}
              showsVerticalScrollIndicator={mapHeight > 440}
            >
              {renderCanvas()}
            </ScrollView>
          </ScrollView>
        </View>
      ) : (
        <Text style={ui.subtitle}>
          O mapa desta região ainda não está disponível. Você pode explorar os
          locais abaixo.
        </Text>
      )}
      {placing ? (
        <Text style={{ color: c.accent, fontWeight: "700" }}>
          Toque na imagem para posicionar {pretty(selected!.name)}. A marcação
          fica salva neste aparelho.
        </Text>
      ) : (
        <Text style={[ui.subtitle, { fontSize: 12, lineHeight: 20 }]}>
          Toque em um ponto para explorar o local. Use o zoom e as barras de
          rolagem para navegar. Locais sem ponto continuam disponíveis na lista.
        </Text>
      )}
      <View style={ui.wrap}>
        <Button
          small
          variant="ghost"
          onPress={() => setShowPoints((value) => !value)}
        >
          {showPoints ? "Ocultar pontos" : "Mostrar pontos"} ({markers.length})
        </Button>
        {!!selectedPoint && (
          <Button small variant="ghost" onPress={focus}>
            Centralizar local
          </Button>
        )}
        {selected && source && (
          <Button
            small
            variant="outline"
            onPress={() => setPlacing((value) => !value)}
          >
            {placing
              ? "Cancelar marcação"
              : selectedPoint
                ? "Ajustar ponto no mapa"
                : "Posicionar no mapa"}
          </Button>
        )}
        {selected && points[keyFor(selected)] && (
          <Button
            small
            variant="ghost"
            onPress={() => removePoint(keyFor(selected))}
          >
            Remover minha marcação
          </Button>
        )}
      </View>
      <View
        style={{
          flexDirection: width >= 1100 ? "row" : "column",
          gap: 18,
          alignItems: "stretch",
        }}
      >
        <View style={{ width: width >= 1100 ? 290 : "100%", gap: 12 }}>
          <Text style={ui.sectionTitle}>Locais da região</Text>
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(0);
            }}
            placeholder="Buscar cidade, rota ou local…"
          />
          <Select
            label="Categoria"
            value={category}
            onChange={(value) => {
              setCategory(value);
              setPage(0);
            }}
            options={[
              { value: "all", label: "Todos os locais" },
              { value: "town", label: "Cidades e ilhas" },
              { value: "route", label: "Rotas" },
              { value: "other", label: "Outros locais" },
            ]}
          />
          {regionQuery.isPending ? (
            <Loading text="Carregando locais…" />
          ) : regionQuery.isError ? (
            <ErrorState
              retry={() => {
                void regionQuery.refetch();
              }}
            />
          ) : (
            <>
              <Text style={ui.subtitle}>{filtered.length} locais</Text>
              <ScrollView
                nestedScrollEnabled
                style={{ maxHeight: 380 }}
                contentContainerStyle={{ gap: 6 }}
              >
                {filtered
                  .slice(currentPage * 15, (currentPage + 1) * 15)
                  .map((location) => (
                    <Pressable
                      key={location.url}
                      accessibilityRole="button"
                      accessibilityState={{
                        selected: selected?.url === location.url,
                      }}
                      onPress={() => choose(location)}
                      style={{
                        padding: 12,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor:
                          selected?.url === location.url ? c.accent : c.line,
                        backgroundColor:
                          selected?.url === location.url
                            ? c.accentSoft
                            : c.surface,
                      }}
                    >
                      <View style={ui.row}>
                        <MapPin
                          size={14}
                          color={pointFor(location) ? c.accent : c.muted}
                        />
                        <Text
                          style={{
                            color: c.ink,
                            fontSize: 13,
                            fontWeight: "600",
                            flex: 1,
                          }}
                        >
                          {pretty(location.name)}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
              </ScrollView>
              {!filtered.length && (
                <Text style={ui.subtitle}>Nenhum local encontrado.</Text>
              )}
              {filtered.length > 15 && (
                <Pagination
                  page={currentPage}
                  total={filtered.length}
                  pageSize={15}
                  setPage={setPage}
                />
              )}
            </>
          )}
        </View>
        <View
          style={{
            flex: 1,
            minWidth: 0,
            gap: 14,
            padding: 16,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: c.line,
            backgroundColor: c.surface,
          }}
        >
          {selected ? (
            <LocationPanel
              key={selected.url}
              location={selected}
              versions={versions}
            />
          ) : (
            <View
              style={{ gap: 10, paddingVertical: 24, alignItems: "center" }}
            >
              <MapPin size={36} color={c.accent} />
              <Text style={ui.sectionTitle}>Escolha um local</Text>
              <Text style={[ui.subtitle, { textAlign: "center" }]}>
                Selecione um ponto no mapa ou um local na lista para ver as
                áreas e os encontros disponíveis.
              </Text>
            </View>
          )}
        </View>
      </View>
      <Modal
        visible={expanded}
        transparent
        animationType="fade"
        onRequestClose={() => setExpanded(false)}
      >
        <View
          style={{
            flex: 1,
            padding: 16,
            backgroundColor: "rgba(0,0,0,0.85)",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              flex: 1,
              maxHeight: "96%",
              backgroundColor: c.surface,
              padding: 12,
              borderRadius: 16,
              gap: 12,
            }}
          >
            <View style={ui.between}>
              <Text style={ui.sectionTitle}>Mapa de {pretty(region.name)}</Text>
              <Button small variant="ghost" onPress={() => setExpanded(false)}>
                Fechar
              </Button>
            </View>
            <ScrollView horizontal nestedScrollEnabled>
              <ScrollView nestedScrollEnabled>
                {source && renderCanvas(true)}
              </ScrollView>
            </ScrollView>
            {selected && (
              <Text style={ui.subtitle}>
                Selecionado: {pretty(selected.name)}. Feche o mapa para ver os
                encontros.
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
function LocationPanel({
  location,
  versions,
}: {
  location: NamedResource;
  versions: string[];
}) {
  const { ui, colors: c } = useTheme();
  const [area, setArea] = useState("");
  const [method, setMethod] = useState("");
  const [pokemonSearch, setPokemonSearch] = useState("");
  const [encounterPage, setEncounterPage] = useState(0);
  const [version, setVersion] = useState(
    versions.length === 1 ? versions[0] : "",
  );
  const query = useQuery({
    queryKey: ["map-location", location.url],
    queryFn: ({ signal }) => getByUrl<Location>(location.url, signal),
    staleTime: 86400000,
  });
  const selectedArea =
    query.data?.areas.find((entry) => entry.url === area) ??
    query.data?.areas[0];
  const areaQuery = useQuery({
    queryKey: ["map-area", selectedArea?.url],
    queryFn: ({ signal }) => getByUrl<Area>(selectedArea!.url, signal),
    enabled: !!selectedArea,
    staleTime: 86400000,
  });
  const availableVersions = [
    ...new Set(
      areaQuery.data?.pokemon_encounters.flatMap((entry) =>
        entry.version_details.map((detail) => detail.version.name),
      ) ?? [],
    ),
  ]
    .filter((name) => !versions.length || versions.includes(name))
    .sort();
  const encounters = (areaQuery.data?.pokemon_encounters ?? []).flatMap(
    (entry) => {
      const filtered = entry.version_details
        .filter(
          (detail) =>
            (!versions.length || versions.includes(detail.version.name)) &&
            (!version || detail.version.name === version),
        )
        .map((detail) => ({
          ...detail,
          encounter_details: detail.encounter_details.filter(
            (encounter) => !method || encounter.method.name === method,
          ),
        }))
        .filter((detail) => detail.encounter_details.length);
      if (
        !entry.pokemon.name.includes(
          pokemonSearch.trim().toLowerCase().replace(/ /g, "-"),
        ) &&
        idFromUrl(entry.pokemon.url) !== pokemonSearch.trim().replace("#", "")
      )
        return [];
      return filtered.length
        ? [{ pokemon: entry.pokemon, versions: filtered }]
        : [];
    },
  );
  const methods = [
    ...new Set(
      areaQuery.data?.pokemon_encounters.flatMap((entry) =>
        entry.version_details
          .filter(
            (detail) =>
              (!versions.length || versions.includes(detail.version.name)) &&
              (!version || detail.version.name === version),
          )
          .flatMap((detail) =>
            detail.encounter_details.map((encounter) => encounter.method.name),
          ),
      ) ?? [],
    ),
  ];
  const currentEncounterPage = Math.min(
    encounterPage,
    Math.max(0, Math.ceil(encounters.length / 12) - 1),
  );
  if (query.isPending) return <Loading text="Carregando local…" />;
  if (query.isError)
    return (
      <ErrorState
        retry={() => {
          void query.refetch();
        }}
      />
    );
  return (
    <>
      <Text style={ui.sectionTitle}>
        {localText(query.data.names, "name") || pretty(location.name)}
      </Text>
      <ResourceLink url={location.url} name="Abrir detalhes do local" />
      {!query.data.areas.length ? (
        <Text style={ui.subtitle}>
          A PokéAPI ainda não possui áreas de encontro cadastradas para este
          local.
        </Text>
      ) : (
        <>
          <Select
            label="Área de encontro"
            value={selectedArea?.url ?? ""}
            options={query.data.areas.map((entry) => ({
              value: entry.url,
              label: pretty(entry.name),
            }))}
            onChange={(value) => {
              setArea(value);
              setVersion(versions.length === 1 ? versions[0] : "");
              setMethod("");
              setPokemonSearch("");
              setEncounterPage(0);
            }}
          />
          {areaQuery.isPending ? (
            <Loading text="Carregando encontros…" />
          ) : areaQuery.isError ? (
            <ErrorState
              retry={() => {
                void areaQuery.refetch();
              }}
            />
          ) : (
            <>
              {availableVersions.length > 1 && (
                <Select
                  label="Jogo"
                  value={version}
                  options={[
                    {
                      value: "",
                      label: versions.length
                        ? "Todas as edições deste conjunto"
                        : "Todos os jogos",
                    },
                    ...availableVersions.map((name) => ({
                      value: name,
                      label: pretty(name),
                    })),
                  ]}
                  onChange={(value) => {
                    setVersion(value);
                    setMethod("");
                    setEncounterPage(0);
                  }}
                />
              )}
              <SearchInput
                value={pokemonSearch}
                onChange={(value) => {
                  setPokemonSearch(value);
                  setEncounterPage(0);
                }}
                placeholder="Buscar Pokémon neste local…"
              />
              {methods.length > 1 && (
                <Select
                  label="Método de encontro"
                  value={method}
                  options={[
                    { value: "", label: "Todos os métodos" },
                    ...methods.map((value) => ({
                      value,
                      label: encounterMethodLabels[value] ?? pretty(value),
                    })),
                  ]}
                  onChange={(value) => {
                    setMethod(value);
                    setEncounterPage(0);
                  }}
                />
              )}
              <Text style={ui.subtitle}>
                {encounters.length} Pokémon com encontros cadastrados
              </Text>
              {!encounters.length && (
                <Text style={ui.body}>
                  Não há encontros cadastrados para esta área nos jogos
                  selecionados.
                </Text>
              )}
              {encounters
                .slice(
                  currentEncounterPage * 12,
                  (currentEncounterPage + 1) * 12,
                )
                .map((entry) => (
                  <EncounterCard
                    key={entry.pokemon.url}
                    pokemon={entry.pokemon}
                    versions={entry.versions}
                  />
                ))}
              {encounters.length > 12 && (
                <Pagination
                  page={currentEncounterPage}
                  total={encounters.length}
                  pageSize={12}
                  setPage={setEncounterPage}
                />
              )}
            </>
          )}
        </>
      )}
      <Text style={[ui.subtitle, { fontSize: 11, lineHeight: 18 }]}>
        Dados de encontros da PokéAPI. Níveis, chances e condições dependem da
        área e da edição do jogo. Ausência de dados não confirma ausência de
        Pokémon no jogo.
      </Text>
    </>
  );
}
function EncounterCard({
  pokemon,
  versions,
}: {
  pokemon: NamedResource;
  versions: VersionEncounters[];
}) {
  const { ui, colors: c } = useTheme();
  const router = useRouter();
  const id = idFromUrl(pokemon.url);
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: c.line,
        borderRadius: 12,
        padding: 12,
        gap: 10,
        backgroundColor: c.surfaceAlt,
      }}
    >
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={"Ver " + pretty(pokemon.name)}
        onPress={() => router.push("/pokemon/" + id)}
        style={ui.row}
      >
        <Art
          name={pokemon.name}
          uri={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`}
          style={{ width: 60, height: 60 }}
        />
        <View style={{ gap: 4, flex: 1 }}>
          <Text style={[ui.sectionTitle, { fontSize: 16 }]}>
            {pretty(pokemon.name)}
          </Text>
          <Text style={ui.subtitle}>#{id.padStart(4, "0")}</Text>
        </View>
      </Pressable>
      {versions.map((detail) => (
        <View key={detail.version.name} style={{ gap: 7 }}>
          <Text style={[ui.label, { color: c.accent }]}>
            {pretty(detail.version.name)}
          </Text>
          {detail.encounter_details.map((encounter, index) => (
            <View key={index} style={{ gap: 4 }}>
              <Text style={[ui.body, { fontSize: 12, lineHeight: 20 }]}>
                {encounterMethodLabels[encounter.method.name] ??
                  pretty(encounter.method.name)}{" "}
                · Nível {encounter.min_level}
                {encounter.min_level !== encounter.max_level
                  ? "–" + encounter.max_level
                  : ""}{" "}
                · {encounter.chance}%
              </Text>
              {!!encounter.condition_values.length && (
                <Text style={[ui.subtitle, { fontSize: 11 }]}>
                  {encounter.condition_values
                    .map((condition) => pretty(condition.name))
                    .join(" · ")}
                </Text>
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
