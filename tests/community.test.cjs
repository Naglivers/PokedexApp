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
