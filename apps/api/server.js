import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { WebSocketServer } from "ws";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const WEB = path.join(ROOT, "apps/web");
const PORT = Number(process.env.PORT || 3000);
const DATABASE_URL = process.env.DATABASE_URL || "postgres://voicecore:voicecore_dev@localhost:5432/voicecore";
const DEV_MODE = process.env.DEV_MODE === "true";

const pool = new Pool({ connectionString: DATABASE_URL });
const sessions = new Map();
const sockets = new Map();

const json = (res, status, data) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
};
const body = async (req) => {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
};
const tokenFrom = (req) => {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7) : "";
};
const userFromToken = (token) => token && sessions.get(token);
const auth = (req, res) => {
  const userId = userFromToken(tokenFrom(req));
  if (!userId) { json(res, 401, { error: "AUTH_REQUIRED" }); return null; }
  return userId;
};
const scrypt = (password, salt) => new Promise((resolve, reject) =>
  crypto.scrypt(password, Buffer.from(salt, "base64"), 64, { N: 16384, r: 8, p: 1 }, (e, key) => e ? reject(e) : resolve(key.toString("base64")))
);
const publicUser = (row) => ({ id: row.id, username: row.username, displayName: row.display_name });

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("CREATE TABLE IF NOT EXISTS _voicecore_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
    for (const name of ["0001_foundation.sql", "0002_full_requirements.sql", "0003_local_dev.sql"]) {
      const exists = await client.query("SELECT 1 FROM _voicecore_migrations WHERE name=$1", [name]);
      if (exists.rowCount) continue;
      const sql = fs.readFileSync(path.join(ROOT, "db/migrations", name), "utf8");
      await client.query(sql);
      await client.query("INSERT INTO _voicecore_migrations(name) VALUES($1)", [name]);
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

async function init() {
  for (let i = 0; i < 30; i++) {
    try { await migrate(); return; }
    catch (e) { if (i === 29) throw e; await new Promise(r => setTimeout(r, 1000)); }
  }
}

async function api(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/health") return json(res, 200, { ok: true, devMode: DEV_MODE });
  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    if (!DEV_MODE) return json(res, 403, { error: "DEV_LOGIN_DISABLED" });
    const b = await body(req);
    const q = await pool.query(
      "SELECT u.id,p.username,p.display_name,d.password_salt,d.password_hash FROM users u JOIN profiles p ON p.user_id=u.id JOIN dev_credentials d ON d.user_id=u.id WHERE p.username=$1 AND u.status='ACTIVE'",
      [String(b.username || "").trim().toLowerCase()]
    );
    if (!q.rowCount) return json(res, 401, { error: "INVALID_LOGIN" });
    const row = q.rows[0];
    const hash = await scrypt(String(b.password || ""), row.password_salt);
    if (!crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(row.password_hash))) return json(res, 401, { error: "INVALID_LOGIN" });
    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, row.id);
    return json(res, 200, { token, user: publicUser(row) });
  }

  const userId = auth(req, res);
  if (!userId) return true;

  if (req.method === "GET" && url.pathname === "/api/me") {
    const q = await pool.query("SELECT u.id,p.username,p.display_name,w.balance_vh FROM users u JOIN profiles p ON p.user_id=u.id LEFT JOIN wallets w ON w.user_id=u.id WHERE u.id=$1", [userId]);
    return json(res, 200, q.rows[0]);
  }

  if (req.method === "GET" && url.pathname === "/api/chats") {
    const q = await pool.query(
      "SELECT c.id,c.title,c.kind, max(m.created_at) last_message_at, (SELECT body FROM messages m2 WHERE m2.chat_id=c.id ORDER BY m2.created_at DESC LIMIT 1) last_message FROM chats c JOIN chat_members cm ON cm.chat_id=c.id LEFT JOIN messages m ON m.chat_id=c.id WHERE cm.user_id=$1 GROUP BY c.id ORDER BY last_message_at DESC NULLS LAST",
      [userId]
    );
    return json(res, 200, q.rows);
  }

  const chatMatch = url.pathname.match(/^\/api\/chats\/([0-9a-f-]+)\/messages$/);
  if (chatMatch && req.method === "GET") {
    const chatId = chatMatch[1];
    const member = await pool.query("SELECT 1 FROM chat_members WHERE chat_id=$1 AND user_id=$2", [chatId, userId]);
    if (!member.rowCount) return json(res, 403, { error: "FORBIDDEN" });
    const q = await pool.query(
      "SELECT m.id,m.body,m.created_at,m.sender_id,p.username,p.display_name FROM messages m JOIN profiles p ON p.user_id=m.sender_id WHERE m.chat_id=$1 AND m.deleted_at IS NULL ORDER BY m.created_at ASC LIMIT 500",
      [chatId]
    );
    return json(res, 200, q.rows);
  }

  if (chatMatch && req.method === "POST") {
    const chatId = chatMatch[1];
    const b = await body(req);
    const textValue = String(b.body || "").trim();
    if (!textValue || textValue.length > 4000) return json(res, 400, { error: "INVALID_MESSAGE" });
    const member = await pool.query("SELECT 1 FROM chat_members WHERE chat_id=$1 AND user_id=$2", [chatId, userId]);
    if (!member.rowCount) return json(res, 403, { error: "FORBIDDEN" });
    const q = await pool.query(
      "INSERT INTO messages(chat_id,sender_id,body) VALUES($1,$2,$3) RETURNING id,chat_id,sender_id,body,created_at",
      [chatId,userId,textValue]
    );
    const msg = q.rows[0];
    const enriched = await pool.query("SELECT m.id,m.chat_id,m.body,m.created_at,m.sender_id,p.username,p.display_name FROM messages m JOIN profiles p ON p.user_id=m.sender_id WHERE m.id=$1",[msg.id]);
    const out = enriched.rows[0];
    broadcast(chatId, out);
    return json(res, 201, out);
  }

  return json(res, 404, { error: "NOT_FOUND" });
}

