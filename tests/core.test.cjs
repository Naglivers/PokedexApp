const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  module._compile(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    }).outputText,
    filename,
  );
};
const persisted = new Map();
const storage = {
  getItem: async (key) => persisted.get(key) ?? null,
  setItem: async (key, value) => {
    persisted.set(key, value);
  },
  removeItem: async (key) => {
    persisted.delete(key);
  },
};
const originalLoad = Module._load;
Module._load = function (request, ...args) {
  if (request === "@react-native-async-storage/async-storage")
    return { __esModule: true, default: storage };
  return originalLoad.call(this, request, ...args);
};
const api = require("../src/services/api.ts");
const {
  matchesName,
  isMegaPokemon,
  defensiveMultiplier,
  flattenEvolution,
  evolutionCondition,
  localText,
  baseTotal,
} = require("../src/utils/pokemon.ts");
const { useFavorites } = require("../src/store/favorites.ts");
const { useCollection } = require("../src/store/collection.ts");
const { QueryClient } = require("@tanstack/react-query");
test("dex separation includes Mega X, Y and Z without excluding Meganium or Yanmega", () => {
  const names = ["venusaur-mega", "charizard-mega-x", "charizard-mega-y", "absol-mega-z", "meganium", "yanmega", "pikachu"];
  assert.deepEqual(names.filter(isMegaPokemon), names.slice(0, 4));
  assert.deepEqual(names.filter((name) => !isMegaPokemon(name)), ["meganium", "yanmega", "pikachu"]);
});
const resource = (name) => ({
  name,
  url: `https://pokeapi.co/api/v2/type/${name}/`,
});
const relations = (values) => ({
  double_damage_from: [],
  half_damage_from: [],
  no_damage_from: [],
  double_damage_to: [],
  half_damage_to: [],
  no_damage_to: [],
  ...values,
});

test("search finds padded IDs and partial alternative-form names across the index", () => {
  assert.equal(matchesName("pikachu", "25", "#0025"), true);
  assert.equal(matchesName("charizard-mega-x", "10034", "CHARIZARD"), true);
  assert.equal(matchesName("pikachu", "25", "  PIKA  "), true);
  assert.equal(matchesName("pikachu", "25", "26"), false);
});
test("dual typing multiplies weaknesses, resistances, and immunity", () => {
  const fire = relations({
    double_damage_from: [resource("rock")],
    half_damage_from: [resource("grass")],
  });
  const flying = relations({
    double_damage_from: [resource("rock")],
    half_damage_from: [resource("grass")],
    no_damage_from: [resource("ground")],
  });
  assert.equal(defensiveMultiplier("rock", [fire, flying]), 4);
  assert.equal(defensiveMultiplier("grass", [fire, flying]), 0.25);
  assert.equal(defensiveMultiplier("ground", [fire, flying]), 0);
});
test("evolution keeps branches and handles item, trade and numeric-zero conditions", () => {
  const leaf = (name) => ({
    species: resource(name),
    evolution_details: [],
    evolves_to: [],
  });
  const tree = {
    ...leaf("eevee"),
    evolves_to: [
      leaf("vaporeon"),
      leaf("jolteon"),
      { ...leaf("umbreon"), evolves_to: [leaf("branch")] },
    ],
  };
  assert.deepEqual(flattenEvolution(tree), [
    "eevee",
    "vaporeon",
    "jolteon",
    "umbreon",
    "branch",
  ]);
  assert.match(
    evolutionCondition({
      trigger: resource("trade"),
      item: resource("metal-coat"),
      relative_physical_stats: 0,
    }),
    /Troca.*Metal Coat.*0/,
  );
});
test("localization falls back to English and removes API control characters", () => {
  assert.equal(
    localText([{ language: resource("en"), flavor_text: "Hello\nworld\f!" }]),
    "Hello world !",
  );
  assert.equal(localText([]), "");
  assert.equal(localText(null), "");
});
test("favorites toggle once and persist the resulting IDs", async () => {
  useFavorites.setState({ ids: [] });
  useFavorites.getState().toggle(25);
  useFavorites.getState().toggle(6);
  useFavorites.getState().toggle(25);
  assert.deepEqual(useFavorites.getState().ids, [6]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(
    JSON.parse(persisted.get("pokedex-favorites")).state.ids,
    [6],
  );
});
test("team caps at six, refuses duplicates and removal permits a new member", () => {
  useCollection.setState({ team: [], compare: [] });
  [1, 2, 3, 4, 5, 6, 7, 1].forEach((id) =>
    useCollection.getState().addTeam(id),
  );
  assert.deepEqual(useCollection.getState().team, [1, 2, 3, 4, 5, 6]);
  useCollection.getState().removeTeam(3);
  useCollection.getState().addTeam(7);
  assert.deepEqual(useCollection.getState().team, [1, 2, 4, 5, 6, 7]);
  [1, 2, 3, 4, 5].forEach((id) => useCollection.getState().toggleCompare(id));
  assert.deepEqual(useCollection.getState().compare, [1, 2, 3, 4]);
});
test("comparison total comes from all six API attributes", () => {
  assert.equal(
    baseTotal({
      stats: [35, 55, 40, 50, 50, 90].map((base_stat) => ({ base_stat })),
    }),
    320,
  );
});
test("HTTP handles unnamed resources, correct limit/offset and queue concurrency", async () => {
  const oldAdapter = api.api.defaults.adapter;
  let concurrent = 0;
  let maximum = 0;
  let params;
  api.api.defaults.adapter = async (config) => {
    params = config.params;
    concurrent++;
    maximum = Math.max(maximum, concurrent);
    await new Promise((resolve) => setTimeout(resolve, 3));
    concurrent--;
    return {
      status: 200,
      statusText: "OK",
      headers: {},
      config,
      data: {
        count: 600,
        next: null,
        previous: null,
        results: [{ url: "https://pokeapi.co/api/v2/evolution-chain/26/" }],
      },
    };
  };
  try {
    const data = await api.getResourceList("evolution-chain", 24, 24);
    assert.deepEqual(params, { limit: 24, offset: 24 });
    assert.equal(data.results[0].name, "#26");
    await Promise.all(
      Array.from({ length: 18 }, () => api.getResource("pokemon", 25)),
    );
    assert.ok(maximum <= 6);
    await assert.rejects(api.getResourceList("pokemon", 24, -1), /inválidos/);
    await assert.rejects(api.getByUrl("https://example.com/"), /inválido/);
    await assert.rejects(api.getResource("pokemon", "../etc"), /válido/);
  } finally {
    api.api.defaults.adapter = oldAdapter;
  }
});
test("cache deduplicates simultaneous queries and reuses fresh data", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: 60000, retry: false } },
  });
  let calls = 0;
  const options = {
    queryKey: ["pokemon", "25"],
    queryFn: async () => {
      calls++;
      return { name: "pikachu" };
    },
  };
  await Promise.all([client.fetchQuery(options), client.fetchQuery(options)]);
  await client.fetchQuery(options);
  assert.equal(calls, 1);
  client.clear();
});
