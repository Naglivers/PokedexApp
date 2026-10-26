const fs = require("node:fs");
const path = require("node:path");
async function main() {
  const file = path.resolve(__dirname, "../.env.local");
  const local = fs.existsSync(file)
    ? Object.fromEntries(
        fs
          .readFileSync(file, "utf8")
          .split(/\r?\n/)
          .filter((line) => /^[A-Z_]+=/.test(line))
          .map((line) => {
            const index = line.indexOf("=");
            return [line.slice(0, index), line.slice(index + 1).trim()];
          }),
      )
    : {};
  const url =
    process.env.EXPO_PUBLIC_SUPABASE_URL || local.EXPO_PUBLIC_SUPABASE_URL;
  const key =
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    local.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    throw new Error("Preencha .env.local antes de verificar a conexão.");
  const headers = { apikey: key };
  const settings = await fetch(`${url}/auth/v1/settings`, {
    headers,
    signal: AbortSignal.timeout(15000),
  });
  console.log(`Conexão com Supabase Auth: HTTP ${settings.status}`);
  if (!settings.ok) {
    process.exitCode = 1;
    return;
  }
  const auth = await settings.json();
  const anonymous =
    auth.external?.anonymous_users ?? auth.anonymous_users_enabled;
  console.log(
    `Login anônimo: ${anonymous === true ? "habilitado" : anonymous === false ? "desabilitado" : "confira Authentication > Sign In / Providers"}`,
  );
  const schema = await fetch(
    `${url}/rest/v1/rpc/pokeatlas_community_overview`,
    { headers, signal: AbortSignal.timeout(15000) },
  );
  console.log(
    `Funções da comunidade: ${schema.ok ? "disponíveis" : `ainda indisponíveis (HTTP ${schema.status})`}`,
  );
  if (!schema.ok) {
    console.log(
      "Execute supabase/migrations/202610260001_community.sql no SQL Editor do projeto.",
    );
    process.exitCode = 1;
  }
}
main().catch((error) => {
  console.error(`Não foi possível verificar: ${error.message}`);
  process.exitCode = 1;
});
