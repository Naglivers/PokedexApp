import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Redirect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { Camera, LogOut, Save, Trash2 } from "lucide-react-native";
import { Button, Loading } from "../src/components/ui";
import { useAuth } from "../src/features/auth/AuthProvider";
import { ProfileAvatar } from "../src/features/auth/ProfileAvatar";
import { useTheme, useThemedStyles, type ThemeColors } from "../src/theme";
import { validateProfile } from "../src/services/account";

export default function Profile() {
  const { session, loading } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <Redirect href="/login" />;
  return <ProfileForm key={session.user.id} />;
}
function ProfileForm() {
  const { session, syncError, saveProfile, refreshProfile, signOut } =
    useAuth();
  const { colors: c, ui } = useTheme();
  const s = useThemedStyles(styles);
  const user = session!.user;
  const [email, setEmail] = useState(user.email ?? "");
  const [avatar, setAvatar] = useState(user.avatar_url);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const working = useRef(false);
  useEffect(() => {
    if (!dirty) {
      setEmail(user.email ?? "");
      setAvatar(user.avatar_url);
    }
  }, [user.email, user.avatar_url, dirty]);
  const photo = async () => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const processed = await manipulateAsync(
        asset.uri,
        [{ resize: { width: 512 } }],
        { compress: 0.7, format: SaveFormat.JPEG, base64: true },
      );
      if (!processed.base64)
        throw new Error("Não foi possível abrir a foto. Escolha outra imagem.");
      const next = "data:image/jpeg;base64," + processed.base64;
      validateProfile("", next);
      setAvatar(next);
      setDirty(true);
      setMessage("Foto selecionada. Toque em Salvar perfil.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível selecionar a foto.",
      );
    } finally {
      working.current = false;
      setBusy(false);
    }
  };
  const save = async () => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await saveProfile(email, avatar);
      setDirty(false);
      setMessage("Perfil salvo.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      working.current = false;
      setBusy(false);
    }
  };
  const logout = async () => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    try {
      await signOut();
    } catch {
      setError("Não foi possível limpar o login salvo. Tente novamente.");
    } finally {
      working.current = false;
      setBusy(false);
    }
  };
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={s.page}
    >
      <View style={s.heading}>
        <Text style={[ui.label, { color: c.accent }]}>SUA CONTA</Text>
        <Text style={ui.title}>Configurações do usuário</Text>
        <Text style={ui.subtitle}>
          Seu perfil, do seu jeito. E-mail e foto são opcionais.
        </Text>
      </View>
      <View style={s.card}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Alterar foto de perfil"
          onPress={() => void photo()}
          disabled={busy}
          style={s.photoButton}
        >
          <ProfileAvatar uri={avatar} size={112} />
          <View style={s.camera}>
            <Camera size={18} color={c.onAccent} />
          </View>
        </Pressable>
        <Text style={s.hint}>Toque na foto para trocar</Text>
        {!!avatar && (
          <Button
            variant="ghost"
            small
            icon={<Trash2 size={14} color={c.muted} />}
            disabled={busy}
            onPress={() => {
              setAvatar(null);
              setDirty(true);
              setMessage("");
            }}
          >
            Remover foto
          </Button>
        )}
        <Text style={s.label}>Nickname</Text>
        <Text style={s.nickname}>{user.nickname}</Text>
        <Text style={s.label}>E-mail (opcional)</Text>
        <TextInput
          accessibilityLabel="E-mail (opcional)"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setDirty(true);
            setMessage("");
          }}
          placeholder="seu@email.com"
          placeholderTextColor={c.placeholder}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          maxLength={254}
          editable={!busy}
          style={s.input}
        />
        <Text style={s.hint}>
          Você pode deixar o e-mail vazio. O login continua com nickname e
          senha.
        </Text>
        {!!syncError && (
          <View style={{ gap: 8 }}>
            <Text style={s.hint}>{syncError}</Text>
            <Button
              variant="outline"
              small
              disabled={busy}
              onPress={() => void refreshProfile()}
            >
              Tentar sincronizar
            </Button>
          </View>
        )}
        {!!error && (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        )}
        {!!message && (
          <Text accessibilityLiveRegion="polite" style={s.success}>
            {message}
          </Text>
        )}
        <Button
          icon={<Save size={17} color={c.onAccent} />}
          onPress={() => void save()}
          disabled={busy}
        >
          {busy ? "Aguarde..." : "Salvar perfil"}
        </Button>
        <View style={s.divider} />
        <Button
          variant="outline"
          icon={<LogOut size={17} color={c.ink} />}
          disabled={busy}
          onPress={() => void logout()}
        >
          Sair da conta
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}
const styles = (c: ThemeColors) =>
  StyleSheet.create({
    page: { flex: 1, padding: 20, gap: 20, backgroundColor: c.bg },
    heading: { gap: 8 },
    card: {
      width: "100%",
      maxWidth: 520,
      alignSelf: "center",
      gap: 12,
      padding: 24,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.surface,
    },
    photoButton: { alignSelf: "center", position: "relative", padding: 6 },
    camera: {
      position: "absolute",
      right: 1,
      bottom: 1,
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    hint: { color: c.muted, fontSize: 12, lineHeight: 18 },
    label: { color: c.muted, fontSize: 12, fontWeight: "700", marginTop: 8 },
    nickname: {
      color: c.ink,
      fontSize: 16,
      padding: 14,
      borderRadius: 10,
      backgroundColor: c.surfaceAlt,
    },
    input: {
      minHeight: 50,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: 10,
      paddingHorizontal: 14,
      color: c.ink,
      backgroundColor: c.surfaceAlt,
      fontSize: 16,
    },
    error: { color: c.accent, fontSize: 13 },
    success: { color: c.green, fontSize: 13 },
    divider: { height: 1, backgroundColor: c.line, marginVertical: 8 },
  });
