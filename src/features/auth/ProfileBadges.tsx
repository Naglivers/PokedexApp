import React, { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { publicQuestBadges } from "../../services/gameQuests";
import { useRouter } from "expo-router";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Gem,
  LockKeyhole,
  Sparkles,
  Star,
} from "lucide-react-native";
import { trackerGames } from "../../services/gameDex";
import type { PublicProfile } from "../../services/publicProfile";
import { font, useTheme, useThemedStyles, type ThemeColors } from "../../theme";
import { GameIcons } from "../tracker/GameIcons";
import { megaTotal } from "../tracker/megaDex";
import { useRetroProfile } from "./RetroAchievementsLink";

type Badge = {
  id: string;
  title: string;
  count: number;
  total: number;
  icon: React.ReactNode;
  eligible?: boolean;
  path?: string;
  retroCompleted?: boolean;
};

function HomeBadgeIcon({ shiny = false }: { shiny?: boolean }) {
  const { colors: c } = useTheme();
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Image
        source={require("../../../assets/brand/pokemon-home-logo.png")}
        accessibilityLabel="Pokémon HOME"
        resizeMode="contain"
        style={{ width: 92, height: 66 }}
      />
      {shiny && (
        <Sparkles
          size={21}
          color={c.gold}
          style={{ position: "absolute", right: -3, top: -4 }}
        />
      )}
    </View>
  );
}

