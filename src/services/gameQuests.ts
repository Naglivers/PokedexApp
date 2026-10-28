import { z } from "zod";
import { supabase } from "./supabase";
import { ensureCommunitySession } from "./community";

const quest = z.object({
  id: z.string(),
  title: z.string(),
  category: z.enum(["story", "postgame", "side"]),
  note: z.string().nullable(),
  completed: z.boolean(),
});
const checklist = z.object({
  game: z.string(),
  title: z.string(),
  reviewed: z.boolean(),
  source: z.string().nullable(),
  side_source: z.string().nullable(),
  total: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  badge: z.boolean(),
  earned_at: z.string().nullable(),
  quests: z.array(quest),
});
export type GameQuest = z.infer<typeof quest>;
export type QuestlineData = z.infer<typeof checklist>;
export type QuestAction = { action: "set"; id: string; completed: boolean };

function failure(code?: string) {
  return new Error(
    (
      {
        session_expired: "Sua sessão expirou. Entre novamente.",
        not_found: "A checklist deste jogo ainda não foi cadastrada.",
        invalid_input: "Esta missão não pertence à checklist deste jogo.",
      } as Record<string, string>
    )[code ?? ""] ?? "Não foi possível salvar a Questline. Tente novamente.",
  );
}
function backendError(code: string) {
  return new Error(
    ["PGRST202", "42883", "42P01"].includes(code)
      ? "Execute as queries 017 e 018 para ativar a nova Questline no Supabase."
      : "Não foi possível acessar a Questline. Tente novamente.",
  );
}
export async function gameQuests(
  token: string | null,
  game: string,
  input?: QuestAction,
  signal?: AbortSignal,
): Promise<QuestlineData> {
  if (!supabase)
    throw new Error("Configure o Supabase para acessar a Questline.");
  if (token) await ensureCommunitySession();
  const { data, error } = await supabase
    .rpc("pokeatlas_questline", {
      p_game: game,
      p_token: token,
      p_action: input?.action ?? "list",
      p_quest_id: input?.id ?? null,
      p_completed: input?.completed ?? null,
    })
    .abortSignal(signal ?? AbortSignal.timeout(20000));
  if (error) throw backendError(error.code);
  if (!data?.ok) throw failure(data?.code);
  return checklist.parse(data);
}
const badgeSchema = z.object({
  game: z.string(),
  title: z.string(),
  versions: z.array(z.string()),
  total: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  reviewed: z.boolean(),
  badge: z.boolean(),
  earned_at: z.string().nullable(),
});
export type QuestBadge = z.infer<typeof badgeSchema>;
export async function publicQuestBadges(
  nickname: string,
  signal?: AbortSignal,
): Promise<QuestBadge[]> {
  if (!supabase)
    throw new Error("Configure o Supabase para acessar as insígnias.");
  const { data, error } = await supabase
    .rpc("pokeatlas_public_quest_badges", {
      p_nickname: nickname,
    })
    .abortSignal(signal ?? AbortSignal.timeout(20000));
  if (error) throw backendError(error.code);
  if (!data?.ok) throw failure(data?.code);
  return z.array(badgeSchema).parse(data.games);
}
