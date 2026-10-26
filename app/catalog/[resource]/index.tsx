import React from "react";
import { useLocalSearchParams } from "expo-router";
import Catalog from "../../../src/features/catalog/Catalog";
export default function CatalogRoute() {
  const { resource } = useLocalSearchParams<{ resource: string }>();
  return <Catalog key={resource} resource={resource} />;
}
