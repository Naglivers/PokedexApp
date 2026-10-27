import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { LockKeyhole, MessageSquare, Pin, Plus } from "lucide-react-native";
import {
  Button,
  Empty,
  Loading,
  Pagination,
  SearchInput,
} from "../../../components/ui";
import { useTheme } from "../../../theme";
import { listForum } from "../../../services/forum";
import { useDebounce } from "../../../hooks/useDebounce";
import { ForumAuthor, ForumError, ForumTag } from "./ForumParts";

import { NewsMedia } from "./NewsMedia";
import { useNewsText } from "./useNewsText";
import type { ForumPost } from "../../../services/forum";

function NewsPreview({ post }: { post: ForumPost }) {
  const { ui } = useTheme();
  const text = useNewsText(post);
  return (
    <View style={{ gap: 9 }}>
      <Text style={ui.sectionTitle}>{text.title}</Text>
      <Text numberOfLines={3} style={ui.subtitle}>
        {post.imported ? text.body : post.excerpt}
      </Text>
      {text.translated && <Text style={ui.subtitle}>Tradução automática</Text>}
    </View>
  );
}

export function ForumFeed({ kind = "all" }: { kind?: "all" | "news" }) {
  const { colors: c, ui } = useTheme();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const query = useDebounce(search);
  const feed = useQuery({
    queryKey: ["forum", "feed", kind, query, page],
    queryFn: ({ signal }) => listForum(kind, query, page, signal),
    staleTime: 30000,
    refetchOnWindowFocus: true,
    refetchInterval: 60000,
    retry: false,
  });
  return (
    <View style={{ gap: 20 }}>
      <View style={[ui.between, { flexWrap: "wrap" }]}>
        <View style={{ flex: 1, minWidth: 180, gap: 6 }}>
          <Text style={ui.sectionTitle}>
            {kind === "news" ? "Notícias Pokémon" : "Conversas da comunidade"}
          </Text>
          <Text style={ui.subtitle}>
            {kind === "news"
              ? "Notícias automáticas e novidades da administração, com espaço para conversar."
              : "Compartilhe descobertas, tire dúvidas e acompanhe as novidades Pokémon."}
          </Text>
        </View>
        <Button
          icon={<Plus size={16} color={c.onAccent} />}
          onPress={() => router.push("/forum/new")}
        >
          Criar postagem
        </Button>
      </View>
      <SearchInput
        value={search}
        onChange={(value) => {
          setSearch(value.slice(0, 100));
          setPage(0);
        }}
        placeholder="Buscar postagens por título ou conteúdo…"
      />
      {feed.isPending ? (
        <Loading text="Carregando postagens…" />
      ) : feed.isError ? (
        <View style={ui.panel}>
          <ForumError error={feed.error} />
          <Button
            variant="outline"
            onPress={() => {
              void feed.refetch();
            }}
          >
            Tentar novamente
          </Button>
        </View>
      ) : !feed.data.posts.length ? (
        <Empty
          title={
            query
              ? "Nenhuma postagem encontrada"
              : kind === "news"
                ? "As notícias chegam por aqui"
                : "Comece a conversa"
          }
          description={
            query
              ? "Tente outro termo de pesquisa."
              : kind === "news"
                ? "As novidades aparecerão após a próxima importação automática."
                : "Seja o primeiro a compartilhar uma descoberta com outros treinadores."
          }
        />
      ) : (
        <>
          <Text style={ui.subtitle}>
            {feed.data.total}{" "}
            {feed.data.total === 1 ? "publicação" : "publicações"}
          </Text>
          {feed.data.posts.map((post) => (
            <View
              key={post.id}
              style={[
                ui.panel,
                { gap: 14, borderColor: post.pinned ? c.accent : c.line },
              ]}
            >
              <View style={[ui.wrap, { alignItems: "center" }]}>
                <ForumTag>
                  {post.kind === "news" ? "Notícia" : "Comunidade"}
                </ForumTag>
                {post.imported && <ForumTag>Automática</ForumTag>}
                {post.pinned && <Pin size={14} color={c.accent} />}
                {post.locked && <LockKeyhole size={14} color={c.muted} />}
              </View>
              <NewsMedia post={post} compact />
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push(`/forum/${post.id}`)}
                style={{ gap: 9 }}
              >
                <NewsPreview post={post} />
              </Pressable>
              {post.imported ? (
                <Text style={ui.subtitle}>
                  {post.source_name ?? "Fonte externa"} ·{" "}
                  {new Date(
                    post.source_published_at ?? post.created_at,
                  ).toLocaleString("pt-BR")}
                </Text>
              ) : (
                <ForumAuthor author={post.author} date={post.created_at} />
              )}
              <View style={ui.between}>
                <View style={ui.row}>
                  <MessageSquare size={14} color={c.muted} />
                  <Text style={ui.subtitle}>
                    {post.comment_count} respostas
                  </Text>
                </View>
                <Button
                  small
                  variant="ghost"
                  onPress={() => router.push(`/forum/${post.id}`)}
                >
                  Ler postagem
                </Button>
              </View>
            </View>
          ))}
          <Pagination
            page={page}
            total={feed.data.total}
            pageSize={20}
            setPage={setPage}
          />
        </>
      )}
    </View>
  );
}
