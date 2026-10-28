import React, { useState } from "react";
import { Switch, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield } from "lucide-react-native";
import { useTheme } from "../../../src/theme";
import { Button, Empty, Loading, Pagination } from "../../../src/components/ui";
import { useAuth } from "../../../src/features/auth/AuthProvider";
import {
  ForumAuthor,
  ForumEditor,
  ForumError,
  ForumTag,
} from "../../../src/features/community/forum/ForumParts";
import {
  getForumAccess,
  getForumAdminPost,
  moderateForumComment,
  saveForumPost,
  validForumId,
  type ForumDraft,
  type ForumPost,
} from "../../../src/services/forum";

function AdminEditor({
  post,
  token,
  onSaved,
}: {
  post: ForumPost;
  token: string;
  onSaved: () => void;
}) {
  const { colors: c, ui } = useTheme();
  const [draft, setDraft] = useState<ForumDraft>({
    title: post.title,
    body: post.body ?? "",
    kind: post.kind,
    source_url: post.source_url ?? "",
  });
  const [options, setOptions] = useState({
    published: post.status === "published",
    pinned: post.pinned,
    locked: post.locked,
  });
  const [message, setMessage] = useState("");
  const save = useMutation({
    mutationFn: () => saveForumPost(token, post.id, draft, options),
    onSuccess: () => {
      setMessage("Alterações salvas.");
      onSaved();
    },
  });
  return (
    <View style={{ gap: 16 }}>
      <ForumError error={save.error} />
      {!!message && (
        <Text accessibilityLiveRegion="polite" style={{ color: c.green }}>
          {message}
        </Text>
      )}
      <ForumEditor
        draft={draft}
        onChange={(value) => {
          setMessage("");
          setDraft(value);
        }}
        onSubmit={() => save.mutate()}
        pending={save.isPending}
        canPublishNews
        label="Salvar alterações"
      >
        <View style={{ gap: 16 }}>
          {(
            [
              [
                "published",
                "Publicação visível",
                "Desative para ocultar a postagem e suas respostas do público.",
              ],
              [
                "pinned",
                "Fixar postagem",
                "Exibe esta publicação no topo do fórum.",
              ],
              [
                "locked",
                "Fechar respostas",
                "Impede novas respostas dos participantes.",
              ],
            ] as const
          ).map(([key, title, description]) => (
            <View key={key} style={ui.between}>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={[ui.sectionTitle, { fontSize: 13 }]}>{title}</Text>
                <Text style={[ui.subtitle, { fontSize: 11 }]}>
                  {description}
                </Text>
              </View>
              <Switch
                accessibilityLabel={title}
                value={options[key]}
                disabled={save.isPending}
                onValueChange={(value) => {
                  setMessage("");
                  setOptions((previous) => ({ ...previous, [key]: value }));
                }}
                trackColor={{ false: c.line, true: c.accent }}
              />
            </View>
          ))}
        </View>
      </ForumEditor>
    </View>
  );
}