export function ProfileBadges({
  profile,
  nationalTotal,
  compact = false,
  onOpenGallery,
}: {
  profile: PublicProfile;
  nationalTotal: number;
  compact?: boolean;
  onOpenGallery?: () => void;
}) {
  const { colors: c, ui } = useTheme();
  const s = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const router = useRouter();
  const retroQuery = useRetroProfile(profile.nickname);
  const retroBadges: Badge[] = (retroQuery.data?.badges ?? []).map((game) => ({
    id: "ra-" + game.ra_game_id,
    title:
      game.title +
      " · RetroAchievements · " +
      (game.mode === "hardcore" ? "Hardcore" : "Softcore"),
    count: game.awarded,
    total: game.total,
    icon: game.image ? (
      <Image
        source={{ uri: "https://media.retroachievements.org" + game.image }}
        resizeMode="contain"
        style={{
          width: compact ? 92 : 54,
          height: compact ? 92 : 54,
          borderRadius: 6,
        }}
      />
    ) : (
      <GameIcons versions={game.versions} size={compact ? 76 : 40} />
    ),
  }));
  const questQuery = useQuery({
    queryKey: ["quest-badges", profile.nickname.toLowerCase()],
    queryFn: ({ signal }) => publicQuestBadges(profile.nickname, signal),
    staleTime: 0,
    retry: false,
  });
  const questBadges: Badge[] = (questQuery.data ?? []).map((game) => ({
    id: "quest-" + game.game,
    title: game.title + " · Jogo concluído",
    count: game.completed,
    total: game.total,
    path: "/questline/" + game.game,
    icon: <GameIcons versions={game.versions} size={compact ? 76 : 40} />,
  }));
  const dexBadges: Badge[] = [
    {
      id: "megadex",
      title: "Megadex completa",
      count: profile.trackers.megadex,
      total: megaTotal,
      icon: <Gem size={54} color={c.accent} />,
    },
    {
      id: "pokedex",
      title: "Pokédex completa",
      count: profile.trackers.pokedex,
      total: nationalTotal,
      icon: <HomeBadgeIcon />,
    },
    {
      id: "shinydex",
      title: "Shinydex completa",
      count: profile.trackers.shinydex,
      total: nationalTotal,
      icon: <HomeBadgeIcon shiny />,
    },
  ];
  const retroCompletedGames = new Set(
    (retroQuery.data?.badges ?? []).map((game) => game.game),
  );
  const gameBadges: Badge[] = trackerGames.map((game) => ({
    id: game.key,
    title: game.title,
    count: profile.games[game.key] ?? 0,
    retroCompleted: retroCompletedGames.has(game.key),
    total: game.total,
    icon: <GameIcons versions={game.versions} size={compact ? 76 : 40} />,
  }));
  const complete = (badge: Badge) =>
    badge.eligible !== false &&
    badge.total > 0 &&
    (badge.retroCompleted === true || badge.count >= badge.total);
  const allBadges = [
    ...retroBadges,
    ...dexBadges,
    ...gameBadges,
    ...questBadges,
  ];
  const earned = allBadges.filter(complete).length;
  const dlcKeys = new Set(
    trackerGames.filter((game) => game.parentGame).map((game) => game.key),
  );
  const groups = [
    {
      title: "RetroAchievements",
      description:
        "100% do conjunto principal de conquistas, confirmado na sincronização. Uma badge por jogo, em Softcore ou Hardcore.",
      badges: retroBadges,
    },
    {
      title: "Insígnias de conclusão dos jogos",
      description:
        "História principal, pós-jogo e todas as missões secundárias. Cada expansão tem sua própria insígnia.",
      badges: questBadges,
    },
    {
      title: "Badges de Dex",
      description:
        "Conquiste os emblemas da Pokédex, Shinydex e Megadex ao completar cada coleção.",
      badges: dexBadges,
    },
    {
      title: "Badges de Livingdex dos jogos",
      description:
        "Complete a coleção ou conquiste 100% no RetroAchievements em uma das edições do conjunto.",
      badges: gameBadges.filter((badge) => !dlcKeys.has(badge.id)),
    },
    {
      title: "Badges de Livingdex das DLCs",
      description: "Cada expansão tem sua própria conquista.",
      badges: gameBadges.filter((badge) => dlcKeys.has(badge.id)),
    },
  ];
  if (compact)
    return (
      <BadgeStrip
        key={profile.nickname}
        badges={allBadges.filter(complete)}
        loading={questQuery.isPending || retroQuery.isPending || !nationalTotal}
        failed={questQuery.isError || retroQuery.isError}
        onOpenGallery={onOpenGallery}
      />
    );
  return (
    <View style={s.gallery}>
      <View style={s.heading}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={ui.sectionTitle}>Badges do treinador</Text>
          <Text style={ui.subtitle}>
            {earned} / {allBadges.length} conquistadas
          </Text>
        </View>
        <Award size={28} color={c.gold} />
      </View>
      {questQuery.isPending && (
        <Text style={ui.subtitle}>Carregando insígnias da Questline…</Text>
      )}
      {(retroQuery.isError || retroQuery.data?.sync_error) && (
        <Text style={{ color: c.warningText }}>
          {retroQuery.isError
            ? retroQuery.error.message
            : retroQuery.data?.sync_error}
        </Text>
      )}
      {questQuery.isError && (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void questQuery.refetch();
          }}
        >
          <Text style={{ color: c.warningText }}>
            {questQuery.error.message} Toque para tentar novamente.
          </Text>
        </Pressable>
      )}
      {groups
        .filter((group) => group.badges.length > 0)
        .map((group) => (
          <View key={group.title} style={s.section}>
            <View style={{ gap: 5 }}>
              <Text style={s.sectionTitle}>
                {group.title} · {group.badges.filter(complete).length} /{" "}
                {group.badges.length}
              </Text>
              <Text style={ui.subtitle}>{group.description}</Text>
            </View>
            <View style={s.grid}>
              {group.badges.map((badge) => {
                const unlocked = complete(badge);
                const count = Math.min(badge.count, badge.total);
                const pending = badge.total === 0;
                return (
                  <Pressable
                    key={badge.id}
                    disabled={!badge.path}
                    accessibilityRole={badge.path ? "link" : undefined}
                    onPress={() => {
                      if (badge.path) router.push(badge.path);
                    }}
                    accessible
                    accessibilityLabel={`${badge.title}: ${unlocked ? "badge conquistada" : pending ? "carregando progresso" : `${count} de ${badge.total}, ainda não conquistada`}`}
                    style={[
                      s.card,
                      { width: width < 650 ? "47%" : "23%" },
                      unlocked && {
                        borderColor: c.gold,
                        backgroundColor: c.goldSoft,
                      },
                    ]}
                  >
                    <View
                      style={[
                        s.emblem,
                        {
                          borderColor: unlocked ? c.gold : c.line,
                          opacity: unlocked ? 1 : 0.4,
                        },
                      ]}
                    >
                      {badge.icon}
                    </View>
                    <Text style={s.title}>{badge.title}</Text>
                    <View style={s.status}>
                      {unlocked ? (
                        <Award size={14} color={c.gold} />
                      ) : (
                        <LockKeyhole size={12} color={c.muted} />
                      )}
                      <Text
                        style={[s.statusText, unlocked && { color: c.gold }]}
                      >
                        {unlocked
                          ? "Conquistada!"
                          : badge.eligible === false
                            ? "Catálogo em revisão"
                            : "Em progresso"}
                      </Text>
                    </View>
                    <Text style={s.count}>
                      {badge.retroCompleted
                        ? "Conquistada via RetroAchievements"
                        : pending
                          ? badge.path
                            ? "Catálogo pendente"
                            : "Carregando dex…"
                          : `${count} / ${badge.total}`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
    </View>
  );
}

function BadgeStrip({
  badges,
  loading,
  failed,
  onOpenGallery,
}: {
  badges: Badge[];
  loading: boolean;
  failed: boolean;
  onOpenGallery?: () => void;
}) {
  const { colors: c } = useTheme();
  const scroll = useRef<ScrollView>(null);
  const [offset, setOffset] = useState(0);
  const [viewport, setViewport] = useState(280);
  const [selected, setSelected] = useState<string | null>(null);
  const selectedBadge = badges.find((badge) => badge.id === selected);
  const overflow = badges.length * 56 > viewport + 1;
  const move = (direction: number) =>
    scroll.current?.scrollTo({
      x: Math.max(
        0,
        Math.min(badges.length * 56 - viewport, offset + direction * 56 * 4),
      ),
      animated: true,
    });
  if (!badges.length)
    return (
      <Pressable
        onPress={onOpenGallery}
        disabled={!onOpenGallery}
        accessibilityRole={onOpenGallery ? "button" : undefined}
      >
        <Text style={{ color: c.muted, fontSize: 11, paddingVertical: 6 }}>
          {failed
            ? "Não foi possível carregar todas as insígnias · Ver badges"
            : loading
              ? "Carregando insígnias…"
              : "Ainda sem insígnias conquistadas"}
        </Text>
      </Pressable>
    );
  return (
    <View style={{ width: "100%", maxWidth: 360, gap: 3 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <ScrollView
          ref={scroll}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1, minWidth: 0 }}
          contentContainerStyle={{ paddingVertical: 9 }}
          onLayout={(event) => setViewport(event.nativeEvent.layout.width)}
          onScroll={(event) => setOffset(event.nativeEvent.contentOffset.x)}
          scrollEventThrottle={32}
          snapToInterval={56}
          decelerationRate="fast"
          accessibilityLabel="Insígnias conquistadas do treinador"
        >
          {badges.map((badge) => {
            const quest = badge.id.startsWith("quest-");
            const dex = ["pokedex", "shinydex", "megadex"].includes(badge.id);
            const metal =
              badge.id === "shinydex"
                ? "#bda1ef"
                : quest
                  ? "#d5ae55"
                  : dex
                    ? "#d9b963"
                    : "#9eafc2";
            const active = selected === badge.id;
            return (
              <Pressable
                key={badge.id}
                accessibilityRole="button"
                accessibilityLabel={badge.title + ": insígnia conquistada"}
                accessibilityState={{ selected: active }}
                onPress={() =>
                  setSelected((value) => (value === badge.id ? null : badge.id))
                }
                onHoverIn={() => setSelected(badge.id)}
                style={({ pressed }) => ({
                  width: 56,
                  height: 55,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.7 : 1,
                  transform: [{ translateY: active ? -2 : 0 }],
                })}
              >
                <View
                  style={{
                    position: "absolute",
                    width: dex ? 46 : 38,
                    height: dex ? 46 : 38,
                    borderRadius: dex ? 24 : 7,
                    transform: [{ rotate: dex ? "0deg" : "45deg" }],
                    backgroundColor: c.surfaceAlt,
                    borderWidth: 2,
                    borderColor: metal,
                    shadowColor: metal,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: active ? 0.5 : 0.22,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                />
                <View
                  style={{
                    position: "absolute",
                    width: dex ? 38 : 30,
                    height: dex ? 38 : 30,
                    borderRadius: dex ? 20 : 4,
                    transform: [{ rotate: dex ? "0deg" : "45deg" }],
                    borderWidth: 1,
                    borderColor: metal,
                    opacity: 0.5,
                  }}
                />
                <View
                  pointerEvents="none"
                  style={{
                    width: 110,
                    height: 94,
                    position: "absolute",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: [{ scale: 0.38 }],
                  }}
                >
                  {badge.icon}
                </View>
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    bottom: 0,
                    alignItems: "center",
                    backgroundColor: c.surface,
                    borderColor: metal,
                    borderWidth: 1,
                    borderRadius: 4,
                    paddingHorizontal: 4,
                    paddingVertical: 1,
                  }}
                >
                  <Star size={9} color={metal} fill={metal} />
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
        {overflow && (
          <View style={{ gap: 2 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Insígnias anteriores"
              disabled={offset < 1}
              onPress={() => move(-1)}
              hitSlop={5}
              style={{ padding: 3, opacity: offset < 1 ? 0.25 : 1 }}
            >
              <ChevronLeft size={18} color={c.muted} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Próximas insígnias"
              disabled={offset >= badges.length * 56 - viewport - 1}
              onPress={() => move(1)}
              hitSlop={5}
              style={{
                padding: 3,
                opacity: offset >= badges.length * 56 - viewport - 1 ? 0.25 : 1,
              }}
            >
              <ChevronRight size={18} color={c.muted} />
            </Pressable>
          </View>
        )}
      </View>
      <Pressable
        onPress={onOpenGallery}
        disabled={!onOpenGallery}
        accessibilityRole={onOpenGallery ? "button" : undefined}
      >
        <Text
          numberOfLines={2}
          style={{ color: c.muted, fontSize: 10, lineHeight: 15 }}
        >
          {selectedBadge
            ? selectedBadge.title
            : badges.length +
              (badges.length === 1
                ? " insígnia conquistada"
                : " insígnias conquistadas")}
          {onOpenGallery ? " · Ver badges" : ""}
        </Text>
      </Pressable>
    </View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    gallery: { marginTop: 32, gap: 22 },
    heading: { flexDirection: "row", alignItems: "center", gap: 12 },
    section: {
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: c.line,
      gap: 16,
    },
    sectionTitle: { ...font, color: c.ink, fontSize: 15, fontWeight: "700" },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    card: {
      alignItems: "center",
      padding: 14,
      gap: 9,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.surface,
    },
    emblem: {
      width: 108,
      height: 94,
      borderRadius: 25,
      borderWidth: 2,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      ...font,
      color: c.ink,
      fontSize: 12,
      fontWeight: "700",
      textAlign: "center",
      lineHeight: 18,
    },
    status: { flexDirection: "row", alignItems: "center", gap: 5 },
    statusText: { ...font, color: c.muted, fontSize: 11, fontWeight: "600" },
    count: { ...font, color: c.muted, fontSize: 11 },
  });
