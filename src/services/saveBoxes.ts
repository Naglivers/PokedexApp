import { z } from "zod";
import { AccountError } from "./account";
import { ensureCommunitySession } from "./community";
import { supabase } from "./supabase";
import {
  MAX_SAVE_BYTES,
  saveSummarySchema,
  snapshotSchema,
  type SaveSnapshot,
} from "../features/save-boxes/schema";

export function readerUrl() {
  const configured =
    process.env.EXPO_PUBLIC_SAVE_READER_URL ??
    (typeof window !== "undefined" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname)
      ? "http://localhost:5099"
      : undefined);
  if (!configured)
    throw new AccountError(
      "configuration",
      "A importação de saves ainda não está disponível. Tente novamente mais tarde.",
    );
  const url = new URL(configured);
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    )
  )
    throw new AccountError(
      "configuration",
      "O leitor de saves precisa usar uma conexão HTTPS.",
    );
  if (url.username || url.password || url.search || url.hash)
    throw new AccountError(
      "configuration",
      "Endereço do leitor de saves inválido.",
    );
  return url.href.replace(/\/$/, "");
}
export async function parseSave(
  file: File,
  signal: AbortSignal,
): Promise<SaveSnapshot> {
  if (!file.size || file.size > MAX_SAVE_BYTES)
    throw new Error("Escolha um save de até 64 MB.");
  const endpoint = readerUrl() + "/parse";
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: file,
      signal,
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error(
      "Não foi possível conectar ao leitor de saves. Tente novamente mais tarde.",
    );
  }
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      typeof error?.message === "string"
        ? error.message
        : response.status === 429
          ? "Muitas importações. Aguarde um minuto e tente novamente."
          : "Não foi possível ler o save. Tente novamente mais tarde.",
    );
  }
  const result = snapshotSchema.safeParse(await response.json());
  if (!result.success)
    throw new Error(
      "O leitor retornou dados inválidos. Nenhum Pokémon foi salvo.",
    );
  return result.data;
}
async function rpc(
  name: string,
  params: Record<string, unknown>,
  signal?: AbortSignal,
) {
  if (!supabase)
    throw new AccountError(
      "configuration",
      "O armazenamento da box ainda não está configurado.",
    );
  await ensureCommunitySession();
  const { data, error } = await supabase
    .rpc(name, params)
    .abortSignal(signal ?? AbortSignal.timeout(60000));
  if (error)
    throw new AccountError(
      error.code === "PGRST202" ? "setup" : "network",
      "Não foi possível acessar sua box. Tente novamente mais tarde.",
    );
  if (!data?.ok) {
    const messages: Record<string, string> = {
      session_expired: "Sua sessão expirou. Entre novamente.",
      not_found: "Este save não está disponível nesta conta.",
      different_save:
        "Este arquivo pertence a outro jogo ou treinador. Importe como um novo save.",
      invalid_input:
        "O save retornou dados inválidos. Nenhuma alteração foi feita.",
    };
    throw new AccountError(
      data?.code ?? "network",
      messages[data?.code] ?? "Não foi possível acessar sua box.",
    );
  }
  return data;
}
export async function listSaveBoxes(token: string, signal?: AbortSignal) {
  const data = await rpc(
    "pokeatlas_save_boxes_list",
    { p_token: token },
    signal,
  );
  return z.array(saveSummarySchema).parse(data.saves);
}
export async function getSaveBox(
  token: string,
  id: string,
  signal?: AbortSignal,
) {
  const data = await rpc(
    "pokeatlas_save_boxes_get",
    { p_token: token, p_save_id: z.string().uuid().parse(id) },
    signal,
  );
  return snapshotSchema.parse(data.snapshot);
}
export async function importSaveBox(
  token: string,
  snapshot: SaveSnapshot,
  replaceId: string | null,
) {
  const data = await rpc("pokeatlas_save_boxes_import", {
    p_token: token,
    p_snapshot: snapshotSchema.parse(snapshot),
    p_replace_id: replaceId ? z.string().uuid().parse(replaceId) : null,
  });
  return z.object({ id: z.string().uuid(), reused: z.boolean() }).parse(data);
}
