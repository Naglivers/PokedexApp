import {
  calculate,
  Generations,
  Pokemon,
  Move,
  Field,
  NATURES,
  toID,
  type GenerationNum,
  type StatsTable,
  type State,
} from "@smogon/calc";

export const statIds = ["hp", "atk", "def", "spa", "spd", "spe"] as const;
export const statLabels = {
  hp: "HP",
  atk: "Atk",
  def: "Def",
  spa: "Sp. Atk",
  spd: "Sp. Def",
  spe: "Vel.",
};
export type Combatant = {
  name: string;
  level: number;
  nature: string;
  ability: string;
  abilityOn: boolean;
  item: string;
  ivs: StatsTable;
  evs: StatsTable;
  boosts: StatsTable;
  hpPercent: number;
  status: NonNullable<State.Pokemon["status"]>;
  teraType: string;
};
export type Conditions = {
  weather: NonNullable<State.Field["weather"]> | "";
  terrain: NonNullable<State.Field["terrain"]> | "";
  doubles: boolean;
  reflect: boolean;
  lightScreen: boolean;
  auroraVeil: boolean;
  critical: boolean;
  stellarFirstUse: boolean;
  hits: number;
};
export const emptyConditions: Conditions = {
  weather: "",
  terrain: "",
  doubles: false,
  reflect: false,
  lightScreen: false,
  auroraVeil: false,
  critical: false,
  stellarFirstUse: true,
  hits: 2,
};
export function defaultCombatant(
  name: string,
  generation: GenerationNum = 9,
): Combatant {
  const species = Generations.get(generation).species.get(toID(name));
  return {
    name,
    level: 50,
    nature: "Hardy",
    ability: species?.abilities?.[0] || "(No Ability)",
    abilityOn: false,
    item: "",
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    boosts: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    hpPercent: 100,
    status: "",
    teraType: "",
  };
}
export function catalog(generation: GenerationNum) {
  const gen = Generations.get(generation);
  const names = (entries: Iterable<{ name: string }>) =>
    [...entries]
      .map((entry) => String(entry.name))
      .sort((a, b) => a.localeCompare(b));
  return {
    pokemon: names(gen.species),
    moves: names(gen.moves),
    abilities: names(gen.abilities),
    items: names(gen.items),
    natures: Object.keys(NATURES).sort(),
    types: names(gen.types).filter((name) => name !== "???"),
  };
}
export type DefensePreset = "def" | "spd";
export function maxDefender(
  value: Combatant,
  preset: DefensePreset,
): Combatant {
  return {
    ...value,
    hpPercent: 100,
    nature: preset === "def" ? "Bold" : "Calm",
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    evs: {
      hp: 252,
      atk: 0,
      def: preset === "def" ? 252 : 4,
      spa: 0,
      spd: preset === "spd" ? 252 : 4,
      spe: 0,
    },
    boosts: { ...value.boosts, hp: 0 },
  };
}
function integer(value: number, min: number, max: number) {
  return Number.isInteger(value) && value >= min && value <= max;
}
export function validateCombatant(value: Combatant, generation: GenerationNum) {
  const gen = Generations.get(generation);
  if (!gen.species.get(toID(value.name)))
    throw new Error("Escolha um Pokémon disponível nesta geração.");
  if (!integer(value.level, 1, 100))
    throw new Error("O nível deve estar entre 1 e 100.");
  if (!gen.natures.get(toID(value.nature)))
    throw new Error("Escolha uma natureza válida.");
  if (
    value.ability !== "(No Ability)" &&
    !gen.abilities.get(toID(value.ability))
  )
    throw new Error("Escolha uma habilidade disponível nesta geração.");
  if (value.item && !gen.items.get(toID(value.item)))
    throw new Error("Escolha um item disponível nesta geração.");
  if (!integer(value.hpPercent, 1, 100))
    throw new Error("O HP atual deve estar entre 1% e 100%.");
  for (const stat of statIds) {
    if (!integer(value.ivs[stat], 0, 31))
      throw new Error("Cada IV deve estar entre 0 e 31.");
    if (!integer(value.evs[stat], 0, 252))
      throw new Error("Cada EV deve estar entre 0 e 252.");
    if (!integer(value.boosts[stat], -6, 6))
      throw new Error("Os estágios devem estar entre −6 e +6.");
  }
  if (statIds.reduce((sum, stat) => sum + value.evs[stat], 0) > 510)
    throw new Error("O total de EVs não pode ultrapassar 510 por Pokémon.");
  if (
    value.teraType &&
    (generation !== 9 || !gen.types.get(toID(value.teraType)))
  )
    throw new Error(
      "A terastalização exige um tipo válido e regras da geração IX.",
    );
}
export function buildPokemon(value: Combatant, generation: GenerationNum) {
  validateCombatant(value, generation);
  const pokemon = new Pokemon(generation, value.name, {
    level: value.level,
    nature: value.nature,
    ability: value.ability,
    abilityOn: value.abilityOn,
    item: value.item,
    ivs: { ...value.ivs },
    evs: { ...value.evs },
    boosts: { ...value.boosts },
    status: value.status,
    ...(value.teraType
      ? { teraType: value.teraType as NonNullable<State.Pokemon["teraType"]> }
      : {}),
  });
  pokemon.originalCurHP = Math.max(
    1,
    Math.floor((pokemon.maxHP() * value.hpPercent) / 100),
  );
  return pokemon;
}
export function simulate(
  generation: GenerationNum,
  attacker: Combatant,
  defender: Combatant,
  moveName: string,
  conditions: Conditions,
  defensePreset: DefensePreset = "def",
) {
  defender = maxDefender(defender, defensePreset);
  if (!integer(generation, 3, 9))
    throw new Error("Selecione uma geração entre III e IX.");
  const gen = Generations.get(generation);
  const data = gen.moves.get(toID(moveName));
  if (!data) throw new Error("Escolha um golpe disponível nesta geração.");
  if (["Fissure", "Guillotine", "Horn Drill", "Sheer Cold"].includes(moveName))
    throw new Error(
      "Golpes de nocaute direto usam regras próprias de acerto e não são calculados nesta simulação.",
    );
  if (
    ["Counter", "Mirror Coat", "Metal Burst", "Bide", "Comeuppance"].includes(
      moveName,
    )
  )
    throw new Error(
      "Este golpe depende do dano recebido anteriormente, que não está informado nesta simulação.",
    );
  const hits = Array.isArray(data.multihit)
    ? conditions.hits
    : typeof data.multihit === "number"
      ? data.multihit
      : undefined;
  if (
    Array.isArray(data.multihit) &&
    !integer(conditions.hits, data.multihit[0], data.multihit[1])
  )
    throw new Error(
      "Selecione uma quantidade válida de acertos para este golpe.",
    );
  const attack = buildPokemon(attacker, generation),
    defense = buildPokemon(defender, generation);
  const move = new Move(generation, moveName, {
    isCrit: conditions.critical,
    isStellarFirstUse: conditions.stellarFirstUse,
    hits,
  });
  const field = new Field({
    gameType: conditions.doubles ? "Doubles" : "Singles",
    weather: conditions.weather || undefined,
    terrain: conditions.terrain || undefined,
    defenderSide: {
      isReflect: conditions.reflect,
      isLightScreen: conditions.lightScreen,
      isAuroraVeil: conditions.auroraVeil,
    },
  });
  const result = calculate(generation, attack, defense, move, field);
  const [min, max] = result.range();
  const hp = defense.maxHP(),
    currentHP = defense.curHP();
  let ohko: number | null = max < currentHP ? 0 : min >= currentHP ? 1 : null;
  if (move.category !== "Status" && ohko === null) {
    const chance = result.kochance(false);
    if (chance.n === 1 && typeof chance.chance === "number")
      ohko = chance.chance;
  }
  return {
    min,
    max,
    minPercent: (min / hp) * 100,
    maxPercent: (max / hp) * 100,
    hp,
    currentHP,
    remainingMin: Math.max(0, currentHP - max),
    remainingMax: Math.max(0, currentHP - min),
    ohko,
    category: result.move.category,
    moveType: String(result.move.type),
    power: result.move.bp,
    hits: result.move.hits,
    statusMove: result.move.category === "Status" && max === 0,
  };
}
