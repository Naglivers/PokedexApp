import type {
  DamageRelations,
  EvolutionNode,
  NamedResource,
  PokemonDetail,
} from "../services/api";

export const pretty = (value: string) =>
  value.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
export const isMegaPokemon = (name: string) => /-mega(?:-|$)/i.test(name);
export const normalize = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^#0*/, "");
export const baseTotal = (pokemon: PokemonDetail) =>
  pokemon.stats.reduce((sum, stat) => sum + stat.base_stat, 0);
export function matchesName(name: string, id: string, query: string) {
  const text = normalize(query);
  return (
    !text ||
    name.includes(text.replace(/ /g, "-")) ||
    String(Number(text)) === id
  );
}
export function defensiveMultiplier(
  attacking: string,
  defenses: DamageRelations[],
): number {
  return defenses.reduce(
    (total, relations) =>
      total *
      (relations.no_damage_from.some((t) => t.name === attacking)
        ? 0
        : relations.double_damage_from.some((t) => t.name === attacking)
          ? 2
          : relations.half_damage_from.some((t) => t.name === attacking)
            ? 0.5
            : 1),
    1,
  );
}
export function evolutionCondition(details: Record<string, unknown>): string {
  const bits: string[] = [];
  const names: Record<string, string> = {
    min_level: "Nível",
    min_happiness: "Amizade",
    min_beauty: "Beleza",
    min_affection: "Afeição",
    time_of_day: "Horário",
    item: "Item",
    held_item: "Segurar",
    location: "Local",
    known_move: "Golpe",
    known_move_type: "Tipo de golpe",
    party_species: "Na equipe",
    party_type: "Tipo na equipe",
    trade_species: "Troca com",
    gender: "Gênero",
    relative_physical_stats: "Ataque × defesa",
    needs_overworld_rain: "Chuva",
    turn_upside_down: "Dispositivo invertido",
  };
  Object.entries(details).forEach(([key, value]) => {
    if (value === null || value === false || value === "" || key === "trigger")
      return;
    const label = names[key] ?? pretty(key.replace(/_/g, "-"));
    const text =
      typeof value === "object" && "name" in value
        ? pretty(String((value as NamedResource).name))
        : value === true
          ? ""
          : String(value);
    bits.push(`${label}${text ? `: ${text}` : ""}`);
  });
  const trigger = details.trigger as NamedResource | undefined;
  return (
    [
      trigger?.name === "trade"
        ? "Troca"
        : trigger?.name === "shed"
          ? "Condição especial"
          : "",
      ...bits,
    ]
      .filter(Boolean)
      .join(" · ") || pretty(trigger?.name ?? "Evolução")
  );
}
export function flattenEvolution(node: EvolutionNode): string[] {
  return [node.species.name, ...node.evolves_to.flatMap(flattenEvolution)];
}
export function localText(
  entries: unknown,
  key = "flavor_text",
  language = "pt-BR",
): string {
  if (!Array.isArray(entries)) return "";
  const records = entries as Record<string, unknown>[];
  const chosen =
    [language, "pt", "en"]
      .map((lang) =>
        records.find(
          (record) =>
            (record.language as NamedResource | undefined)?.name === lang,
        ),
      )
      .find(Boolean) ?? records[0];
  return String(chosen?.[key] ?? "").replace(/[\f\n\r]+/g, " ");
}
