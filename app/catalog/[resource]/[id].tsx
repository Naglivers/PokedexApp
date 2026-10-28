import React from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Database } from "lucide-react-native";
import { useTheme } from "../../../src/theme";
import { getResource } from "../../../src/services/api";
import { resourceLabels } from "../../../src/constants/pokemon";
import {
  localText,
  pretty,
  localDescription,
} from "../../../src/utils/pokemon";
import { Button, ErrorState, Loading } from "../../../src/components/ui";
import { ResourceData } from "../../../src/components/ResourceData";
import { EvolutionTree } from "../../../src/features/pokemon/EvolutionTree";
import type { EvolutionChain } from "../../../src/services/api";
import { TypeDetailPage } from "../../../src/features/catalog/TypeDetailPage";
import { ResourceFavoriteButton } from "../../../src/components/ResourceFavoriteButton";
import { isFavoriteResource } from "../../../src/store/resourceFavorites";
import { GameDetail } from "../../../src/features/catalog/GameDetail";
import {
  RegionDetail,
  type RegionData,
} from "../../../src/features/catalog/RegionDetail";
import {
  GenerationDetail,
  type GenerationData,
} from "../../../src/features/catalog/GenerationDetail";
export default function ResourceDetail() {
  const { colors: c, ui } = useTheme();
  const { resource, id } = useLocalSearchParams<{
    resource: string;
    id: string;
  }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const query = useQuery({
    queryKey: ["resource", resource, id],
    queryFn: ({ signal }) => getResource(resource, id, signal),
  });
  const description = localDescription(query.data, "effect");
  return (
    <View style={[ui.page, width < 650 && { padding: 18 }]}>
      <View style={{ alignSelf: "flex-start" }}>
        <Button
          small
          variant="ghost"
          icon={<ArrowLeft size={14} color={c.muted} />}
          onPress={() =>
            router.push(
              resource === "version" || resource === "version-group"
                ? "/games"
                : `/catalog/${resource}`,
            )
          }
        >
          {resource === "version" || resource === "version-group"
            ? "Jogos"
            : (resourceLabels[resource] ?? pretty(resource))}
        </Button>
      </View>
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState retry={() => query.refetch()} />
      ) : resource === "type" ? (
        <TypeDetailPage
          key={id}
          data={
            query.data as unknown as React.ComponentProps<
              typeof TypeDetailPage
            >["data"]
          }
        />
      ) : resource === "region" ? (
        <RegionDetail key={id} data={query.data as unknown as RegionData} />
      ) : resource === "version" || resource === "version-group" ? (
        <GameDetail resource={resource} data={query.data} />
      ) : resource === "generation" ? (
        <GenerationDetail
          key={id}
          data={query.data as unknown as GenerationData}
        />
      ) : (
        <>
          <View style={ui.panel}>
            {isFavoriteResource(resource) && (
              <View style={{ alignSelf: "flex-end" }}>
                <ResourceFavoriteButton
                  resource={resource}
                  id={String(query.data.id ?? id)}
                  name={String(query.data.name ?? id)}
                />
              </View>
            )}
            <Text style={[ui.label, { color: c.accent }]}>
              {resourceLabels[resource] ?? resource} / #{id}
            </Text>
            <Text style={ui.title}>
              {query.data.name
                ? pretty(query.data.name)
                : `${resourceLabels[resource] ?? pretty(resource)} #${id}`}
            </Text>
            {!!description && <Text style={ui.body}>{description}</Text>}
          </View>
          {resource === "evolution-chain" && query.data.chain && (
            <EvolutionTree
              node={(query.data as unknown as EvolutionChain).chain}
            />
          )}
          <View style={ui.between}>
            <Text style={ui.sectionTitle}>Informações e relações</Text>
            <Database size={18} color={c.muted} />
          </View>
          <Text style={ui.subtitle}>
            Abra os grupos para explorar os dados. Os links levam aos registros
            relacionados.
          </Text>
          <ResourceData data={query.data} />
        </>
      )}
    </View>
  );
}
