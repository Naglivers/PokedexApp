import type { NamedResource } from "../../services/api";
import { idFromUrl } from "../../services/api";
import type { TrackerKind } from "../../services/tracker";

export const BOX_SIZE = 30;
export type BoxPokemon = { id: number; name: string };
export function createTrackerBoxes(species: NamedResource[]): BoxPokemon[][] {
  const entries = new Map<number, BoxPokemon>();
  for (const record of species) {
    const id = Number(idFromUrl(record.url));
    if (Number.isInteger(id) && id > 0 && id <= 20000)
      entries.set(id, { id, name: record.name });
  }
  const sorted = [...entries.values()].sort((a, b) => a.id - b.id);
  return Array.from({ length: Math.ceil(sorted.length / BOX_SIZE) }, (_, i) =>
    sorted.slice(i * BOX_SIZE, (i + 1) * BOX_SIZE),
  );
}
export const dexNumber = (id: number) => String(id).padStart(4, "0");
export function boxRange(box: BoxPokemon[]) {
  return box.length
    ? `${dexNumber(box[0].id)} - ${dexNumber(box[box.length - 1].id)}`
    : "";
}
export function trackerName(name: string) {
  const special: Record<string, string> = {
    "nidoran-f": "Nidoran♀",
    "nidoran-m": "Nidoran♂",
    "mr-mime": "Mr. Mime",
    "mime-jr": "Mime Jr.",
    "mr-rime": "Mr. Rime",
    farfetchd: "Farfetch’d",
    sirfetchd: "Sirfetch’d",
    "type-null": "Type: Null",
    "ho-oh": "Ho-Oh",
  };
  return (
    special[name] ??
    name
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}
export function trackerSprite(id: number, kind: TrackerKind) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${kind === "shinydex" ? "shiny/" : ""}${id}.png`;
}
