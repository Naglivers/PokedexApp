const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { createTrackerDatabase } = require("./helpers/tracker-database.cjs");

const source = "https://retroachievements.org/user/RetroTrainer";
const badge = (id, game = "red-blue") => ({
  ra_game_id: id,
  game,
  title: game === "red-blue" ? "Pokémon Red" : "Pokémon Emerald",
  versions: game === "red-blue" ? ["red"] : ["emerald"],
  image: "/Images/000001.png",
  mode: "hardcore",
  total: 100,
  awarded: 100,
});

async function fixture(t) {
  const context = await createTrackerDatabase();
  const { db } = context;
  t.after(() => db.close());
  await db.exec("create role service_role");
  for (const file of [
    "202610280015_friend_codes.sql",
    "202610280017_questline_checklist.sql",
    "202610280018_questline_catalog.sql",
    "202610280020_retroachievements_badges.sql",
    "202610280021_retroachievements_hourly.sql",
    "202610290022_retroachievements_save_fix.sql",
  ]) {
    const filename = path.join(__dirname, "../supabase/migrations", file);
    await db.exec(fs.readFileSync(filename, "utf8"));
  }
  const account = (
    await db.query(
      "insert into pokeatlas_private.accounts(nickname,password_hash) values ('RetroTrainer','test-only') returning id",
    )
  ).rows[0].id;
  await db.query(
    "insert into pokeatlas_private.friend_codes(account_id,retroachievements) values ($1,$2)",
    [account, source],
  );
  const claim = () => context.rpc("pokeatlas_ra_claim_account", [account]);
  const finish = (reservation, badges, error = false) =>
    context.rpc("pokeatlas_ra_finish", [
      account,
      reservation.claim,
      source,
      JSON.stringify(badges),
      error,
    ]);
  return { ...context, account, claim, finish };
}

test("RetroAchievements saves distinct badges and exposes them through the public profile", async (t) => {
  const { db, claim, finish, rpc } = await fixture(t);
  await db.exec("set role service_role");
  const reservation = await claim();
  assert.equal(reservation.ok, true);
  assert.deepEqual(await finish(reservation, [badge(1), badge(2, "emerald")]), {
    ok: true,
    count: 2,
  });
  await db.exec("set role anon");
  const profile = await rpc("pokeatlas_ra_profile", ["RetroTrainer"]);
  assert.equal(profile.last_error, false);
  assert.ok(profile.synced_at);
  assert.deepEqual(profile.badges, [badge(1), badge(2, "emerald")]);
});

test("RetroAchievements repair preserves saved badges, failed syncs and service-only access", async (t) => {
  const { db, account, claim, finish, rpc } = await fixture(t);
  await finish(await claim(), [badge(1)]);
  const repair = fs.readFileSync(
    path.join(
      __dirname,
      "../supabase/migrations/202610290022_retroachievements_save_fix.sql",
    ),
    "utf8",
  );
  await db.exec(repair);
  await db.exec(repair);
  assert.equal(
    (await rpc("pokeatlas_ra_profile", ["RetroTrainer"])).badges.length,
    1,
  );
  const nextClaim = async () => {
    await db.query(
      "update pokeatlas_private.ra_sync set synced_at=null, attempted_at=null, claim_until=now()-interval '1 minute' where account_id=$1",
      [account],
    );
    return claim();
  };
  assert.equal((await finish(await nextClaim(), [], true)).ok, true);
  let profile = await rpc("pokeatlas_ra_profile", ["RetroTrainer"]);
  assert.equal(profile.last_error, true);
  assert.deepEqual(profile.badges, [badge(1)]);
  assert.equal((await claim()).code, "rate_limited");

  const reservation = await nextClaim();
  assert.equal(
    (await finish(reservation, [{ ...badge(1), awarded: 99 }])).code,
    "invalid_input",
  );
  assert.deepEqual(
    (await rpc("pokeatlas_ra_profile", ["RetroTrainer"])).badges,
    [badge(1)],
  );
  assert.equal(
    (await finish({ ...reservation, claim: null }, [])).code,
    "stale",
  );
  await db.exec("set role authenticated");
  await assert.rejects(finish(reservation, []), /permission denied/);
  await db.exec("set role service_role");
  assert.equal((await finish(reservation, [])).ok, true);
  await db.exec("set role anon");
  profile = await rpc("pokeatlas_ra_profile", ["RetroTrainer"]);
  assert.deepEqual(profile.badges, []);
  assert.equal(profile.last_error, false);
});

