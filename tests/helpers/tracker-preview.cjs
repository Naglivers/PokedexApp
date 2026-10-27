// Isolated UI test backend. Uses the real SQL migrations in a disposable local
// PostgreSQL database; never connects to the user's Supabase project.
const http = require("node:http");
const { createTrackerDatabase } = require("./tracker-database.cjs");

async function main() {
  const { db, device, asDevice, rpc } = await createTrackerDatabase();
  let queue = Promise.resolve();
  const allowed = {
    pokeatlas_account_auth: ["p_nickname", "p_password", "p_register"],
    pokeatlas_account_profile: ["p_token"],
    pokeatlas_account_save: ["p_token", "p_email", "p_avatar_url"],
    pokeatlas_account_logout: ["p_token"],
    pokeatlas_community_overview: [],
    pokeatlas_account_my_likes: ["p_token"],
    pokeatlas_account_set_like: ["p_token", "p_pokemon_id", "p_liked"],
    pokeatlas_account_like_counts: ["p_pokemon_ids"],
    pokeatlas_like_counts: ["p_pokemon_ids"],
    pokeatlas_track_page: ["p_path"],
    pokeatlas_tracker_get: ["p_token", "p_tracker"],
    pokeatlas_tracker_set: [
      "p_token",
      "p_tracker",
      "p_pokemon_ids",
      "p_caught",
    ],
    pokeatlas_tracker_complete: ["p_token", "p_tracker", "p_pokemon_ids"],
  };
  const user = {
    id: device,
    aud: "authenticated",
    role: "authenticated",
    email: "",
    app_metadata: {},
    user_metadata: {},
    is_anonymous: true,
    created_at: new Date().toISOString(),
  };
  function authSession() {
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    const encode = (value) =>
      Buffer.from(JSON.stringify(value)).toString("base64url");
    return {
      access_token:
        encode({ alg: "HS256", typ: "JWT" }) +
        "." +
        encode({ sub: device, role: "authenticated", exp: expiry }) +
        ".local-test",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: expiry,
      refresh_token: "local-test-only",
      user,
    };
  }
  const server = http.createServer((req, res) => {
    console.log(req.method, req.url?.split("?")[0]);
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:8097");
    res.setHeader(
      "Access-Control-Allow-Headers",
      req.headers["access-control-request-headers"] ??
        "apikey, authorization, content-type, x-client-info, x-supabase-api-version, prefer",
    );
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Content-Type", "application/json");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      const operation = async () => {
        const body = raw ? JSON.parse(raw) : {};
        const url = new URL(req.url, "http://127.0.0.1:8096");
        let result;
        if (
          url.pathname === "/auth/v1/signup" ||
          url.pathname === "/auth/v1/token"
        )
          result = authSession();
        else if (url.pathname === "/auth/v1/user") result = user;
        else if (url.pathname === "/auth/v1/logout") result = {};
        else if (url.pathname === "/auth/v1/settings")
          result = { external: { anonymous_users: true } };
        else if (url.pathname === "/__qa") {
          await db.exec("reset role");
          result = (
            await db.query(
              "select a.nickname, m.tracker_kind, array_agg(m.pokemon_id order by m.pokemon_id) as pokemon_ids from pokeatlas_private.tracker_marks m join pokeatlas_private.accounts a on a.id = m.account_id group by a.nickname, m.tracker_kind order by a.nickname, m.tracker_kind",
            )
          ).rows;
        } else if (url.pathname.startsWith("/rest/v1/rpc/")) {
          const name = url.pathname.slice("/rest/v1/rpc/".length);
          if (!Object.hasOwn(allowed, name)) throw Error("Unknown test RPC");
          await asDevice();
          if (name.endsWith("like_counts")) {
            result = (
              await db.query("select * from public." + name + "($1)", [
                body.p_pokemon_ids,
              ])
            ).rows;
          } else
            result = await rpc(
              name,
              allowed[name].map((param) => body[param] ?? null),
            );
          if (name === "pokeatlas_tracker_set")
            console.log(
              JSON.stringify({
                tracker: body.p_tracker,
                ids: body.p_pokemon_ids,
                caught: body.p_caught,
                ok: result.ok,
                saved: result.pokemon_ids,
              }),
            );
        } else {
          res.writeHead(404);
          res.end(JSON.stringify({ message: "Not found" }));
          return;
        }
        res.end(JSON.stringify(result ?? null));
      };
      queue = queue.then(operation, operation).catch((error) => {
        console.error(error.message);
        res.writeHead(400);
        res.end(JSON.stringify({ code: "TEST_ERROR", message: error.message }));
      });
    });
  });
  server.listen(8096, "127.0.0.1", () =>
    console.log("Disposable tracker SQL preview: http://localhost:8096"),
  );
  const close = () =>
    server.close(() => {
      void db.close().then(() => process.exit(0));
    });
  process.on("SIGINT", close);
  process.on("SIGTERM", close);
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
