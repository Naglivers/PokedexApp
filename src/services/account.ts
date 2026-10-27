import { supabase } from "./supabase";
import { ensureCommunitySession } from "./community";

export type AccountUser = {
  id: string;
  nickname: string;
  email: string | null;
  avatar_url: string | null;
};
export type AccountSession = {
  token: string;
  expires_at: string;
  user: AccountUser;
};
export class AccountError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "AccountError";
  }
}
const messages: Record<string, string> = {
  invalid_input:
    "Use um nickname de 3 a 20 letras, números ou _ e uma senha de 6 a 72 bytes.",
  invalid_credentials: "Nickname ou senha incorretos.",
  nickname_taken: "Esse nickname já está em uso.",
  rate_limited: "Muitas tentativas. Aguarde 15 minutos e tente novamente.",
  session_expired: "Sua sessão expirou. Entre novamente.",
  invalid_email: "Digite um e-mail válido ou deixe o campo vazio.",
  invalid_photo: "Escolha uma foto JPG, PNG ou WebP de até 500 KB.",
};
type Result = {
  ok: boolean;
  code?: string;
  session?: AccountSession;
  user?: AccountUser;
};
async function rpc(
  name: string,
  params: Record<string, unknown>,
): Promise<Result> {
  if (!supabase)
    throw new AccountError(
      "configuration",
      "O serviço de contas ainda não está configurado.",
    );
  await ensureCommunitySession();
  const { data, error } = await supabase
    .rpc(name, params)
    .abortSignal(AbortSignal.timeout(20000));
  if (error) {
    if (error.code === "PGRST202" || error.code === "42883")
      throw new AccountError(
        "setup",
        "O serviço de contas ainda está em preparação. Tente novamente mais tarde.",
      );
    throw new AccountError(
      "network",
      "Não foi possível conectar à sua conta. Tente novamente.",
    );
  }
  const result = data as Result;
  if (!result?.ok)
    throw new AccountError(
      result?.code ?? "network",
      messages[result?.code ?? ""] ?? "Não foi possível acessar sua conta.",
    );
  return result;
}
export function validateCredentials(nickname: string, password: string) {
  const name = nickname.trim();
  const characters = Array.from(password);
  const bytes = characters.reduce((sum, char) => {
    const point = char.codePointAt(0)!;
    return (
      sum + (point > 0xffff ? 4 : point > 0x7ff ? 3 : point > 0x7f ? 2 : 1)
    );
  }, 0);
  if (!/^[A-Za-z0-9_]{3,20}$/.test(name) || characters.length < 6 || bytes > 72)
    throw new AccountError("invalid_input", messages.invalid_input);
  return name;
}
export function validateProfile(email: string, avatar: string | null) {
  if (
    email &&
    (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  )
    throw new AccountError("invalid_email", messages.invalid_email);
  if (
    avatar &&
    (avatar.length > 700000 ||
      !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(avatar))
  )
    throw new AccountError("invalid_photo", messages.invalid_photo);
}
export async function authenticate(
  nickname: string,
  password: string,
  register: boolean,
) {
  const name = validateCredentials(nickname, password);
  const result = await rpc("pokeatlas_account_auth", {
    p_nickname: name,
    p_password: password,
    p_register: register,
  });
  if (!result.session)
    throw new AccountError("network", "Resposta do login inválida.");
  return result.session;
}
export async function fetchAccount(token: string) {
  const result = await rpc("pokeatlas_account_profile", { p_token: token });
  if (!result.user)
    throw new AccountError("network", "Resposta do perfil inválida.");
  return result.user;
}
export async function updateAccount(
  token: string,
  email: string,
  avatar: string | null,
) {
  validateProfile(email.trim(), avatar);
  const result = await rpc("pokeatlas_account_save", {
    p_token: token,
    p_email: email.trim() || null,
    p_avatar_url: avatar,
  });
  if (!result.user)
    throw new AccountError("network", "Resposta do perfil inválida.");
  return result.user;
}
export async function revokeAccount(token: string) {
  if (!supabase) return;
  await ensureCommunitySession();
  const { error } = await supabase
    .rpc("pokeatlas_account_logout", { p_token: token })
    .abortSignal(AbortSignal.timeout(10000));
  if (error)
    throw new AccountError("network", "Não foi possível encerrar a sessão.");
}
