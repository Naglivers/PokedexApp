const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText,
    filename,
  );
const {
  defaultCombatant,
  buildPokemon,
  simulate,
  emptyConditions,
  validateCombatant,
  maxDefender,
} = require("../src/features/damage/engine.ts");
const run = (a, d, m, field = {}) =>
  simulate(9, a, d, m, { ...emptyConditions, ...field });
test("level 50 stats use base stats, IVs, EVs and nature; Shedinja keeps one HP", () => {
  const charizard = defaultCombatant("Charizard");
  assert.deepEqual(buildPokemon(charizard, 9).rawStats, {
    hp: 153,
    atk: 104,
    def: 98,
    spa: 129,
    spd: 105,
    spe: 120,
  });
  charizard.nature = "Modest";
  charizard.evs.spa = 252;
  assert.equal(buildPokemon(charizard, 9).rawStats.spa, 177);
  assert.equal(buildPokemon(charizard, 9).rawStats.atk, 93);
  const shedinja = defaultCombatant("Shedinja");
  shedinja.evs.hp = 252;
  assert.equal(buildPokemon(shedinja, 9).maxHP(), 1);
});
test("known single-hit damage range and health percentages remain stable", () => {
  const result = run(
    defaultCombatant("Charizard"),
    defaultCombatant("Venusaur"),
    "Flamethrower",
  );
  assert.equal(result.min, 110);
  assert.equal(result.max, 132);
  assert.equal(result.hp, 187);
  assert.equal(result.currentHP, 187);
  assert.equal(result.remainingMin, 55);
  assert.equal(result.remainingMax, 77);
  assert.equal(result.ohko, 0);
});
test("type immunity and ability immunity cause zero damage", () => {
  assert.equal(
    run(
      defaultCombatant("Pikachu"),
      defaultCombatant("Garchomp"),
      "Thunderbolt",
    ).max,
    0,
  );
  const gengar = defaultCombatant("Gengar");
  gengar.ability = "Levitate";
  assert.equal(run(defaultCombatant("Garchomp"), gengar, "Earthquake").max, 0);
});
test("weather, screens, burn and critical strikes affect the correct attack category", () => {
  const a = defaultCombatant("Charizard"),
    d = defaultCombatant("Venusaur");
  const base = run(a, d, "Flamethrower");
  assert.ok(run(a, d, "Flamethrower", { weather: "Sun" }).min > base.min);
  assert.ok(run(a, d, "Flamethrower", { weather: "Rain" }).max < base.max);
  assert.ok(run(a, d, "Flamethrower", { lightScreen: true }).max < base.max);
  assert.ok(run(a, d, "Flamethrower", { critical: true }).min > base.min);
  assert.ok(
    run({ ...a, status: "brn" }, d, "Dragon Claw").max <
      run(a, d, "Dragon Claw").max,
  );
  assert.equal(run({ ...a, status: "brn" }, d, "Flamethrower").max, base.max);
});
test("multi-hit ranges, status moves and remaining current HP are distinguished", () => {
  const a = defaultCombatant("Venusaur"),
    d = defaultCombatant("Blastoise");
  const two = run(a, d, "Bullet Seed", { hits: 2 }),
    five = run(a, d, "Bullet Seed", { hits: 5 });
  assert.equal(five.min, (two.min / 2) * 5);
  assert.equal(five.max, (two.max / 2) * 5);
  assert.equal(run(a, d, "Swords Dance").statusMove, true);
  const weakened = { ...d, hpPercent: 1 };
  assert.deepEqual(run(a, weakened, "Energy Ball"), run(a, d, "Energy Ball"));
});
test("invalid spreads and unavailable Pokémon are rejected rather than silently clamped", () => {
  const a = defaultCombatant("Charizard");
  a.evs = { hp: 252, atk: 252, def: 252, spa: 0, spd: 0, spe: 0 };
  assert.throws(() => validateCombatant(a, 9), /510/);
  assert.throws(
    () => validateCombatant({ ...defaultCombatant("Charizard"), level: 0 }, 9),
    /nível/,
  );
  const invalid = defaultCombatant("Charizard");
  invalid.ivs.atk = 32;
  assert.throws(() => validateCombatant(invalid, 9), /IV/);
  assert.throws(
    () => validateCombatant(defaultCombatant("Sylveon"), 3),
    /geração/,
  );
});
test("conditional abilities and Stellar's first use are explicit rather than assumed", () => {
  const a = { ...defaultCombatant("Charizard"), ability: "Flash Fire" },
    d = defaultCombatant("Venusaur");
  assert.ok(
    run({ ...a, abilityOn: true }, d, "Flamethrower").min >
      run({ ...a, abilityOn: false }, d, "Flamethrower").min,
  );
  const stellar = { ...defaultCombatant("Charizard"), teraType: "Stellar" };
  assert.ok(
    run(stellar, d, "Flamethrower", { stellarFirstUse: true }).min >
      run(stellar, d, "Flamethrower", { stellarFirstUse: false }).min,
  );
  assert.throws(() => run(a, d, "Fissure"), /nocaute direto/);
  assert.throws(() => run(a, d, "Counter"), /anteriormente/);
});
test("the calculation does not mutate either form state", () => {
  const a = defaultCombatant("Charizard"),
    d = defaultCombatant("Venusaur");
  a.boosts.spa = 2;
  const before = JSON.stringify([a, d]);
  run(a, d, "Flamethrower");
  assert.equal(JSON.stringify([a, d]), before);
});
test("defender presets always maximize level-specific HP and chosen defense", () => {
  const original = defaultCombatant("Venusaur");
  original.hpPercent = 1;
  original.ivs.hp = 0;
  original.evs.hp = 0;
  const physical = maxDefender(original, "def"),
    special = maxDefender(original, "spd");
  assert.equal(physical.hpPercent, 100);
  assert.equal(special.hpPercent, 100);
  assert.deepEqual(buildPokemon(physical, 9).rawStats, {
    hp: 187,
    atk: 91,
    def: 148,
    spa: 120,
    spd: 121,
    spe: 100,
  });
  assert.deepEqual(buildPokemon(special, 9).rawStats, {
    hp: 187,
    atk: 91,
    def: 104,
    spa: 120,
    spd: 167,
    spe: 100,
  });
  assert.equal(
    buildPokemon(maxDefender({ ...original, level: 100 }, "def"), 9).maxHP(),
    364,
  );
  assert.equal(
    buildPokemon(maxDefender(defaultCombatant("Shedinja"), "spd"), 9).maxHP(),
    1,
  );
  const attacker = defaultCombatant("Charizard");
  const def = simulate(
    9,
    attacker,
    original,
    "Flamethrower",
    emptyConditions,
    "def",
  );
  const spdef = simulate(
    9,
    attacker,
    original,
    "Flamethrower",
    emptyConditions,
    "spd",
  );
  assert.equal(def.currentHP, def.hp);
  assert.equal(spdef.currentHP, spdef.hp);
  assert.ok(spdef.max < def.max);
  assert.equal(original.hpPercent, 1);
  assert.equal(original.evs.hp, 0);
});
