import React, { useMemo, useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  Calculator,
  ChevronDown,
  Shield,
  Swords,
} from "lucide-react-native";
import { Generations, toID, type GenerationNum } from "@smogon/calc";
import { Art, Badge, Button, Select } from "../../components/ui";
import { font, useTheme } from "../../theme";
import { pokemonOptions } from "../../services/queries";
import { Picker } from "./Picker";
import { NumberField } from "./NumberField";
import {
  buildPokemon,
  catalog,
  defaultCombatant,
  maxDefender,
  type DefensePreset,
  emptyConditions,
  simulate,
  statIds,
  statLabels,
  type Combatant,
  type Conditions,
} from "./engine";

const stages = Array.from({ length: 13 }, (_, i) => ({
  value: String(i - 6),
  label: i === 6 ? "0 · Normal" : `${i > 6 ? "+" : ""}${i - 6}`,
}));
const statusOptions = [
  { value: "", label: "Saudável" },
  { value: "brn", label: "Queimado" },
  { value: "par", label: "Paralisado" },
  { value: "psn", label: "Envenenado" },
  { value: "tox", label: "Muito envenenado" },
  { value: "slp", label: "Dormindo" },
  { value: "frz", label: "Congelado" },
];
const weatherOptions = [
  { value: "", label: "Sem clima" },
  { value: "Sun", label: "Sol" },
  { value: "Rain", label: "Chuva" },
  { value: "Sand", label: "Tempestade de areia" },
  { value: "Snow", label: "Neve" },
  { value: "Hail", label: "Granizo" },
  { value: "Harsh Sunshine", label: "Sol extremo" },
  { value: "Heavy Rain", label: "Chuva extrema" },
  { value: "Strong Winds", label: "Ventos fortes" },
];
const terrainOptions = [
  { value: "", label: "Sem terreno" },
  { value: "Electric", label: "Elétrico" },
  { value: "Grassy", label: "Grama" },
  { value: "Psychic", label: "Psíquico" },
  { value: "Misty", label: "Névoa" },
];
const generationOptions = [3, 4, 5, 6, 7, 8, 9].map((number) => ({
  value: String(number),
  label: `Geração ${["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"][number]}`,
}));
function imageSlug(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[.’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-$/, "");
  return (
    (
      {
        deoxys: "deoxys-normal",
        giratina: "giratina-altered",
        shaymin: "shaymin-land",
        landorus: "landorus-incarnate",
        tornadus: "tornadus-incarnate",
        thundurus: "thundurus-incarnate",
        keldeo: "keldeo-ordinary",
        aegislash: "aegislash-shield",
        meowstic: "meowstic-male",
        "meowstic-f": "meowstic-female",
        indeedee: "indeedee-male",
        "indeedee-f": "indeedee-female",
        mimikyu: "mimikyu-disguised",
        wishiwashi: "wishiwashi-solo",
        urshifu: "urshifu-single-strike",
        palafin: "palafin-zero",
        toxtricity: "toxtricity-amped",
        darmanitan: "darmanitan-standard",
      } as Record<string, string>
    )[slug] ?? slug
  );
}