function edgeHandler({ legacy = false, saveError = null } = {}) {
  let handler;
  const calls = [];
  const env = {
    RETROACHIEVEMENTS_WEB_API_KEY: "private-ra-key",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "private-legacy-key",
    SUPABASE_ANON_KEY: "legacy-public-key",
    ...(!legacy && {
      SUPABASE_SECRET_KEYS: JSON.stringify({ default: "private-new-key" }),
      SUPABASE_PUBLISHABLE_KEYS: JSON.stringify({ default: "new-public-key" }),
    }),
  };
  const createClient = (_url, key, options) => ({
    rpc: async (name, args) => {
      calls.push({ key, name, args, options });
      if (name === "pokeatlas_ra_claim")
        return {
          data: {
            ok: true,
            source_url: source,
            account_id: "account",
            claim: "reservation",
          },
          error: null,
        };
      if (name === "pokeatlas_ra_finish")
        return {
          data: saveError && !args.p_error ? null : { ok: true },
          error: args.p_error ? null : saveError,
        };
      throw Error("Unexpected RPC: " + name);
    },
  });
  const filename = path.join(
    __dirname,
    "../supabase/functions/retroachievements-sync/index.ts",
  );
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    reportDiagnostics: true,
  });
  assert.deepEqual(
    compiled.diagnostics,
    [],
    "Edge Function must have valid TypeScript syntax",
  );
  vm.runInNewContext(
    compiled.outputText,
    {
      exports: {},
      require: (name) => {
        assert.equal(name, "npm:@supabase/supabase-js@2");
        return { createClient };
      },
      Deno: {
        env: { get: (name) => env[name] },
        serve: (callback) => {
          handler = callback;
        },
      },
      URL,
      URLSearchParams,
      Request,
      Response,
      AbortSignal,
      TextDecoder,
      fetch: async () =>
        new Response(
          JSON.stringify([
            {
              GameID: 1,
              Title: "Pokémon Red Version",
              ConsoleID: 4,
              MaxPossible: 100,
              NumAwarded: 100,
              HardcoreMode: "1",
              ImageIcon: "/Images/000001.png",
            },
          ]),
        ),
    },
    { filename },
  );
  const invoke = async () => {
    const response = await handler(
      new Request("https://example.test/sync", {
        method: "POST",
        headers: { Authorization: "Bearer private-session" },
        body: JSON.stringify({ token: "private-account-token" }),
      }),
    );
    return { status: response.status, body: await response.json() };
  };
  return { invoke, calls };
}

for (const legacy of [false, true]) {
  test(`Edge Function syncs with ${legacy ? "legacy" : "modern"} project keys`, async () => {
    const { invoke, calls } = edgeHandler({ legacy });
    assert.deepEqual(await invoke(), {
      status: 200,
      body: { ok: true, cached: false, count: 1 },
    });
    assert.equal(calls[0].key, legacy ? "legacy-public-key" : "new-public-key");
    assert.equal(
      calls[0].options.global.headers.Authorization,
      "Bearer private-session",
    );
    assert.equal(
      calls[1].key,
      legacy ? "private-legacy-key" : "private-new-key",
    );
    assert.deepEqual(JSON.parse(JSON.stringify(calls[1].args.p_badges)), [
      badge(1),
    ]);
  });
}

test("Edge Function returns the database error code and releases the claim without exposing secrets", async () => {
  const { invoke, calls } = edgeHandler({
    saveError: { code: "42702", message: "Private database details" },
  });
  const result = await invoke();
  assert.deepEqual(result, {
    status: 400,
    body: {
      ok: false,
      code: "sync_failed",
      debug_stage: "database_save",
      debug_detail: "42702",
    },
  });
  assert.equal(calls.at(-1).args.p_error, true);
  assert.doesNotMatch(JSON.stringify(result), /private|Private/);
});
