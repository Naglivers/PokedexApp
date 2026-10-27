import part1 from "./moves-1.json";
import part2 from "./moves-2.json";
import part3 from "./moves-3.json";
import part4 from "./moves-4.json";

// PokeAPI/pokeapi data/v2/csv/moves.csv, revision 2bf639e5572812a67d2b94903fdcb9d095f5aeb2.
// Tuple: id, name, type, power, accuracy, pp, damage class, priority, generation.
type MoveRow = [
  number,
  string,
  number,
  number | null,
  number | null,
  number | null,
  number,
  number,
  number,
];
const typeNames: Record<number, string> = {
  "1": "normal",
  "2": "fighting",
  "3": "flying",
  "4": "poison",
  "5": "ground",
  "6": "rock",
  "7": "bug",
  "8": "ghost",
  "9": "steel",
  "10": "fire",
  "11": "water",
  "12": "grass",
  "13": "electric",
  "14": "psychic",
  "15": "ice",
  "16": "dragon",
  "17": "dark",
  "18": "fairy",
  "19": "stellar",
  "10001": "unknown",
  "10002": "shadow",
};
const categories: Record<number, string> = {
  "1": "status",
  "2": "physical",
  "3": "special",
};
export const moveIndex = (
  [...part1, ...part2, ...part3, ...part4] as MoveRow[]
).map(
  ([
    id,
    name,
    typeId,
    power,
    accuracy,
    pp,
    category,
    priority,
    generation,
  ]) => ({
    id,
    name,
    type: typeNames[typeId],
    power,
    accuracy,
    pp,
    category: categories[category],
    priority,
    generation,
  }),
);
export type MoveSummary = (typeof moveIndex)[number];
