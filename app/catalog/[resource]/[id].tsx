import React from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Database } from "lucide-react-native";
import { colors as c, ui } from "../../../src/theme";
import { getResource } from "../../../src/services/api";
import { resourceLabels } from "../../../src/constants/pokemon";
import { localText, pretty, localDescription } from "../../../src/utils/pokemon";
import { Button, ErrorState, Loading } from "../../../src/components/ui";
import { ResourceData } from "../../../src/components/ResourceData";
import { EvolutionTree } from "../../../src/features/pokemon/EvolutionTree";
import type { EvolutionChain, TypeDetail } from "../../../src/services/api";
import { TypePokemon } from "../../../src/features/catalog/TypePokemon";
export default function ResourceDetail() {
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
          onPress={() => router.push(`/catalog/${resource}`)}
        >
          {resourceLabels[resource] ?? pretty(resource)}
        </Button>
      </View>
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState retry={() => query.refetch()} />
      ) : (
        <>
          <View style={ui.panel}>
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
          {resource === "type" && Array.isArray(query.data.pokemon) && (
            <TypePokemon name={String(query.data.name ?? id)} pokemon={(query.data as unknown as TypeDetail).pokemon} />
          )}
        </>
      )}
    </View>
  );
}
