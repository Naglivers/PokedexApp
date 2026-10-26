import { createClient } from "npm:@supabase/supabase-js@2.49.8";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });
const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))))
  .map((byte) => byte.toString(16).padStart(2, "0")).join("");

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Authentication required" }, 401);
    const { data: identity, error: authError } = await service.auth.getUser(token);
    if (authError || !identity.user) return json({ error: "Authentication required" }, 401);
    const raw = await request.text();
    if (raw.length > 50000) return json({ error: "Payload too large" }, 413);
    let payload;
    try { payload = JSON.parse(raw); } catch { return json({ error: "Invalid JSON" }, 400); }
    const { texts, target } = payload;
    if (!Array.isArray(texts) || !texts.length || texts.length > 32 ||
        texts.some((text) => typeof text !== "string" || !text.trim() || text.length > 4000) ||
        texts.reduce((total, text) => total + text.length, 0) > 8000 ||
        typeof target !== "string" || !/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(target)) return json({ error: "Invalid translation request" }, 400);
    const language = target.toLowerCase().startsWith("zh")
      ? (/hant|tw|hk|mo/i.test(target) ? "zh-TW" : "zh-CN") : target.split("-")[0].toLowerCase();
    const keys = await Promise.all(texts.map((text) => hash(JSON.stringify([language, text]))));
    const { data: saved, error: cacheError } = await service.from("pokeatlas_translation_cache").select("cache_key,translated_text").in("cache_key", keys);
    if (cacheError) return json({ error: "Translation cache not configured" }, 503);
    const cache = new Map((saved ?? []).map((entry) => [entry.cache_key, entry.translated_text]));
    const missing = [...new Set(keys.filter((key) => !cache.has(key)))];
    if (missing.length) {
      const apiKey = Deno.env.get("GOOGLE_TRANSLATE_API_KEY");
      if (!apiKey) return json({ error: "Translation provider not configured" }, 503);
      const input = missing.map((key) => texts[keys.indexOf(key)]);
      const { data: allowed, error: limitError } = await service.rpc("pokeatlas_reserve_translation", {
        p_user: identity.user.id, p_characters: input.reduce((total, text) => total + text.length, 0),
      });
      if (limitError) return json({ error: "Translation quota unavailable" }, 503);
      if (!allowed) return json({ error: "Daily translation limit reached" }, 429);
      const response = await fetch("https://translation.googleapis.com/language/translate/v2", {
        method: "POST", headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey },
        body: JSON.stringify({ q: input, target: language, format: "text" }), signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) return json({ error: "Translation provider unavailable" }, 502);
      const result = await response.json();
      const output = result.data?.translations;
      if (!Array.isArray(output) || output.length !== missing.length || output.some((entry) => typeof entry.translatedText !== "string")) return json({ error: "Invalid translation response" }, 502);
      const rows = missing.map((key, index) => ({ cache_key: key, translated_text: output[index].translatedText }));
      const { error: saveError } = await service.from("pokeatlas_translation_cache").upsert(rows);
      if (saveError) return json({ error: "Translation cache unavailable" }, 503);
      rows.forEach((row) => cache.set(row.cache_key, row.translated_text));
    }
    return json({ translations: keys.map((key) => cache.get(key)) });
  } catch { return json({ error: "Translation unavailable" }, 503); }
});
