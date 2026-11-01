const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createTrackerDatabase } = require("./helpers/tracker-database.cjs");
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
const { snapshotSchema } = require("../src/features/save-boxes/schema.ts");
function fixture(hash = "a") {
  const pk = {
    location: "box",
    boxIndex: 0,
    slotIndex: 0,
    species: 25,
    form: 0,
    nickname: "Sparky",
    level: 50,
    gender: 0,
    isShiny: true,
    isEgg: false,
    nature: "Hardy",
    ability: 9,
    heldItem: 0,
    originalTrainer: "Ash",
    trainerId: "123",
    personality: "00000001",
    encryptionConstant: "00000001",
    format: "pk3",
    rawData: "AAAA",
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    moves: [1, 2, 3, 4],
  };
  return {
    schemaVersion: 1,
    fileHash: hash.repeat(64),
    sourceKey: "b".repeat(64),
    game: "E",
    generation: 3,
    trainerName: "Ash",
    boxCount: 1,
    slotsPerBox: 30,
    boxNames: ["Box 1"],
    warnings: [],
    pokemon: [pk, { ...pk, slotIndex: 1 }],
  };
}
test("snapshot accepts identical Pokémon in different slots and rejects duplicate or out-of-range positions", () => {
  assert.equal(snapshotSchema.parse(fixture()).pokemon.length, 2);
  const duplicate = fixture();
  duplicate.pokemon[1].slotIndex = 0;
  assert.equal(snapshotSchema.safeParse(duplicate).success, false);
  const invalid = fixture();
  invalid.pokemon[0].boxIndex = 1;
  assert.equal(snapshotSchema.safeParse(invalid).success, false);
  const party = fixture();
  party.pokemon = [
    { ...party.pokemon[0], location: "party", boxIndex: null, slotIndex: 5 },
  ];
  assert.equal(snapshotSchema.safeParse(party).success, true);
  party.pokemon[0].slotIndex = 6;
  assert.equal(snapshotSchema.safeParse(party).success, false);
});
test("private storage, exact reimport, explicit replacement and rollback use real database migrations", async () => {
  const context = await createTrackerDatabase();
  const { db, rpc, asDevice, secondDevice } = context;
  try {
    await db.exec(
      fs.readFileSync(
        path.join(
          __dirname,
          "../supabase/migrations/202610310001_save_boxes.sql",
        ),
        "utf8",
      ),
    );
    await asDevice();
    const alice = (
      await rpc("pokeatlas_account_auth", ["BoxAlice", "secret-alice", true])
    ).session.token;
    const save = fixture();
    const imported = await rpc("pokeatlas_save_boxes_import", [
      alice,
      save,
      null,
    ]);
    assert.equal(imported.ok, true);
    assert.equal(imported.reused, false);
    const first = await rpc("pokeatlas_save_boxes_get", [alice, imported.id]);
    assert.deepEqual(first.snapshot.pokemon, save.pokemon);
    const duplicate = await rpc("pokeatlas_save_boxes_import", [
      alice,
      save,
      null,
    ]);
    assert.equal(duplicate.id, imported.id);
    assert.equal(duplicate.reused, true);
    assert.equal(
      (await rpc("pokeatlas_save_boxes_list", [alice])).saves.length,
      1,
    );
    const invalid = fixture("c");
    invalid.pokemon[1].slotIndex = 0;
    assert.equal(
      (await rpc("pokeatlas_save_boxes_import", [alice, invalid, imported.id]))
        .ok,
      false,
    );
    assert.equal(
      (await rpc("pokeatlas_save_boxes_get", [alice, imported.id])).snapshot
        .fileHash,
      save.fileHash,
    );
    const otherTrainer = fixture("c");
    otherTrainer.sourceKey = "d".repeat(64);
    assert.equal(
      (
        await rpc("pokeatlas_save_boxes_import", [
          alice,
          otherTrainer,
          imported.id,
        ])
      ).code,
      "different_save",
    );
    const updated = fixture("c");
    updated.pokemon = updated.pokemon.slice(0, 1);
    assert.equal(
      (await rpc("pokeatlas_save_boxes_import", [alice, updated, imported.id]))
        .id,
      imported.id,
    );
    assert.equal(
      (await rpc("pokeatlas_save_boxes_get", [alice, imported.id])).snapshot
        .pokemon.length,
      1,
    );
    await asDevice(secondDevice);
    const bob = (
      await rpc("pokeatlas_account_auth", ["BoxBob", "secret-bob", true])
    ).session.token;
    assert.equal(
      (await rpc("pokeatlas_save_boxes_list", [bob])).saves.length,
      0,
    );
    assert.equal(
      (await rpc("pokeatlas_save_boxes_get", [bob, imported.id])).code,
      "not_found",
    );
    assert.equal(
      (await rpc("pokeatlas_save_boxes_import", [bob, fixture(), imported.id]))
        .code,
      "not_found",
    );
    assert.equal(
      (await rpc("pokeatlas_save_boxes_list", [alice])).code,
      "session_expired",
    );
    await assert.rejects(
      db.query("select * from pokeatlas_private.save_box_pokemon"),
      /permission denied/,
    );
    await db.exec("reset role; set role anon");
    await assert.rejects(
      rpc("pokeatlas_save_boxes_list", [bob]),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
