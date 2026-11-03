const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validateBuildConfig } = require("../scripts/validate-build-config.cjs");
const valid = {
  EXPO_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
};
test("release fails when cloud variables are absent or use only the wrong key name", () => {
  assert.throws(() => validateBuildConfig({}), /EXPO_PUBLIC_SUPABASE_URL/);
  assert.throws(
    () =>
      validateBuildConfig({
        EXPO_PUBLIC_SUPABASE_URL: valid.EXPO_PUBLIC_SUPABASE_URL,
        EXPO_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_test",
      }),
    /EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY/,
  );
});
test("release accepts configured publishable and legacy anon keys", () => {
  assert.doesNotThrow(() => validateBuildConfig(valid));
  const payload = Buffer.from(JSON.stringify({ role: "anon" })).toString(
    "base64url",
  );
  assert.doesNotThrow(() =>
    validateBuildConfig({
      ...valid,
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "header." + payload + ".signature",
    }),
  );
});
test("release rejects private keys, invalid URLs and whitespace", () => {
  const payload = Buffer.from(
    JSON.stringify({ role: "service_role" }),
  ).toString("base64url");
  for (const key of ["sb_secret_private", "header." + payload + ".signature"]) {
    assert.throws(
      () =>
        validateBuildConfig({
          ...valid,
          EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
        }),
      /chave publica/,
    );
  }
  for (const url of [
    "not-a-url",
    "http://example.supabase.co",
    "https://example.supabase.co/rest/v1",
  ]) {
    assert.throws(
      () => validateBuildConfig({ ...valid, EXPO_PUBLIC_SUPABASE_URL: url }),
      /URL HTTPS/,
    );
  }
  assert.throws(
    () =>
      validateBuildConfig({
        ...valid,
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
          " " + valid.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      }),
    /espacos/,
  );
});
