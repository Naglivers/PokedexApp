import React, { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useQueries } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Compass,
  Layers,
  Search as SearchIcon,
  Sparkles,
} from "lucide-react-native";
import { useTheme, useThemedStyles } from "../src/theme";
import {
  Art,
  Empty,
  ErrorState,
  Loading,
  SearchInput,
} from "../src/components/ui";
import { indexOptions } from "../src/services/queries";
import { idFromUrl } from "../src/services/api";
import { matchesName } from "../src/utils/pokemon";
import { useDebounce } from "../src/hooks/useDebounce";
import { SearchCard } from "../src/features/search/SearchCard";
import {
  categories,
  discovery,
  searchStyles,
  type SearchCategory,
} from "../src/features/search/searchStyles";

export default function Search() {
  const { colors: c, ui } = useTheme();
  const s = useThemedStyles(searchStyles);
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [search, setSearch] = useState(q ?? "");
  const [category, setCategory] = useState<SearchCategory | "all">("all");
  const [limits, setLimits] = useState<Partial<Record<SearchCategory, number>>>(
    {},
  );
  const { width } = useWindowDimensions();
  const [contentWidth, setContentWidth] = useState(0);
  const compact = width < 760;
  const gridGap = compact ? 10 : 12;
  const columns = Math.max(
    1,
    Math.min(
      compact ? 2 : 6,
      Math.floor((contentWidth + gridGap) / ((compact ? 126 : 160) + gridGap)),
    ),
  );
  const cardWidth =
    contentWidth > 0
      ? (contentWidth - gridGap * (columns - 1)) / columns
      : undefined;
  const query = useDebounce(search.trim());
  const searching = !!query;
  useEffect(() => {
    setSearch(q ?? "");
    setLimits({});
    setCategory("all");
  }, [q]);
  const results = useQueries({
    queries: categories.map(({ resource }) => ({
      ...indexOptions(resource),
      enabled: searching,
    })),
  });
  const groups = categories.map((entry, i) => ({
    ...entry,
    records: searching
      ? (results[i].data?.results.filter((item) =>
          matchesName(item.name, idFromUrl(item.url), query),
        ) ?? [])
      : (discovery[entry.resource] ?? []),
    pending: searching && results[i].isPending,
    error: searching && results[i].isError,
  }));
  const count = groups.reduce(
    (total, group) => total + group.records.length,
    0,
  );
  const visibleGroups = groups.filter(
    (group) =>
      (category === "all" || category === group.resource) &&
      group.records.length,
  );
  const scopedGroups = groups.filter(
    (group) => category === "all" || category === group.resource,
  );
  const pending = scopedGroups.some((group) => group.pending);
  const failed = scopedGroups.some((group) => group.error);
  const changeSearch = (value: string) => {
    setSearch(value);
    setLimits({});
  };

  return (
    <View style={[ui.page, s.page, compact && s.mobilePage]}>
      <View style={[s.hero, compact && s.mobileHero]}>
        <View
          pointerEvents="none"
          style={[s.heroRing, compact && { right: -130, opacity: 0.4 }]}
        />
        <View style={[s.heroCopy, compact && s.mobileHeroCopy]}>
          <View style={s.eyebrowRow}>
            <Compass size={14} color={c.green} />
            <Text style={[s.eyebrow, compact && { flex: 1, lineHeight: 15 }]}>
              EXPLORE O UNIVERSO POKÉMON
            </Text>
          </View>
          <Text
            style={[
              s.heroTitle,
              compact && { fontSize: 28, lineHeight: 34, letterSpacing: -0.8 },
            ]}
          >
            O que vamos descobrir?
          </Text>
          <Text style={s.heroSubtitle}>
            Uma busca por Pokémon, golpes, habilidades e muito mais.
          </Text>
          <View style={s.searchBox}>
            <SearchInput
              large={compact}
              value={search}
              onChange={changeSearch}
              placeholder="Pesquise por nome ou número…"
            />
          </View>
          <View style={s.suggestions}>
            <Text
              style={[
                s.suggestionLabel,
                compact && { width: "100%", fontSize: 11 },
              ]}
            >
              Experimente
            </Text>
            {["Pikachu", "Eevee", "Master Ball", "Emerald"].map((name) => (
              <Pressable
                key={name}
                accessibilityRole="button"
                accessibilityLabel={`Pesquisar ${name}`}
                onPress={() => {
                  changeSearch(name);
                  setCategory("all");
                }}
                style={({
                  pressed,
                  hovered,
                }: {
                  pressed: boolean;
                  hovered?: boolean;
                }) => [
                  s.suggestion,
                  {
                    backgroundColor: hovered ? c.glassStrong : c.glass,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={s.suggestionText}>{name}</Text>
                <ArrowUpRight size={11} color={c.pokemonMuted} />
              </Pressable>
            ))}
          </View>
        </View>
        {!compact && (
          <View pointerEvents="none" style={s.heroArt}>
            <View style={s.artHalo} />
            <Art
              uri="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/133.png"
              name="Eevee"
              style={s.eevee}
            />
            <Art
              uri="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png"
              name="Pikachu"
              style={s.pikachu}
            />
            <View style={s.heroArtLabel}>
              <Sparkles size={12} color={c.green} />
              <Text style={s.heroArtLabelText}>
                Sua próxima descoberta está aqui
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={s.filters}>
        <ScrollView
          horizontal
          style={s.filterScroll}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: category === "all" }}
            onPress={() => setCategory("all")}
            style={[s.filter, category === "all" && s.filterActive]}
          >
            <Layers
              size={15}
              color={category === "all" ? c.onAccent : c.muted}
            />
            <Text
              style={[s.filterText, category === "all" && s.filterTextActive]}
            >
              Tudo
            </Text>
            {searching && (
              <Text
                style={[
                  s.filterCount,
                  category === "all" && s.filterTextActive,
                ]}
              >
                {count}
              </Text>
            )}
          </Pressable>
          {groups.map(
            ({ resource, label, Icon, records, pending: loading }) => (
              <Pressable
                key={resource}
                accessibilityRole="button"
                accessibilityState={{ selected: category === resource }}
                onPress={() => setCategory(resource)}
                style={[s.filter, category === resource && s.filterActive]}
              >
                <Icon
                  size={15}
                  color={category === resource ? c.onAccent : c.muted}
                />
                <Text
                  style={[
                    s.filterText,
                    category === resource && s.filterTextActive,
                  ]}
                >
                  {label}
                </Text>
                {searching && (
                  <Text
                    style={[
                      s.filterCount,
                      category === resource && s.filterTextActive,
                    ]}
                  >
                    {loading ? "…" : records.length}
                  </Text>
                )}
              </Pressable>
            ),
          )}
        </ScrollView>
      </View>

      <View style={s.resultBar}>
        <View style={{ flex: 1, gap: 5 }}>
          <Text accessibilityRole="header" style={s.resultsTitle}>
            {searching ? "Resultados da busca" : "Um universo para explorar"}
          </Text>
          <Text accessibilityLiveRegion="polite" style={s.resultSubtitle}>
            {searching ? (
              <>
                {category === "all"
                  ? count
                  : (scopedGroups[0]?.records.length ?? 0)}{" "}
                resultados para{" "}
                <Text style={{ color: c.ink, fontWeight: "600" }}>
                  “{query}”
                </Text>
                {pending ? " · Buscando…" : failed ? " · Busca parcial" : ""}
              </>
            ) : (
              "Encontre seu próximo favorito em cada categoria."
            )}
          </Text>
        </View>
        {!compact && (
          <View style={s.resultTag}>
            <SearchIcon size={12} color={c.muted} />
            <Text style={s.resultTagText}>Por nome ou número da Pokédex</Text>
          </View>
        )}
      </View>

      <View style={s.sections}>
        {pending && <Loading />}
        {failed && (
          <ErrorState
            retry={() => {
              results.forEach((result) => {
                if (result.isError) void result.refetch();
              });
            }}
          />
        )}
        {visibleGroups.map(
          ({ resource, label, description, Icon, records }) => {
            const limit = limits[resource] ?? (columns <= 2 ? 4 : columns);
            const shown = records.slice(0, limit);
            return (
              <View
                key={resource}
                style={[s.section, compact && s.mobileSection]}
              >
                <View style={s.sectionHeader}>
                  <View
                    style={[
                      s.sectionIcon,
                      {
                        backgroundColor:
                          resource === "pokemon"
                            ? c.mint
                            : resource === "item"
                              ? c.goldSoft
                              : resource === "version"
                                ? c.lavender
                                : c.blueSoft,
                      },
                    ]}
                  >
                    <Icon
                      size={19}
                      color={
                        resource === "pokemon"
                          ? c.green
                          : resource === "item"
                            ? c.gold
                            : resource === "version"
                              ? c.purpleText
                              : c.body
                      }
                      strokeWidth={1.7}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                    <View style={s.titleRow}>
                      <Text accessibilityRole="header" style={s.sectionTitle}>
                        {label}
                      </Text>
                      {searching && (
                        <Text style={s.countBadge}>{records.length}</Text>
                      )}
                    </View>
                    {!compact && (
                      <Text style={s.sectionDescription}>{description}</Text>
                    )}
                  </View>
                  <Text style={s.showing}>
                    {shown.length} / {records.length}
                  </Text>
                </View>
                <View
                  onLayout={(event) =>
                    setContentWidth(event.nativeEvent.layout.width)
                  }
                  style={[s.grid, { gap: gridGap }]}
                >
                  {shown.map((record) => (
                    <View
                      key={record.url}
                      style={{
                        width: cardWidth ?? "100%",
                        minWidth: 0,
                        flexShrink: 0,
                      }}
                    >
                      <SearchCard
                        resource={resource}
                        record={record}
                        mobile={compact}
                      />
                    </View>
                  ))}
                </View>
                {records.length > limit && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Ver mais resultados: ${label}`}
                    onPress={() =>
                      setLimits((current) => ({
                        ...current,
                        [resource]: limit + 12,
                      }))
                    }
                    style={({
                      pressed,
                      hovered,
                    }: {
                      pressed: boolean;
                      hovered?: boolean;
                    }) => [
                      s.moreButton,
                      {
                        backgroundColor: hovered ? c.surfaceAlt : "transparent",
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text style={s.moreText}>Ver mais resultados</Text>
                    <ArrowDown size={14} color={c.body} />
                  </Pressable>
                )}
              </View>
            );
          },
        )}
        {!pending &&
          !failed &&
          !visibleGroups.length &&
          (searching ? (
            <View style={s.section}>
              <Empty
                title="Nenhum resultado"
                description="Tente outro nome, número ou categoria."
              />
              {category !== "all" && count > 0 && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setCategory("all")}
                  style={s.moreButton}
                >
                  <Text style={s.moreText}>Ver todas as categorias</Text>
                  <ArrowRight size={15} color={c.body} />
                </Pressable>
              )}
            </View>
          ) : (
            <View style={s.section}>
              <Empty
                title="Toda descoberta começa com uma pergunta"
                description="Digite um nome ou número para explorar as categorias."
              />
            </View>
          ))}
      </View>
      <View style={s.footer}>
        <Sparkles size={13} color={c.green} />
        <Text style={[ui.subtitle, { fontSize: 11 }]}>
          Explore. Descubra. Colecione.
        </Text>
      </View>
    </View>
  );
}
