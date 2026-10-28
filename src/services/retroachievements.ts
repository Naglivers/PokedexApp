import { z } from "zod";
import { supabase } from "./supabase";
import { ensureCommunitySession } from "./community";
const schema = z.object({
  linked: z.boolean(),
  source_url: z.string().nullable(),
  synced_at: z.string().nullable(),
  last_error: z.boolean(),
  badges: z.array(
    z.object({
      ra_game_id: z.number().int().positive(),
      game: z.string(),
      title: z.string(),
      versions: z.array(z.string()),
      image: z
        .string()
        .regex(/^\/Images\/[0-9]+\.png$/)
        .nullable(),
      mode: z.enum(["softcore", "hardcore"]),
      total: z.number().int().positive(),
      awarded: z.number().int().positive(),
    }),
  ),
});
export type RetroProfile = z.infer<typeof schema> & { sync_error?: string };
const messages: Record<string, string> = {
  configuration:
    "Configure a chave da API na função retroachievements-sync do Supabase.",
  setup: "Execute a query 020 e publique a função retroachievements-sync.",
  session_expired: "Sua sessão expirou. Entre novamente.",
  not_linked:
    "Salve o link do seu perfil RetroAchievements nos códigos de amizade.",
  busy: "Uma sincronização já está em andamento. Aguarde um momento.",
  rate_limited: "Aguarde dois minutos antes de tentar novamente.",
  sync_failed:
    "O RetroAchievements não pôde ser consultado. As badges salvas foram preservadas.",
};
export async function getRetroProfile(
  nickname: string,
  signal?: AbortSignal,
): Promise<RetroProfile> {
  if (!supabase)
    throw new Error("Configure o Supabase para acessar o RetroAchievements.");
  const { data, error } = await supabase
    .rpc("pokeatlas_ra_profile", { p_nickname: nickname })
    .abortSignal(signal ?? AbortSignal.timeout(20000));
  if (error)
    throw new Error(
      ["PGRST202", "42883", "42P01"].includes(error.code)
        ? messages.setup
        : "Não foi possível carregar as badges do RetroAchievements.",
    );
  if (!data?.ok) throw new Error("Perfil não encontrado.");
  return schema.parse(data);
}
export async function syncRetroProfile(token: string) {
  if (!supabase) throw new Error("Configure o Supabase para sincronizar.");
  await ensureCommunitySession();
  const { data, error } = await supabase.functions.invoke(
    "retroachievements-sync",
    { body: { token } },
  );
  if (error) {
    let code = "";
    try {
      code = (await error.context?.json())?.code ?? "";
    } catch {}
    throw new Error(
      messages[code] ??
        "Não foi possível sincronizar. Verifique a publicação da função retroachievements-sync.",
    );
  }
  if (!data?.ok)
    throw new Error(messages[data?.code] ?? "Não foi possível sincronizar.");
  return data as { ok: true; cached?: boolean; count?: number };
}
