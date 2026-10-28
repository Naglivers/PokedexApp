import { z } from "zod";
import { supabase } from "./supabase";
import { ensureCommunitySession } from "./community";
const analysisSchema = z.object({
  status: z.enum(["pending", "done", "error"]),
  pokemon_ids: z.array(z.number().int().positive()),
  reviewed: z.boolean(),
  updated_at: z.string(),
});
const messages: Record<string, string> = {
  setup: "Execute a query 014 no Supabase para ativar o fundo das cartas.",
  configuration:
    "Configure GEMINI_API_KEY na função tcg-background do Supabase.",
  forbidden: "Somente a conta administradora pode analisar ou corrigir cartas.",
  daily_limit: "O limite de 20 análises por dia foi atingido. Tente amanhã.",
  busy: "Esta carta já está sendo analisada. Aguarde um pouco.",
  no_image: "Esta carta ainda não tem uma imagem disponível para análise.",
  card_metadata:
    "O cadastro desta carta ainda não contém os dados necessários.",
  analysis_failed:
    "Não foi possível concluir a análise. Nenhuma identificação foi publicada.",
};
function failure(code: string) {
  return new Error(
    messages[code] ??
      "Não foi possível consultar o fundo da carta. Tente novamente.",
  );
}
async function rpc(name: string, params: Record<string, unknown>) {
  if (!supabase) throw failure("configuration");
  const { data, error } = await supabase
    .rpc(name, params)
    .abortSignal(AbortSignal.timeout(20000));
  if (error)
    throw failure(
      ["PGRST202", "42883", "42P01"].includes(error.code) ? "setup" : "network",
    );
  if (!data?.ok) throw failure(data?.code ?? "network");
  return data;
}
export async function getCardBackground(cardId: string, language: string) {
  const data = await rpc("pokeatlas_tcg_background_get", {
    p_card_id: cardId,
    p_language: language,
  });
  return analysisSchema.nullable().parse(data.analysis);
}
export async function analyzeCardBackground(
  token: string,
  cardId: string,
  language: string,
) {
  if (!supabase) throw failure("configuration");
  await ensureCommunitySession();
  const { data, error } = await supabase.functions.invoke("tcg-background", {
    body: { token, card_id: cardId, language },
  });
  if (error) {
    let code = "network";
    try {
      const response = await (error as { context?: Response }).context?.json();
      code = response?.code ?? code;
    } catch {
      /* Keep safe error. */
    }
    throw failure(code);
  }
  if (!data?.ok) throw failure(data?.code ?? "analysis_failed");
}
export async function correctCardBackground(
  token: string,
  cardId: string,
  language: string,
  ids: number[],
) {
  await ensureCommunitySession();
  await rpc("pokeatlas_tcg_background_correct", {
    p_token: token,
    p_card_id: cardId,
    p_language: language,
    p_pokemon_ids: ids,
  });
}
const backgroundCardSchema = z.object({
  id: z.string(),
  name: z.string(),
  localId: z.string(),
  language: z.string(),
  set_name: z.string(),
  image: z.string().nullish(),
  reviewed: z.boolean(),
});
export type BackgroundCard = z.infer<typeof backgroundCardSchema>;
export async function listBackgroundCards(
  pokemonId: number,
  languages: string[],
  page: number,
) {
  const data = await rpc("pokeatlas_tcg_background_list", {
    p_pokemon_id: pokemonId,
    p_languages: languages,
    p_page: page,
  });
  return z
    .object({
      cards: z.array(backgroundCardSchema),
      total: z.number().int().nonnegative(),
    })
    .parse(data);
}