export default function ForumAdminRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const { colors: c, ui } = useTheme();
  const { session, loading, signIn } = useAuth();
  const router = useRouter();
  const client = useQueryClient();
  const [nickname, setNickname] = useState("naglivers");
  const [password, setPassword] = useState("");
  const [page, setPage] = useState(0);
  const access = useQuery({
    queryKey: ["forum", "access", session?.user.id],
    queryFn: ({ signal }) => getForumAccess(session!.token, signal),
    enabled: !!session,
    retry: false,
    staleTime: 0,
  });
  const allowed = !!session && access.data === true;
  const query = useQuery({
    queryKey: ["forum", "admin", id, session?.user.id, page],
    queryFn: ({ signal }) =>
      getForumAdminPost(session!.token, id, page, signal),
    enabled: allowed && validForumId(id),
    retry: false,
    staleTime: 0,
  });
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["forum"] });
  };
  const login = useMutation({
    mutationFn: () => signIn(nickname, password),
    onSuccess: () => {
      setPassword("");
      refresh();
    },
  });
  const moderation = useMutation({
    mutationFn: ({ comment, visible }: { comment: string; visible: boolean }) =>
      moderateForumComment(session!.token, id, comment, visible),
    onSuccess: refresh,
  });
  if (!validForumId(id))
    return (
      <Empty
        title="Postagem não encontrada"
        description="Confira o ID da postagem."
      />
    );
  return (
    <View style={[ui.page, { maxWidth: 1000 }]}>
      <Button small variant="ghost" onPress={() => router.push(`/forum/${id}`)}>
        Voltar à postagem
      </Button>
      <View style={ui.row}>
        <Shield size={26} color={c.accent} />
        <Text style={ui.title}>Administrar postagem</Text>
      </View>
      {loading || (!!session && access.isPending) ? (
        <Loading text="Verificando acesso…" />
      ) : !allowed ? (
        <View style={ui.panel}>
          <Text style={ui.sectionTitle}>Entrar com a conta administradora</Text>
          <Text style={ui.subtitle}>
            Use o nickname e a senha da conta autorizada para administrar esta
            publicação.
          </Text>
          <ForumError error={login.error ?? access.error} />
          <TextInput
            accessibilityLabel="Nickname do administrador"
            value={nickname}
            onChangeText={setNickname}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Nickname"
            placeholderTextColor={c.placeholder}
            style={ui.input}
            editable={!login.isPending}
          />
          <TextInput
            accessibilityLabel="Senha do administrador"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="Senha"
            placeholderTextColor={c.placeholder}
            style={ui.input}
            editable={!login.isPending}
            onSubmitEditing={() => {
              if (nickname.trim() && password) login.mutate();
            }}
          />
          {!!session && access.data === false && (
            <Text style={ui.subtitle}>
              A conta atual não tem permissão administrativa.
            </Text>
          )}
          <Button
            disabled={login.isPending || !nickname.trim() || !password}
            onPress={() => login.mutate()}
          >
            {login.isPending ? "Entrando…" : "Entrar para administrar"}
          </Button>
          {access.isError && (
            <Button
              small
              variant="ghost"
              onPress={() => {
                void access.refetch();
              }}
            >
              Verificar acesso novamente
            </Button>
          )}
        </View>
      ) : query.isPending ? (
        <Loading text="Carregando administração…" />
      ) : query.isError ? (
        <View style={ui.panel}>
          <ForumError error={query.error} />
          <Button
            variant="outline"
            onPress={() => {
              void query.refetch();
            }}
          >
            Tentar novamente
          </Button>
        </View>
      ) : query.data ? (
        <>
          <View style={ui.wrap}>
            <ForumTag>
              {query.data.post.status === "published" ? "Visível" : "Oculta"}
            </ForumTag>
            <ForumTag>
              {query.data.post.kind === "news" ? "Notícia" : "Post"}
            </ForumTag>
          </View>
          <AdminEditor
            key={query.data.post.id}
            post={query.data.post}
            token={session!.token}
            onSaved={refresh}
          />
          <Text style={ui.sectionTitle}>
            Moderar respostas · {query.data.total}
          </Text>
          <ForumError error={moderation.error} />
          {query.data.comments.map((comment) => (
            <View
              key={comment.id}
              style={[
                ui.panel,
                { opacity: comment.status === "hidden" ? 0.65 : 1 },
              ]}
            >
              <ForumAuthor author={comment.author} date={comment.created_at} />
              <Text selectable style={[ui.body, { lineHeight: 23 }]}>
                {comment.body}
              </Text>
              <ForumTag>
                {comment.status === "published" ? "Visível" : "Oculta"}
              </ForumTag>
              <Button
                small
                variant="outline"
                disabled={moderation.isPending}
                onPress={() =>
                  moderation.mutate({
                    comment: comment.id,
                    visible: comment.status !== "published",
                  })
                }
              >
                {comment.status === "published"
                  ? "Ocultar resposta"
                  : "Restaurar resposta"}
              </Button>
            </View>
          ))}
          {!query.data.comments.length && (
            <Text style={ui.subtitle}>Nenhuma resposta nesta postagem.</Text>
          )}
          <Pagination
            page={page}
            total={query.data.total}
            pageSize={20}
            setPage={setPage}
          />
        </>
      ) : null}
    </View>
  );
}
