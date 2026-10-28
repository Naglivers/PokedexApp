import React, { useState } from "react";
import { Linking, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Gamepad2, Users } from "lucide-react-native";
import { Button, Empty, ErrorState, Loading } from "../../components/ui";
import { useTheme } from "../../theme";
import { friendCodeFields, getFriendCodes } from "../../services/friendCodes";
import { RetroAchievementsLink } from "./RetroAchievementsLink";

export function ProfileFriendCodes({
  nickname,
  ownProfile,
}: {
  nickname: string;
  ownProfile: boolean;
}) {
  const { ui, colors: c } = useTheme();
  const router = useRouter();
  const [linkError, setLinkError] = useState(false);
  const query = useQuery({
    queryKey: ["friend-codes", nickname.toLowerCase()],
    queryFn: () => getFriendCodes(nickname),
    staleTime: 60000,
    retry: false,
    refetchOnWindowFocus: true,
  });
  const fields = friendCodeFields.filter((field) => !!query.data?.[field.key]);
  return (
    <View style={{ gap: 18 }}>
      <View style={[ui.between, { flexWrap: "wrap", gap: 12 }]}>
        <View style={{ gap: 6, flex: 1 }}>
          <Text style={ui.sectionTitle}>Códigos de amizade</Text>
          <Text style={ui.subtitle}>
            Encontre este treinador nos jogos e plataformas.
          </Text>
        </View>
        {ownProfile && (
          <Button
            small
            variant="outline"
            onPress={() => router.push("/friend-codes")}
          >
            Editar códigos
          </Button>
        )}
      </View>
      {query.isPending ? (
        <Loading text="Carregando códigos…" />
      ) : query.isError ? (
        <>
          <Text style={{ color: c.warningText }}>{query.error.message}</Text>
          <ErrorState
            retry={() => {
              void query.refetch();
            }}
          />
        </>
      ) : !fields.length ? (
        <Empty
          title="Nenhum código compartilhado"
          description={
            ownProfile
              ? "Adicione seus códigos para seus amigos encontrarem você."
              : "Este treinador ainda não compartilhou códigos de amizade."
          }
        />
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
          {fields.map((field) => (
            <View
              key={field.key}
              style={[ui.panel, { flexGrow: 1, flexBasis: 280, gap: 12 }]}
            >
              <View style={ui.row}>
                {field.key === "retroachievements" ? (
                  <Users size={20} color={c.accent} />
                ) : (
                  <Gamepad2 size={20} color={c.accent} />
                )}
                <Text style={[ui.sectionTitle, { fontSize: 17 }]}>
                  {field.label}
                </Text>
              </View>
              <Text style={[ui.subtitle, { fontSize: 12 }]}>{field.hint}</Text>
              <Text
                selectable
                style={{
                  color: c.ink,
                  fontSize: field.key === "retroachievements" ? 14 : 19,
                  fontWeight: "700",
                  lineHeight: 28,
                }}
              >
                {query.data![field.key]}
              </Text>
              {field.key === "retroachievements" &&
                /^https:\/\/(www\.)?retroachievements\.org\/user\/[a-zA-Z0-9_.%-]+\/?$/.test(
                  query.data![field.key],
                ) && (
                  <Button
                    small
                    variant="ghost"
                    onPress={() => {
                      void Linking.openURL(query.data![field.key]).catch(() =>
                        setLinkError(true),
                      );
                    }}
                  >
                    Abrir perfil ↗
                  </Button>
                )}
            </View>
          ))}
        </View>
      )}
      {linkError && (
        <Text style={{ color: c.warningText }}>
          Não foi possível abrir o perfil.
        </Text>
      )}
      <RetroAchievementsLink nickname={nickname} />
    </View>
  );
}
