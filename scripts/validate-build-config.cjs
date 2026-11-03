// Validate the cloud environment, not .env.local: otherwise a release can ship
// successfully with a null Supabase client.
function validateBuildConfig(env = process.env) {
  const url = env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const key = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const missing = [
    !url && "EXPO_PUBLIC_SUPABASE_URL",
    !key && "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ].filter(Boolean);
  if (missing.length)
    throw new Error(
      "Build interrompido: configure " +
        missing.join(" e ") +
        " no ambiente EAS selecionado em eas.json. O PokeAtlas usa PUBLISHABLE_KEY; cadastrar apenas ANON_KEY nao configura o app.",
    );
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    /* Report names, never values. */
  }
  if (
    !parsed ||
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== "/"
  ) {
    throw new Error(
      "EXPO_PUBLIC_SUPABASE_URL deve ser a URL HTTPS do projeto Supabase.",
    );
  }
  let publicKey = key.startsWith("sb_publishable_");
  if (!publicKey && key.split(".").length === 3) {
    try {
      publicKey =
        JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString())
          .role === "anon";
    } catch {
      /* Reject invalid and private keys. */
    }
  }
  if (!publicKey)
    throw new Error(
      "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY deve ser uma chave publica publishable ou anon.",
    );
  if (
    url !== env.EXPO_PUBLIC_SUPABASE_URL ||
    key !== env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    throw new Error(
      "Remova os espacos nas variaveis publicas do Supabase antes de gerar o app.",
    );
  }
}
module.exports = { validateBuildConfig };
if (require.main === module) {
  try {
    validateBuildConfig();
    console.log("Configuracao do Supabase validada para o build do PokeAtlas.");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
