import React from "react";
import {
  Image,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Award, Gem, LockKeyhole, Sparkles } from "lucide-react-native";
import { trackerGames } from "../../services/gameDex";
import type { PublicProfile } from "../../services/publicProfile";
import { font, useTheme, useThemedStyles, type ThemeColors } from "../../theme";
import { GameIcons } from "../tracker/GameIcons";
import { megaTotal } from "../tracker/megaDex";

type Badge = {
  id: string;
  title: string;
  count: number;
  total: number;
  icon: React.ReactNode;
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
}: {
  profile: PublicProfile;
  nationalTotal: number;
}) {
  const { colors: c, ui } = useTheme();
  const s = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
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
  const gameBadges: Badge[] = trackerGames.map((game) => ({
    id: game.key,
    title: game.title,
    count: profile.games[game.key] ?? 0,
    total: game.total,
    icon: <GameIcons versions={game.versions} size={40} />,
  }));
  const complete = (badge: Badge) =>
    badge.total > 0 && badge.count >= badge.total;
  const allBadges = [...dexBadges, ...gameBadges];
  const earned = allBadges.filter(complete).length;
  const dlcKeys = new Set(
    trackerGames.filter((game) => game.parentGame).map((game) => game.key),
  );
  const groups = [
    {
      title: "Badges de Dex",
      description:
        "Conquiste os emblemas da Pokédex, Shinydex e Megadex ao completar cada coleção.",
      badges: dexBadges,
    },
    {
      title: "Badges dos jogos",
      description: "Uma badge para cada conjunto de jogos concluído.",
      badges: gameBadges.filter((badge) => !dlcKeys.has(badge.id)),
    },
    {
      title: "Badges de DLCs",
      description: "Cada expansão tem sua própria conquista.",
      badges: gameBadges.filter((badge) => dlcKeys.has(badge.id)),
    },
  ];
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
      {groups.map((group) => (
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
                <View
                  key={badge.id}
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
                    <Text style={[s.statusText, unlocked && { color: c.gold }]}>
                      {unlocked ? "Conquistada!" : "Em progresso"}
                    </Text>
                  </View>
                  <Text style={s.count}>
                    {pending ? "Carregando dex…" : `${count} / ${badge.total}`}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ))}
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
