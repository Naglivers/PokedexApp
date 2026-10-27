import catalog from "./megaCatalog.json";
import { BOX_SIZE, type BoxPokemon } from "./boxes";

// PokéAPI pokemon.csv, revision 2bf639e5572812a67d2b94903fdcb9d095f5aeb2.
// Form IDs remain distinct, including X/Y/Z and cosmetic Mega variants.
export const megaPokemon: BoxPokemon[] = catalog;
export const megaIds = new Set(megaPokemon.map((pokemon) => pokemon.id));
export const megaTotal = megaPokemon.length;
export function createMegaBoxes(): BoxPokemon[][] {
  return Array.from({ length: Math.ceil(megaTotal / BOX_SIZE) }, (_, index) =>
    megaPokemon.slice(index * BOX_SIZE, (index + 1) * BOX_SIZE),
  );
}
