// Mechanical import of official PokeAPI names, available without a runtime service.
const fs = require("node:fs");
const path = require("node:path");
const base = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/";
function parse(text) {
  const rows = []; let row = [], value = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') { if (quoted && text[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted; }
    else if (!quoted && (char === "," || char === "\n")) {
      row.push(value.replace(/\r$/, "")); value = "";
      if (char === "\n") { rows.push(row); row = []; }
    } else value += char;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  const header = rows.shift();
  return rows.filter((entry) => entry.length === header.length).map((entry) => Object.fromEntries(header.map((name, i) => [name, entry[i]])));
}
async function csv(file) {
  const response = await fetch(base + file, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  return parse(await response.text());
}
async function main() {
  const output = {};
  const languages = { "1": "ja", "7": "es", "9": "en", "11": "ja", "12": "zh-Hans" };
  for (const [entities, translations, idField] of [
    ["pokemon_species.csv", "pokemon_species_names.csv", "pokemon_species_id"],
    ["moves.csv", "move_names.csv", "move_id"],
    ["abilities.csv", "ability_names.csv", "ability_id"],
    ["items.csv", "item_names.csv", "item_id"],
  ]) {
    const [records, names] = await Promise.all([csv(entities), csv(translations)]);
    const byId = new Map(records.map((record) => [record.id, record.identifier.replace(/-/g, " ").toLowerCase()]));
    const localized = new Map();
    for (const entry of names) {
      const lang = languages[entry.local_language_id]; const id = entry[idField];
      if (!lang || !byId.has(id)) continue;
      if (!localized.has(id)) localized.set(id, {});
      localized.get(id)[lang] = entry.name;
    }
    for (const [id, names] of localized) {
      output[byId.get(id)] = names;
      if (names.en) output[names.en.toLowerCase()] = names;
    }
  }
  fs.writeFileSync(path.resolve(__dirname, "../src/i18n/officialNames.json"), JSON.stringify(output));
  console.log(`Imported ${Object.keys(output).length} localized names from PokeAPI.`);
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
