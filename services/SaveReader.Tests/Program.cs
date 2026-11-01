using PKHeX.Core;
using System.Text.Json;

static void Check(bool condition, string message) { if (!condition) throw new Exception(message); }
var save = new SAV3E();
save.OT = "BoxTest";
save.ID32 = 123456;
for (int box = 0; box < save.BoxCount; box++) save.SetBoxName(box, $"Box {box + 1}");
var pokemon = new PK3 { Species = 25, Nickname = "Sparky", OriginalTrainerName = "BoxTest", ID32 = save.ID32, PID = 42 };
pokemon.CurrentLevel = 50;
pokemon.RefreshChecksum();
save.SetBoxSlotAtIndex(pokemon, 0, 0, EntityImportSettings.None);
save.SetBoxSlotAtIndex(pokemon, 0, 1, EntityImportSettings.None);
save.SetPartySlotAtIndex(pokemon, 0, EntityImportSettings.None);
var bytes = new byte[SaveUtil.SIZE_G3RAW];
// A synthetic GBA save needs the sector layout normally written by the game.
for (int slot = 0; slot < 2; slot++) for (short sector = 0; sector < 14; sector++) {
 var offset = slot * 14 * 0x1000 + sector * 0x1000;
 System.Buffers.Binary.BinaryPrimitives.WriteInt16LittleEndian(bytes.AsSpan(offset + 0xFF4), sector);
 System.Buffers.Binary.BinaryPrimitives.WriteUInt32LittleEndian(bytes.AsSpan(offset + 0xFF8), 0x08012025);
}
save.Small[0x900] = 1; // distinguish Emerald's extended block from Ruby/Sapphire
save.Small[0xAC] = 42; // nonzero Emerald encryption key required for detection
save.WriteBothSaveSlots(bytes);
var snapshot = SaveDecoder.Decode(bytes);
Check(snapshot.Generation == 3, "Generation detection failed");
Check(snapshot.Game.Contains("Emerald", StringComparison.OrdinalIgnoreCase), "Game identification failed");
Check(snapshot.Pokemon.Count == 3, "Party and duplicate boxed Pokémon must be preserved");
Check(snapshot.Pokemon.Count(p => p.Location == "party") == 1, "Party position missing");
Check(snapshot.Pokemon.Count(p => p.Location == "box") == 2, "Box positions missing");
Check(snapshot.Pokemon.All(p => p.Species == 25 && p.Level == 50 && p.RawData.Length > 0), "Pokémon attributes missing");
Check(snapshot.FileHash == SaveDecoder.Decode(bytes).FileHash, "Identical saves must have the same hash");
bool rejected = false;
try { SaveDecoder.Decode(new byte[256]); } catch (InvalidDataException) { rejected = true; }
Check(rejected, "Random bytes must not be accepted as a save");
if (args.Length > 0) {
 Directory.CreateDirectory(args[0]);
 File.WriteAllBytes(Path.Combine(args[0], "synthetic-emerald.sav"), bytes);
 File.WriteAllText(Path.Combine(args[0], "synthetic-emerald.json"), JsonSerializer.Serialize(snapshot, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
}
Console.WriteLine("PASS: PKHeX save detection, party, duplicate Pokémon, attributes, hash and invalid file rejection.");
