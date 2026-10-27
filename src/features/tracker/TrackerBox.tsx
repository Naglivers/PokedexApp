import React, { useMemo, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Check, Minus } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTheme, useThemedStyles } from "../../theme";
import type { TrackerKind } from "../../services/tracker";
import {
  boxRange,
  dexNumber,
  trackerName,
  trackerSprite,
  type BoxPokemon,
} from "./boxes";
import { createTrackerStyles } from "./trackerStyles";

export function trackerBoxMask(box: BoxPokemon[], ids: ReadonlySet<number>) {
  let mask = 0;
  for (let index = 0; index < box.length; index++)
    if (ids.has(box[index].id)) mask |= 1 << index;
  return mask;
}
function countBits(mask: number) {
  let count = 0;
  while (mask) {
    mask &= mask - 1;
    count++;
  }
  return count;
}
const TrackerSprite = React.memo(function TrackerSprite({
  id,
  kind,
  size,
}: {
  id: number;
  kind: TrackerKind;
  size: number;
}) {
  const { colors: c } = useTheme();
  const [missing, setMissing] = useState(false);
  return missing ? (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: c.placeholder, fontSize: 20 }}>?</Text>
    </View>
  ) : (
    <Image
      source={{ uri: trackerSprite(id, kind) }}
      style={{ width: size, height: size }}
      resizeMode="contain"
      onError={() => setMissing(true)}
      accessible={false}
    />
  );
});
type TogglePokemon = (id: number, caught: boolean, selected: boolean) => void;
type ToggleBox = (ids: number[], desired: boolean, bulk: boolean) => void;

const TrackerCell = React.memo(function TrackerCell({
  pokemon,
  kind,
  caught,
  selected,
  bulkEditing,
  disabled,
  mobile,
  onToggle,
}: {
  pokemon: BoxPokemon;
  kind: TrackerKind;
  caught: boolean;
  selected: boolean;
  bulkEditing: boolean;
  disabled: boolean;
  mobile: boolean;
  onToggle: TogglePokemon;
}) {
  const router = useRouter();
  const { colors: c } = useTheme();
  const s = useThemedStyles(createTrackerStyles);
  const pendingRemoval = bulkEditing && caught && !selected;
  const pendingAddition = bulkEditing && !caught && selected;
  return (
    <View style={s.cellFrame}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={
          trackerName(pokemon.name) +
          " #" +
          dexNumber(pokemon.dexNumber ?? pokemon.id) +
          (kind === "shinydex" ? " shiny" : "")
        }
        accessibilityState={{
          checked: bulkEditing ? selected : caught,
          disabled,
        }}
        accessibilityHint={
          bulkEditing
            ? "Marque para capturado ou desmarque para não capturado. Só salva ao confirmar."
            : "Marca ou desmarca sua captura."
        }
        disabled={disabled}
        onPress={() => onToggle(pokemon.id, caught, selected)}
        style={({ hovered }: { hovered?: boolean; pressed: boolean }) => [
          s.cell,
          {
            height: mobile ? 94 : 116,
            backgroundColor: pendingRemoval
              ? c.warningBg
              : pendingAddition
                ? c.accentSoft
                : caught
                  ? c.mint
                  : hovered
                    ? c.surfaceHover
                    : c.surface,
            opacity: disabled ? 0.65 : 1,
          },
        ]}
      >
        {bulkEditing && (
          <>
            {(pendingAddition || pendingRemoval) && (
              <View
                pointerEvents="none"
                style={[
                  s.selectionRing,
                  pendingRemoval && { borderColor: c.warningText },
                ]}
              />
            )}
            <View
              pointerEvents="none"
              style={[
                s.selectionCheckbox,
                selected && {
                  backgroundColor: c.accent,
                  borderColor: c.accent,
                },
              ]}
            >
              {selected && <Check size={11} color={c.onAccent} />}
            </View>
          </>
        )}
        {pendingRemoval ? (
          <Minus size={12} color={c.warningText} style={s.check} />
        ) : (
          caught && <Check size={12} color={c.green} style={s.check} />
        )}
        <Text
          numberOfLines={2}
          style={[s.name, { fontSize: mobile ? 10 : 13 }]}
        >
          {trackerName(pokemon.name)}
        </Text>
        <TrackerSprite
          key={kind}
          id={pokemon.id}
          kind={kind}
          size={mobile ? 40 : 52}
        />
        <Text
          style={[
            s.number,
            {
              color: caught ? c.green : c.muted,
              fontSize: mobile ? 9 : 11,
              width: "100%",
              paddingRight: mobile ? 18 : 0,
            },
          ]}
        >
          #{dexNumber(pokemon.dexNumber ?? pokemon.id)}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={"Ver detalhes de " + trackerName(pokemon.name)}
        accessibilityHint="Abre a página do Pokémon sem alterar a captura ou seleção."
        onPress={() => router.push("/pokemon/" + pokemon.id)}
        hitSlop={4}
        style={[
          s.pokemonDetails,
          { width: mobile ? 18 : 24, height: mobile ? 18 : 24 },
        ]}
      >
        <Text style={[s.pokemonDetailsText, { fontSize: mobile ? 12 : 15 }]}>
          ?
        </Text>
      </Pressable>
    </View>
  );
});
export const TrackerBox = React.memo(function TrackerBox({
  box,
  index,
  kind,
  caughtMask,
  selectedMask,
  bulkEditing,
  disabled,
  mobile,
  onToggle,
  onToggleBox,
}: {
  box: BoxPokemon[];
  index: number;
  kind: TrackerKind;
  caughtMask: number;
  selectedMask: number;
  bulkEditing: boolean;
  disabled: boolean;
  mobile: boolean;
  onToggle: TogglePokemon;
  onToggleBox: ToggleBox;
}) {
  const s = useThemedStyles(createTrackerStyles);
  const ids = useMemo(() => box.map(({ id }) => id), [box]);
  const captured = countBits(caughtMask);
  const selected = countBits(selectedMask);
  const allMarked = captured === box.length;
  const allSelected = selected === box.length;
  return (
    <View style={s.box}>
      <View style={s.boxHeader}>
        <View>
          <Text style={s.boxLabel}>BOX {index + 1}</Text>
          <Text style={[s.range, mobile && { fontSize: 19 }]}>
            {boxRange(box)}
          </Text>
          <Text style={s.boxStatus}>
            {captured} / {box.length} capturados
            {bulkEditing ? " · " + selected + " selecionados" : ""}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            (bulkEditing
              ? allSelected
                ? "Desmarcar"
                : "Selecionar"
              : allMarked
                ? "Desmarcar"
                : "Marcar") +
            " todos os Pokémon da box " +
            (index + 1)
          }
          disabled={disabled}
          onPress={() =>
            onToggleBox(
              ids,
              bulkEditing ? !allSelected : !allMarked,
              bulkEditing,
            )
          }
          style={[s.bulk, disabled && s.disabled]}
        >
          <Text style={s.bulkText}>
            {bulkEditing
              ? allSelected
                ? "Desmarcar box"
                : "Selecionar box"
              : allMarked
                ? "Desmarcar todos"
                : "Marcar todos"}
          </Text>
        </Pressable>
      </View>
      <View style={s.grid}>
        {box.map((pokemon, position) => (
          <TrackerCell
            key={pokemon.id}
            pokemon={pokemon}
            kind={kind}
            caught={!!(caughtMask & (1 << position))}
            selected={!!(selectedMask & (1 << position))}
            bulkEditing={bulkEditing}
            disabled={disabled}
            mobile={mobile}
            onToggle={onToggle}
          />
        ))}
      </View>
    </View>
  );
});
