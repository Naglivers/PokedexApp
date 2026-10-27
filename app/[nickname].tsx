import React, { useMemo } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Head from "expo-router/head";
import { useQuery } from "@tanstack/react-query";
import { Award, RefreshCw, Settings } from "lucide-react-native";
import { Button, Empty, ErrorState, Loading } from "../src/components/ui";
import { ProfileAvatar } from "../src/features/auth/ProfileAvatar";
import { useAuth } from "../src/features/auth/AuthProvider";
import { dexTrackers } from "../src/features/tracker/trackers";
import { createTrackerBoxes } from "../src/features/tracker/boxes";
import { indexOptions } from "../src/services/queries";
import { trackerGames } from "../src/services/gameDex";
import {
  getPublicProfile,
  publicProfilePath,
} from "../src/services/publicProfile";
import {
  font,
  useTheme,
  useThemedStyles,
  type ThemeColors,
} from "../src/theme";

export default function PublicProfileRoute() {
  const params = useLocalSearchParams<{ nickname: string }>();
  const nickname = typeof params.nickname === "string" ? params.nickname : "";
  const { session } = useAuth();
  const { colors: c, ui } = useTheme();
  const s = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const router = useRouter();
  const profile = useQuery({
    queryKey: ["public-profile", nickname.toLowerCase()],
    queryFn: ({ signal }) => getPublicProfile(nickname, signal),
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: true,
  });
  const species = useQuery({
    ...indexOptions("pokemon-species"),
    enabled: !!profile.data,
  });
  const total = useMemo(
    () =>
      createTrackerBoxes(species.data?.results ?? []).reduce(
        (sum, box) => sum + box.length,
        0,
      ),
    [species.data],
  );
  const ownProfile =
    !!profile.data &&
    session?.user.nickname.toLowerCase() ===
      profile.data.nickname.toLowerCase();

  if (profile.isPending) return <Loading text="Carregando perfil…" />;
  if (profile.isError)
    return (
      <ErrorState
        retry={() => {
          void profile.refetch();
        }}
      />
    );
  if (!profile.data)
    return (
      <Empty
        title="Treinador não encontrado"
        description="Não encontramos uma conta com esse nickname."
        action={
          <Button onPress={() => router.replace("/")}>Voltar ao início</Button>
        }
      />
    );
  const user = profile.data;
  const completedGames = trackerGames.filter(
    (game) => (user.games?.[game.key] ?? 0) >= game.total,
  ).length;

  return (
    <View style={[ui.page, width < 650 && { padding: 18 }]}>
      <Head>
        <title>{user.nickname} · Pokéatlas</title>
      </Head>
      <View style={s.content}>
        <Text style={s.eyebrow}>PERFIL DO TREINADOR</Text>
        <View style={[s.hero, width < 650 && s.mobileHero]}>
          <View style={s.avatar}>
            <ProfileAvatar uri={user.avatar_url} size={96} />
          </View>
          <View style={s.identity}>
            <Text style={s.nickname}>{user.nickname}</Text>
            <Text style={s.path}>{publicProfilePath(user.nickname)}</Text>
            <Text style={s.description}>
              Uma jornada, muitas descobertas. Acompanhe a coleção deste
              treinador.
            </Text>
          </View>
          {ownProfile && (
            <Button
              small
              variant="outline"
              icon={<Settings size={14} color={c.muted} />}
              onPress={() => router.push("/profile")}
            >
              Editar perfil
            </Button>
          )}
        </View>

        <View style={s.sectionHeader}>
          <Text style={ui.sectionTitle}>Conclusão das dex</Text>
          <Button
            small
            variant="ghost"
            disabled={profile.isFetching || species.isFetching}
            icon={<RefreshCw size={13} color={c.muted} />}
            onPress={() => {
              void profile.refetch();
              void species.refetch();
            }}
          >
            Atualizar
          </Button>
        </View>
        {species.isPending ? (
          <Loading text="Carregando as dex…" />
        ) : species.isError ? (
          <ErrorState
            retry={() => {
              void species.refetch();
            }}
          />
        ) : (
          <View style={s.dexGrid}>
            {dexTrackers.map(({ slug, title, Icon }) => {
              const nationalDex = slug === "pokedex" || slug === "shinydex";
              const available = nationalDex || slug === "gamesdex";
              const dexTotal =
                slug === "gamesdex" ? trackerGames.length : total;
              const captured =
                slug === "gamesdex"
                  ? completedGames
                  : nationalDex
                    ? Math.min(user.trackers[slug], total)
                    : 0;
              const complete =
                available && dexTotal > 0 && captured === dexTotal;
              const percent = dexTotal
                ? Math.floor((captured / dexTotal) * 100)
                : 0;
              return (
                <View
                  key={slug}
                  style={[
                    s.dexCard,
                    { width: width >= 850 ? "48.5%" : "100%" },
                  ]}
                >
                  <View style={s.cardHeader}>
                    <View style={s.dexIcon}>
                      <Icon size={20} color={c.accent} />
                    </View>
                    <Text style={s.dexTitle}>{title}</Text>
                    {complete && (
                      <View
                        accessibilityRole="image"
                        accessibilityLabel={
                          title + " completa: medalha de 100%"
                        }
                        style={s.medal}
                      >
                        <Award size={24} color={c.gold} />
                      </View>
                    )}
                  </View>
                  {available ? (
                    <>
                      <View style={s.countRow}>
                        <Text style={s.captured}>
                          {captured} <Text style={s.total}>/ {dexTotal}</Text>
                        </Text>
                        <Text
                          style={[s.percent, complete && { color: c.gold }]}
                        >
                          {percent}%
                        </Text>
                      </View>
                      <View
                        accessibilityRole="progressbar"
                        accessibilityValue={{
                          min: 0,
                          max: dexTotal,
                          now: captured,
                          text: percent + "%",
                        }}
                        style={s.progressTrack}
                      >
                        <View
                          style={[
                            s.progressFill,
                            {
                              width: (percent + "%") as `${number}%`,
                              backgroundColor: complete ? c.gold : c.accent,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[s.status, complete && { color: c.gold }]}>
                        {complete
                          ? "Coleção completa!"
                          : slug === "gamesdex"
                            ? "Medalhas de conjuntos conquistadas"
                            : slug === "shinydex"
                              ? "Pokémon shiny capturados"
                              : "Pokémon capturados"}
                      </Text>
                    </>
                  ) : (
                    <Text style={s.comingSoon}>Em preparação</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}
        {completedGames > 0 && (
          <View style={{ marginTop: 26, gap: 14 }}>
            <Text style={ui.sectionTitle}>Medalhas dos conjuntos</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {trackerGames
                .filter((game) => (user.games?.[game.key] ?? 0) >= game.total)
                .map((game) => (
                  <View
                    key={game.key}
                    accessibilityRole="image"
                    accessibilityLabel={"Medalha de " + game.title}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 9,
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: c.goldSoft,
                    }}
                  >
                    <Award size={23} color={c.gold} />
                    <Text
                      style={{ color: c.gold, fontWeight: "600", fontSize: 12 }}
                    >
                      {game.title}
                    </Text>
                  </View>
                ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    content: { width: "100%", maxWidth: 1000, alignSelf: "center" },
    eyebrow: {
      ...font,
      color: c.accent,
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 2,
      marginBottom: 16,
    },
    hero: {
      flexDirection: "row",
      alignItems: "center",
      gap: 22,
      padding: 26,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: 18,
      marginBottom: 28,
    },
    mobileHero: { flexDirection: "column", alignItems: "center", padding: 22 },
    avatar: {
      padding: 6,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: 60,
      backgroundColor: c.surfaceAlt,
    },
    identity: { flex: 1, minWidth: 0, gap: 7 },
    nickname: { ...font, color: c.ink, fontSize: 27, fontWeight: "800" },
    path: { ...font, color: c.accent, fontSize: 12 },
    description: {
      ...font,
      color: c.muted,
      fontSize: 12,
      lineHeight: 19,
      maxWidth: 420,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      marginBottom: 16,
    },
    dexGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: 18,
    },
    dexCard: {
      padding: 22,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: 16,
      backgroundColor: c.surface,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      marginBottom: 23,
    },
    dexIcon: {
      width: 38,
      height: 38,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.accentSoft,
    },
    dexTitle: {
      ...font,
      color: c.ink,
      fontSize: 14,
      fontWeight: "700",
      flex: 1,
    },
    medal: { padding: 6, borderRadius: 10, backgroundColor: c.goldSoft },
    countRow: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: 10,
    },
    captured: { ...font, color: c.ink, fontSize: 26, fontWeight: "800" },
    total: { color: c.muted, fontSize: 14, fontWeight: "400" },
    percent: { ...font, color: c.accent, fontSize: 18, fontWeight: "700" },
    progressTrack: {
      height: 6,
      borderRadius: 4,
      overflow: "hidden",
      backgroundColor: c.surfaceAlt,
      marginTop: 13,
    },
    progressFill: { height: 6, borderRadius: 4 },
    status: { ...font, color: c.muted, fontSize: 11, marginTop: 11 },
    comingSoon: { ...font, color: c.muted, fontSize: 12, marginBottom: 7 },
  });