function broadcast(chatId, message) {
  const set = sockets.get(chatId);
  if (!set) return;
  for (const ws of set) if (ws.readyState === 1) ws.send(JSON.stringify({ type: "message", message }));
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));
    if (url.pathname.startsWith("/api/")) return await api(req, res, url);
    if (url.pathname === "/ws") return;
    let file = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\//, "");
    file = path.normalize(path.join(WEB, file));
    if (!file.startsWith(WEB) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(WEB, "index.html");
    const ext = path.extname(file);
    const types = { ".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".svg":"image/svg+xml" };
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  } catch (e) { console.error(e); json(res,500,{error:"SERVER_ERROR"}); }
});

const wss = new WebSocketServer({ server, path: "/ws" });
wss.on("connection", (ws, req) => {
  const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));
  const userId = userFromToken(url.searchParams.get("token"));
  if (!userId) return ws.close(1008, "AUTH_REQUIRED");
  ws.userId = userId;
  ws.on("message", async raw => {
    try {
      const data = JSON.parse(raw.toString());
      if (data.type !== "subscribe" || !data.chatId) return;
      const member = await pool.query("SELECT 1 FROM chat_members WHERE chat_id=$1 AND user_id=$2",[data.chatId,userId]);
      if (!member.rowCount) return;
      if (!sockets.has(data.chatId)) sockets.set(data.chatId,new Set());
      sockets.get(data.chatId).add(ws);
      ws.chatId = data.chatId;
      ws.send(JSON.stringify({type:"subscribed",chatId:data.chatId}));
    } catch {}
  });
  ws.on("close",()=>{ if(ws.chatId) sockets.get(ws.chatId)?.delete(ws); });
});

init().then(()=>server.listen(PORT,"0.0.0.0",()=>console.log("VoiceCore local dev: http://0.0.0.0:"+PORT))).catch(e=>{console.error(e);process.exit(1)});
