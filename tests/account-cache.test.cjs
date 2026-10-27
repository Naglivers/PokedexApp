const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    }).outputText,
    filename,
  );
const plain = new Map();
const secure = new Map();
const platform = { OS: "android" };
const storage = {
  getItem: async (k) => plain.get(k) ?? null,
  setItem: async (k, v) => {
    await new Promise((r) => setTimeout(r, 3));
    plain.set(k, v);
  },
  removeItem: async (k) => {
    plain.delete(k);
  },
};
const original = Module._load;
Module._load = function (request, ...args) {
  if (request === "@react-native-async-storage/async-storage")
    return { __esModule: true, default: storage };
  if (request === "react-native") return { Platform: platform };
  if (request === "expo-secure-store")
    return {
      getItemAsync: async (k) => secure.get(k) ?? null,
      setItemAsync: async (k, v) => {
        secure.set(k, v);
      },
      deleteItemAsync: async (k) => {
        secure.delete(k);
      },
    };
  return original.call(this, request, ...args);
};
const {
  cacheSession,
  readCachedSession,
  clearCachedSession,
} = require("../src/features/auth/sessionCache.ts");
const session = {
  token: "a".repeat(64),
  expires_at: new Date(Date.now() + 86400000).toISOString(),
  user: { id: "account-one", nickname: "Misty", email: null, avatar_url: null },
};

test("cache restores the session and keeps the native token out of ordinary storage", async () => {
  await cacheSession(session);
  assert.deepEqual(await readCachedSession(), session);
  assert.ok(!JSON.stringify([...plain.values()]).includes(session.token));
  assert.ok(JSON.stringify([...secure.values()]).includes(session.token));
});
test("signing out wins over a pending profile cache write", async () => {
  await Promise.all([cacheSession(session), clearCachedSession()]);
  assert.equal(await readCachedSession(), null);
});
test("corrupt, mismatched, expired and legacy local sessions do not authenticate", async () => {
  await cacheSession({ ...session, expires_at: "bad-date" });
  assert.equal(await readCachedSession(), null);
  await cacheSession({ ...session, expires_at: "2020-01-01T00:00:00Z" });
  assert.equal(await readCachedSession(), null);
  await cacheSession(session);
  plain.set("pokeatlas-account-cache-v1", "{malformed");
  assert.equal(await readCachedSession(), null);
  await cacheSession(session);
  plain.set(
    "pokeatlas-account-cache-v1",
    JSON.stringify({ user: { ...session.user, id: "other-account" } }),
  );
  assert.equal(await readCachedSession(), null);
  await clearCachedSession();
  plain.set(
    "pokeatlas-local-session",
    JSON.stringify({ user: { id: "local-name", nickname: "Misty" } }),
  );
  assert.equal(await readCachedSession(), null);
});
test("web restores a saved login and logout removes both cache entries", async () => {
  platform.OS = "web";
  await cacheSession(session);
  assert.deepEqual(await readCachedSession(), session);
  await clearCachedSession();
  assert.equal(await readCachedSession(), null);
  assert.ok(!plain.has("pokeatlas-account-token-v1"));
});
