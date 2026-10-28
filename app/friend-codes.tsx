import React, { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Loading } from "../src/components/ui";
import { useTheme } from "../src/theme";
import { useAuth } from "../src/features/auth/AuthProvider";
import { RetroAchievementsLink } from "../src/features/auth/RetroAchievementsLink";
import {
  emptyFriendCodes,
  friendCodeFields,
  getFriendCodes,
  saveFriendCodes,
  type FriendCodes,
} from "../src/services/friendCodes";
export default function FriendCodesRoute() {
  const { session, loading } = useAuth();
  const { ui, colors: c } = useTheme();
  const router = useRouter();
  const query = useQuery({
    queryKey: ["friend-codes", session?.user.nickname.toLowerCase()],
    queryFn: () => getFriendCodes(session!.user.nickname),
    enabled: !!session,
    retry: false,
    staleTime: 0,
  });
  if (loading) return <Loading />;
  if (!session) return <Redirect href="/login" />;
  return (
    <View style={[ui.page, { maxWidth: 850 }]}>
      <Button small variant="ghost" onPress={() => router.push("/profile")}>
        ← Configurações do perfil
      </Button>
      <Text style={ui.title}>Códigos de amizade</Text>
      <Text style={ui.subtitle}>
        Todos os campos são opcionais. Os códigos salvos aparecem no seu perfil
        público. Apague um campo e salve para removê-lo.
      </Text>
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <View style={{ gap: 12 }}>
          <Text style={{ color: c.warningText }}>{query.error.message}</Text>
          <Button
            onPress={() => {
              void query.refetch();
            }}
          >
            Tentar novamente
          </Button>
        </View>
      ) : (
        <CodesForm
          key={session.user.id}
          initial={query.data ?? emptyFriendCodes}
          token={session.token}
          nickname={session.user.nickname}
        />
      )}
      <RetroAchievementsLink nickname={session.user.nickname} />
    </View>
  );
}
function CodesForm({
  initial,
  token,
  nickname,
}: {
  initial: FriendCodes;
  token: string;
  nickname: string;
}) {
  const { ui, colors: c } = useTheme();
  const client = useQueryClient();
  const [codes, setCodes] = useState(initial);
  const [saved, setSaved] = useState(false);
  const mutation = useMutation({
    mutationFn: () => saveFriendCodes(token, codes),
    onSuccess: (data) => {
      setCodes(data);
      setSaved(true);
      client.setQueryData(["friend-codes", nickname.toLowerCase()], data);
      void client.invalidateQueries({
        queryKey: ["ra-profile", nickname.toLowerCase()],
      });
    },
  });
  return (
    <View style={[ui.panel, { gap: 20 }]}>
      {friendCodeFields.map((field) => (
        <View key={field.key} style={{ gap: 8 }}>
          <Text style={[ui.sectionTitle, { fontSize: 17 }]}>{field.label}</Text>
          <Text style={[ui.subtitle, { fontSize: 12 }]}>{field.hint}</Text>
          <TextInput
            accessibilityLabel={field.label}
            value={codes[field.key]}
            editable={!mutation.isPending}
            maxLength={field.maxLength}
            autoCapitalize={
              field.key === "home_code" || field.key === "switch_code"
                ? "characters"
                : "none"
            }
            autoCorrect={false}
            placeholder={field.placeholder}
            placeholderTextColor={c.placeholder}
            keyboardType={field.key === "retroachievements" ? "url" : "default"}
            onChangeText={(value) => {
              setCodes((previous) => ({ ...previous, [field.key]: value }));
              setSaved(false);
            }}
            style={ui.input}
          />
        </View>
      ))}
      {mutation.isError && (
        <Text style={{ color: c.warningText }}>{mutation.error.message}</Text>
      )}
      {saved && (
        <Text style={{ color: c.green }}>Códigos de amizade salvos!</Text>
      )}
      <Button disabled={mutation.isPending} onPress={() => mutation.mutate()}>
        {mutation.isPending ? "Salvando…" : "Salvar códigos de amizade"}
      </Button>
    </View>
  );
}
