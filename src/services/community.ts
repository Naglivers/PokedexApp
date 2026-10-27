import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { isTrackedPage } from "../features/community/trackedPages";

export type CommunityOverview = {
  likes: { pokemon_id: number; total: number }[];
  pages: { path: string; views: number }[];
  total_likes: number;
  total_visits: number;
};
export type LikeResult = { liked: boolean; total: number };
export class CommunityError extends Error {
  constructor(
    public code: "configuration" | "schema" | "auth" | "network",
    message: string,
    public backendCode?: string,
  ) {
    super(message);
    this.name = "CommunityError";
  }
}
function client() {
  if (!supabase)
    throw new CommunityError(
      "configuration",
      "A comunidade ainda não está configurada.",
    );
  return supabase;
}
function fail(error: { message?: string; code?: string }, auth = false): never {
  if (error.code === "PGRST202" || error.code === "42P01")
    throw new CommunityError(
      "schema",
      "A comunidade ainda está em preparação.",
      error.code,
    );
  throw new CommunityError(
    auth ? "auth" : "network",
    auth
      ? "Não foi possível iniciar sua sessão na comunidade."
      : "A comunidade está indisponível. Tente novamente mais tarde.",
    error.code,
  );
}
export async function getCommunityOverview(): Promise<CommunityOverview> {
  const { data, error } = await client().rpc("pokeatlas_community_overview");
  if (error) fail(error);
  if (!data || !Array.isArray(data.likes) || !Array.isArray(data.pages))
    throw new CommunityError("schema", "Resposta da comunidade inválida.");
  return data as CommunityOverview;
}
let sessionRequest: Promise<Session> | null = null;
export function ensureCommunitySession(): Promise<Session> {
  if (sessionRequest) return sessionRequest;
  sessionRequest = (async () => {
    const service = client();
    const existing = await service.auth.getSession();
    if (existing.error) fail(existing.error, true);
    if (existing.data.session) return existing.data.session;
    const result = await service.auth.signInAnonymously();
    if (result.error) fail(result.error, true);
    if (!result.data.session) throw new CommunityError("auth", "Sua sessão não pôde ser iniciada.");
    return result.data.session;
  })().finally(() => {
    sessionRequest = null;
  });
  return sessionRequest;
}
export async function getMyLikes(): Promise<number[]> {
  const session = await ensureCommunitySession();
  const { data, error } = await client()
    .from("pokeatlas_likes")
    .select("pokemon_id")
    .eq("user_id", session.user.id);
  if (error) fail(error);
  return (data ?? []).map((row) => Number(row.pokemon_id));
}
export async function getLikeCounts(
  ids: number[],
): Promise<Record<number, number>> {
  if (!ids.length) return {};
  const { data, error } = await client().rpc("pokeatlas_like_counts", {
    p_pokemon_ids: ids,
  });
  if (error) fail(error);
  return Object.fromEntries(
    (data ?? []).map((row: { pokemon_id: number; total: number }) => [
      row.pokemon_id,
      Number(row.total),
    ]),
  );
}
export async function setPokemonLike(
  id: number,
  liked: boolean,
): Promise<LikeResult> {
  await ensureCommunitySession();
  const { data, error } = await client().rpc("pokeatlas_set_like", {
    p_pokemon_id: id,
    p_liked: liked,
  });
  if (error) fail(error);
  return data as LikeResult;
}
export async function trackPage(path: string): Promise<void> {
  if (!isTrackedPage(path)) return;
  await ensureCommunitySession();
  const { error } = await client().rpc("pokeatlas_track_page", {
    p_path: path,
  });
  if (error) fail(error);
}
