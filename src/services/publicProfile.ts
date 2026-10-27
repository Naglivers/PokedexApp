import { AccountError } from "./account";
import { supabase } from "./supabase";
import type { TrackerKind } from "./tracker";

export type PublicProfile = {
  nickname: string;
  avatar_url: string | null;
  trackers: Record<TrackerKind, number>;
};

// Static app routes keep their existing meaning. A fallback handles accounts
// whose nickname already matches one of those routes.
const reservedPaths = new Set([
  "index",
  "login",
  "profile",
  "pokedex",
  "mega-dex",
  "gmax-dex",
  "favorites",
  "community",
  "compare",
  "team-builder",
  "type-battle",
  "search",
  "api-explorer",
  "catalog",
  "pokemon",
  "dex-tracker",
  "u",
]);
export function publicProfilePath(nickname: string) {
  const escaped = encodeURIComponent(nickname);
  return reservedPaths.has(nickname.toLowerCase())
    ? `/u/${escaped}`
    : `/${escaped}`;
}

export async function getPublicProfile(
  nickname: string,
  signal?: AbortSignal,
): Promise<PublicProfile | null> {
  if (!/^[A-Za-z0-9_]{3,20}$/.test(nickname)) return null;
  if (!supabase)
    throw new AccountError(
      "configuration",
      "Os perfis públicos ainda não estão disponíveis.",
    );
  // Public endpoint: a visitor does not need to sign in or create a session.
  const { data, error } = await supabase
    .rpc("pokeatlas_public_profile", { p_nickname: nickname })
    .abortSignal(signal ?? AbortSignal.timeout(20000));
  if (error) {
    throw new AccountError(
      ["PGRST202", "42883", "42P01"].includes(error.code) ? "setup" : "network",
      "Não foi possível carregar este perfil. Tente novamente mais tarde.",
    );
  }
  if (!data?.ok) {
    if (data?.code === "not_found") return null;
    throw new AccountError("network", "Não foi possível carregar este perfil.");
  }
  const profile = data.profile;
  if (
    !profile ||
    typeof profile.nickname !== "string" ||
    (profile.avatar_url !== null && typeof profile.avatar_url !== "string") ||
    !["pokedex", "shinydex"].every(
      (kind) =>
        Number.isSafeInteger(profile.trackers?.[kind]) &&
        profile.trackers[kind] >= 0,
    )
  ) {
    throw new AccountError(
      "network",
      "O perfil retornou uma resposta inválida. Tente novamente.",
    );
  }
  return {
    nickname: profile.nickname,
    avatar_url: profile.avatar_url,
    trackers: {
      pokedex: profile.trackers.pokedex,
      shinydex: profile.trackers.shinydex,
    },
  };
}
