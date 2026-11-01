import { z } from "zod";

const integer = (max: number) => z.number().int().min(0).max(max);
const stats = z.object({
  hp: integer(65535),
  atk: integer(65535),
  def: integer(65535),
  spa: integer(65535),
  spd: integer(65535),
  spe: integer(65535),
});
export const pokemonEntrySchema = z.object({
  location: z.enum(["party", "box"]),
  boxIndex: integer(1023).nullable(),
  slotIndex: integer(127),
  species: z.number().int().min(1).max(20000),
  form: integer(255),
  nickname: z.string().max(100),
  level: z.number().int().min(1).max(100),
  gender: integer(2),
  isShiny: z.boolean(),
  isEgg: z.boolean(),
  nature: z.string().max(40),
  ability: integer(10000),
  heldItem: integer(100000),
  originalTrainer: z.string().max(100),
  trainerId: z.string().regex(/^\d{1,10}$/),
  personality: z.string().regex(/^[a-f0-9]{8}$/),
  encryptionConstant: z.string().regex(/^[a-f0-9]{8}$/),
  format: z.string().regex(/^[a-z0-9]{2,12}$/),
  rawData: z
    .string()
    .min(4)
    .max(32768)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/),
  ivs: stats,
  evs: stats,
  moves: z.array(integer(10000)).length(4),
  speciesName: z.string().max(100).optional(),
  abilityName: z.string().max(100).optional(),
  heldItemName: z.string().max(100).optional(),
  moveNames: z.array(z.string().max(100)).length(4).optional(),
});
export const snapshotSchema = z
  .object({
    schemaVersion: z.literal(1),
    fileHash: z.string().regex(/^[a-f0-9]{64}$/),
    sourceKey: z.string().regex(/^[a-f0-9]{64}$/),
    game: z.string().min(1).max(60),
    generation: z.number().int().min(1).max(20),
    trainerName: z.string().max(100),
    boxCount: integer(1024),
    slotsPerBox: z.number().int().min(1).max(128),
    boxNames: z.array(z.string().max(100)).max(1024),
    pokemon: z.array(pokemonEntrySchema).max(20000),
    warnings: z.array(z.string().max(500)).max(20),
  })
  .superRefine((value, context) => {
    if (value.boxNames.length !== value.boxCount)
      context.addIssue({ code: "custom", message: "Lista de boxes inválida." });
    const slots = new Set<string>();
    for (const entry of value.pokemon) {
      const valid =
        entry.location === "party"
          ? entry.boxIndex === null && entry.slotIndex < 6
          : entry.boxIndex !== null &&
            entry.boxIndex < value.boxCount &&
            entry.slotIndex < value.slotsPerBox;
      const key = `${entry.location}:${entry.boxIndex}:${entry.slotIndex}`;
      if (!valid || slots.has(key))
        context.addIssue({
          code: "custom",
          message: "Posição de Pokémon inválida ou repetida.",
        });
      slots.add(key);
    }
  });
export type PokemonEntry = z.infer<typeof pokemonEntrySchema>;
export type SaveSnapshot = z.infer<typeof snapshotSchema>;
export const saveSummarySchema = z.object({
  id: z.string().uuid(),
  game: z.string(),
  trainer_name: z.string(),
  pokemon_count: integer(20000),
  shiny_count: integer(20000),
  source_key: z.string(),
  imported_at: z.string(),
});
export type SaveSummary = z.infer<typeof saveSummarySchema>;
export const MAX_SAVE_BYTES = 64 * 1024 * 1024;
