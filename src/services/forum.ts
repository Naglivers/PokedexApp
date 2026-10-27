import { z } from "zod";
import { AccountError } from "./account";
import { ensureCommunitySession } from "./community";
import { supabase } from "./supabase";

const authorSchema = z.object({
  nickname: z.string(),
  avatar_url: z.string().nullable(),
});
const postSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  body: z.string().nullable(),
  excerpt: z.string(),
  kind: z.enum(["post", "news"]),
  source_url: z.string().nullable(),
  image_url: z.string().nullable().optional(),
  video_url: z.string().nullable().optional(),
  imported: z.boolean().optional(),
  source_name: z.string().nullable().optional(),
  source_published_at: z.string().nullable().optional(),
  status: z.enum(["published", "hidden"]),
  pinned: z.boolean(),
  locked: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  author: authorSchema,
  comment_count: z.number().int().nonnegative(),
});
const commentSchema = z.object({
  id: z.string().uuid(),
  body: z.string(),
  status: z.enum(["published", "hidden"]),
  created_at: z.string(),
  author: authorSchema,
});
const pageSchema = z.object({
  posts: z.array(postSchema),
  total: z.number().int().nonnegative(),
});
const commentsSchema = z.object({
  comments: z.array(commentSchema),
  total: z.number().int().nonnegative(),
});
const adminSchema = commentsSchema.extend({ post: postSchema });
export type ForumPost = z.infer<typeof postSchema>;
export type ForumComment = z.infer<typeof commentSchema>;
export type ForumDraft = {
  title: string;
  body: string;
  kind: "post" | "news";
  source_url: string;
};
export const emptyForumDraft: ForumDraft = {
  title: "",
  body: "",
  kind: "post",
  source_url: "",
};
export const validForumId = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
const messages: Record<string, string> = {
  not_found: "Esta postagem não está disponível.",
  forbidden: "Sua conta não tem permissão para esta ação.",
  session_expired: "Sua sessão expirou. Entre novamente.",
  locked: "Esta postagem está fechada para novas respostas.",
  invalid_input:
    "Confira os campos: título de 4 a 140 caracteres, conteúdo de 10 a 20.000 e um link válido, se informado.",
  rate_limited:
    "Você publicou muitas vezes em pouco tempo. Aguarde 15 minutos e tente novamente.",
};
async function rpc(
  name: string,
  params: Record<string, unknown>,
  authenticated = false,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  if (!supabase)
    throw new AccountError(
      "configuration",
      "O fórum ainda não está configurado.",
    );
  if (authenticated) await ensureCommunitySession();
  const { data, error } = await supabase
    .rpc(name, params)
    .abortSignal(signal ?? AbortSignal.timeout(20000));
  if (error)
    throw new AccountError(
      ["PGRST202", "42883", "42P01"].includes(error.code) ? "setup" : "network",
      "Não foi possível acessar o fórum. Tente novamente mais tarde.",
    );
  if (!data?.ok) {
    const code = typeof data?.code === "string" ? data.code : "network";
    throw new AccountError(
      code,
      messages[code] ?? "Não foi possível concluir esta ação no fórum.",
    );
  }
  return data;
}
function parsed<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success)
    throw new AccountError(
      "network",
      "O fórum retornou dados inválidos. Tente atualizar a página.",
    );
  return result.data;
}
function draftParams(draft: ForumDraft) {
  const title = draft.title.trim(),
    body = draft.body.trim(),
    source = draft.source_url.trim();
  let validSource = !source;
  if (source)
    try {
      const url = new URL(source);
      validSource =
        ["http:", "https:"].includes(url.protocol) &&
        !/\s/.test(source) &&
        source.length <= 2048;
    } catch {}
  if (
    title.length < 4 ||
    title.length > 140 ||
    body.length < 10 ||
    body.length > 20000 ||
    !validSource
  )
    throw new AccountError("invalid_input", messages.invalid_input);
  return {
    p_title: title,
    p_body: body,
    p_kind: draft.kind,
    p_source_url: source || null,
  };
}
export async function listForum(
  kind: "all" | "post" | "news",
  search: string,
  page: number,
  signal?: AbortSignal,
) {
  return parsed(
    pageSchema,
    await rpc(
      "pokeatlas_forum_list",
      {
        p_kind: kind,
        p_search: search.trim().slice(0, 100),
        p_offset: page * 20,
        p_limit: 20,
      },
      false,
      signal,
    ),
  );
}
export async function getForumPost(
  id: string,
  signal?: AbortSignal,
): Promise<ForumPost | null> {
  if (!validForumId(id)) return null;
  try {
    const data = await rpc("pokeatlas_forum_post", { p_id: id }, false, signal);
    return parsed(postSchema, data.post);
  } catch (error) {
    if (error instanceof AccountError && error.code === "not_found")
      return null;
    throw error;
  }
}
export async function getForumComments(
  id: string,
  page: number,
  signal?: AbortSignal,
) {
  return parsed(
    commentsSchema,
    await rpc(
      "pokeatlas_forum_comments",
      { p_id: id, p_offset: page * 20, p_limit: 20 },
      false,
      signal,
    ),
  );
}
export async function getForumAccess(token: string, signal?: AbortSignal) {
  const data = await rpc(
    "pokeatlas_forum_access",
    { p_token: token },
    true,
    signal,
  );
  return parsed(z.boolean(), data.is_admin);
}
export async function createForumPost(token: string, draft: ForumDraft) {
  const data = await rpc(
    "pokeatlas_forum_create",
    { p_token: token, ...draftParams(draft) },
    true,
  );
  return parsed(postSchema, data.post);
}
export async function replyToForum(token: string, id: string, body: string) {
  if (!body.trim() || body.trim().length > 5000)
    throw new AccountError(
      "invalid_input",
      "A resposta deve ter de 1 a 5.000 caracteres.",
    );
  const data = await rpc(
    "pokeatlas_forum_reply",
    { p_token: token, p_id: id, p_body: body.trim() },
    true,
  );
  return parsed(commentSchema, data.comment);
}
export async function getForumAdminPost(
  token: string,
  id: string,
  page: number,
  signal?: AbortSignal,
) {
  return parsed(
    adminSchema,
    await rpc(
      "pokeatlas_forum_admin_post",
      { p_token: token, p_id: id, p_offset: page * 20 },
      true,
      signal,
    ),
  );
}
export async function saveForumPost(
  token: string,
  id: string,
  draft: ForumDraft,
  options: { published: boolean; pinned: boolean; locked: boolean },
) {
  const data = await rpc(
    "pokeatlas_forum_admin_save",
    {
      p_token: token,
      p_id: id,
      ...draftParams(draft),
      p_published: options.published,
      p_pinned: options.pinned,
      p_locked: options.locked,
    },
    true,
  );
  return parsed(postSchema, data.post);
}
export async function moderateForumComment(
  token: string,
  id: string,
  commentId: string,
  visible: boolean,
) {
  await rpc(
    "pokeatlas_forum_admin_comment",
    { p_token: token, p_id: id, p_comment: commentId, p_visible: visible },
    true,
  );
}
