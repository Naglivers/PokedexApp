import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageStyle,
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Search,
  X,
} from "lucide-react-native";
import { colors as c, font, ui } from "../theme";
import { types } from "../constants/pokemon";

export function Button({
  children,
  onPress,
  variant = "primary",
  icon,
  disabled,
  small,
  label,
}: {
  children: React.ReactNode;
  onPress: () => void;
  variant?: "primary" | "outline" | "ghost" | "dark";
  icon?: React.ReactNode;
  disabled?: boolean;
  small?: boolean;
  label?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({
        hovered,
        pressed,
      }: {
        hovered?: boolean;
        pressed: boolean;
      }) => [
        s.button,
        small && { paddingVertical: 8, minHeight: 36 },
        {
          backgroundColor:
            variant === "primary"
              ? c.accent
              : variant === "dark"
                ? c.navy
                : variant === "outline"
                  ? "#FFF"
                  : "transparent",
          borderColor: variant === "outline" ? c.line : "transparent",
          opacity: disabled ? 0.4 : pressed ? 0.7 : hovered ? 0.88 : 1,
        },
      ]}
    >
      {icon}
      <Text
        style={[
          s.buttonText,
          {
            color: variant === "primary" || variant === "dark" ? "#FFF" : c.ink,
          },
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}
export function IconButton({
  onPress,
  label,
  children,
  active = false,
}: {
  onPress: () => void;
  label: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({
        hovered,
        pressed,
      }: {
        hovered?: boolean;
        pressed: boolean;
      }) => [
        s.iconButton,
        {
          backgroundColor: active ? c.accentSoft : hovered ? "#F1F3F6" : "#FFF",
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      {children}
    </Pressable>
  );
}
export function Badge({
  name,
  onPress,
}: {
  name: string;
  onPress?: () => void;
}) {
  const type = types[name] ?? { name, color: c.muted, bg: "#F0F2F6" };
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      style={[s.badge, { backgroundColor: type.bg }]}
    >
      <View style={[s.badgeDot, { backgroundColor: type.color }]} />
      <Text style={[s.badgeText, { color: type.color }]}>{type.name}</Text>
    </Pressable>
  );
}
export function Art({
  uri,
  name,
  style,
}: {
  uri?: string | number | null;
  name: string;
  style?: StyleProp<ImageStyle>;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  return uri && !failed ? (
    <Image
      accessibilityLabel={name}
      source={typeof uri === "number" ? uri : { uri }}
      resizeMode="contain"
      style={style}
      onError={() => setFailed(true)}
    />
  ) : (
    <View
      accessibilityLabel={`Imagem indisponível: ${name}`}
      style={[style, { alignItems: "center", justifyContent: "center" }]}
    >
      <View style={s.placeholderBall} />
      <Text style={[ui.label, { fontSize: 8, marginTop: 8 }]}>SEM IMAGEM</Text>
    </View>
  );
}
export function SearchInput({
  value,
  onChange,
  placeholder,
  onSubmit,
}: {
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
  onSubmit?: () => void;
}) {
  return (
    <View style={s.search}>
      <Search size={18} color={c.muted} />
      <TextInput
        accessibilityLabel={placeholder}
        placeholder={placeholder}
        placeholderTextColor="#9AA2AF"
        style={s.searchInput}
        value={value}
        onChangeText={onChange}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        autoCapitalize="none"
      />
      {!!value && (
        <Pressable
          accessibilityLabel="Limpar pesquisa"
          accessibilityRole="button"
          onPress={() => onChange("")}
          hitSlop={12}
        >
          <X size={16} color={c.muted} />
        </Pressable>
      )}
      {onSubmit && !!value && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pesquisar"
          onPress={onSubmit}
          hitSlop={10}
        >
          <ArrowRight size={17} color={c.accent} />
        </Pressable>
      )}
    </View>
  );
}
export function Select({
  value,
  options,
  onChange,
  label,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
        style={s.select}
      >
        <Text numberOfLines={1} style={s.selectText}>
          {options.find((option) => option.value === value)?.label ?? label}
        </Text>
        <ChevronDown size={15} color={c.muted} />
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={s.selectModal}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={ui.between}>
              <Text style={ui.sectionTitle}>{label}</Text>
              <IconButton label="Fechar opções" onPress={() => setOpen(false)}>
                <X size={18} />
              </IconButton>
            </View>
            <ScrollView
              style={{ maxHeight: 420 }}
              contentContainerStyle={{ gap: 4 }}
            >
              {options.map((option) => (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  style={({
                    hovered,
                  }: {
                    hovered?: boolean;
                    pressed?: boolean;
                  }) => [
                    s.option,
                    {
                      backgroundColor:
                        option.value === value
                          ? c.accentSoft
                          : hovered
                            ? c.bg
                            : "#FFF",
                    },
                  ]}
                >
                  <Text
                    style={{
                      ...font,
                      color: option.value === value ? c.accent : c.ink,
                      fontWeight: option.value === value ? "700" : "400",
                    }}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
export function Empty({
  title = "Nada por aqui ainda",
  description = "Tente uma nova pesquisa ou ajuste os filtros.",
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={s.empty}>
      <Search size={30} color="#B1B8C3" />
      <Text style={[ui.sectionTitle, { marginTop: 6 }]}>{title}</Text>
      <Text style={[ui.subtitle, { textAlign: "center", maxWidth: 360 }]}>
        {description}
      </Text>
      {action}
    </View>
  );
}
export function ErrorState({ retry }: { retry: () => void }) {
  return (
    <View style={s.empty}>
      <AlertCircle size={30} color={c.accent} />
      <Text style={ui.sectionTitle}>Não foi possível carregar</Text>
      <Text style={ui.subtitle}>Confira sua conexão ou tente novamente.</Text>
      <Button variant="outline" onPress={retry}>
        Tentar novamente
      </Button>
    </View>
  );
}
export function Loading({
  text = "Consultando a PokéAPI…",
}: {
  text?: string;
}) {
  return (
    <View style={s.empty}>
      <ActivityIndicator color={c.accent} />
      <Text style={ui.subtitle}>{text}</Text>
    </View>
  );
}
export function Skeleton({
  height = 18,
  width = "100%",
}: {
  height?: number;
  width?: number | `${number}%`;
}) {
  return (
    <View
      style={{ height, width, borderRadius: 9, backgroundColor: "#EAEDEF" }}
    />
  );
}
export function Pagination({
  page,
  total,
  pageSize = 24,
  setPage,
}: {
  page: number;
  total: number;
  pageSize?: number;
  setPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const numbers = Array.from(new Set([0, page - 1, page, page + 1, pages - 1]))
    .filter((n) => n >= 0 && n < pages)
    .sort((a, b) => a - b);
  return (
    <View style={s.pagination}>
      <Button
        small
        variant="outline"
        disabled={page === 0}
        icon={<ArrowLeft size={14} color={c.muted} />}
        onPress={() => setPage(page - 1)}
      >
        Anterior
      </Button>
      <View style={ui.row}>
        {numbers.map((number, i) => (
          <React.Fragment key={number}>
            {i > 0 && number - numbers[i - 1] > 1 && (
              <Text style={ui.subtitle}>…</Text>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Página ${number + 1}`}
              onPress={() => setPage(number)}
              style={[
                s.pageNumber,
                number === page && { backgroundColor: c.navy },
              ]}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: number === page ? "#FFF" : c.muted,
                }}
              >
                {number + 1}
              </Text>
            </Pressable>
          </React.Fragment>
        ))}
      </View>
      <Button
        small
        variant="outline"
        disabled={page >= pages - 1}
        icon={<ArrowRight size={14} color={c.muted} />}
        onPress={() => setPage(page + 1)}
      >
        Próxima
      </Button>
    </View>
  );
}
const s = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderRadius: 9,
    minHeight: 43,
    paddingHorizontal: 16,
    paddingVertical: 11,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { ...font, fontSize: 12, fontWeight: "600" },
  iconButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.line,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
  },
  badgeText: { ...font, fontSize: 10, fontWeight: "600" },
  badgeDot: { width: 4, height: 4, borderRadius: 4 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: "#FFF",
  },
  searchInput: {
    ...font,
    flex: 1,
    fontSize: 12,
    paddingVertical: 12,
    color: c.ink,
    minWidth: 0,
  },
  select: {
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 9,
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF",
    justifyContent: "space-between",
  },
  selectText: { ...font, color: "#586373", fontSize: 12, flexShrink: 1 },
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#17233388",
    padding: 20,
  },
  selectModal: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 20,
    maxWidth: 420,
    width: "100%",
    gap: 16,
  },
  option: { padding: 14, borderRadius: 9 },
  empty: {
    padding: 35,
    minHeight: 210,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  pagination: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 12,
  },
  pageNumber: {
    width: 31,
    height: 33,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderBall: {
    height: 38,
    width: 38,
    borderWidth: 5,
    borderColor: "#CBD1DA",
    borderRadius: 30,
  },
});
