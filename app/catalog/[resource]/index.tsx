import React from "react";
import { useLocalSearchParams } from "expo-router";
import Catalog from "../../../src/features/catalog/Catalog";
import MovesCatalog from "../../../src/features/catalog/MovesCatalog";
import ItemsCatalog from "../../../src/features/catalog/ItemsCatalog";
import BerriesCatalog from "../../../src/features/catalog/BerriesCatalog";
export default function CatalogRoute() {
  const { resource } = useLocalSearchParams<{ resource: string }>();
  return resource === "move" ? (
    <MovesCatalog />
  ) : resource === "item" ? (
    <ItemsCatalog />
  ) : resource === "berry" ? (
    <BerriesCatalog />
  ) : (
    <Catalog key={resource} resource={resource} />
  );
}