function Fighter({
  value,
  onChange,
  generation,
  role,
  options,
  defensePreset,
  onDefensePreset,
}: {
  value: Combatant;
  onChange: (value: Combatant) => void;
  generation: GenerationNum;
  role: "Atacante" | "Defensor";
  options: ReturnType<typeof catalog>;
  defensePreset?: DefensePreset;
  onDefensePreset?: (preset: DefensePreset) => void;
}) {
  const { colors: c, ui } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const species = Generations.get(generation).species.get(toID(value.name));
  const art = useQuery({
    ...pokemonOptions(imageSlug(value.name)),
    retry: false,
  });
  let stats: ReturnType<typeof buildPokemon>["rawStats"] | undefined;
  try {
    stats = buildPokemon(value, generation).rawStats;
  } catch {}
  const patch = (next: Partial<Combatant>) => onChange({ ...value, ...next });
  const totalEVs = statIds.reduce((sum, stat) => sum + value.evs[stat], 0);
  const Icon = role === "Atacante" ? Swords : Shield;
  return (
    <View style={[ui.panel, { flex: 1, minWidth: 0, padding: 18, gap: 18 }]}>
      <View style={ui.between}>
        <View style={ui.row}>
          <Icon size={18} color={role === "Atacante" ? c.accent : c.green} />
          <Text
            style={[
              ui.label,
              { color: role === "Atacante" ? c.accent : c.green },
            ]}
          >
            {role.toUpperCase()}
          </Text>
        </View>
        <Text style={ui.subtitle}>Nv. {value.level}</Text>
      </View>
      <View
        style={{
          borderRadius: 16,
          padding: 12,
          backgroundColor: role === "Atacante" ? c.accentSoft : c.mint,
          alignItems: "center",
          gap: 6,
        }}
      >
        <Art
          name={value.name}
          uri={
            art.data?.sprites.other?.["official-artwork"]?.front_default ??
            art.data?.sprites.front_default
          }
          style={{ width: "100%", height: 140 }}
        />
        <Text style={[ui.sectionTitle, { fontSize: 21 }]}>{value.name}</Text>
        <View style={[ui.row, { flexWrap: "wrap", justifyContent: "center" }]}>
          {species?.types.map((type) => (
            <Badge key={type} name={type.toLowerCase()} />
          ))}
        </View>
      </View>
      <Picker
        label={`Pokémon ${role.toLowerCase()}`}
        value={value.name}
        values={options.pokemon}
        onChange={(name) =>
          patch({
            name,
            abilityOn: false,
            ability:
              Generations.get(generation).species.get(toID(name))
                ?.abilities?.[0] || "(No Ability)",
          })
        }
      />
      <View style={[ui.row, { alignItems: "flex-start" }]}>
        <NumberField
          label={`Nível do ${role.toLowerCase()}`}
          min={1}
          max={100}
          value={value.level}
          onChange={(level) => patch({ level })}
        />
        {role === "Atacante" ? (
          <NumberField
            label={`HP atual % do ${role.toLowerCase()}`}
            min={1}
            max={100}
            value={value.hpPercent}
            onChange={(hpPercent) => patch({ hpPercent })}
          />
        ) : (
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={ui.label}>HP DO DEFENSOR</Text>
            <Text style={[ui.input, { fontSize: 16 }]}>
              {stats?.hp ?? "—"} / {stats?.hp ?? "—"} · 100%
            </Text>
          </View>
        )}
      </View>
      {role === "Defensor" && (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {(
              [
                ["def", "MAX HP & DEF"],
                ["spd", "MAX HP & SPDEF"],
              ] as const
            ).map(([preset, label]) => (
              <Pressable
                key={preset}
                accessibilityRole="radio"
                accessibilityLabel={label}
                accessibilityState={{ checked: defensePreset === preset }}
                onPress={() => onDefensePreset?.(preset)}
                style={{
                  flexGrow: 1,
                  minHeight: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: defensePreset === preset ? c.accent : c.line,
                  backgroundColor:
                    defensePreset === preset ? c.accentSoft : c.surface,
                }}
              >
                <Text
                  style={{
                    color: defensePreset === preset ? c.accent : c.ink,
                    fontWeight: "700",
                    fontSize: 12,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={ui.subtitle}>
            Sempre com HP máximo no nível selecionado: 31 IVs, 252 EVs em HP e
            na defesa escolhida, natureza favorável e 100% de HP.
          </Text>
        </View>
      )}
      {role === "Atacante" ? (
        <Picker
          label={`Natureza do ${role.toLowerCase()}`}
          value={value.nature}
          values={options.natures}
          onChange={(nature) => patch({ nature })}
        />
      ) : (
        <Text style={ui.body}>
          Natureza fixa: {value.nature} ·{" "}
          {defensePreset === "spd" ? "+Sp. Def / −Atk" : "+Def / −Atk"}
        </Text>
      )}
      <Picker
        label={`Habilidade do ${role.toLowerCase()}`}
        value={value.ability === "(No Ability)" ? "" : value.ability}
        values={["", ...options.abilities]}
        emptyLabel="Sem habilidade"
        onChange={(ability) =>
          patch({ ability: ability || "(No Ability)", abilityOn: false })
        }
      />
      {[
        "Flash Fire",
        "Slow Start",
        "Plus",
        "Minus",
        "Stakeout",
        "Electromorphosis",
        "Analytic",
      ].includes(value.ability) && (
        <Toggle
          label={`${role}: efeito da habilidade ativado`}
          value={value.abilityOn}
          onChange={() => patch({ abilityOn: !value.abilityOn })}
        />
      )}
      <Picker
        label={`Item do ${role.toLowerCase()}`}
        value={value.item}
        values={["", ...options.items]}
        onChange={(item) => patch({ item })}
      />
      <Select
        label={`Status do ${role.toLowerCase()}`}
        value={value.status}
        options={statusOptions}
        onChange={(status) => patch({ status: status as Combatant["status"] })}
      />
      {generation === 9 && (
        <Picker
          label={`Tipo Tera do ${role.toLowerCase()}`}
          value={value.teraType}
          values={["", ...options.types]}
          emptyLabel="Sem terastalização"
          onChange={(teraType) => patch({ teraType })}
        />
      )}
      <View style={{ gap: 8 }}>
        <View style={ui.between}>
          <Text style={ui.sectionTitle}>Atributos</Text>
          <Text
            style={[
              ui.subtitle,
              { color: totalEVs > 510 ? c.accent : c.muted },
            ]}
          >
            {totalEVs} / 510 EVs
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 7, alignItems: "center" }}>
          <Text style={[ui.label, { flex: 1 }]}>BASE</Text>
          {["IV", "EV", "FINAL"].map((label) => (
            <Text
              key={label}
              style={[
                ui.label,
                { width: 42, textAlign: "center", fontSize: 9 },
              ]}
            >
              {label}
            </Text>
          ))}
        </View>
        {statIds.map((stat) => (
          <View
            key={stat}
            style={{ flexDirection: "row", gap: 7, alignItems: "center" }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{
                  ...font,
                  color: c.ink,
                  fontSize: 11,
                  fontWeight: "700",
                }}
              >
                {statLabels[stat]}
              </Text>
              <Text style={{ color: c.muted, fontSize: 10 }}>
                {species?.baseStats[stat] ?? "—"}
              </Text>
            </View>
            {role === "Defensor" ? (
              <>
                <Text
                  style={{
                    width: 42,
                    textAlign: "center",
                    color: c.muted,
                    fontSize: 13,
                  }}
                >
                  {value.ivs[stat]}
                </Text>
                <Text
                  style={{
                    width: 42,
                    textAlign: "center",
                    color: c.muted,
                    fontSize: 13,
                  }}
                >
                  {value.evs[stat]}
                </Text>
              </>
            ) : (
              <>
                <NumberField
                  small
                  label={`${role} ${statLabels[stat]} IV`}
                  value={value.ivs[stat]}
                  max={31}
                  onChange={(number) =>
                    patch({ ivs: { ...value.ivs, [stat]: number } })
                  }
                />
                <NumberField
                  small
                  label={`${role} ${statLabels[stat]} EV`}
                  value={value.evs[stat]}
                  max={252}
                  onChange={(number) =>
                    patch({ evs: { ...value.evs, [stat]: number } })
                  }
                />
              </>
            )}
            <Text
              style={{
                width: 42,
                textAlign: "center",
                color: c.ink,
                fontWeight: "700",
                fontSize: 13,
              }}
            >
              {stats?.[stat] ?? "—"}
            </Text>
          </View>
        ))}
        <Text style={[ui.subtitle, { fontSize: 10, lineHeight: 16 }]}>
          Final = nível, natureza, IVs e EVs. Estágios, status, itens e
          habilidades entram no cálculo do dano.
        </Text>
        {role === "Atacante" && (
          <Button
            small
            variant="outline"
            onPress={() =>
              patch({ evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } })
            }
          >
            Zerar EVs
          </Button>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((current) => !current)}
        style={[
          ui.between,
          {
            minHeight: 44,
            borderTopWidth: 1,
            borderColor: c.line,
            paddingTop: 12,
          },
        ]}
      >
        <Text style={ui.body}>Estágios de batalha</Text>
        <ChevronDown
          size={16}
          color={c.muted}
          style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}
        />
      </Pressable>
      {expanded && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {statIds
            .filter((stat) => stat !== "hp")
            .map((stat) => (
              <View
                key={stat}
                style={{ flexBasis: "45%", flexGrow: 1, minWidth: 0, gap: 5 }}
              >
                <Text style={ui.label}>{statLabels[stat]}</Text>
                <Select
                  label={`${role} estágio ${statLabels[stat]}`}
                  value={String(value.boosts[stat])}
                  options={stages}
                  onChange={(number) =>
                    patch({
                      boosts: { ...value.boosts, [stat]: Number(number) },
                    })
                  }
                />
              </View>
            ))}
        </View>
      )}
    </View>
  );
}
function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: () => void;
}) {
  const { colors: c } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={onChange}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        minHeight: 44,
        padding: 10,
        borderWidth: 1,
        borderColor: value ? c.accent : c.line,
        borderRadius: 10,
        backgroundColor: value ? c.accentSoft : c.surface,
      }}
    >
      <View
        style={{
          width: 16,
          height: 16,
          borderWidth: 1,
          borderColor: value ? c.accent : c.borderStrong,
          borderRadius: 4,
          backgroundColor: value ? c.accent : "transparent",
        }}
      />
      <Text style={{ fontSize: 12, color: c.ink, flexShrink: 1 }}>{label}</Text>
    </Pressable>
  );
}

