import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useQueries } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Swords } from "lucide-react-native";
import { types } from "../src/constants/pokemon";
import { useTheme, useThemedStyles, type ThemeColors } from "../src/theme";
import { Badge, ErrorState, Loading, Select } from "../src/components/ui";
import { getResource, TypeDetail } from "../src/services/api";
import { defensiveMultiplier } from "../src/utils/pokemon";

const names = Object.keys(types);
const options = names.map((name) => ({ value: name, label: types[name].name }));
const multiplierLabel = (value: number) =>
  `${value === 0.5 ? "½" : value === 0.25 ? "¼" : value}×`;

export default function TypeBattle() {
  const { colors: c, ui, types } = useTheme();
  const s = useThemedStyles(createStyles);
  const tone = (value: number) =>
    value === 0
      ? { bg: "#354153", color: "#FFF" }
      : value > 1
        ? { bg: c.successBg, color: c.successText }
        : value < 1
          ? { bg: c.warningBg, color: c.warningText }
          : { bg: c.surfaceAlt, color: c.muted };

  const router = useRouter();
  const openType = (name: string) => router.push(`/catalog/type/${name}`);
  const { width } = useWindowDimensions();
  const [attack, setAttack] = useState("fire");
  const [defense, setDefense] = useState("grass");
  const [second, setSecond] = useState("");
  const queries = useQueries({
    queries: names.map((name) => ({
      queryKey: ["type", name],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getResource<TypeDetail>("type", name, signal),
    })),
  });
  const relation = (name: string) =>
    queries[names.indexOf(name)].data!.damage_relations;
  const pending = queries.some((query) => query.isPending);
  const failed = queries.some((query) => query.isError);
  const selectDefense = (name: string) => {
    setDefense(name);
    if (name === second) setSecond("");
  };
  const multiplier =
    !pending && !failed
      ? defensiveMultiplier(attack, [
          relation(defense),
          ...(second ? [relation(second)] : []),
        ])
      : 1;
  return (
    <View style={[ui.page, width < 650 && { padding: 18 }]}>
      <View>
        <View style={ui.row}>
          <Swords size={23} color={c.accent} />
          <Text style={ui.title}>Briga de tipos</Text>
        </View>
        <Text style={[ui.subtitle, { marginTop: 8 }]}>
          Descubra as vantagens, resistências e imunidades dos 18 tipos.
        </Text>
      </View>
      {failed ? (
        <ErrorState
          retry={() =>
            queries.forEach((query) => {
              void query.refetch();
            })
          }
        />
      ) : pending ? (
        <Loading />
      ) : (
        <>
          <View style={ui.panel}>
            <Text style={ui.sectionTitle}>Simule um confronto</Text>
            <View style={[ui.wrap, { gap: 16 }]}>
              <View style={s.field}>
                <Text style={ui.label}>TIPO DO GOLPE</Text>
                <Select
                  label="Tipo atacante"
                  value={attack}
                  options={options}
                  onChange={setAttack}
                />
              </View>
              <View style={s.field}>
                <Text style={ui.label}>TIPO DO DEFENSOR</Text>
                <Select
                  label="Tipo defensor"
                  value={defense}
                  options={options}
                  onChange={selectDefense}
                />
              </View>
              <View style={s.field}>
                <Text style={ui.label}>SEGUNDO TIPO DO DEFENSOR</Text>
                <Select
                  label="Segundo tipo defensor"
                  value={second}
                  options={[
                    { value: "", label: "Sem segundo tipo" },
                    ...options.filter((option) => option.value !== defense),
                  ]}
                  onChange={setSecond}
                />
              </View>
            </View>
            <View style={[ui.wrap, { alignItems: "center", gap: 12 }]}>
              <Badge name={attack} onPress={() => openType(attack)} />
              <Text style={ui.subtitle}>→</Text>
              <Badge name={defense} onPress={() => openType(defense)} />
              {second && (
                <Badge name={second} onPress={() => openType(second)} />
              )}
              <Text
                accessibilityLiveRegion="polite"
                style={{
                  fontSize: 28,
                  fontWeight: "800",
                  color: tone(multiplier).color,
                  backgroundColor: tone(multiplier).bg,
                  padding: 12,
                  borderRadius: 10,
                }}
              >
                {multiplierLabel(multiplier)}
              </Text>
              <Text style={ui.body}>
                {multiplier === 0
                  ? "Sem efeito"
                  : multiplier > 1
                    ? "Super eficaz!"
                    : multiplier < 1
                      ? "Pouco eficaz"
                      : "Dano neutro"}
              </Text>
            </View>
            <Text style={ui.subtitle}>
              Multiplicador de tipos. Habilidades, itens, STAB e outras
              condições de batalha não estão incluídos.
            </Text>
          </View>
          <View style={ui.panel}>
            <Text style={ui.sectionTitle}>Tabela de efetividade</Text>
            <Text style={ui.subtitle}>
              Linhas: tipo do golpe. Colunas: tipo do defensor. Toque em uma
              célula para simular o confronto.
            </Text>
            <View style={ui.wrap}>
              {[0, 0.5, 1, 2].map((value) => (
                <Text
                  key={value}
                  style={{
                    backgroundColor: tone(value).bg,
                    color: tone(value).color,
                    padding: 8,
                    borderRadius: 6,
                  }}
                >
                  {multiplierLabel(value)} ·{" "}
                  {value === 0
                    ? "Imune"
                    : value === 0.5
                      ? "Resistente"
                      : value === 1
                        ? "Neutro"
                        : "Fraco"}
                </Text>
              ))}
            </View>
            <Text style={ui.subtitle}>
              Deslize para os lados para visualizar todos os tipos. Relações
              atuais da PokéAPI.
            </Text>
            <ScrollView horizontal>
              <View>
                <View style={s.row}>
                  <Text style={[s.heading, { width: 100 }]}>
                    ATAQUE ↓ / DEFESA →
                  </Text>
                  {names.map((name) => (
                    <Pressable
                      key={name}
                      accessibilityRole="link"
                      accessibilityLabel={`Ver tipo ${types[name].name}`}
                      onPress={() => openType(name)}
                    >
                      <Text
                        style={[
                          s.heading,
                          {
                            backgroundColor: types[name].bg,
                            color: types[name].color,
                          },
                        ]}
                      >
                        {types[name].name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {names.map((attacking) => (
                  <View key={attacking} style={s.row}>
                    <Pressable
                      accessibilityRole="link"
                      accessibilityLabel={`Ver tipo ${types[attacking].name}`}
                      onPress={() => openType(attacking)}
                    >
                      <Text
                        style={[
                          s.heading,
                          {
                            width: 100,
                            backgroundColor: types[attacking].bg,
                            color: types[attacking].color,
                          },
                        ]}
                      >
                        {types[attacking].name}
                      </Text>
                    </Pressable>
                    {names.map((defending) => {
                      const value = defensiveMultiplier(attacking, [
                        relation(defending),
                      ]);
                      const selected =
                        attack === attacking && defense === defending;
                      return (
                        <Pressable
                          key={defending}
                          accessibilityRole="button"
                          accessibilityLabel={`${types[attacking].name} contra ${types[defending].name}: ${multiplierLabel(value)}`}
                          accessibilityState={{ selected }}
                          onPress={() => {
                            setAttack(attacking);
                            setDefense(defending);
                            setSecond("");
                          }}
                          style={[
                            s.cell,
                            {
                              backgroundColor: tone(value).bg,
                              borderColor: selected ? c.accent : c.surface,
                              borderWidth: selected ? 2 : 1,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: tone(value).color,
                              fontSize: 13,
                              fontWeight: "700",
                            }}
                          >
                            {multiplierLabel(value)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
}
const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    field: { flex: 1, minWidth: 190, gap: 8 },
    row: { flexDirection: "row" },
    heading: {
      width: 66,
      minHeight: 42,
      textAlign: "center",
      textAlignVertical: "center",
      paddingVertical: 13,
      fontSize: 9,
      fontWeight: "700",
      color: c.muted,
    },
    cell: {
      width: 66,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
  });
