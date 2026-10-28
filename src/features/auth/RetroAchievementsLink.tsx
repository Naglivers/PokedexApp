import React from "react";
import { Linking, Text, View } from "react-native";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { RefreshCw, Trophy } from "lucide-react-native";
import { Button } from "../../components/ui";
import { useTheme } from "../../theme";
import { useAuth } from "../auth/AuthProvider";
import {
  getRetroProfile,
  syncRetroProfile,
} from "../../services/retroachievements";

export function useRetroProfile(nickname: string) {
  const { session } = useAuth();
  const own =
    !!nickname &&
    session?.user.nickname.toLowerCase() === nickname.toLowerCase();
  return useQuery({
    queryKey: ["ra-profile", nickname.toLowerCase()],
    enabled: !!nickname,
    queryFn: async ({ signal }) => {
      const profile = await getRetroProfile(nickname, signal);
      if (
        own &&
        session &&
        profile.linked &&
        (!profile.synced_at ||
          Date.now() - Date.parse(profile.synced_at) >= 60 * 60 * 1000)
      ) {
        try {
          await syncRetroProfile(session.token);
          return await getRetroProfile(nickname, signal);
        } catch (error) {
          return {
            ...profile,
            sync_error:
              error instanceof Error
                ? error.message
                : "Não foi possível sincronizar.",
          };
        }
      }
      return profile;
    },
    staleTime: 60000,
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: own ? 60 * 60 * 1000 : false,
  });
}
export function RetroAchievementsLink({ nickname }: { nickname: string }) {
  const { session } = useAuth();
  const { ui, colors: c } = useTheme();
  const router = useRouter();
  const client = useQueryClient();
  const query = useRetroProfile(nickname);
  const own = session?.user.nickname.toLowerCase() === nickname.toLowerCase();
  const mutation = useMutation({
    mutationFn: () => syncRetroProfile(session!.token),
    onSuccess: () => {
      void client.invalidateQueries({
        queryKey: ["ra-profile", nickname.toLowerCase()],
      });
    },
  });
  if (!own && !query.data?.linked) return null;
  return (
    <View style={[ui.panel, { gap: 12 }]}>
      <View style={ui.row}>
        <Trophy size={22} color={c.gold} />
        <Text style={ui.sectionTitle}>RetroAchievements</Text>
      </View>
      <Text style={ui.subtitle}>
        Conquiste 100% do conjunto principal de conquistas em Softcore ou
        Hardcore para receber a badge do jogo no seu perfil.
      </Text>
      {query.isPending ? (
        <Text style={ui.subtitle}>Carregando vínculo…</Text>
      ) : query.isError ? (
        <Text style={{ color: c.warningText }}>{query.error.message}</Text>
      ) : query.data?.linked ? (
        <>
          <Text style={ui.body}>
            {query.data.badges.length} badges importadas
          </Text>
          <Text style={ui.subtitle}>
            {query.data.synced_at
              ? "Última sincronização: " +
                new Date(query.data.synced_at).toLocaleString()
              : "Aguardando a primeira sincronização."}
          </Text>
          {query.data.source_url && (
            <Button
              small
              variant="ghost"
              onPress={() => {
                void Linking.openURL(query.data!.source_url!);
              }}
            >
              Abrir perfil vinculado ↗
            </Button>
          )}
          {(query.data.sync_error || query.data.last_error) && (
            <Text style={{ color: c.warningText }}>
              {query.data.sync_error ??
                "A última sincronização falhou. O progresso anterior foi mantido."}
            </Text>
          )}
        </>
      ) : (
        <Text style={ui.subtitle}>
          Salve o link do seu perfil RetroAchievements no campo acima para
          vincular os jogos.
        </Text>
      )}
      {own && (
        <View style={ui.wrap}>
          <Button
            small
            variant="outline"
            disabled={
              mutation.isPending || query.isFetching || !query.data?.linked
            }
            icon={<RefreshCw size={14} color={c.muted} />}
            onPress={() => mutation.mutate()}
          >
            {mutation.isPending || query.isFetching
              ? "Sincronizando…"
              : "Sincronizar"}
          </Button>
          <Button
            small
            variant="ghost"
            onPress={() => {
              void query.refetch();
            }}
          >
            Atualizar vínculo
          </Button>
          <Button
            small
            variant="ghost"
            onPress={() => router.push("/friend-codes")}
          >
            Editar vínculo
          </Button>
        </View>
      )}
      {mutation.isError && (
        <Text style={{ color: c.warningText }}>{mutation.error.message}</Text>
      )}
      {mutation.isSuccess && (
        <Text style={{ color: c.green }}>
          {mutation.data.cached
            ? "Dados recentes já sincronizados. Nova consulta disponível após uma hora."
            : "Badges sincronizadas!"}
        </Text>
      )}
    </View>
  );
}
const supported = new Set([
  "red-blue",
  "yellow",
  "gold-silver",
  "crystal",
  "ruby-sapphire",
  "emerald",
  "firered-leafgreen",
  "diamond-pearl",
  "platinum",
  "heartgold-soulsilver",
  "black-white",
  "black-2-white-2",
]);
export function RetroGameStatus({ game }: { game: string }) {
  const { session } = useAuth();
  const query = useRetroProfile(session?.user.nickname ?? "");
  const { ui, colors: c } = useTheme();
  if (!supported.has(game) || !query.data?.linked) return null;
  const badges = query.data.badges.filter((b) => b.game === game);
  return (
    <View
      style={{
        padding: 14,
        borderWidth: 1,
        borderColor: c.line,
        borderRadius: 12,
        gap: 5,
      }}
    >
      <Text style={[ui.label, { color: c.accent }]}>
        Vinculado ao RetroAchievements
      </Text>
      <Text style={ui.subtitle}>
        {badges.length
          ? badges
              .map(
                (b) =>
                  b.title +
                  " · 100% " +
                  (b.mode === "hardcore" ? "Hardcore" : "Softcore"),
              )
              .join("\n")
          : "Conclua 100% das conquistas de uma edição compatível para receber sua badge automaticamente."}
      </Text>
    </View>
  );
}
