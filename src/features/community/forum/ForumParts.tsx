import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../../../theme";
import { Button, Select } from "../../../components/ui";
import { ProfileAvatar } from "../../auth/ProfileAvatar";
import { publicProfilePath } from "../../../services/publicProfile";
import type { ForumDraft, ForumPost } from "../../../services/forum";

export function ForumAuthor({
  author,
  date,
}: {
  author: ForumPost["author"];
  date: string;
}) {
  const { colors: c, ui } = useTheme();
  const router = useRouter();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 9,
      }}
    >
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Perfil de ${author.nickname}`}
        onPress={() => router.push(publicProfilePath(author.nickname))}
        style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
      >
        <ProfileAvatar uri={author.avatar_url} size={27} />
        <Text style={{ color: c.accent, fontSize: 12, fontWeight: "700" }}>
          {author.nickname}
        </Text>
      </Pressable>
      <Text style={[ui.subtitle, { fontSize: 11 }]}>
        {new Date(date).toLocaleString("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
        })}
      </Text>
    </View>
  );
}
export function ForumTag({ children }: { children: string }) {
  const { colors: c } = useTheme();
  return (
    <Text
      style={{
        color: c.accent,
        backgroundColor: c.accentSoft,
        borderRadius: 7,
        paddingVertical: 4,
        paddingHorizontal: 8,
        fontSize: 10,
        fontWeight: "700",
      }}
    >
      {children}
    </Text>
  );
}
export function ForumError({ error }: { error: unknown }) {
  const { colors: c } = useTheme();
  return error ? (
    <Text
      accessibilityRole="alert"
      style={{
        color: c.warningText,
        backgroundColor: c.warningBg,
        padding: 14,
        borderRadius: 10,
        fontSize: 12,
        lineHeight: 19,
      }}
    >
      {error instanceof Error
        ? error.message
        : "Não foi possível concluir esta ação."}
    </Text>
  ) : null;
}
export function ForumEditor({
  draft,
  onChange,
  onSubmit,
  pending,
  canPublishNews,
  label = "Publicar",
  children,
}: {
  draft: ForumDraft;
  onChange: (next: ForumDraft) => void;
  onSubmit: () => void;
  pending: boolean;
  canPublishNews: boolean;
  label?: string;
  children?: React.ReactNode;
}) {
  const { colors: c, ui } = useTheme();
  return (
    <View style={[ui.panel, { gap: 18 }]}>
      {canPublishNews && (
        <View style={{ gap: 7 }}>
          <Text style={ui.label}>TIPO DE PUBLICAÇÃO</Text>
          <Select
            label="Tipo de publicação"
            value={draft.kind}
            onChange={(kind) =>
              onChange({ ...draft, kind: kind === "news" ? "news" : "post" })
            }
            options={[
              { value: "post", label: "Post da comunidade" },
              { value: "news", label: "Notícia Pokémon" },
            ]}
          />
        </View>
      )}
      <View style={{ gap: 7 }}>
        <Text style={ui.label}>TÍTULO</Text>
        <TextInput
          accessibilityLabel="Título da postagem"
          value={draft.title}
          onChangeText={(title) => onChange({ ...draft, title })}
          maxLength={140}
          editable={!pending}
          placeholder="Qual é o assunto?"
          placeholderTextColor={c.placeholder}
          style={ui.input}
        />
        <Text style={[ui.subtitle, { fontSize: 10 }]}>
          {draft.title.length} / 140 · mínimo de 4 caracteres
        </Text>
      </View>
      <View style={{ gap: 7 }}>
        <Text style={ui.label}>CONTEÚDO</Text>
        <TextInput
          accessibilityLabel="Conteúdo da postagem"
          value={draft.body}
          onChangeText={(body) => onChange({ ...draft, body })}
          maxLength={20000}
          editable={!pending}
          multiline
          textAlignVertical="top"
          placeholder="Compartilhe suas novidades, dúvidas ou descobertas Pokémon…"
          placeholderTextColor={c.placeholder}
          style={[ui.input, { minHeight: 240, lineHeight: 23 }]}
        />
        <Text style={[ui.subtitle, { fontSize: 10 }]}>
          {draft.body.length} / 20.000 · mínimo de 10 caracteres
        </Text>
      </View>
      <View style={{ gap: 7 }}>
        <Text style={ui.label}>LINK DA FONTE · OPCIONAL</Text>
        <TextInput
          accessibilityLabel="Link da fonte"
          value={draft.source_url}
          onChangeText={(source_url) => onChange({ ...draft, source_url })}
          maxLength={2048}
          editable={!pending}
          autoCapitalize="none"
          keyboardType="url"
          placeholder="https://…"
          placeholderTextColor={c.placeholder}
          style={ui.input}
        />
      </View>
      {children}
      <Button
        disabled={
          pending ||
          draft.title.trim().length < 4 ||
          draft.body.trim().length < 10
        }
        onPress={onSubmit}
      >
        {pending ? "Salvando…" : label}
      </Button>
    </View>
  );
}
