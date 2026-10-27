import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";
import { LogIn, UserPlus } from "lucide-react-native";
import { Button, Loading } from "../src/components/ui";
import { useTheme, useThemedStyles, type ThemeColors } from "../src/theme";
import { useAuth } from "../src/features/auth/AuthProvider";

export default function Login() {
  const { colors: c, ui } = useTheme();
  const s = useThemedStyles(styles);
  const { session, loading, signIn, signUp } = useAuth();
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [legacy, setLegacy] = useState(false);
  const submitting = useRef(false);
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem("pokeatlas-local-account")
      .then((raw) => {
        if (!active || !raw) return;
        try {
          const account = JSON.parse(raw);
          if (typeof account.nickname === "string") {
            setNickname(account.nickname);
            setLegacy(true);
            setRegister(true);
          }
        } catch {}
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  if (loading) return <Loading />;
  if (session) return <Redirect href="/profile" />;
  const submit = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setError("");
    setBusy(true);
    try {
      await (register
        ? signUp(nickname, password)
        : signIn(nickname, password));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
      submitting.current = false;
    }
  };
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={s.root}
    >
      <View style={s.card}>
        <Text style={[ui.label, { color: c.accent }]}>POKÉATLAS</Text>
        <Text style={ui.title}>
          {register ? "Criar conta" : "Entrar na comunidade"}
        </Text>
        <Text style={ui.subtitle}>
          {register
            ? "Só nickname e senha. Você pode adicionar e-mail e foto depois."
            : "Entre com seu nickname e senha."}
        </Text>
        {legacy && (
          <Text style={ui.subtitle}>
            Sua conta anterior era local. Cadastre o mesmo nickname uma vez para
            salvar sua conta online.
          </Text>
        )}
        <Text style={s.label}>Nickname</Text>
        <TextInput
          accessibilityLabel="Nickname"
          value={nickname}
          onChangeText={setNickname}
          placeholder="Seu nickname"
          placeholderTextColor={c.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          maxLength={20}
          editable={!busy}
          style={s.input}
        />
        <Text style={s.label}>Senha</Text>
        <TextInput
          accessibilityLabel="Senha"
          value={password}
          onChangeText={setPassword}
          placeholder="Pelo menos 6 caracteres"
          placeholderTextColor={c.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={register ? "new-password" : "current-password"}
          secureTextEntry
          editable={!busy}
          onSubmitEditing={() => void submit()}
          returnKeyType="go"
          style={s.input}
        />
        {!!error && (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        )}
        <Button onPress={() => void submit()} disabled={busy}>
          {busy ? "Aguarde..." : register ? "Criar conta" : "Entrar"}
        </Button>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => {
            setRegister(!register);
            setError("");
          }}
          style={s.switch}
        >
          {register ? (
            <LogIn size={16} color={c.accent} />
          ) : (
            <UserPlus size={16} color={c.accent} />
          )}
          <Text style={{ color: c.accent, fontWeight: "700" }}>
            {register ? "Já tenho uma conta" : "Criar uma conta"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
const styles = (c: ThemeColors) => ({
  root: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: c.bg,
  } as const,
  card: {
    width: "100%",
    maxWidth: 440,
    padding: 26,
    gap: 14,
    backgroundColor: c.surface,
    borderColor: c.line,
    borderWidth: 1,
    borderRadius: 22,
  } as const,
  label: { color: c.ink, fontSize: 12, fontWeight: "700" } as const,
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 12,
    paddingHorizontal: 15,
    color: c.ink,
    backgroundColor: c.surfaceAlt,
    fontSize: 16,
  } as const,
  error: { color: c.accent, fontSize: 13 } as const,
  switch: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    padding: 8,
  } as const,
});
