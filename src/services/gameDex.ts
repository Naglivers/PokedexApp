import catalog from "../features/tracker/gameCatalog.json";
import { getResource, idFromUrl, type NamedResource } from "./api";
import { BOX_SIZE, type BoxPokemon } from "../features/tracker/boxes";
import {
  obtainablePokemon,
  gameSpeciesNames,
} from "../features/tracker/gameAvailability";

export type GamePokedex = { key: string; title: string; total: number };
export type TrackerGame = {
  key: string;
  title: string;
  dexes: GamePokedex[];
  total: number;
  versions: string[];
  parentGame?: string;
};
export const trackerGames: TrackerGame[] = catalog;
export function resolveTrackerGame(key?: string) {
  return trackerGames.find(
    (game) => game.key === key || game.versions.includes(key ?? ""),
  );
}
type PokedexResponse = {
  pokemon_entries: { entry_number: number; pokemon_species: NamedResource }[];
};

export async function getGamePokedex(
  key: string,
  signal?: AbortSignal,
  gameKey?: string,
): Promise<BoxPokemon[][]> {
  const allowedIds = gameKey ? obtainablePokemon[gameKey] : undefined;
  if (!allowedIds?.length)
    throw new Error(
      "Não encontramos a lista de obtenção normal deste conjunto.",
    );
  const allowed = new Set(allowedIds);
  const readRegionalDex = async (dexKey: string): Promise<BoxPokemon[]> => {
    const dex = await getResource<PokedexResponse>("pokedex", dexKey, signal);
    if (!Array.isArray(dex.pokemon_entries) || !dex.pokemon_entries.length)
      throw new Error("Não foi possível carregar a Pokédex deste jogo.");
    return [...dex.pokemon_entries]
      .sort((a, b) => a.entry_number - b.entry_number)
      .map((entry) => ({
        id: Number(idFromUrl(entry.pokemon_species.url)),
        name: entry.pokemon_species.name,
        dexNumber: entry.entry_number,
      }))
      .filter((entry) => allowed.has(entry.id));
  };
  if (key === "obtainable") {
    const game = trackerGames.find((item) => item.key === gameKey);
    const regionalDexes = await Promise.all(
      (game?.dexes ?? [])
        .filter((dex) => dex.key !== "obtainable")
        .map((dex) => readRegionalDex(dex.key)),
    );
    const ordered = new Map<number, BoxPokemon>();
    for (const entry of regionalDexes.flat()) {
      if (!ordered.has(entry.id)) ordered.set(entry.id, entry);
    }
    // Species without a regional entry follow the game's dex in National order.
    // Keep their National numbers instead of inventing regional dex numbers.
    for (const id of allowedIds) {
      if (!ordered.has(id))
        ordered.set(id, { id, name: gameSpeciesNames[String(id)] });
    }
    const entries = [...ordered.values()];
    return Array.from(
      { length: Math.ceil(entries.length / BOX_SIZE) },
      (_, index) => entries.slice(index * BOX_SIZE, (index + 1) * BOX_SIZE),
    );
  }
  const entries = await readRegionalDex(key);
  if (
    entries.some(
      (entry) =>
        !Number.isInteger(entry.id) ||
        entry.id < 1 ||
        !Number.isInteger(entry.dexNumber),
    )
  )
    throw new Error("A Pokédex retornou dados inválidos.");
  return Array.from(
    { length: Math.ceil(entries.length / BOX_SIZE) },
    (_, index) => entries.slice(index * BOX_SIZE, (index + 1) * BOX_SIZE),
  );
}
