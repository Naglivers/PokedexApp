import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ArrowUpRight, MessageCircle } from "lucide-react-native";
import { Button, Empty, ErrorState, Loading, Art } from "../../components/ui";
import { useTheme } from "../../theme";
import {
  getForumComments,
  listForum,
  type ForumPost,
} from "../../services/forum";
import type { PublicProfile } from "../../services/publicProfile";

// The public feed is paginated. Inspect every page before filtering by author;
// filtering only the first page would silently omit older posts.
type ProfileEntry = ForumPost & {
  activity: "post" | "comment";
  postId: string;
};
async function authorPosts(nickname: string, signal: AbortSignal) {
  const posts = new Map<string, ProfileEntry>();
  const isAuthor = (author: string) =>
    author.toLowerCase() === nickname.toLowerCase();
  for (let page = 0; ; page++) {
    signal.throwIfAborted();
    const batch = await listForum("all", "", page, signal);
    for (const post of batch.posts) {
      if (
        post.status === "published" &&
        !post.imported &&
        isAuthor(post.author.nickname)
      )
        posts.set(`post:${post.id}`, {
          ...post,
          activity: "post",
          postId: post.id,
        });
    }
    // Comments can be authored on another person's post. Read every public
    // thread with replies, not only threads created by this profile.
    const threads = batch.posts.filter(
      (post) => post.status === "published" && post.comment_count > 0,
    );
    let nextThread = 0;
    await Promise.all(
      Array.from({ length: Math.min(3, threads.length) }, async () => {
        while (nextThread < threads.length) {
          signal.throwIfAborted();
          const parent = threads[nextThread++];
          for (let commentPage = 0; ; commentPage++) {
            const comments = await getForumComments(
              parent.id,
              commentPage,
              signal,
            );
            for (const comment of comments.comments) {
              if (
                comment.status === "published" &&
                isAuthor(comment.author.nickname)
              ) {
                posts.set(`comment:${comment.id}`, {
                  ...parent,
                  id: comment.id,
                  author: comment.author,
                  activity: "comment",
                  postId: parent.id,
                  title: parent.title,
                  excerpt: comment.body,
                  body: comment.body,
                  image_url: null,
                  video_url: null,
                  created_at: comment.created_at,
                  updated_at: comment.created_at,
                });
              }
            }
            if (
              !comments.comments.length ||
              (commentPage + 1) * 20 >= comments.total
            )
              break;
          }
        }
      }),
    );
    if (!batch.posts.length || (page + 1) * 20 >= batch.total) break;
  }
  return [...posts.values()].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
}

export function ProfileActivity({
  profile,
  completedGames,
  postsOnly = false,
}: {
  profile: PublicProfile;
  completedGames: number;
  postsOnly?: boolean;
}) {
  const { colors: c, ui } = useTheme();
  const router = useRouter();
  const [limit, setLimit] = useState(20);
  const posts = useQuery({
    queryKey: [
      "profile-activity",
      "posts-and-comments",
      profile.nickname.toLowerCase(),
    ],
    queryFn: ({ signal }) => authorPosts(profile.nickname, signal),
    staleTime: 60000,
  });
  if (!postsOnly) {
    const statistics = [
      ["Pokémon capturados", profile.trackers.pokedex],
      ["Shinies capturados", profile.trackers.shinydex],
      ["Mega evoluções", profile.trackers.megadex],
      ["Jogos completos", completedGames],
      [
        "Posts publicados",
        posts.isSuccess
          ? posts.data.filter((entry) => entry.activity === "post").length
          : null,
      ],
      [
        "Comentários escritos",
        posts.isSuccess
          ? posts.data.filter((entry) => entry.activity === "comment").length
          : null,
      ],
    ] as const;
    return (
      <View style={{ gap: 14, marginBottom: 26 }}>
        <Text style={ui.sectionTitle}>Estatísticas do treinador</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {statistics.map(([label, value]) => (
            <View
              key={label}
              style={[
                ui.panel,
                {
                  flexGrow: 1,
                  flexBasis: 140,
                  minWidth: 0,
                  padding: 18,
                  gap: 8,
                },
              ]}
            >
              <Text
                style={{ color: c.accent, fontSize: 27, fontWeight: "800" }}
              >
                {value ?? (posts.isError ? "—" : "…")}
              </Text>
              <Text style={[ui.subtitle, { fontSize: 11 }]}>{label}</Text>
            </View>
          ))}
        </View>
        {posts.isError && (
          <Button
            small
            variant="ghost"
            onPress={() => {
              void posts.refetch();
            }}
          >
            Tentar carregar estatísticas de postagens novamente
          </Button>
        )}
      </View>
    );
  }
  if (posts.isPending) return <Loading text="Carregando postagens…" />;
  if (posts.isError)
    return (
      <ErrorState
        retry={() => {
          void posts.refetch();
        }}
      />
    );
  if (!posts.data.length)
    return (
      <Empty
        title="Nenhuma postagem por aqui ainda"
        description="Os posts e comentários escritos por este treinador aparecerão aqui."
      />
    );
  return (
    <View style={{ gap: 14 }}>
      <View style={ui.between}>
        <Text style={ui.sectionTitle}>Postagens de {profile.nickname}</Text>
        <Button
          small
          variant="ghost"
          disabled={posts.isFetching}
          onPress={() => {
            void posts.refetch();
          }}
        >
          Atualizar
        </Button>
      </View>
      <Text style={ui.subtitle}>
        {posts.data.filter((entry) => entry.activity === "post").length} posts ·{" "}
        {posts.data.filter((entry) => entry.activity === "comment").length}{" "}
        comentários · Mais recentes primeiro
      </Text>
      {posts.data.slice(0, limit).map((post) => (
        <Pressable
          key={`${post.activity}:${post.id}`}
          accessibilityRole="link"
          accessibilityLabel={
            post.activity === "comment"
              ? `Comentário em ${post.title}`
              : post.title
          }
          onPress={() => router.push(`/forum/${post.postId}`)}
          style={[ui.panel, { gap: 10 }]}
        >
          <View style={ui.between}>
            <Text style={[ui.label, { flexShrink: 1 }]}>
              {post.activity === "comment" ? "COMENTÁRIO" : "POST"} ·{" "}
              {new Date(post.created_at).toLocaleDateString("pt-BR")}
            </Text>
            <ArrowUpRight size={17} color={c.muted} />
          </View>
          {post.image_url && (
            <Art
              name={post.title}
              uri={post.image_url}
              style={{ width: "100%", height: 170, borderRadius: 10 }}
            />
          )}
          <Text style={ui.sectionTitle}>
            {post.activity === "comment"
              ? `Comentou em: ${post.title}`
              : post.title}
          </Text>
          <Text numberOfLines={3} style={ui.body}>
            {post.excerpt}
          </Text>
          <View style={ui.row}>
            <MessageCircle size={14} color={c.muted} />
            <Text style={ui.subtitle}>
              {post.activity === "comment"
                ? "Ver conversa"
                : `${post.comment_count} comentários`}
            </Text>
          </View>
        </Pressable>
      ))}
      {posts.data.length > limit && (
        <Button
          variant="outline"
          onPress={() => setLimit((current) => current + 20)}
        >
          Ver mais postagens
        </Button>
      )}
    </View>
  );
}
