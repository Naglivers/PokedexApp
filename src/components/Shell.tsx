import React, { useState } from "react";
import { version } from "../../package.json";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { usePathname, useRouter } from "expo-router";
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  ChevronRight,
  Code2,
  Compass,
  Dna,
  Gamepad2,
  Heart,
  Gem,
  Home,
  Leaf,
  Map,
  Menu,
  ScanLine,
  Shield,
  Shuffle,
  Sparkles,
  Swords,
  Users,
  X,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors as c, font, ui } from "../theme";
import { IconButton, SearchInput } from "./ui";
import { useFavorites } from "../store/favorites";

const navigation = [
  {
    group: "EXPLORAR",
    items: [
      ["/", "Visão geral", Home],
      ["/pokedex", "Pokédex", ScanLine],
      ["/mega-dex", "Mega Dex", Gem],
      ["/catalog/type", "Tipos", Dna],
      ["/catalog/move", "Golpes", Swords],
      ["/catalog/ability", "Habilidades", Sparkles],
      ["/catalog/item", "Itens", Shield],
    ],
  },
  {
    group: "UNIVERSO POKÉMON",
    items: [
      ["/catalog/generation", "Jogos e gerações", Gamepad2],
      ["/catalog/region", "Regiões", Map],
      ["/catalog/berry", "Frutas", Leaf],
      ["/api-explorer", "Todas as categorias", Compass],
    ],
  },
  {
    group: "SEU ESPAÇO",
    items: [
      ["/favorites", "Favoritos", Heart],
      ["/community", "Comunidade", BarChart3],
      ["/compare", "Comparador", Shuffle],
      ["/team-builder", "Minha equipe", Users],
    ],
  },
] as const;
export function Shell({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const desktop = width >= 1080;
  const mobile = width < 650;
  const path = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState("");
  const favorites = useFavorites((state) => state.ids.length);
  const go = (href: string) => {
    router.push(href);
    setMenu(false);
  };
  const nav = (
    <View style={s.sideContent}>
      <Pressable
        accessibilityRole="link"
        onPress={() => go("/")}
        style={s.brand}
      >
        <View style={s.brandIcon}>
          <ScanLine size={23} color="#FFF" strokeWidth={2.1} />
        </View>
        <View>
          <Text style={s.brandName}>
            poké<Text style={{ color: "#EE7B70" }}>atlas</Text>
          </Text>
          <Text style={s.brandSub}>SEU GUIA POKÉMON</Text>
        </View>
      </Pressable>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 26, paddingBottom: 15 }}
      >
        {navigation.map((group) => (
          <View key={group.group} style={{ gap: 5 }}>
            <Text style={s.groupLabel}>{group.group}</Text>
            {group.items.map(([href, label, Icon]) => {
              const active =
                path === href || (href !== "/" && path.startsWith(href));
              return (
                <Pressable
                  key={href}
                  accessibilityRole="link"
                  accessibilityLabel={label}
                  onPress={() => go(href)}
                  style={({
                    hovered,
                  }: {
                    hovered?: boolean;
                    pressed?: boolean;
                  }) => [
                    s.navItem,
                    active && s.navActive,
                    hovered && !active && { backgroundColor: "#223045" },
                  ]}
                >
                  <Icon
                    size={17}
                    strokeWidth={1.7}
                    color={active ? "#F18F80" : "#8E9CAF"}
                  />
                  <Text
                    style={[
                      s.navText,
                      active && { color: "#FFF", fontWeight: "600" },
                    ]}
                  >
                    {label}
                  </Text>
                  {href === "/favorites" && favorites > 0 && (
                    <Text style={s.navCount}>{favorites}</Text>
                  )}
                  {active && <View style={s.activeDot} />}
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
      <View style={s.sideFoot}>
        <View style={ui.between}>
          <View style={ui.row}>
            <View style={s.sourceDot} />
            <Text style={s.sourceText}>Explorar. Descobrir. Colecionar.</Text>
          </View>
        </View>
        <Text style={s.copyright}>Dados abertos da PokéAPI · v2</Text>
        <Text style={s.copyright}>Pokéatlas · v{version}</Text>
      </View>
    </View>
  );
  return (
    <SafeAreaView edges={["top", "bottom"]} style={s.safe}>
      <View style={s.root}>
        {desktop && <View style={s.sidebar}>{nav}</View>}
        <View style={s.workspace}>
          <View
            style={[s.header, mobile && { paddingHorizontal: 16, gap: 12 }]}
          >
            <View style={[ui.row, { flex: 1, minWidth: 0, maxWidth: 640 }]}>
              {!desktop && (
                <IconButton label="Abrir menu" onPress={() => setMenu(true)}>
                  <Menu size={20} color={c.ink} />
                </IconButton>
              )}
              {!mobile && (
                <View style={s.breadcrumb}>
                  <BookOpen size={15} color={c.muted} />
                  <Text style={s.breadcrumbText}>Pokémon Database</Text>
                  <ChevronRight size={13} color="#B4BCC7" />
                </View>
              )}
              <View style={{ flex: 1, minWidth: 0 }}>
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder={
                    mobile
                      ? "Buscar Pokémon, golpes…"
                      : "Pesquise Pokémon, golpes, habilidades…"
                  }
                  onSubmit={() => {
                    if (search.trim()) {
                      router.push({
                        pathname: "/search",
                        params: { q: search.trim() },
                      });
                      setSearch("");
                    }
                  }}
                />
              </View>
            </View>
            <View style={[ui.row, { gap: 9 }]}>
              <IconButton
                label="Meus favoritos"
                onPress={() => go("/favorites")}
              >
                <Heart size={18} color={c.muted} />
              </IconButton>
              {!mobile && (
                <>
                  <View style={s.headerDivider} />
                  <View style={s.avatar}>
                    <Text
                      style={{
                        color: "#8A6C3F",
                        fontSize: 11,
                        fontWeight: "800",
                      }}
                    >
                      TR
                    </Text>
                  </View>
                  <View>
                    <Text style={s.trainer}>Olá, treinador!</Text>
                    <Text style={s.trainerSub}>Sua aventura começa aqui</Text>
                  </View>
                </>
              )}
            </View>
          </View>
          <ScrollView
            key={path}
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ flex: 1 }}>{children}</View>
            <View style={[s.footer, mobile && { paddingHorizontal: 20 }]}>
              <Text style={s.footerText}>
                Feito para quem nunca deixou de explorar.
              </Text>
              <Pressable
                accessibilityRole="link"
                onPress={() => go("/api-explorer")}
                style={ui.row}
              >
                <Text style={s.footerText}>PokéAPI · Projeto de fãs</Text>
                <ArrowUpRight size={12} color={c.muted} />
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
      <Modal
        visible={menu && !desktop}
        transparent
        animationType="fade"
        onRequestClose={() => setMenu(false)}
      >
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            backgroundColor: "#0D152BB3",
          }}
        >
          <View style={[s.sidebar, { width: 270 }]}>
            {nav}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar menu"
              onPress={() => setMenu(false)}
              style={s.closeMenu}
            >
              <X size={19} color="#FFF" />
            </Pressable>
          </View>
          <Pressable
            style={{ flex: 1 }}
            onPress={() => setMenu(false)}
            accessibilityLabel="Fechar menu"
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  root: { flex: 1, flexDirection: "row" },
  sidebar: { width: 222, backgroundColor: c.navy },
  sideContent: { flex: 1, padding: 16, paddingTop: 30 },
  brand: {
    flexDirection: "row",
    gap: 9,
    alignItems: "center",
    paddingHorizontal: 10,
    marginBottom: 39,
  },
  brandIcon: {
    backgroundColor: c.accent,
    width: 35,
    height: 35,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    ...font,
    fontWeight: "800",
    fontSize: 23,
    letterSpacing: -0.8,
    color: "#F7F8FC",
  },
  brandSub: {
    ...font,
    color: "#7F90A6",
    fontSize: 7,
    letterSpacing: 2,
    marginTop: 2,
  },
  groupLabel: {
    ...font,
    fontSize: 8,
    fontWeight: "600",
    color: "#78889F",
    letterSpacing: 1.5,
    paddingHorizontal: 13,
    marginBottom: 9,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderRadius: 8,
  },
  navActive: { backgroundColor: "#2F333F" },
  navText: { ...font, fontSize: 11, color: "#A6B2C2", flex: 1 },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#EE8274",
  },
  navCount: { fontSize: 9, color: "#F5B1A7" },
  sideFoot: {
    borderTopWidth: 1,
    borderTopColor: "#2B3748",
    paddingTop: 20,
    marginTop: 16,
    gap: 8,
    paddingHorizontal: 7,
  },
  sourceDot: {
    width: 5,
    height: 5,
    backgroundColor: "#74BCAA",
    borderRadius: 4,
  },
  sourceText: { ...font, color: "#A5B3C5", fontSize: 8 },
  copyright: { ...font, fontSize: 8, color: "#63758D", marginLeft: 15 },
  workspace: { flex: 1, minWidth: 0 },
  header: {
    height: 78,
    borderBottomWidth: 1,
    borderBottomColor: c.line,
    backgroundColor: "#FFF",
    paddingHorizontal: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 28,
  },
  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginRight: 13,
  },
  breadcrumbText: { ...font, color: c.muted, fontSize: 10 },
  headerDivider: {
    height: 24,
    width: 1,
    backgroundColor: c.line,
    marginHorizontal: 6,
  },
  avatar: {
    width: 33,
    height: 33,
    borderRadius: 12,
    backgroundColor: "#F6EDD9",
    alignItems: "center",
    justifyContent: "center",
  },
  trainer: { ...font, fontSize: 10, fontWeight: "700", color: c.ink },
  trainerSub: { ...font, fontSize: 8, color: c.muted, marginTop: 4 },
  footer: {
    paddingHorizontal: 30,
    paddingVertical: 21,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "center",
    justifyContent: "space-between",
    borderTopColor: c.line,
    borderTopWidth: 1,
    marginTop: 18,
  },
  footerText: { ...font, fontSize: 9, color: "#9199A5" },
  closeMenu: { position: "absolute", right: 12, top: 9, padding: 8 },
});
