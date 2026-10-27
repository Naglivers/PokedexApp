import { AccountError } from "./account";
import { ensureCommunitySession } from "./community";
import { supabase } from "./supabase";

export type TrackerKind = "pokedex" | "shinydex";
async function trackerRpc(
  name: string,
  params: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<number[]> {
  if (!supabase)
    throw new AccountError(
      "configuration",
      "O tracker ainda não está disponível.",
    );
  await ensureCommunitySession();
  const { data, error } = await supabase
    .rpc(name, params)
    .abortSignal(signal ?? AbortSignal.timeout(20000));
  if (error) {
    if (["PGRST202", "42883", "42P01"].includes(error.code)) {
      throw new AccountError(
        "setup",
        "O tracker ainda não está disponível. Tente novamente mais tarde.",
      );
    }
    throw new AccountError(
      "network",
      "Não foi possível sincronizar seu tracker. Verifique sua conexão e tente novamente.",
    );
  }
  if (!data?.ok) {
    throw new AccountError(
      data?.code ?? "network",
      data?.code === "session_expired"
        ? "Sua sessão expirou. Entre novamente para salvar seu tracker."
        : "Não foi possível salvar essa marcação. Tente novamente.",
    );
  }
  if (
    !Array.isArray(data.pokemon_ids) ||
    !data.pokemon_ids.every(
      (id: unknown) =>
        Number.isInteger(id) && Number(id) > 0 && Number(id) <= 20000,
    )
  ) {
    throw new AccountError(
      "network",
      "O tracker retornou uma resposta inválida. Tente novamente.",
    );
  }
  return [...new Set<number>(data.pokemon_ids)].sort((a, b) => a - b);
}
export function getTracker(
  token: string,
  tracker: TrackerKind,
  signal?: AbortSignal,
) {
  return trackerRpc(
    "pokeatlas_tracker_get",
    { p_token: token, p_tracker: tracker },
    signal,
  );
}
export function setTrackerMarks(
  token: string,
  tracker: TrackerKind,
  pokemonIds: number[],
  caught: boolean,
) {
  if (
    !pokemonIds.length ||
    pokemonIds.length > 30 ||
    !pokemonIds.every((id) => Number.isInteger(id) && id >= 1 && id <= 20000)
  ) {
    throw new AccountError(
      "invalid_input",
      "Selecione de 1 a 30 Pokémon válidos.",
    );
  }
  return trackerRpc("pokeatlas_tracker_set", {
    p_token: token,
    p_tracker: tracker,
    p_pokemon_ids: pokemonIds,
    p_caught: caught,
  });
}

export function completeTracker(
  token: string,
  tracker: TrackerKind,
  pokemonIds: number[],
) {
  if (
    !pokemonIds.length ||
    pokemonIds.length > 2000 ||
    !pokemonIds.every((id) => Number.isInteger(id) && id >= 1 && id <= 20000)
  ) {
    throw new AccountError(
      "invalid_input",
      "Não foi possível completar essa coleção. Recarregue os Pokémon e tente novamente.",
    );
  }
  return trackerRpc("pokeatlas_tracker_complete", {
    p_token: token,
    p_tracker: tracker,
    p_pokemon_ids: pokemonIds,
  });
}
