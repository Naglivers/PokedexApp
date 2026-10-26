import axios from "axios";
import { registerNames } from "../i18n/translateLocal";

export const BASE = "https://pokeapi.co/api/v2/";
export const api = axios.create({ baseURL: BASE, timeout: 20000 });
export type NamedResource = { name: string; url: string };
export type ApiList<T = NamedResource> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};
export type Names = { name: string; language: NamedResource }[];
export type SpriteTree = { [key: string]: string | SpriteTree | null };
export type PokemonDetail = {
  id: number;
  name: string;
  height: number;
  weight: number;
  base_experience: number | null;
  is_default: boolean;
  sprites: {
    front_default: string | null;
    front_shiny: string | null;
    back_default: string | null;
    back_shiny: string | null;
    other?: {
      "official-artwork"?: {
        front_default: string | null;
        front_shiny: string | null;
      };
    };
    versions?: SpriteTree;
  };
  types: { slot: number; type: NamedResource }[];
  abilities: { is_hidden: boolean; ability: NamedResource }[];
  stats: { base_stat: number; effort: number; stat: NamedResource }[];
  species: NamedResource;
  forms: NamedResource[];
  moves: {
    move: NamedResource;
    version_group_details: {
      level_learned_at: number;
      move_learn_method: NamedResource;
      version_group: NamedResource;
    }[];
  }[];
  location_area_encounters: string;
};
export type Species = {
  id: number;
  name: string;
  names: Names;
  color: NamedResource;
  shape: NamedResource | null;
  habitat: NamedResource | null;
  generation: NamedResource;
  capture_rate: number;
  base_happiness: number;
  gender_rate: number;
  growth_rate: NamedResource;
  egg_groups: NamedResource[];
  is_baby: boolean;
  is_legendary: boolean;
  is_mythical: boolean;
  evolution_chain: { url: string } | null;
  genera: { genus: string; language: NamedResource }[];
  varieties: { is_default: boolean; pokemon: NamedResource }[];
  flavor_text_entries: {
    flavor_text: string;
    language: NamedResource;
    version: NamedResource;
  }[];
};
export type EvolutionNode = {
  species: NamedResource;
  evolves_to: EvolutionNode[];
  evolution_details: Record<string, unknown>[];
};
export type EvolutionChain = { id: number; chain: EvolutionNode };
export type DamageRelations = {
  double_damage_from: NamedResource[];
  half_damage_from: NamedResource[];
  no_damage_from: NamedResource[];
  double_damage_to: NamedResource[];
  half_damage_to: NamedResource[];
  no_damage_to: NamedResource[];
};
export type TypeDetail = {
  id: number;
  name: string;
  damage_relations: DamageRelations;
  pokemon: { pokemon: NamedResource; slot: number }[];
  moves: NamedResource[];
};
export type GenericResource = {
  id?: number;
  name?: string;
  names?: Names;
  [key: string]: unknown;
};

let active = 0;
const pending: (() => void)[] = [];
async function limited<T>(task: () => Promise<T>): Promise<T> {
  if (active >= 6) await new Promise<void>((resolve) => pending.push(resolve));
  active++;
  try {
    return await task();
  } finally {
    active--;
    pending.shift()?.();
  }
}
export function idFromUrl(url: string) {
  return url.match(/\/(\d+)\/?(?:\?.*)?$/)?.[1] ?? "";
}
export function resourceFromUrl(url: string) {
  return url.match(/\/api\/v2\/([^/]+)\//)?.[1] ?? "";
}
export function spriteUrl(id: string | number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}
export async function getResourceList(
  resource: string,
  limit = 24,
  offset = 0,
  signal?: AbortSignal,
): Promise<ApiList> {
  if (!/^[a-z-]+$/.test(resource) || limit < 1 || offset < 0)
    throw new Error("Parâmetros de consulta inválidos.");
  return limited(async () => {
    const { data } = await api.get<ApiList<{ name?: string; url: string }>>(
      `${resource}/`,
      { params: { limit, offset }, signal },
    );
    if (!Array.isArray(data.results))
      throw new Error("A API retornou uma lista inválida.");
    return {
      ...data,
      results: data.results.map((record) => ({
        ...record,
        name: record.name ?? `#${idFromUrl(record.url)}`,
      })),
    };
  });
}
export async function getResource<T = GenericResource>(
  resource: string,
  id: string | number,
  signal?: AbortSignal,
): Promise<T> {
  const name = String(id).trim().toLowerCase().replace(/^#/, "");
  if (!/^[a-z-]+$/.test(resource) || !/^[a-z0-9-]+$/.test(name))
    throw new Error("Informe um nome ou número válido.");
  return limited(async () => {
    const { data } = await api.get<T>(`${resource}/${encodeURIComponent(name)}/`, { signal });
    registerNames(data);
    return data;
  });
}
export async function getByUrl<T = GenericResource>(
  url: string,
  signal?: AbortSignal,
): Promise<T> {
  if (!url.startsWith(BASE)) throw new Error("Link da PokéAPI inválido.");
  return limited(async () => {
    const { data } = await api.get<T>(url, { signal });
    registerNames(data);
    return data;
  });
}
export async function getResourceCatalog(
  signal?: AbortSignal,
): Promise<Record<string, string>> {
  return limited(
    async () => (await api.get<Record<string, string>>("", { signal })).data,
  );
}
export const getPokemon = (id: string | number, signal?: AbortSignal) =>
  getResource<PokemonDetail>("pokemon", id, signal);
export const getSpecies = (id: string | number, signal?: AbortSignal) =>
  getResource<Species>("pokemon-species", id, signal);
export const getEvolutionChain = (id: string | number, signal?: AbortSignal) =>
  getResource<EvolutionChain>("evolution-chain", id, signal);
