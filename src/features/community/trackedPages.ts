export function isTrackedPage(path: string): boolean {
  return path.length <= 180 &&
    /^\/(?:pokemon|catalog\/(?:move|ability|item))\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path);
}

export function getMostVisitedPages(pages: { path: string; views: number }[] = []) {
  return pages.filter((page) => isTrackedPage(page.path) && Number(page.views) > 0)
    .sort((a, b) => Number(b.views) - Number(a.views) || a.path.localeCompare(b.path));
}

export function visitedPageLabel(path: string): string {
  const parts = path.split("/");
  const category = parts[1] === "pokemon" ? "Pokémon" :
    ({ move: "Golpe", ability: "Habilidade", item: "Item" }[parts[2]] ?? "Página");
  return `${category} · ${parts.at(-1)}`;
}
