import { messages, templates } from "./catalog";
import { apiMessages } from "./apiCatalog";
import type { Language } from "./locale";
import officialNames from "./officialNames.json";
const languages: Language[] = ["pt", "en", "es", "ja", "zh-Hans"];
const normalize = (text: string) => text.replace(/[\f\r\n]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
const dictionaries = new Map<string, string[]>();
for (const row of [...messages, ...apiMessages]) for (const text of row.slice(0, 2))
  if (!dictionaries.has(normalize(text))) dictionaries.set(normalize(text), row);
const patterns = templates.map((row) => {
  const names: string[] = [];
  const chunks = row[0].split(/(\{\w+\})/).map((part) => {
    if (/^\{\w+\}$/.test(part)) { const name = part.slice(1, -1); names.push(name); return name === "n" ? "([0-9][0-9., ]*)" : "(.+?)"; }
    return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  });
  return { regex: new RegExp(`^${chunks.join("")}$`, "i"), names, row };
}).sort((a, b) => Number(a.row[0].startsWith("{name}")) - Number(b.row[0].startsWith("{name}")));
const resourceNames = new Map<string, Partial<Record<Language, string>>>();
export function registerNames(data: unknown) {
  if (!data || typeof data !== "object") return;
  const record = data as { name?: string; names?: { name: string; language: { name: string } }[] };
  if (!record.name || !Array.isArray(record.names)) return;
  const names: Partial<Record<Language, string>> = {};
  for (const entry of record.names) {
    const lang = entry.language.name;
    if (languages.includes(lang as Language)) names[lang as Language] = entry.name;
    if (lang === "ja-Hrkt" && !names.ja) names.ja = entry.name;
  }
  resourceNames.set(normalize(record.name.replace(/-/g, " ")), names);
  if (names.en) resourceNames.set(normalize(names.en), names);
}
export function translateLocal(text: string, language: Language, depth = 0): string {
  if (depth > 3 || !text.trim() || /^(https?:\/\/|\/)/.test(text.trim())) return text;
  const trimmed = text.trim();
  const index = languages.indexOf(language);
  const key = normalize(text);
  const bundled = (officialNames as Record<string, Partial<Record<Language, string>>>)[key];
  let result = dictionaries.get(key)?.[index] ?? resourceNames.get(key)?.[language] ?? bundled?.[language];
  if (!result) for (const pattern of patterns) {
    const match = trimmed.match(pattern.regex);
    if (!match) continue;
    result = pattern.row[index].replace(/\{(\w+)\}/g, (_, name: string) => {
      const value = match[pattern.names.indexOf(name) + 1];
      return name === "n" ? value : translateLocal(value, language, depth + 1).trim();
    });
    break;
  }
  if (!result && /[·:]/.test(trimmed)) result = trimmed.split(/(\s*·\s*|:\s*)/).map((part) => /[·:]/.test(part) ? part : translateLocal(part, language, depth + 1)).join("");
  if (!result && /\n/.test(text)) result = text.split(/(\n)/).map((part) => part === "\n" ? part : translateLocal(part, language, depth + 1)).join("").trim();
  if (!result && /[.!?]\s+\p{L}/u.test(trimmed)) result = trimmed.split(/(?<=[.!?])(\s+)(?=\p{L})/u).map((part) => translateLocal(part, language, depth + 1)).join("");
  if (!result) return text;
  return text.slice(0, text.length - text.trimStart().length) + result + text.slice(text.trimEnd().length);
}
