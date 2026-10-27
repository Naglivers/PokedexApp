import { z } from "zod";
import { supabase } from "./supabase";
import { ensureCommunitySession } from "./community";
const huntSchema = z.object({
  id: z.string().uuid(),
  game: z.string(),
  pokemon_id: z.number().int(),
  encounters: z.number().int().nonnegative(),
  revision: z.number().int(),
  found_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ShinyHunt = z.infer<typeof huntSchema>;
export type HuntInput = {
  action: "create" | "save" | "finish";
  id?: string;
  game?: string;
  pokemonId?: number;
  encounters: number;
  revision?: number;
};
async function rpc(token: string, input?: HuntInput) {
  if (!supabase) throw new Error("Configure o Supabase para usar o contador.");
  await ensureCommunitySession();
  const { data, error } = await supabase
    .rpc("pokeatlas_shiny_hunts", {
      p_token: token,
      p_action: input?.action ?? "list",
      p_id: input?.id ?? null,
      p_game: input?.game ?? null,
      p_pokemon_id: input?.pokemonId ?? null,
      p_encounters: input?.encounters ?? 0,
      p_revision: input?.revision ?? 0,
    })
    .abortSignal(AbortSignal.timeout(20000));
  if (error)
    throw new Error(
      ["PGRST202", "42883", "42P01"].includes(error.code)
        ? "Execute a query 013 do contador shiny no Supabase."
        : "Não foi possível salvar. Confira a conexão e tente novamente.",
    );
  if (!data?.ok)
    throw new Error(
      (
        {
          session_expired: "Sua sessão expirou. Entre novamente.",
          conflict:
            "Esta caça mudou em outro lugar. Recarregue as caças antes de continuar.",
          limit: "Você atingiu o limite de 500 caças.",
          rate_limited: "Aguarde alguns minutos antes de criar outra caça.",
        } as Record<string, string>
      )[data?.code] ?? "Não foi possível salvar esta caça.",
    );
  return data;
}
export async function listShinyHunts(token: string) {
  const data = await rpc(token);
  return z.array(huntSchema).parse(data.hunts);
}
export async function saveShinyHunt(token: string, input: HuntInput) {
  const data = await rpc(token, input);
  return huntSchema.parse(data.hunt);
}
