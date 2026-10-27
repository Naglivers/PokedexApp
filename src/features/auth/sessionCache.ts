import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { AccountSession } from "../../services/account";

const CACHE_KEY = "pokeatlas-account-cache-v1";
const TOKEN_KEY = "pokeatlas-account-token-v1";
let pending: Promise<unknown> = Promise.resolve();
function persist(operation: () => Promise<void>) {
  const next = pending.catch(() => {}).then(operation);
  pending = next;
  return next;
}
const tokens = {
  get: () =>
    Platform.OS === "web"
      ? AsyncStorage.getItem(TOKEN_KEY)
      : SecureStore.getItemAsync(TOKEN_KEY),
  set: (value: string) =>
    Platform.OS === "web"
      ? AsyncStorage.setItem(TOKEN_KEY, value)
      : SecureStore.setItemAsync(TOKEN_KEY, value),
  remove: () =>
    Platform.OS === "web"
      ? AsyncStorage.removeItem(TOKEN_KEY)
      : SecureStore.deleteItemAsync(TOKEN_KEY),
};
export async function readCachedSession(): Promise<AccountSession | null> {
  await pending.catch(() => {});
  const [raw, secret] = await Promise.all([
    AsyncStorage.getItem(CACHE_KEY),
    tokens.get(),
  ]);
  if (!raw || !secret) return null;
  try {
    const { user } = JSON.parse(raw);
    const { token, expires_at, id } = JSON.parse(secret);
    if (
      !/^[a-f0-9]{64}$/.test(token) ||
      !user ||
      user.id !== id ||
      typeof user.nickname !== "string" ||
      !Number.isFinite(Date.parse(expires_at)) ||
      Date.parse(expires_at) <= Date.now()
    )
      return null;
    return { token, expires_at, user };
  } catch {
    return null;
  }
}
export async function cacheSession(session: AccountSession) {
  return persist(async () => {
    await tokens.set(
      JSON.stringify({
        token: session.token,
        expires_at: session.expires_at,
        id: session.user.id,
      }),
    );
    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ user: session.user }),
    );
  });
}
export async function clearCachedSession() {
  return persist(async () => {
    await tokens.remove();
    await AsyncStorage.removeItem(CACHE_KEY);
  });
}
