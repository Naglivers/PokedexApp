import type { CommunityOverview } from "../../services/community";

/** A local favorite never counts as a community vote. */
export function getRadarPokemon(overview?: CommunityOverview | null) {
  const mostLiked = overview?.likes.reduce<
    CommunityOverview["likes"][number] | undefined
  >((leader, candidate) => {
    if (
      !Number.isInteger(candidate.pokemon_id) ||
      candidate.pokemon_id < 1 ||
      !Number.isFinite(candidate.total) ||
      candidate.total <= 0
    )
      return leader;
    return !leader ||
      candidate.total > leader.total ||
      (candidate.total === leader.total &&
        candidate.pokemon_id < leader.pokemon_id)
      ? candidate
      : leader;
  }, undefined);
  return { pokemonId: mostLiked?.pokemon_id ?? 25, mostLiked };
}
