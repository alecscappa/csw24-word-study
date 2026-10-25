// The game reviewer: a small server on this Mac that the app sends games to. It runs Macondo's full-game analysis
// (simulation each turn, the endgame solved exactly) and hands back the result. Only this computer can reach it.
// Usage: node reviewer/reviewer.mjs   (install.sh starts it at login instead)
import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.join(HERE, "..");
const MACONDO_DIR = path.join(ROOT, "tools", "macondo"), MACONDO = path.join(MACONDO_DIR, "macondo");
const WORK = path.join(ROOT, "tools", "reviews");
const PORT = 8190;
fs.mkdirSync(WORK, { recursive: true });

// pages allowed to use it: Live Server and the test copies, the page opened from disk, and the live site
const allowed = o => !o || o === "null" || o === "file://" || /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(o) || o === "https://alecscappa.github.io";

const jobs = new Map(), queue = [];
let running = null, seq = 0;
const view = j => ({ id: j.id, state: j.state, done: j.done, total: j.total, error: j.error || "", speed: j.speed, queued: queue.indexOf(j) + 1 });

// a Woogles game id, from the id itself or a link to the game
const woogId = s => (String(s).match(/woogles\.io\/game\/([A-Za-z0-9]+)/) || String(s).match(/^([A-Za-z0-9]{6,})$/) || [])[1];

function next() {
  if (running || !queue.length) return;
  const j = running = queue.shift();
  j.state = "running";
  const dir = path.join(WORK, j.id), gcg = path.join(dir, "game.gcg"), out = path.join(dir, "review.json");
  fs.mkdirSync(dir, { recursive: true });
  let cmds = "set lexicon CSW24\n";
  if (j.woog) cmds += `load woogles ${j.woog}\nexport "${gcg}"\n`;
  else { fs.writeFileSync(gcg, j.gcg); cmds += `load "${gcg}"\n`; }
  cmds += `analyze -force -json "${out}"\nexit\n`;
  // gentle: background priority, so macOS keeps the Mac smooth (it takes several times longer)
  const [cmd, args] = j.speed === "gentle" ? ["taskpolicy", ["-b", MACONDO]] : [MACONDO, []];
  const p = j.proc = spawn(cmd, args, { cwd: MACONDO_DIR, env: { ...process.env, DEFAULT_LEXICON: "CSW24" } });
  let buf = "", errs = [];
  const line = l => {
    l = l.replace(/\x1b\[[0-9;]*m/g, "");
    const m = l.match(/analyzed turn .*player-turn:(\d+) total:(\d+)/);
    if (m) { j.done = +m[1]; j.total = +m[2]; }
    if (/Error:|"level":"error"|panic:/.test(l) && !/sending quit signal|Config File|error-checking-for-datapath/.test(l)) errs.push(l.trim().slice(0, 300));
  };
  const read = d => { buf += d; let i; while ((i = buf.indexOf("\n")) >= 0) { line(buf.slice(0, i)); buf = buf.slice(i + 1); } };
  p.stdout.on("data", read); p.stderr.on("data", read);
  p.stdin.write(cmds);
  p.on("exit", () => {
    running = null; j.proc = null;
    if (j.state === "stopped") return next();
    try {
      j.result = JSON.parse(fs.readFileSync(out, "utf8"));
      j.gcgOut = fs.readFileSync(gcg, "utf8");
      j.state = "done"; j.done = j.total = j.result.turns?.length || j.total;
    } catch {
      j.state = "error"; j.error = errs.slice(-3).join("\n") || "Macondo stopped without a review";
    }
    next();
  });
}

const send = (res, code, body, origin) => {
  res.writeHead(code, { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin || "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Private-Network": "true", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
};
const body = req => new Promise((ok, no) => { let s = ""; req.on("data", d => { s += d; if (s.length > 2e6) no(new Error("too big")); }); req.on("end", () => { try { ok(JSON.parse(s || "{}")); } catch (e) { no(e); } }); });

http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (!allowed(origin)) return send(res, 403, { error: "not allowed" });
  if (req.method === "OPTIONS") return send(res, 204, {}, origin);
  const u = new URL(req.url, "http://x"), parts = u.pathname.split("/").filter(Boolean);
  try {
    if (u.pathname === "/status") return send(res, 200, { ok: true, macondo: fs.existsSync(MACONDO), busy: !!running, queued: queue.length }, origin);
    if (req.method === "POST" && u.pathname === "/review") {
      const b = await body(req), woog = b.woogles ? woogId(b.woogles) : null;
      if (b.woogles && !woog) return send(res, 400, { error: "That doesn't look like a Woogles game link" }, origin);
      if (!woog && !/^#|^>/m.test(b.gcg || "")) return send(res, 400, { error: "No game to review" }, origin);
      const j = { id: Date.now().toString(36) + (++seq), state: "queued", done: 0, total: 0, speed: b.speed === "gentle" ? "gentle" : "full", gcg: b.gcg, woog };
      jobs.set(j.id, j); queue.push(j); next();
      return send(res, 200, view(j), origin);
    }
    const j = parts[0] === "review" && jobs.get(parts[1]);
    if (parts[0] === "review" && !j) return send(res, 404, { error: "No such review (the reviewer may have restarted)" }, origin);
    if (j && req.method === "GET") return send(res, 200, { ...view(j), ...(j.state === "done" ? { result: j.result, gcg: j.gcgOut } : {}) }, origin);
    if (j && req.method === "POST" && parts[2] === "stop") {
      const q = queue.indexOf(j); if (q >= 0) queue.splice(q, 1);
      j.state = "stopped"; j.proc?.kill();
      return send(res, 200, view(j), origin);
    }
    send(res, 404, { error: "not found" }, origin);
  } catch (e) { send(res, 500, { error: String(e.message || e) }, origin); }
}).listen(PORT, "127.0.0.1", () => console.log(`Game reviewer ready on http://127.0.0.1:${PORT}` + (fs.existsSync(MACONDO) ? "" : " (Macondo not found in tools/macondo)")));
