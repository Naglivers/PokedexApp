import React from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useTheme } from "../../src/theme";
import { dexTrackers } from "../../src/features/tracker/trackers";

export default function DexTrackerIndex() {
  const { colors: c, ui } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  return (
    <View style={ui.page}>
      <Text style={ui.title}>Dex Tracker</Text>
      <Text style={ui.subtitle}>
        Escolha uma coleção para acompanhar seu progresso.
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
        {dexTrackers.map(({ slug, title, description, Icon }) => (
          <Pressable
            key={slug}
            accessibilityRole="link"
            accessibilityLabel={title}
            onPress={() => router.push(`/dex-tracker/${slug}`)}
            style={({ pressed }) => [
              ui.panel,
              {
                width: width < 650 ? "100%" : "47%",
                gap: 12,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <View style={ui.between}>
              <Icon size={26} color={c.accent} />
              <ChevronRight size={20} color={c.muted} />
            </View>
            <Text style={ui.sectionTitle}>{title}</Text>
            <Text style={ui.subtitle}>{description}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
