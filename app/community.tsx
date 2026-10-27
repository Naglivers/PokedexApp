import React, { useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { BarChart3, MessageSquare, Newspaper } from "lucide-react-native";
import { useTheme } from "../src/theme";
import { ForumFeed } from "../src/features/community/forum/ForumFeed";
import CommunityRankings from "../src/features/community/CommunityRankings";

export default function Community() {
  const { colors: c, ui } = useTheme();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<"forum" | "news" | "rankings">("forum");
  return (
    <>
      <View style={[ui.page, width < 650 && { padding: 18 }]}>
        <View style={{ gap: 7 }}>
          <Text style={[ui.label, { color: c.accent }]}>
            TREINADORES CONECTADOS
          </Text>
          <Text style={ui.title}>Comunidade Pokéatlas</Text>
          <Text style={ui.subtitle}>
            Um lugar para compartilhar sua jornada, conversar e acompanhar o
            mundo Pokémon.
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 22,
            borderBottomWidth: 1,
            borderBottomColor: c.line,
          }}
        >
          {(
            [
              { key: "forum", label: "Fórum", Icon: MessageSquare },
              { key: "news", label: "Notícias", Icon: Newspaper },
              { key: "rankings", label: "Rankings", Icon: BarChart3 },
            ] as const
          ).map(({ key, label, Icon }) => (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === key }}
              onPress={() => setTab(key)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 7,
                paddingVertical: 14,
                borderBottomWidth: 2,
                borderBottomColor: tab === key ? c.accent : "transparent",
              }}
            >
              <Icon size={16} color={tab === key ? c.accent : c.muted} />
              <Text
                style={{
                  color: tab === key ? c.accent : c.muted,
                  fontSize: 12,
                  fontWeight: "700",
                }}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        {tab !== "rankings" && (
          <ForumFeed key={tab} kind={tab === "news" ? "news" : "all"} />
        )}
      </View>
      {tab === "rankings" && <CommunityRankings />}
    </>
  );
}