export default function DamageCalculator() {
  const { colors: c, ui } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 900;
  const [defensePreset, setDefensePreset] = useState<DefensePreset>("def");
  const [generation, setGeneration] = useState<GenerationNum>(9),
    [attacker, setAttacker] = useState(() => defaultCombatant("Charizard")),
    [rawDefender, setDefender] = useState(() => defaultCombatant("Venusaur")),
    [move, setMove] = useState("Flamethrower"),
    [conditions, setConditions] = useState<Conditions>({ ...emptyConditions });
  const defender = useMemo(
    () => maxDefender(rawDefender, defensePreset),
    [rawDefender, defensePreset],
  );
  const options = useMemo(() => catalog(generation), [generation]);
  const moveData = Generations.get(generation).moves.get(toID(move));
  const hitRange = Array.isArray(moveData?.multihit)
    ? moveData.multihit
    : undefined;
  const outcome = useMemo(() => {
    try {
      return {
        data: simulate(
          generation,
          attacker,
          defender,
          move,
          conditions,
          defensePreset,
        ),
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível calcular este cenário.",
      };
    }
  }, [generation, attacker, defender, move, conditions, defensePreset]);
  const result = outcome.data;
  const percent = (number: number) => number.toFixed(1).replace(".", ",") + "%";
  function chooseGeneration(text: string) {
    const next = Number(text) as GenerationNum;
    setGeneration(next);
    setAttacker(defaultCombatant("Charizard", next));
    setDefender(defaultCombatant("Venusaur", next));
    setMove("Flamethrower");
    setConditions({ ...emptyConditions });
  }
  function chooseMove(name: string) {
    setMove(name);
    const data = Generations.get(generation).moves.get(toID(name));
    setConditions((current) => ({
      ...current,
      hits: Array.isArray(data?.multihit)
        ? data.multihit[0]
        : typeof data?.multihit === "number"
          ? data.multihit
          : 2,
    }));
  }
  return (
    <View
      style={[
        ui.page,
        { maxWidth: 1250, minWidth: 0 },
        width < 650 && { padding: 14 },
      ]}
    >
      <View style={{ gap: 10 }}>
        <View style={ui.row}>
          <Calculator size={17} color={c.accent} />
          <Text style={[ui.label, { color: c.accent }]}>
            LABORATÓRIO DE BATALHA
          </Text>
        </View>
        <Text style={ui.title}>Cada ponto faz a diferença.</Text>
        <Text style={ui.body}>
          Monte o atacante e o defensor, escolha um golpe e descubra o dano nas
          condições da batalha.
        </Text>
      </View>
      <View style={[ui.between, { flexWrap: "wrap" }]}>
        <View style={{ minWidth: 170, flexGrow: 1, maxWidth: 290 }}>
          <Select
            label="Geração da batalha"
            value={String(generation)}
            options={generationOptions}
            onChange={chooseGeneration}
          />
        </View>
        <Button
          variant="outline"
          icon={<ArrowLeftRight size={15} color={c.ink} />}
          onPress={() => {
            setAttacker(defender);
            setDefender(attacker);
          }}
        >
          Inverter Pokémon
        </Button>
      </View>
      <View
        style={{
          flexDirection: compact ? "column" : "row",
          alignItems: "stretch",
          gap: 18,
          minWidth: 0,
        }}
      >
        <Fighter
          role="Atacante"
          generation={generation}
          value={attacker}
          onChange={setAttacker}
          options={options}
        />
        <Fighter
          role="Defensor"
          defensePreset={defensePreset}
          onDefensePreset={setDefensePreset}
          generation={generation}
          value={defender}
          onChange={setDefender}
          options={options}
        />
      </View>
      <View style={ui.panel}>
        <View style={ui.row}>
          <Swords size={18} color={c.accent} />
          <Text style={ui.sectionTitle}>Golpe e campo de batalha</Text>
        </View>
        <Picker
          label="Golpe"
          value={move}
          values={options.moves}
          onChange={chooseMove}
        />
        <View style={[ui.row, { flexWrap: "wrap" }]}>
          {moveData && <Badge name={String(moveData.type).toLowerCase()} />}
          <Text style={ui.subtitle}>
            {moveData?.category === "Physical"
              ? "Físico"
              : moveData?.category === "Special"
                ? "Especial"
                : "Status"}{" "}
            · Potência base:{" "}
            {moveData?.basePower || "Variável / sem dano direto"}
          </Text>
        </View>
        <View
          style={{ flexDirection: width < 650 ? "column" : "row", gap: 12 }}
        >
          <View style={{ flex: 1 }}>
            <Select
              label="Clima"
              value={conditions.weather}
              options={weatherOptions.filter(
                (option) =>
                  !option.value ||
                  ((generation >= 6 ||
                    !["Harsh Sunshine", "Heavy Rain", "Strong Winds"].includes(
                      option.value,
                    )) &&
                    (generation >= 9
                      ? option.value !== "Hail"
                      : option.value !== "Snow")),
              )}
              onChange={(weather) =>
                setConditions((current) => ({
                  ...current,
                  weather: weather as Conditions["weather"],
                }))
              }
            />
          </View>
          {generation >= 6 && (
            <View style={{ flex: 1 }}>
              <Select
                label="Terreno"
                value={conditions.terrain}
                options={terrainOptions.filter(
                  (option) => generation >= 7 || option.value !== "Psychic",
                )}
                onChange={(terrain) =>
                  setConditions((current) => ({
                    ...current,
                    terrain: terrain as Conditions["terrain"],
                  }))
                }
              />
            </View>
          )}
        </View>
        {hitRange && (
          <Select
            label="Número de acertos"
            value={String(conditions.hits)}
            options={Array.from(
              { length: hitRange[1] - hitRange[0] + 1 },
              (_, index) => ({
                value: String(hitRange[0] + index),
                label: `${hitRange[0] + index} acertos`,
              }),
            )}
            onChange={(hits) =>
              setConditions((current) => ({ ...current, hits: Number(hits) }))
            }
          />
        )}
        {generation === 9 && attacker.teraType === "Stellar" && (
          <Toggle
            label="Primeiro uso deste tipo com Tera Stellar"
            value={conditions.stellarFirstUse}
            onChange={() =>
              setConditions((current) => ({
                ...current,
                stellarFirstUse: !current.stellarFirstUse,
              }))
            }
          />
        )}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(
            [
              ["critical", "Acerto crítico"],
              ["doubles", "Batalha em duplas"],
              ["reflect", "Reflect no defensor"],
              ["lightScreen", "Light Screen no defensor"],
              ...(generation >= 7
                ? [["auroraVeil", "Aurora Veil no defensor"]]
                : []),
            ] as [
              keyof Pick<
                Conditions,
                | "critical"
                | "doubles"
                | "reflect"
                | "lightScreen"
                | "auroraVeil"
              >,
              string,
            ][]
          ).map(([key, label]) => (
            <Toggle
              key={key}
              label={label}
              value={conditions[key]}
              onChange={() =>
                setConditions((current) => ({
                  ...current,
                  [key]: !current[key],
                }))
              }
            />
          ))}
        </View>
      </View>
      <View
        style={[
          ui.panel,
          {
            backgroundColor: c.navy,
            borderColor: c.navyLight,
            padding: width < 650 ? 20 : 28,
          },
        ]}
      >
        <Text style={[ui.label, { color: "#B7C6D8" }]}>
          RESULTADO · {attacker.name.toUpperCase()} →{" "}
          {defender.name.toUpperCase()}
        </Text>
        {outcome.error ? (
          <Text
            accessibilityRole="alert"
            style={{ color: "#FFB3A9", fontSize: 14, lineHeight: 22 }}
          >
            {outcome.error}
          </Text>
        ) : (
          result && (
            <>
              <Text
                accessibilityLiveRegion="polite"
                style={{
                  ...font,
                  color: "#FFFFFF",
                  fontSize: width < 650 ? 34 : 46,
                  fontWeight: "800",
                  letterSpacing: -1,
                }}
              >
                {result.statusMove
                  ? "Golpe de status"
                  : `${result.min}–${result.max}`}
                <Text
                  style={{ fontSize: 14, fontWeight: "500", color: "#B7C6D8" }}
                >
                  {result.statusMove ? "" : " de dano"}
                </Text>
              </Text>
              <Text style={{ color: "#B7C6D8", fontSize: 14, lineHeight: 22 }}>
                {result.statusMove
                  ? "Este golpe não causa dano direto; seus efeitos não são uma previsão de dano."
                  : `${percent(result.minPercent)}–${percent(result.maxPercent)} do HP máximo do defensor · ${result.currentHP} / ${result.hp} HP atual`}
              </Text>
              {!result.statusMove && (
                <>
                  <View
                    style={{
                      height: 15,
                      backgroundColor: "#304158",
                      borderRadius: 8,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        height: "100%",
                        width: `${Math.min(100, result.maxPercent)}%`,
                        backgroundColor: "#F5CE70",
                        position: "absolute",
                      }}
                    />
                    <View
                      style={{
                        height: "100%",
                        width: `${Math.min(100, result.minPercent)}%`,
                        backgroundColor: "#E95B54",
                      }}
                    />
                  </View>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 22 }}
                  >
                    <View style={{ gap: 6 }}>
                      <Text style={{ color: "#B7C6D8", fontSize: 11 }}>
                        Chance de KO neste golpe
                      </Text>
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontWeight: "800",
                          fontSize: 21,
                        }}
                      >
                        {result.ohko === null
                          ? "Não determinada"
                          : percent(result.ohko * 100)}
                      </Text>
                    </View>
                    <View style={{ gap: 6 }}>
                      <Text style={{ color: "#B7C6D8", fontSize: 11 }}>
                        HP restante previsto
                      </Text>
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontWeight: "800",
                          fontSize: 21,
                        }}
                      >
                        {result.remainingMin}–{result.remainingMax}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={{ color: "#B7C6D8", fontSize: 11, lineHeight: 18 }}
                  >
                    {result.max === 0
                      ? "Sem dano nas condições atuais. Confira tipos, habilidades e o golpe selecionado."
                      : "O intervalo considera a variação de dano do jogo. A chance de KO considera que o golpe acerta; precisão e efeitos secundários não entram nessa chance."}
                  </Text>
                </>
              )}
            </>
          )
        )}
      </View>
      <Text style={[ui.subtitle, { fontSize: 11 }]}>
        Cálculos Smogon · Regras da geração selecionada. Simulação de um golpe,
        sem hazards ou dano residual. As combinações de golpes, itens e
        habilidades são livres e não validam a legalidade da equipe. Trocar a
        geração restaura os ajustes iniciais.
      </Text>
    </View>
  );
}
