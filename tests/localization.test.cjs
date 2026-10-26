const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const babel = require("@babel/core");
const path = require("node:path");
require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText, filename);
const { apiLanguages, resolveLocale } = require("../src/i18n/locale.ts");
const { localText } = require("../src/utils/pokemon.ts");
test("device language preference normalizes and maps PokeAPI Chinese and Japanese codes", () => {
  assert.equal(resolveLocale(["invalid locale", "pt_BR"]), "pt-BR");
  assert.ok(apiLanguages("zh-TW").includes("zh-Hant"));
  assert.ok(apiLanguages("zh-CN").includes("zh-Hans"));
  assert.ok(apiLanguages("ja-JP").includes("ja-Hrkt"));
  assert.equal(apiLanguages("es-MX").at(-1), "en");
});
test("PokeAPI descriptions prefer device language before English, without unrelated language fallback", () => {
  const entries = [
    { language: { name: "en" }, flavor_text: "English" },
    { language: { name: "es" }, flavor_text: "Español" },
    { language: { name: "fr" }, flavor_text: "Français" },
  ];
  assert.equal(localText(entries, "flavor_text", "es-MX"), "Español");
  assert.equal(localText(entries, "flavor_text", "fr-FR"), "Français");
  assert.equal(localText(entries, "flavor_text", "pt-BR"), "English");
});
test("localization transform routes only first-party native display components", () => {
  const transform = (filename) => babel.transformSync('import { Text, View, TextInput, Pressable } from "react-native"; const route = "/pokemon/25";', {
    configFile: false, babelrc: false, filename,
    plugins: [require("../scripts/babel-localization.cjs")],
  }).code;
  const app = transform(path.resolve("app/index.tsx"));
  assert.match(app, /i18n\/components/);
  assert.match(app, /import \{ View \} from "react-native"/);
  assert.match(app, /"\/pokemon\/25"/);
  assert.doesNotMatch(transform(path.resolve("node_modules/example/index.js")), /i18n\/components/);
  assert.doesNotMatch(transform(path.resolve("src/i18n/components.tsx")), /i18n\/components/);
});

test("bundled dictionaries translate UI, dynamic counts and official names in five languages", () => {
  const { translateLocal } = require("../src/i18n/translateLocal.ts");
  const { messages } = require("../src/i18n/catalog.ts");
  for (const row of messages) assert.ok(row.length === 5 && row.every((value) => typeof value === "string" && value.length));
  assert.equal(translateLocal("Visão geral", "en"), "Overview");
  assert.equal(translateLocal("Visão geral", "es"), "Resumen");
  assert.equal(translateLocal("Visão geral", "ja"), "概要");
  assert.equal(translateLocal("Visão geral", "zh-Hans"), "概览");
  assert.equal(translateLocal("Overview", "pt"), "Visão geral");
  assert.equal(translateLocal("25 Pokémon encontrados", "en"), "25 Pokémon found");
  assert.equal(translateLocal("Pokémon do tipo Fogo", "es"), "Pokémon de tipo Fuego");
  assert.equal(translateLocal("Pikachu", "ja"), "ピカチュウ");
  assert.equal(translateLocal("Pikachu", "zh-Hans"), "皮卡丘");
  assert.equal(translateLocal("Flamethrower", "es"), "Lanzallamas");
  assert.equal(translateLocal("Habilidade · 1 visitas", "ja"), "特性 · 1回閲覧");
  assert.equal(translateLocal("https://pokeapi.co/api/v2/pokemon/25/", "ja"), "https://pokeapi.co/api/v2/pokemon/25/");
  assert.equal(translateLocal("Uncatalogued description.", "pt"), "Uncatalogued description.");
});

test("manual preference selects API language and native descriptions before English effects", () => {
  const locale = require("../src/i18n/locale.ts");
  const { localDescription } = require("../src/utils/pokemon.ts");
  locale.setLanguagePreference("es");
  assert.equal(locale.currentLanguage(), "es");
  assert.equal(locale.apiLanguages()[0], "es");
  assert.equal(localDescription({ effect_entries: [{ language: { name: "en" }, short_effect: "English effect" }], flavor_text_entries: [{ language: { name: "es" }, flavor_text: "Texto español" }] }), "Texto español");
  locale.setLanguagePreference("zh-Hans");
  assert.equal(locale.currentLocale(), "zh-CN");
  locale.setLanguagePreference("auto");
});
