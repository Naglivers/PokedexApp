const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PGlite } = require("@electric-sql/pglite");
const { pgcrypto } = require("@electric-sql/pglite/contrib/pgcrypto");

test("nickname accounts: optional fields, private profiles, session isolation, expiry and rate limiting", async (t) => {
  const db = new PGlite({ extensions: { pgcrypto } });
  t.after(() => db.close());
  await db.exec(
    "create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key);",
  );
  await db.exec(
    "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;",
  );
  const device = "00000000-0000-4000-8000-000000000001";
  const secondDevice = "00000000-0000-4000-8000-000000000002";
  await db.query("insert into auth.users values ($1), ($2)", [
    device,
    secondDevice,
  ]);
  const sql = fs.readFileSync(
    path.join(__dirname, "../supabase/migrations/202610280001_accounts.sql"),
    "utf8",
  );
  await db.exec(
    fs.readFileSync(
      path.join(__dirname, "../supabase/migrations/202610260001_community.sql"),
      "utf8",
    ),
  );
  await db.exec(sql);
  await db.exec(sql); // Safe to rerun without deleting accounts.
  const likesSql = fs.readFileSync(
    path.join(
      __dirname,
      "../supabase/migrations/202610280002_account_likes.sql",
    ),
    "utf8",
  );
  await db.exec(likesSql);
  await db.exec(likesSql);
  const owner = async () => db.exec("reset role");
  const asDevice = async (id = device) => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
      id,
    ]);
    await db.exec("set role authenticated");
  };
  const rpc = async (name, args) =>
    (
      await db.query(
        "select public." +
          name +
          "(" +
          args.map((_, i) => "$" + (i + 1)).join(",") +
          ") as value",
        args,
      )
    ).rows[0].value;
  await asDevice();
  const result = await rpc("pokeatlas_account_auth", [
    "Ash_01",
    "my-private-password",
    true,
  ]);
  assert.equal(result.ok, true);
  const first = result.session;
  assert.equal(first.user.nickname, "Ash_01");
  assert.equal(first.user.email, null);
  assert.equal(first.user.avatar_url, null);
  assert.match(first.token, /^[a-f0-9]{64}$/);
  assert.ok(!JSON.stringify(result).includes("my-private-password"));
  await owner();
  await db.query(
    "insert into public.pokeatlas_likes(user_id, pokemon_id) values ($1, 992)",
    [device],
  );
  await asDevice();
  assert.equal(
    (await rpc("pokeatlas_account_set_like", [first.token, 992, true])).ok,
    true,
  );
  await rpc("pokeatlas_account_set_like", [first.token, 992, true]);
  assert.deepEqual(
    (await rpc("pokeatlas_account_my_likes", [first.token])).likes,
    [992],
  );
  assert.equal((await rpc("pokeatlas_community_overview", [])).total_likes, 2);
  assert.deepEqual(
    (
      await db.query(
        "select * from public.pokeatlas_account_like_counts(array[992])",
      )
    ).rows,
    [{ pokemon_id: 992, total: 1 }],
  );
  await asDevice(secondDevice);
  assert.equal(
    (await rpc("pokeatlas_account_set_like", [first.token, 992, false])).code,
    "session_expired",
  );
  await asDevice();
  assert.equal(
    (await rpc("pokeatlas_account_set_like", [first.token, 992, false])).ok,
    true,
  );
  assert.deepEqual(
    (await rpc("pokeatlas_account_my_likes", [first.token])).likes,
    [],
  );
  assert.equal((await rpc("pokeatlas_community_overview", [])).total_likes, 1);
  await assert.rejects(
    db.query("select * from pokeatlas_private.account_likes"),
    /permission denied/,
  );
  const photo = "data:image/png;base64,iVBORw0KGgo=";
  const saved = await rpc("pokeatlas_account_save", [
    first.token,
    "ash@example.com",
    photo,
  ]);
  assert.equal(saved.user.email, "ash@example.com");
  assert.equal(saved.user.avatar_url, photo);
  assert.equal(
    (await rpc("pokeatlas_account_save", [first.token, "broken-email", null]))
      .code,
    "invalid_email",
  );
  assert.equal(
    (
      await rpc("pokeatlas_account_save", [
        first.token,
        "",
        "data:image/svg+xml;base64,PHN2Zz4=",
      ])
    ).code,
    "invalid_photo",
  );
  await assert.rejects(
    db.query("select * from pokeatlas_private.accounts"),
    /permission denied/,
  );
  await assert.rejects(
    db.query("select pokeatlas_private.profile_json($1)", [first.user.id]),
    /permission denied/,
  );
  assert.equal(
    (await rpc("pokeatlas_account_profile", ["f".repeat(64)])).code,
    "session_expired",
  );
  await asDevice(secondDevice);
  assert.equal(
    (await rpc("pokeatlas_account_profile", [first.token])).code,
    "session_expired",
    "tokens must be bound to the device identity",
  );
  assert.equal(
    (await rpc("pokeatlas_account_auth", ["ASH_01", "wrong-password", false]))
      .code,
    "invalid_credentials",
  );
  assert.equal(
    (
      await rpc("pokeatlas_account_auth", [
        "ash_01",
        "different-password",
        true,
      ])
    ).code,
    "nickname_taken",
  );
  const second = (
    await rpc("pokeatlas_account_auth", [
      "aSh_01",
      "my-private-password",
      false,
    ])
  ).session;
  assert.equal(second.user.id, first.user.id);
  assert.equal(second.user.email, "ash@example.com");
  assert.equal(second.user.avatar_url, photo);
  assert.equal(
    (await rpc("pokeatlas_account_save", [second.token, "", null])).user.email,
    null,
    "email remains optional",
  );
  await rpc("pokeatlas_account_logout", [second.token]);
  assert.equal(
    (await rpc("pokeatlas_account_profile", [second.token])).code,
    "session_expired",
  );
  await asDevice();
  assert.equal(
    (await rpc("pokeatlas_account_profile", [first.token])).ok,
    true,
    "another device signing out must not revoke this session",
  );
  await owner();
  const hashes = (
    await db.query("select password_hash from pokeatlas_private.accounts")
  ).rows;
  assert.match(hashes[0].password_hash, /^\$2/);
  assert.notEqual(hashes[0].password_hash, "my-private-password");
  await db.query(
    "update pokeatlas_private.sessions set expires_at = now() - interval '1 minute'",
  );
  await asDevice();
  assert.equal(
    (await rpc("pokeatlas_account_profile", [first.token])).code,
    "session_expired",
  );
  for (let i = 0; i < 22; i++)
    await rpc("pokeatlas_account_auth", ["Ash_01", "wrong-password", false]);
  assert.equal(
    (
      await rpc("pokeatlas_account_auth", [
        "Ash_01",
        "my-private-password",
        false,
      ])
    ).code,
    "rate_limited",
  );
  await owner();
  assert.ok(
    (
      await db.query(
        "select count from pokeatlas_private.attempts where key = $1",
        ["device:" + device],
      )
    ).rows[0].count > 20,
    "failed attempts are committed",
  );
  await db.query("select set_config('request.jwt.claim.sub', '', false)");
  await assert.rejects(
    rpc("pokeatlas_account_auth", ["Other", "strong-password", true]),
    /Authentication required/,
  );
  await db.exec("set role anon");
  await assert.rejects(
    rpc("pokeatlas_account_auth", ["Other", "strong-password", true]),
    /permission denied/,
  );
});
