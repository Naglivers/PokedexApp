import type { CommunityOverview } from "../../services/community";

export function getMostViewedPokemon(overview?: CommunityOverview) {
  return (overview?.pages ?? [])
    .map((page) => {
      const match = page.path.match(/^\/pokemon\/(\d+)$/);
      return match
        ? { id: Number(match[1]), views: Number(page.views) }
        : null;
    })
    .filter(
      (item): item is { id: number; views: number } =>
        !!item && item.id > 0 && Number.isFinite(item.views) && item.views > 0,
    )
    .sort((a, b) => b.views - a.views || a.id - b.id)
    .slice(0, 4)
    .map((item) => ({
      name: `pokemon-${item.id}`,
      url: `https://pokeapi.co/api/v2/pokemon/${item.id}/`,
      views: item.views,
    }));
}
