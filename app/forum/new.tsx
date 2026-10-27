import React, { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "../../src/theme";
import { Button, Loading } from "../../src/components/ui";
import { useAuth } from "../../src/features/auth/AuthProvider";
import {
  ForumEditor,
  ForumError,
} from "../../src/features/community/forum/ForumParts";
import {
  createForumPost,
  emptyForumDraft,
  getForumAccess,
} from "../../src/services/forum";

export default function NewForumPost() {
  const { ui } = useTheme();
  const { session, loading } = useAuth();
  const router = useRouter();
  const client = useQueryClient();
  const [draft, setDraft] = useState({ ...emptyForumDraft });
  const access = useQuery({
    queryKey: ["forum", "access", session?.user.id],
    queryFn: ({ signal }) => getForumAccess(session!.token, signal),
    enabled: !!session,
    retry: false,
    staleTime: 30000,
  });
  const save = useMutation({
    mutationFn: () => createForumPost(session!.token, draft),
    onSuccess: (post) => {
      void client.invalidateQueries({ queryKey: ["forum"] });
      router.replace(`/forum/${post.id}`);
    },
  });
  return (
    <View style={ui.page}>
      <Button small variant="ghost" onPress={() => router.push("/community")}>
        Voltar à comunidade
      </Button>
      <Text style={ui.title}>Nova postagem</Text>
      <Text style={ui.subtitle}>
        Compartilhe suas descobertas com outros treinadores. As publicações são
        públicas.
      </Text>
      {loading ? (
        <Loading />
      ) : !session ? (
        <View style={ui.panel}>
          <Text style={ui.sectionTitle}>Entre para publicar</Text>
          <Button onPress={() => router.push("/login")}>
            Entrar na sua conta
          </Button>
        </View>
      ) : (
        <>
          <ForumError error={save.error} />
          <ForumEditor
            draft={draft}
            onChange={setDraft}
            onSubmit={() => save.mutate()}
            pending={save.isPending}
            canPublishNews={access.data === true}
          />
        </>
      )}
    </View>
  );
}
