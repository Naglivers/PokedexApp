import { createClient } from "npm:@supabase/supabase-js@2";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
const normalize = (title: string) =>
  title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
const editions: [string, string, string[], string[]][] = [
  ["red-blue", "Pokémon Red", ["red"], ["pokemonredversion"]],
  ["red-blue", "Pokémon Blue", ["blue"], ["pokemonblueversion"]],
  [
    "yellow",
    "Pokémon Yellow",
    ["yellow"],
    ["pokemonyellowversion", "pokemonyellowversionspecialpikachuedition"],
  ],
  ["gold-silver", "Pokémon Gold", ["gold"], ["pokemongoldversion"]],
  ["gold-silver", "Pokémon Silver", ["silver"], ["pokemonsilverversion"]],
  ["crystal", "Pokémon Crystal", ["crystal"], ["pokemoncrystalversion"]],
  ["ruby-sapphire", "Pokémon Ruby", ["ruby"], ["pokemonrubyversion"]],
  [
    "ruby-sapphire",
    "Pokémon Sapphire",
    ["sapphire"],
    ["pokemonsapphireversion"],
  ],
  ["emerald", "Pokémon Emerald", ["emerald"], ["pokemonemeraldversion"]],
  [
    "firered-leafgreen",
    "Pokémon FireRed",
    ["firered"],
    ["pokemonfireredversion"],
  ],
  [
    "firered-leafgreen",
    "Pokémon LeafGreen",
    ["leafgreen"],
    ["pokemonleafgreenversion"],
  ],
  ["diamond-pearl", "Pokémon Diamond", ["diamond"], ["pokemondiamondversion"]],
  ["diamond-pearl", "Pokémon Pearl", ["pearl"], ["pokemonpearlversion"]],
  ["platinum", "Pokémon Platinum", ["platinum"], ["pokemonplatinumversion"]],
  [
    "heartgold-soulsilver",
    "Pokémon HeartGold / SoulSilver",
    ["heartgold", "soulsilver"],
    ["pokemonheartgoldversionpokemonsoulsilverversion"],
  ],
  [
    "heartgold-soulsilver",
    "Pokémon HeartGold",
    ["heartgold"],
    ["pokemonheartgoldversion"],
  ],
  [
    "heartgold-soulsilver",
    "Pokémon SoulSilver",
    ["soulsilver"],
    ["pokemonsoulsilverversion"],
  ],
  ["black-white", "Pokémon Black", ["black"], ["pokemonblackversion"]],
  ["black-white", "Pokémon White", ["white"], ["pokemonwhiteversion"]],
  [
    "black-2-white-2",
    "Pokémon Black 2",
    ["black-2"],
    ["pokemonblackversion2", "pokemonblack2version"],
  ],
  [
    "black-2-white-2",
    "Pokémon White 2",
    ["white-2"],
    ["pokemonwhiteversion2", "pokemonwhite2version"],
  ],
];
type Badge = {
  ra_game_id: number;
  game: string;
  title: string;
  versions: string[];
  image: string | null;
  mode: string;
  total: number;
  awarded: number;
};
function completedBadges(input: unknown): Badge[] {
  if (!Array.isArray(input) || input.length > 40000)
    throw new Error("upstream_format");
  const result = new Map<number, Badge>();
  for (const row of input) {
    if (!row || typeof row !== "object" || typeof row.Title !== "string")
      throw new Error("upstream_format");
    const edition = editions.find((e) => e[3].includes(normalize(row.Title)));
    // Exact retail titles only. Hacks, subsets and similarly named games cannot match.
    if (!edition || ![4, 5, 6, 18].includes(Number(row.ConsoleID))) continue;
    const id = Number(row.GameID),
      total = Number(row.MaxPossible),
      awarded = Number(row.NumAwarded);
    const mode = String(row.HardcoreMode);
    if (
      ![id, total, awarded].every(Number.isSafeInteger) ||
      id <= 0 ||
      total <= 0 ||
      awarded < total ||
      !["0", "1"].includes(mode)
    )
      continue;
    const old = result.get(id);
    if (old?.mode === "hardcore") continue;
    result.set(id, {
      ra_game_id: id,
      game: edition[0],
      title: edition[1],
      versions: edition[2],
      image:
        typeof row.ImageIcon === "string" &&
        /^\/Images\/[0-9]+\.png$/.test(row.ImageIcon)
          ? row.ImageIcon
          : null,
      mode: mode === "1" ? "hardcore" : "softcore",
      total,
      awarded,
    });
  }
  return [...result.values()];
}
async function raRead(username: string, key: string) {
  const url = new URL(
    "https://retroachievements.org/API/API_GetUserCompletedGames.php",
  );
  url.search = new URLSearchParams({ y: key, u: username }).toString();
  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok || !response.body) throw new Error("upstream");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 6000000) {
      await reader.cancel();
      throw new Error("upstream_format");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.length;
  }
  return completedBadges(JSON.parse(new TextDecoder().decode(bytes)));
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return reply({ ok: false, code: "method" }, 405);
  const key = Deno.env.get("RETROACHIEVEMENTS_WEB_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!key || !supabaseUrl || !serviceKey)
    return reply({ ok: false, code: "configuration" }, 503);
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
  async function synchronize(claim: Record<string, any>) {
    if (!claim.ok || claim.cached) return claim;
    const source = String(claim.source_url);
    const match =
      /^https:\/\/(?:www\.)?retroachievements\.org\/user\/([a-zA-Z0-9_.%-]{1,80})\/?$/.exec(
        source,
      );
    try {
      if (!match) throw new Error("invalid_link");
      const username = decodeURIComponent(match[1]);
      if (!/^[a-zA-Z0-9_.-]{1,80}$/.test(username))
        throw new Error("invalid_link");
      const badges = await raRead(username, key!);
      const { data, error } = await admin.rpc("pokeatlas_ra_finish", {
        p_account_id: claim.account_id,
        p_claim: claim.claim,
        p_source_url: source,
        p_badges: badges,
      });
      if (error || !data?.ok) throw new Error("save");
      return { ok: true, cached: false, count: badges.length };
    } catch {
      await admin.rpc("pokeatlas_ra_finish", {
        p_account_id: claim.account_id,
        p_claim: claim.claim,
        p_source_url: source,
        p_badges: [],
        p_error: true,
      });
      // Do not log fetch errors: their message can contain the secret query parameter.
      return { ok: false, code: "sync_failed" };
    }
  }
  try {
    const text = await req.text();
    if (text.length > 2000)
      return reply({ ok: false, code: "invalid_input" }, 400);
    const body = JSON.parse(text);
    if (body.batch === true) {
      const secret = Deno.env.get("RETROACHIEVEMENTS_SYNC_SECRET");
      const supplied = req.headers.get("x-sync-secret") ?? "";
      if (!secret || secret.length < 32 || supplied !== secret)
        return reply({ ok: false, code: "forbidden" }, 403);
      if (
        body.cursor != null &&
        (typeof body.cursor !== "string" ||
          !/^[0-9a-f-]{36}$/i.test(body.cursor))
      )
        return reply({ ok: false, code: "invalid_input" }, 400);
      const { data: accounts, error } = await admin.rpc(
        "pokeatlas_ra_accounts",
        { p_after: body.cursor ?? null },
      );
      if (error || !Array.isArray(accounts))
        return reply({ ok: false, code: "setup" }, 503);
      let failed = 0;
      for (const account of accounts) {
        const { data, error } = await admin.rpc("pokeatlas_ra_claim_account", {
          p_account_id: account,
        });
        if (error) {
          failed++;
          continue;
        }
        const result = await synchronize(data ?? { ok: false });
        if (
          !result.ok &&
          !["busy", "rate_limited", "not_linked"].includes(result.code)
        )
          failed++;
      }
      return reply({
        ok: true,
        failed,
        next_cursor:
          accounts.length === 3 ? accounts[accounts.length - 1] : null,
      });
    }
    if (typeof body.token !== "string" || body.token.length > 500)
      return reply({ ok: false, code: "invalid_input" }, 400);
    const client = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization") ?? "" },
        },
        auth: { persistSession: false },
      },
    );
    const { data, error } = await client.rpc("pokeatlas_ra_claim", {
      p_token: body.token,
    });
    if (error) return reply({ ok: false, code: "setup" }, 503);
    const result = await synchronize(
      data ?? { ok: false, code: "session_expired" },
    );
    return reply(result, result.ok ? 200 : 400);
  } catch {
    return reply({ ok: false, code: "invalid_input" }, 400);
  }
});
