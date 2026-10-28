import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Loading, ErrorState, Select } from "../src/components/ui";
import { useTheme } from "../src/theme";
import { indexOptions } from "../src/services/queries";
import { pretty } from "../src/utils/pokemon";
import { InteractiveRegionMap } from "../src/features/maps/InteractiveRegionMap";
export default function MapsRoute() {
  const { ui } = useTheme();
  const params = useLocalSearchParams<{ region?: string; location?: string }>();
  const router = useRouter();
  const region = typeof params.region === "string" ? params.region : "kanto";
  const location = typeof params.location === "string" ? params.location : "";
  const query = useQuery(indexOptions("region"));
  const selected =
    query.data?.results.find((entry) => entry.name === region) ??
    query.data?.results[0];
  return (
    <View style={ui.page}>
      <Text style={ui.title}>Mapas interativos</Text>
      <Text style={ui.subtitle}>
        Explore as regiões, escolha locais e consulte os Pokémon encontrados em
        cada área.
      </Text>
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState
          retry={() => {
            void query.refetch();
          }}
        />
      ) : (
        <>
          <Select
            label="Região"
            value={selected?.name ?? ""}
            onChange={(value) =>
              router.setParams({ region: value, location: "" })
            }
            options={query.data.results.map((entry) => ({
              value: entry.name,
              label: pretty(entry.name),
            }))}
          />
          {selected && (
            <InteractiveRegionMap
              key={selected.url + ":" + location}
              region={selected}
              initialLocation={location}
            />
          )}
        </>
      )}
    </View>
  );
}
