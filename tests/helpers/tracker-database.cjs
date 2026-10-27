const fs = require("node:fs");
const path = require("node:path");
const { PGlite } = require("@electric-sql/pglite");
const { pgcrypto } = require("@electric-sql/pglite/contrib/pgcrypto");

async function createTrackerDatabase() {
  const db = new PGlite({ extensions: { pgcrypto } });
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
  for (const file of [
    "202610260001_community.sql",
    "202610280001_accounts.sql",
    "202610280002_account_likes.sql",
    "202610280003_dex_tracker.sql",
    "202610280004_complete_tracker.sql",
  ]) {
    await db.exec(
      fs.readFileSync(
        path.join(__dirname, "../../supabase/migrations", file),
        "utf8",
      ),
    );
  }
  const asDevice = async (id = device) => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
      id,
    ]);
    await db.exec("set role authenticated");
  };
  const rpc = async (name, args = []) => {
    if (!/^pokeatlas_[a-z_]+$/.test(name)) throw Error("Invalid test function");
    return (
      await db.query(
        "select public." +
          name +
          "(" +
          args.map((_, i) => "$" + (i + 1)).join(",") +
          ") as value",
        args,
      )
    ).rows[0].value;
  };
  return { db, device, secondDevice, asDevice, rpc };
}
module.exports = { createTrackerDatabase };
