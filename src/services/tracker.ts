import { AccountError } from "./account";
import { ensureCommunitySession } from "./community";
import { supabase } from "./supabase";
import { obtainablePokemon } from "../features/tracker/gameAvailability";
import { megaIds } from "../features/tracker/megaDex";

export type BaseTrackerKind = "pokedex" | "shinydex" | "megadex";
export type TrackerKind = BaseTrackerKind | "gamesdex";
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
  game?: string,
) {
  if (tracker === "megadex")
    return trackerRpc("pokeatlas_megadex_get", { p_token: token }, signal);
  if (tracker === "gamesdex") {
    const allowed = new Set(obtainablePokemon[game ?? ""] ?? []);
    return trackerRpc(
      "pokeatlas_gamesdex_get",
      { p_token: token, p_game: game },
      signal,
    ).then((ids) => ids.filter((id) => allowed.has(id)));
  }
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
  game?: string,
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
  if (tracker === "gamesdex" || tracker === "megadex")
    return applyTrackerChanges(
      token,
      tracker,
      caught ? pokemonIds : [],
      caught ? [] : pokemonIds,
      game,
    );
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
  game?: string,
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
  if (tracker === "gamesdex" || tracker === "megadex")
    return applyTrackerChanges(token, tracker, pokemonIds, [], game);
  return trackerRpc("pokeatlas_tracker_complete", {
    p_token: token,
    p_tracker: tracker,
    p_pokemon_ids: pokemonIds,
  });
}

export function applyTrackerChanges(
  token: string,
  tracker: TrackerKind,
  added: number[],
  removed: number[],
  game?: string,
) {
  const addIds = [...new Set(added)];
  const removeIds = [...new Set(removed)];
  const removals = new Set(removeIds);
  const allowed =
    tracker === "gamesdex"
      ? new Set(obtainablePokemon[game ?? ""] ?? [])
      : tracker === "megadex"
        ? megaIds
        : null;
  if (
    (!addIds.length && !removeIds.length) ||
    addIds.length + removeIds.length > 4000 ||
    ![...addIds, ...removeIds].every(
      (id) => Number.isInteger(id) && id >= 1 && id <= 20000,
    ) ||
    addIds.some((id) => removals.has(id)) ||
    (allowed !== null && addIds.some((id) => !allowed.has(id))) ||
    (tracker === "gamesdex" && !game)
  ) {
    throw new AccountError(
      "invalid_input",
      "Revise as alterações antes de salvar.",
    );
  }
  if (tracker === "megadex")
    return trackerRpc("pokeatlas_megadex_apply", {
      p_token: token,
      p_add_ids: addIds,
      p_remove_ids: removeIds,
    });
  return trackerRpc("pokeatlas_tracker_apply", {
    p_token: token,
    p_tracker: tracker,
    p_add_ids: addIds,
    p_remove_ids: removeIds,
    p_game: game ?? null,
  });
}

export async function getGamesdexSummary(
  token: string,
  signal?: AbortSignal,
): Promise<Record<string, number>> {
  if (!supabase)
    throw new AccountError(
      "configuration",
      "A Livingdex ainda não está disponível.",
    );
  await ensureCommunitySession();
  const { data, error } = await supabase
    .rpc("pokeatlas_gamesdex_summary", { p_token: token })
    .abortSignal(signal ?? AbortSignal.timeout(20000));
  if (
    error ||
    !data?.ok ||
    !data.games ||
    typeof data.games !== "object" ||
    Array.isArray(data.games) ||
    !Object.values(data.games).every(
      (value) => Number.isSafeInteger(value) && Number(value) >= 0,
    )
  ) {
    throw new AccountError(
      data?.code ?? "network",
      "Não foi possível carregar o progresso dos jogos. Tente novamente.",
    );
  }
  return data.games;
}
