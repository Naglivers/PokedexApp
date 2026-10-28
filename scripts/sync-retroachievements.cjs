// Hourly synchronization. Secrets are never printed or included in URLs.
const endpoint = process.env.SUPABASE_URL;
const secret = process.env.RETROACHIEVEMENTS_SYNC_SECRET;
if (!endpoint || !secret || secret.length < 32)
  throw new Error(
    "Configure SUPABASE_URL e RETROACHIEVEMENTS_SYNC_SECRET nos secrets do GitHub.",
  );
const url = new URL("/functions/v1/retroachievements-sync", endpoint);
if (url.protocol !== "https:") throw new Error("SUPABASE_URL deve usar HTTPS.");
(async () => {
  let cursor = null,
    batches = 0,
    failed = 0;
  do {
    const response = await fetch(url, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(100000),
      headers: { "Content-Type": "application/json", "x-sync-secret": secret },
      body: JSON.stringify({ batch: true, cursor }),
    });
    if (!response.ok)
      throw new Error(
        "Sincronização indisponível (HTTP " +
          response.status +
          "). Confira a função e os secrets.",
      );
    const data = await response.json();
    if (
      !data.ok ||
      !(data.next_cursor === null || typeof data.next_cursor === "string") ||
      !Number.isInteger(data.failed)
    )
      throw new Error("Resposta de sincronização inválida.");
    failed += data.failed;
    if (data.next_cursor !== null && data.next_cursor === cursor)
      throw new Error("A sincronização não avançou.");
    cursor = data.next_cursor;
    batches++;
    if (batches > 2000) throw new Error("Limite de lotes atingido.");
  } while (cursor);
  if (failed)
    throw new Error(
      failed +
        " contas não puderam ser sincronizadas; as badges anteriores foram preservadas.",
    );
  console.log("Sincronização RetroAchievements concluída.");
})().catch(() => {
  console.error(
    "Falha na sincronização RetroAchievements. Confira a função no Supabase e os secrets da integração.",
  );
  process.exitCode = 1;
});
