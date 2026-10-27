import React, { useState } from "react";
import { Linking, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Head from "expo-router/head";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LockKeyhole, Pin } from "lucide-react-native";
import { useTheme } from "../../../src/theme";
import { Button, Empty, Loading, Pagination } from "../../../src/components/ui";
import { useAuth } from "../../../src/features/auth/AuthProvider";
import {
  ForumAuthor,
  ForumError,
  ForumTag,
} from "../../../src/features/community/forum/ForumParts";
import {
  getForumComments,
  getForumPost,
  replyToForum,
} from "../../../src/services/forum";

import { NewsMedia } from "../../../src/features/community/forum/NewsMedia";
import { useNewsText } from "../../../src/features/community/forum/useNewsText";

export default function ForumPostRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const { colors: c, ui } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const client = useQueryClient();
  const [reply, setReply] = useState("");
  const [page, setPage] = useState(0);
  const [linkError, setLinkError] = useState<Error | null>(null);
  const post = useQuery({
    queryKey: ["forum", "post", id],
    queryFn: ({ signal }) => getForumPost(id, signal),
    retry: false,
    staleTime: 30000,
  });
  const comments = useQuery({
    queryKey: ["forum", "comments", id, page],
    queryFn: ({ signal }) => getForumComments(id, page, signal),
    enabled: !!post.data,
    staleTime: 30000,
    retry: false,
  });
  const newsText = useNewsText(post.data ?? undefined);
  const send = useMutation({
    mutationFn: () => replyToForum(session!.token, id, reply),
    onSuccess: () => {
      setReply("");
      setPage(Math.floor((post.data?.comment_count ?? 0) / 20));
      void client.invalidateQueries({ queryKey: ["forum"] });
    },
  });
  if (post.isPending) return <Loading text="Carregando postagem…" />;
  if (post.isError)
    return (
      <View style={ui.page}>
        <ForumError error={post.error} />
        <Button
          onPress={() => {
            void post.refetch();
          }}
        >
          Tentar novamente
        </Button>
      </View>
    );
  if (!post.data)
    return (
      <Empty
        title="Postagem não disponível"
        description="Ela pode ter sido ocultada ou o endereço está incorreto."
        action={
          <Button onPress={() => router.push("/community")}>
            Voltar à comunidade
          </Button>
        }
      />
    );
  const data = post.data;
  return (
    <View style={[ui.page, { maxWidth: 1000 }]}>
      <Head>
        <title>{data.title} · Comunidade Pokéatlas</title>
      </Head>
      <Button small variant="ghost" onPress={() => router.push("/community")}>
        Voltar à comunidade
      </Button>
      <View style={[ui.panel, { gap: 20 }]}>
        <View style={ui.wrap}>
          <ForumTag>
            {data.kind === "news" ? "Notícia Pokémon" : "Post da comunidade"}
          </ForumTag>
          {data.imported && <ForumTag>Automática</ForumTag>}
          {data.pinned && <Pin size={16} color={c.accent} />}
          {data.locked && <LockKeyhole size={16} color={c.muted} />}
        </View>
        <Text style={ui.title}>{newsText.title}</Text>
        {data.imported ? (
          <Text style={ui.subtitle}>
            {data.source_name ?? "Fonte externa"} ·{" "}
            {new Date(
              data.source_published_at ?? data.created_at,
            ).toLocaleString("pt-BR")}
          </Text>
        ) : (
          <ForumAuthor author={data.author} date={data.created_at} />
        )}
        <NewsMedia post={data} />
        {newsText.canTranslate && (
          <View style={{ gap: 8 }}>
            <Text style={ui.subtitle}>
              {newsText.pending
                ? "Traduzindo…"
                : newsText.translated
                  ? "Tradução automática"
                  : newsText.failed
                    ? "Tradução indisponível. Exibindo original."
                    : "Texto original"}
            </Text>
            <Button small variant="ghost" onPress={newsText.toggle}>
              {newsText.original ? "Traduzir" : "Ver original"}
            </Button>
          </View>
        )}
        {data.updated_at !== data.created_at && (
          <Text style={[ui.subtitle, { fontSize: 10 }]}>
            Editado em {new Date(data.updated_at).toLocaleString("pt-BR")}
          </Text>
        )}
        <View style={{ height: 1, backgroundColor: c.line }} />
        <Text selectable style={[ui.body, { fontSize: 15, lineHeight: 27 }]}>
          {newsText.body}
        </Text>
        {data.source_url && (
          <View style={{ gap: 8 }}>
            <Text style={ui.label}>FONTE</Text>
            <Text selectable style={ui.subtitle}>
              {data.source_url}
            </Text>
            <Button
              small
              variant="outline"
              onPress={() => {
                void Linking.openURL(data.source_url!).catch(() =>
                  setLinkError(new Error("Não foi possível abrir a fonte.")),
                );
              }}
            >
              Abrir fonte
            </Button>
            <ForumError error={linkError} />
          </View>
        )}
      </View>
      <Text style={ui.sectionTitle}>Respostas · {data.comment_count}</Text>
      {comments.isPending ? (
        <Loading text="Carregando respostas…" />
      ) : comments.isError ? (
        <View style={ui.panel}>
          <ForumError error={comments.error} />
          <Button
            small
            variant="outline"
            onPress={() => {
              void comments.refetch();
            }}
          >
            Tentar novamente
          </Button>
        </View>
      ) : (
        <>
          {!comments.data?.comments.length && (
            <Text style={ui.subtitle}>
              Ainda não há respostas nesta postagem.
            </Text>
          )}
          {comments.data?.comments.map((comment) => (
            <View key={comment.id} style={[ui.panel, { gap: 13 }]}>
              <ForumAuthor author={comment.author} date={comment.created_at} />
              <Text selectable style={[ui.body, { lineHeight: 24 }]}>
                {comment.body}
              </Text>
            </View>
          ))}
          {!!comments.data?.total && (
            <Pagination
              page={page}
              total={comments.data.total}
              pageSize={20}
              setPage={setPage}
            />
          )}
        </>
      )}
      {data.locked ? (
        <View style={ui.panel}>
          <LockKeyhole size={20} color={c.muted} />
          <Text style={ui.subtitle}>
            Esta conversa está fechada para novas respostas.
          </Text>
        </View>
      ) : session ? (
        <View style={ui.panel}>
          <Text style={ui.sectionTitle}>Participar da conversa</Text>
          <TextInput
            accessibilityLabel="Sua resposta"
            multiline
            textAlignVertical="top"
            maxLength={5000}
            value={reply}
            editable={!send.isPending}
            onChangeText={setReply}
            placeholder="Escreva sua resposta…"
            placeholderTextColor={c.placeholder}
            style={[ui.input, { minHeight: 130, lineHeight: 22 }]}
          />
          <ForumError error={send.error} />
          <Button
            disabled={send.isPending || !reply.trim()}
            onPress={() => send.mutate()}
          >
            {send.isPending ? "Enviando…" : "Publicar resposta"}
          </Button>
        </View>
      ) : (
        <View style={ui.panel}>
          <Text style={ui.subtitle}>Entre na sua conta para responder.</Text>
          <Button onPress={() => router.push("/login")}>Entrar</Button>
        </View>
      )}
    </View>
  );
}
