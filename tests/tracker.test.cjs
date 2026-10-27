const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { createTrackerDatabase } = require("./helpers/tracker-database.cjs");

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
const {
  createTrackerBoxes,
  boxRange,
  trackerSprite,
  trackerName,
} = require("../src/features/tracker/boxes.ts");

test("national boxes use 30 species in numeric order, preserve the final partial box and use shiny sprites", () => {
  const species = Array.from({ length: 1025 }, (_, i) => ({
    name: "pokemon-" + (i + 1),
    url: "https://pokeapi.co/api/v2/pokemon-species/" + (i + 1) + "/",
  })).reverse();
  const boxes = createTrackerBoxes([
    ...species,
    species[0],
    { name: "invalid", url: "https://example.com/invalid/" },
  ]);
  assert.equal(boxes.length, 35);
  assert.equal(boxes[0].length, 30);
  assert.equal(boxRange(boxes[0]), "0001 - 0030");
  assert.equal(boxRange(boxes[1]), "0031 - 0060");
  assert.equal(boxRange(boxes.at(-1)), "1021 - 1025");
  assert.equal(boxes.flat().length, 1025);
  assert.match(trackerSprite(1, "pokedex"), /pokemon\/1.png$/);
  assert.match(trackerSprite(1, "shinydex"), /pokemon\/shiny\/1.png$/);
  assert.equal(trackerName("nidoran-f"), "Nidoran♀");
});

test("tracker SQL persists individual and whole-box marks with account, tracker and device isolation", async (t) => {
  const { db, device, secondDevice, asDevice, rpc } =
    await createTrackerDatabase();
  t.after(() => db.close());
  const sql = fs.readFileSync(
    path.join(__dirname, "../supabase/migrations/202610280003_dex_tracker.sql"),
    "utf8",
  );
  await db.exec(sql); // Reapplying the migration must not erase marks.
  await asDevice();
  const ash = (
    await rpc("pokeatlas_account_auth", ["TrackerAsh", "password-ash", true])
  ).session;
  const misty = (
    await rpc("pokeatlas_account_auth", [
      "TrackerMisty",
      "password-misty",
      true,
    ])
  ).session;
  const get = (token, kind = "pokedex") =>
    rpc("pokeatlas_tracker_get", [token, kind]);
  const set = (token, ids, caught, kind = "pokedex") =>
    rpc("pokeatlas_tracker_set", [token, kind, ids, caught]);
  const firstBox = Array.from({ length: 30 }, (_, i) => i + 1);
  assert.deepEqual((await get(ash.token)).pokemon_ids, []);
  assert.deepEqual((await set(ash.token, [1], true)).pokemon_ids, [1]);
  assert.deepEqual(
    (await get(ash.token)).pokemon_ids,
    [1],
    "fresh reads restore the saved marker",
  );
  assert.deepEqual(
    (await set(ash.token, [1, 1], true)).pokemon_ids,
    [1],
    "explicit desired state is idempotent",
  );
  assert.deepEqual(
    (await get(misty.token)).pokemon_ids,
    [],
    "another nickname cannot read Ash's collection",
  );
  assert.deepEqual(
    (await get(ash.token, "shinydex")).pokemon_ids,
    [],
    "normal and shiny are independent",
  );
  assert.deepEqual(
    (await set(ash.token, [25], true, "shinydex")).pokemon_ids,
    [25],
  );
  assert.deepEqual(
    (await set(ash.token, firstBox, true)).pokemon_ids,
    firstBox,
  );
  await set(ash.token, [31], true);
  assert.deepEqual(
    (await set(ash.token, firstBox, false)).pokemon_ids,
    [31],
    "clearing box one must preserve box two",
  );
  assert.deepEqual(
    (await get(ash.token, "shinydex")).pokemon_ids,
    [25],
    "clearing normal box must preserve shiny marks",
  );
  await set(misty.token, [1], false);
  assert.deepEqual((await get(ash.token)).pokemon_ids, [31]);
  for (const ids of [
    [],
    [0],
    [null],
    Array.from({ length: 31 }, (_, i) => i + 1),
  ]) {
    assert.equal((await set(ash.token, ids, true)).code, "invalid_input");
  }
  assert.equal(
    (await set(ash.token, [1], true, "gamesdex")).code,
    "invalid_input",
  );
  assert.equal((await get("f".repeat(64))).code, "session_expired");
  await assert.rejects(
    db.query("select * from pokeatlas_private.tracker_marks"),
    /permission denied/,
  );
  await assert.rejects(
    db.query(
      "insert into pokeatlas_private.tracker_marks values ($1, 'pokedex', 2, now())",
      [ash.user.id],
    ),
    /permission denied/,
  );
  await asDevice(secondDevice);
  assert.equal(
    (await set(ash.token, [31], false)).code,
    "session_expired",
    "another device cannot reuse a stolen token",
  );
  const ashOtherDevice = (
    await rpc("pokeatlas_account_auth", ["TrackerAsh", "password-ash", false])
  ).session;
  assert.deepEqual(
    (await get(ashOtherDevice.token)).pokemon_ids,
    [31],
    "same account restores the tracker on another device",
  );
  await set(ashOtherDevice.token, [31], false);
  await asDevice(device);
  assert.deepEqual(
    (await get(ash.token)).pokemon_ids,
    [],
    "the original device reads the updated server data",
  );
  await rpc("pokeatlas_account_logout", [ash.token]);
  assert.equal((await set(ash.token, [1], true)).code, "session_expired");
  await db.exec("reset role; set role anon;");
  await assert.rejects(get(misty.token), /permission denied/);
});
