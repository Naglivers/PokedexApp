import { z } from "zod";
import { supabase } from "./supabase";
import { ensureCommunitySession } from "./community";
export const friendCodeFields = [
  {
    key: "retroachievements",
    label: "RetroAchievements",
    hint: "Link do seu perfil",
    placeholder: "https://retroachievements.org/user/seunick",
    maxLength: 160,
  },
  {
    key: "pokemmo",
    label: "PokéMMO",
    hint: "Nickname do personagem",
    placeholder: "Seu nickname no PokéMMO",
    maxLength: 40,
  },
  {
    key: "switch_code",
    label: "Nintendo Switch",
    hint: "Código de amizade",
    placeholder: "SW-0000-0000-0000",
    maxLength: 20,
  },
  {
    key: "three_ds_code",
    label: "Nintendo 3DS",
    hint: "Código de amizade",
    placeholder: "0000-0000-0000",
    maxLength: 18,
  },
  {
    key: "home_code",
    label: "Pokémon HOME",
    hint: "Código de amizade",
    placeholder: "ABCDEFGHIJKL",
    maxLength: 20,
  },
  {
    key: "champions_code",
    label: "Pokémon Champions",
    hint: "Código de amizade exibido no jogo",
    placeholder: "Seu código no Pokémon Champions",
    maxLength: 64,
  },
] as const;
export type FriendCodeKey = (typeof friendCodeFields)[number]["key"];
export type FriendCodes = Record<FriendCodeKey, string>;
export const emptyFriendCodes: FriendCodes = {
  retroachievements: "",
  pokemmo: "",
  switch_code: "",
  three_ds_code: "",
  home_code: "",
  champions_code: "",
};
const schema = z.object({
  retroachievements: z.string().nullish(),
  pokemmo: z.string().nullish(),
  switch_code: z.string().nullish(),
  three_ds_code: z.string().nullish(),
  home_code: z.string().nullish(),
  champions_code: z.string().nullish(),
});
const errors: Record<string, string> = {
  session_expired: "Sua sessão expirou. Entre novamente.",
  invalid_ra:
    "Use o link HTTPS do seu perfil em retroachievements.org/user/seunick.",
  invalid_mmo: "O nickname do PokéMMO deve ter até 40 caracteres.",
  invalid_switch: "O código do Switch deve ter 12 números, com ou sem SW-.",
  invalid_ds: "O código do Nintendo 3DS deve ter 12 números.",
  invalid_home: "O código do Pokémon HOME deve ter 12 letras.",
  invalid_champions: "O código do Champions deve ter até 64 caracteres.",
};
async function rpc(name: string, params: Record<string, unknown>) {
  if (!supabase) throw new Error("O Supabase ainda não está configurado.");
  const { data, error } = await supabase
    .rpc(name, params)
    .abortSignal(AbortSignal.timeout(20000));
  if (error)
    throw new Error(
      ["PGRST202", "42883", "42P01"].includes(error.code)
        ? "Execute a query 015 no Supabase para ativar os códigos de amizade."
        : "Não foi possível acessar seus códigos. Tente novamente.",
    );
  if (!data?.ok)
    throw new Error(
      errors[data?.code] ?? "Não foi possível salvar os códigos de amizade.",
    );
  const parsed = schema.parse(data.codes);
  return Object.fromEntries(
    friendCodeFields.map((field) => [field.key, parsed[field.key] ?? ""]),
  ) as FriendCodes;
}
export const getFriendCodes = (nickname: string) =>
  rpc("pokeatlas_friend_codes_get", { p_nickname: nickname });
export async function saveFriendCodes(token: string, codes: FriendCodes) {
  await ensureCommunitySession();
  return rpc("pokeatlas_friend_codes_save", { p_token: token, p_codes: codes });
}
