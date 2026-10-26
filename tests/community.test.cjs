const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    }).outputText,
    filename,
  );
let signedIn = null;
let anonymousRequests = 0;
let anonymousError = null;
let response = {
  data: { likes: [], pages: [], total_likes: 0, total_visits: 0 },
  error: null,
};
const calls = [];
const fake = {
  auth: {
    getSession: async () => ({ data: { session: signedIn }, error: null }),
    signInAnonymously: async () => {
      anonymousRequests++;
      if (anonymousError)
        return { data: { session: null }, error: anonymousError };
      await new Promise((resolve) => setTimeout(resolve, 5));
      signedIn = { user: { id: "test-user" } };
      return { data: { session: signedIn }, error: null };
    },
  },
  rpc: async (name, params) => {
    calls.push({ name, params });
    return response;
  },
  from: (table) => ({
    select: (fields) => ({
      eq: async (field, value) => {
        calls.push({ table, fields, field, value });
        return { data: [{ pokemon_id: 25 }], error: null };
      },
    }),
  }),
};
const originalLoad = Module._load;
Module._load = function (request, parent, ...args) {
  if (request === "./supabase" && parent.filename.endsWith("community.ts"))
    return { supabase: fake };
  return originalLoad.call(this, request, parent, ...args);
};
const community = require("../src/services/community.ts");
const { getRadarPokemon } = require("../src/features/community/radar.ts");

test("parallel consumers create only one anonymous session and reuse it", async () => {
  const result = await Promise.all(
    Array.from({ length: 8 }, () => community.ensureCommunitySession()),
  );
  assert.equal(anonymousRequests, 1);
  assert.ok(result.every((session) => session.user.id === "test-user"));
  await community.ensureCommunitySession();
  assert.equal(anonymousRequests, 1);
});
test("personal likes query selects only Pokemon IDs for the current identity", async () => {
  assert.deepEqual(await community.getMyLikes(), [25]);
  assert.deepEqual(calls.at(-1), {
    table: "pokeatlas_likes",
    fields: "pokemon_id",
    field: "user_id",
    value: "test-user",
  });
});
test("likes send an explicit desired state instead of an unsafe increment", async () => {
  response = { data: { liked: true, total: 2 }, error: null };
  await community.setPokemonLike(25, true);
  assert.deepEqual(calls.at(-1), {
    name: "pokeatlas_set_like",
    params: { p_pokemon_id: 25, p_liked: true },
  });
  response = { data: { liked: false, total: 1 }, error: null };
  await community.setPokemonLike(25, false);
  assert.equal(calls.at(-1).params.p_liked, false);
});
test("tracking rejects queries and full URLs; only route paths are transmitted", async () => {
  response = { data: null, error: null };
  const before = calls.length;
  await community.trackPage("/search?q=private-query");
  await community.trackPage("https://example.com/");
  assert.equal(calls.length, before);
  await community.trackPage("/pokemon/25");
  assert.deepEqual(calls.at(-1), {
    name: "pokeatlas_track_page",
    params: { p_path: "/pokemon/25" },
  });
});

test("tracking only accepts Pokemon, moves, abilities and items", async () => {
  response = { data: null, error: null };
  const before = calls.length;
  await community.trackPage("/");
  await community.trackPage("/catalog/region");
  await community.trackPage("/community");
  await community.trackPage("/catalog/move");
  await community.trackPage("/catalog/item/");
  await community.trackPage("/catalog/ability");
  await community.trackPage("/catalog/move/1/extra");
  await community.trackPage("/pokemon/25");
  await community.trackPage("/catalog/move/10");
  await community.trackPage("/catalog/ability/65");
  await community.trackPage("/catalog/item/1");
  assert.deepEqual(
    calls.slice(before).map(({ params }) => params.p_path),
    ["/pokemon/25", "/catalog/move/10", "/catalog/ability/65", "/catalog/item/1"],
  );
});
test("missing schema is a setup state and does not fabricate rankings", async () => {
  response = {
    data: null,
    error: { code: "PGRST202", message: "Function not found" },
  };
  await assert.rejects(
    community.getCommunityOverview(),
    (error) =>
      error instanceof community.CommunityError && error.code === "schema",
  );
  response = { data: { invalid: true }, error: null };
  await assert.rejects(community.getCommunityOverview(), /inválida/);
});

test("disabled anonymous auth cannot create a like; retry recovers after configuration is fixed", async () => {
  signedIn = null;
  anonymousError = {
    code: "anonymous_provider_disabled",
    message: "Anonymous sign-ins are disabled",
  };
  const before = calls.length;
  await assert.rejects(
    community.setPokemonLike(992, true),
    (error) =>
      error.code === "auth" &&
      error.backendCode === "anonymous_provider_disabled",
  );
  assert.equal(
    calls.length,
    before,
    "No like RPC may run after failed authentication",
  );
  anonymousError = null;
  response = { data: { liked: true, total: 1 }, error: null };
  assert.deepEqual(await community.setPokemonLike(992, true), {
    liked: true,
    total: 1,
  });
  assert.deepEqual(calls.at(-1), {
    name: "pokeatlas_set_like",
    params: { p_pokemon_id: 992, p_liked: true },
  });
});

test("No radar displays Iron Hands with one saved like and Pikachu without votes", () => {
  const empty = { likes: [], pages: [], total_likes: 0, total_visits: 0 };
  assert.equal(getRadarPokemon(undefined).pokemonId, 25);
  assert.equal(getRadarPokemon(empty).pokemonId, 25);
  assert.equal(
    getRadarPokemon({ ...empty, likes: [{ pokemon_id: 992, total: 1 }] })
      .pokemonId,
    992,
  );
  const ranked = getRadarPokemon({
    ...empty,
    likes: [
      { pokemon_id: 25, total: 1 },
      { pokemon_id: 992, total: 2 },
    ],
  });
  assert.equal(ranked.pokemonId, 992);
  assert.equal(ranked.mostLiked.total, 2);
  assert.equal(
    getRadarPokemon({ ...empty, likes: [{ pokemon_id: 992, total: 0 }] })
      .pokemonId,
    25,
  );
});
