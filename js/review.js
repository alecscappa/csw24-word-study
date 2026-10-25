// ---------- Games and Review: games kept on this device (played here, typed in, or loaded from a .gcg file or
// Woogles) and reviewed in full by Macondo through the reviewer on the Mac (reviewer/reviewer.mjs). Until a game has
// a full review, each turn gets a quick check from our own engine ----------
const RV_HELPER = "http://127.0.0.1:8190";
let GAMES = store.get("games", []);
const gamesSave = () => store.set("games", GAMES);
const gameById = id => GAMES.find(g => g.id === id);
const newGameId = () => Date.now().toString(36) + rnd(1e6).toString(36);

// ---- .gcg files: the standard game record, which Woogles and Macondo use too. A play reads ">nick: RACK 8D WORD +30 30",
// "8D" across from row 8 column D, "D8" down; "." in the word is a tile already on the board, small letters are blanks
const gcgSquares = (at, word) => {
  let m, r, c, d = 0;
  if (m = at.match(/^(\d{1,2})([A-O])$/i)) { r = +m[1] - 1; c = m[2].toUpperCase().charCodeAt(0) - 65; }
  else if (m = at.match(/^([A-O])(\d{1,2})$/i)) { r = +m[2] - 1; c = m[1].toUpperCase().charCodeAt(0) - 65; d = 1; }
  else return null;
  const sq = [...word].map((ch, k) => [d ? (r + k) * 15 + c : r * 15 + c + k, ch]);
  return sq.every(([i]) => i >= 0 && i < 225) && (d || c + word.length <= 15) ? { sq, start: sq[0][0], dir: d } : null;
};
function gcgParse(text) {
  const g = { names: ["Player 1", "Player 2"], nicks: [], lexicon: "", ev: [] };
  let board = ".".repeat(225);
  for (const raw of String(text).split(/\r?\n/)) {
    const l = raw.trim(); let m;
    if (m = l.match(/^#player([12])\s+(\S+)\s*(.*)$/)) { g.nicks[m[1] - 1] = m[2]; g.names[m[1] - 1] = m[3].trim() || m[2]; continue; }
    if (m = l.match(/^#lexicon\s+(\S+)/)) { g.lexicon = m[1]; continue; }
    if (!(m = l.match(/^>([^:]+):\s*(.*)$/))) continue;
    const nick = m[1].trim(), f = m[2].trim().split(/\s+/);
    let p = g.nicks.indexOf(nick);
    if (p < 0) { p = g.nicks.length < 2 ? g.nicks.push(nick) - 1 : 0; if (g.names[p].startsWith("Player")) g.names[p] = nick; }
    const tot = +f[f.length - 1], s = +f[f.length - 2].replace("+", "");
    const e = { p, rack: f[0].replace(/[()]/g, ""), before: board, s, tot };
    if (f[0].startsWith("(") || /^\(\w*\)$/.test(f[1] || "") && f[1] !== "(challenge)" && f[1] !== "(time)") { e.k = "end"; e.x = f[0].startsWith("(") ? e.rack : f[1].replace(/[()]/g, ""); }
    else if (f[1] === "(challenge)") e.k = "bonus";
    else if (f[1] === "(time)") e.k = "time";
    else if (f[1] === "--") { e.k = "off"; const last = [...g.ev].reverse().find(x => x.k === "play"); if (last) { board = last.before; last.off = true; } }
    else if (f[1] && f[1].startsWith("-")) { e.k = f[1] === "-" ? "pass" : "swap"; e.x = f[1].slice(1); }
    else {
      const q = gcgSquares(f[1] || "", f[2] || "");
      if (!q) continue;
      e.k = "play"; e.at = f[1].toUpperCase(); e.raw = f[2]; e.start = q.start; e.dir = q.dir;
      const a = [...board]; e.t = [];
      for (const [i, ch] of q.sq) if (ch !== ".") { a[i] = ch; e.t.push([i, ch.toUpperCase().charCodeAt(0) - 65, ch === ch.toLowerCase() ? 1 : 0]); }
      board = a.join("");
      e.w = q.sq.map(([i, ch]) => ch === "." ? e.before[i] : ch).join("");
    }
    g.ev.push(e);
  }
  g.board = board;
  g.scores = [0, 1].map(p => [...g.ev].reverse().find(e => e.p === p)?.tot ?? 0);
  // the turns Macondo reviews: plays, swaps and passes, in order
  g.moves = g.ev.filter(e => ["play", "swap", "pass"].includes(e.k));
  return g;
}
// a game from the app's log (Play, or typed in), written as a .gcg file
function gcgFromLog(names, log) {
  const nick = [0, 1].map(p => (names[p] || "Player " + (p + 1)).replace(/[^\w-]+/g, "_").slice(0, 20) || "p" + (p + 1));
  if (nick[0] === nick[1]) nick[1] += "2";
  const out = ["#character-encoding UTF-8", "#lexicon CSW24", `#player1 ${nick[0]} ${names[0]}`, `#player2 ${nick[1]} ${names[1]}`];
  for (const e of log) {
    const who = `>${nick[e.p]}:`, rack = sortRack(e.before?.rack || (e.t || []).map(t => t[2] ? "?" : AZ[t[1]]).join("") || e.x || "?");
    if (e.k === "play" || e.k === "off") {
      const q = gcgSquares(e.at, e.w); if (!q) continue;
      const placed = new Set(e.t.map(t => t[0]));
      const w = q.sq.map(([i], k) => placed.has(i) ? (e.t.find(t => t[0] === i)[2] ? e.w[k].toLowerCase() : e.w[k].toUpperCase()) : ".").join("");
      out.push(`${who} ${rack} ${e.at} ${w} +${e.s} ${e.k === "off" ? e.tot + e.s : e.tot}`);
      if (e.k === "off") out.push(`${who} ${rack} -- -${e.s} ${e.tot}`);
    } else if (e.k === "swap") out.push(`${who} ${rack} -${sortRack(e.x)} +0 ${e.tot}`);
    else if (e.k === "pass") out.push(`${who} ${rack} - +0 ${e.tot}`);
    else if (e.k === "out") out.push(`${who} (${sortRack(e.x)}) +${e.s} ${e.tot}`);
    else if (e.k === "left") out.push(`${who} (${sortRack(e.x) || ""}) ${e.s} ${e.tot}`);
  }
  return out.join("\n") + "\n";
}
function gameAdd(src, gcg, extra = {}) {
  const P = gcg ? gcgParse(gcg) : null;
  const g = { id: newGameId(), at: Date.now(), src, gcg: gcg || "", names: P ? P.names : extra.names || ["?", "?"], scores: P ? P.scores : [0, 0], review: null, job: null, ...extra };
  GAMES.unshift(g); gamesSave();
  return g;
}

// ---- the reviewer on the Mac
let rvHelper = null;   // null = not asked yet, false = not running, true = ready
async function rvFetch(path, opts = {}) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), opts.wait || 2500);
  try {
    const r = await fetch(RV_HELPER + path, { ...opts, signal: c.signal, headers: opts.body ? { "Content-Type": "application/json" } : {} });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "The reviewer said no");
    return j;
  } finally { clearTimeout(t); }
}
async function rvCheck() {
  try { const s = await rvFetch("/status", { wait: 1500 }); rvHelper = !!s.macondo; } catch { rvHelper = false; }
  return rvHelper;
}
const rvSpeed = () => store.get("reviewSpeed", "full");
async function rvStart(g) {
  try {
    const j = await rvFetch("/review", { method: "POST", body: JSON.stringify(g.woog ? { woogles: g.woog, speed: rvSpeed() } : { gcg: g.gcg, speed: rvSpeed() }) });
    g.job = { id: j.id, state: j.state, done: 0, total: 0, speed: rvSpeed() }; g.err = ""; gamesSave(); rvWatch();
  } catch (e) { g.err = e.name === "AbortError" || e instanceof TypeError ? "The reviewer on the Mac isn't running." : e.message; gamesSave(); }
}
// keep only what the review page shows (a whole Macondo review is about 70KB a game)
const rvTrim = r => ({
  turns: (r.turns || []).map(t => ({ n: t.turnNumber, who: t.playerName, rack: t.rack, bag: t.tilesInBag ?? 0, phase: (t.phase || "").replace("PHASE_", ""),
    played: t.playedMove, ps: t.playedScore, best: t.optimalMove, bs: t.optimalScore, loss: t.winProbLoss ?? null, spread: t.spreadLoss ?? null,
    size: t.mistakeSize || "", phony: !!t.isPhony, missed: !!t.missedChallenge, blown: !!t.blownEndgame, bingo: !!t.missedBingo,
    tops: (t.topSimPlays || []).slice(0, 6).map(p => [p.moveDescription, p.score, p.leave || "", p.winProb ?? null, p.equity ?? null]),
    final: t.principalVariation?.finalSpread ?? null })),
  sums: (r.playerSummaries || []).map(s => ({ who: s.playerName, turns: s.turnsPlayed, best: s.optimalMoves, loss: s.avgWinProbLoss, mi: s.mistakeIndex, elo: Math.round(s.estimatedElo || 0), bingos: s.availableBingos })),
  at: Date.now(), version: r.analyzerVersion || ""
});
let rvTimer = 0;
function rvWatch() {
  clearTimeout(rvTimer);
  const live = GAMES.filter(g => g.job);
  if (!live.length) return;
  rvTimer = setTimeout(async () => {
    for (const g of live) {
      try {
        const j = await rvFetch("/review/" + g.job.id);
        if (j.state === "done") {
          g.review = rvTrim(j.result); g.review.speed = g.job.speed; g.job = null; g.err = "";
          if (j.gcg && (!g.gcg || g.woog)) { g.gcg = j.gcg; const P = gcgParse(j.gcg); g.names = P.names; g.scores = P.scores; }
        } else if (j.state === "error" || j.state === "stopped") { g.err = j.error || "The review stopped."; g.job = null; }
        else Object.assign(g.job, { state: j.state, done: j.done, total: j.total, queued: j.queued });
      } catch (e) { if (!(e.name === "AbortError" || e instanceof TypeError)) { g.err = e.message; g.job = null; } }
    }
    gamesSave(); rvRedraw(); rvWatch();
  }, 2500);
}
// redraw the games list or review page if it's open, keeping the scroll
function rvRedraw() {
  const h = location.hash;
  if (h !== "#board/games" && !h.startsWith("#board/rv-")) return;
  const y = scrollY; VIEWS.board(h.slice(7)); scrollTo(0, y);
}

// ---- the games list
const rvSeg = () => boardSeg("games");
const srcName = { app: "Played in the app", typed: "Typed in", gcg: "From a .gcg file", woogles: "Woogles" };
const fmtDay = t => { const d = new Date(t); return [d.getDate(), d.toLocaleString("en", { month: "short" })]; };
// which seat is "you": the player called You, else the first player
const whose = n => /^you$/i.test(n) ? "Your" : esc(n) + "'s";
const youOf = g => Math.max(0, g.names.findIndex(n => /^you$/i.test(n)));
function gameRowHTML(g) {
  const [day, mon] = fmtDay(g.at), [a, b] = g.scores, y = youOf(g), won = g.scores[y] > g.scores[1 - y], tied = a === b;
  const sum = g.review?.sums.find(s => s.who === gcgParse(g.gcg).nicks[y]) || g.review?.sums[y];
  let right;
  if (g.job) right = `<button class="btn sm" data-gstop="${g.id}">Stop</button>`;
  else if (g.review) right = `<span class="rvmi"><b>${sum ? sum.mi.toFixed(1) : "–"}</b>mistakes</span>`;
  else if (rvHelper) right = `<button class="btn sm primary" data-greview="${g.id}">Review</button>`;
  else right = `<span class="small rvwait">${g.woog && !g.gcg ? "Needs the Mac" : "Quick check"}</span>`;
  const job = g.job ? `<div class="rvprog"><span class="simbar"><i style="width:${g.job.total ? (g.job.done / g.job.total * 100).toFixed(0) : 2}%"></i></span><span class="small">${g.job.state === "queued" ? "Waiting its turn" : g.job.total ? `Reviewing · turn ${g.job.done} of ${g.job.total}` : "Starting the review"}</span></div>` : "";
  return `<div class="rvrow"><a href="#board/rv-${g.id}" class="rvwhen"><b>${day}</b>${mon}</a>
    <a href="#board/rv-${g.id}" class="rvwho"><b>${esc(g.names[0])} v ${esc(g.names[1])}</b><span class="rvsub">${g.gcg ? `<span class="rvres ${tied ? "" : won ? "w" : "l"}">${a}–${b}</span>` : ""}<span>${srcName[g.src] || ""}</span></span>${job}${g.err ? `<span class="small bad">${esc(g.err)}</span>` : ""}</a>
    <div class="rvright">${right}</div></div>`;
}
function viewGames() {
  const status = rvHelper === null ? `<span class="rvmac">Looking for the Mac…</span>` : rvHelper ? `<span class="rvmac on">Macondo ready</span>` : `<span class="rvmac">Reviewer not running</span>`;
  $("#view").innerHTML = `${rvSeg()}
  <div class="card rvgames"><div class="rvhead"><h2 class="lbl">Games</h2>${status}</div>
    <div class="rvadd">
      <a class="rvaddb" href="#board/play"><b>Play in the app</b><span>v the computer or a friend</span></a>
      <a class="rvaddb" href="#board/type"><b>Type in a game</b><span>from a real-life board</span></a>
      <label class="rvaddb"><b>Load a .gcg file</b><span>Woogles, cross-tables, Quackle</span><input type="file" id="rvFile" accept=".gcg,.txt,.json,text/plain,application/json" hidden></label>
      <button type="button" class="rvaddb" id="rvWoogBtn"><b>Woogles link</b><span>paste the game's address</span></button>
    </div>
    <div class="rvwoog" id="rvWoog" hidden><input id="rvWoogIn" class="arack" placeholder="https://woogles.io/game/…" autocomplete="off" spellcheck="false"><button class="btn primary" id="rvWoogGo">Add</button></div>
    <p class="small bad" id="rvMsg" hidden></p>
    <div class="rvlist">${GAMES.length ? GAMES.map(gameRowHTML).join("") : `<p class="empty">No games yet. Play one, type one in, or load a .gcg file.</p>`}</div>
  </div>
  <div class="card"><h2 class="lbl">Full reviews</h2>
    <p class="small" style="margin:0 0 10px">${rvHelper ? "Reviews run on this Mac with Macondo: a look ahead on every turn and the endgame solved exactly." : `Full reviews run on the Mac with Macondo. On the Mac, start it once with <code>reviewer/install.sh</code> and it runs at every login. Games added on a phone can be sent to the Mac with the file buttons below.`}</p>
    <div class="fs"><h2 class="lbl">Review speed</h2><div class="seg">${[["full", "Full speed"], ["gentle", "Gentle"]].map(([k, n]) => `<button type="button" class="btn ${rvSpeed() === k ? "on" : ""}" data-rvs="${k}">${n}</button>`).join("")}</div>
      <p class="small" style="margin:6px 0 0">${rvSpeed() === "full" ? "About 2 minutes a game. Uses every core, so the Mac is busy meanwhile." : "Several times longer, but the Mac stays smooth: it only uses what's spare."}</p></div>
    <div class="fs"><h2 class="lbl">Move games between devices</h2><div class="row"><button class="btn" id="rvSave" ${GAMES.length ? "" : "disabled"}>Save games to a file</button><label class="btn">Load games file<input type="file" id="rvLoad" accept=".json,application/json" hidden></label></div>
      <p class="small" style="margin:6px 0 0">Reviews come too. AirDrop the file or put it in iCloud Drive, then load it on the other device.</p></div>
  </div>`;
  const msg = t => { const m = $("#rvMsg"); m.textContent = t; m.hidden = !t; };
  $("#rvWoogBtn").onclick = () => { $("#rvWoog").hidden = false; $("#rvWoogIn").focus(); };
  $("#rvWoogGo").onclick = () => {
    const v = $("#rvWoogIn").value.trim(), id = (v.match(/woogles\.io\/game\/([A-Za-z0-9]+)/) || v.match(/^([A-Za-z0-9]{6,})$/) || [])[1];
    if (!id) return msg("That doesn't look like a Woogles game link.");
    const g = gameAdd("woogles", "", { woog: id, names: ["Woogles game", id] });
    if (rvHelper) rvStart(g).then(rvRedraw); else viewGames();
  };
  $("#rvFile").onchange = async ev => {
    const f = ev.target.files[0]; if (!f) return;
    const text = await f.text(), P = gcgParse(text);
    if (!P.moves.length) return msg("Couldn't find any plays in that file.");
    if (P.lexicon && !/CSW/i.test(P.lexicon)) msg(`That game was played with ${P.lexicon}; reviews here use CSW24.`);
    const g = gameAdd("gcg", text); location.hash = "board/rv-" + g.id;
  };
  $("#view").querySelectorAll("[data-rvs]").forEach(b => b.onclick = () => { store.set("reviewSpeed", b.dataset.rvs); viewGames(); });
  $("#view").querySelectorAll("[data-greview]").forEach(b => b.onclick = async () => { const g = gameById(b.dataset.greview); await rvStart(g); rvRedraw(); });
  $("#view").querySelectorAll("[data-gstop]").forEach(b => b.onclick = async () => {
    const g = gameById(b.dataset.gstop); try { await rvFetch(`/review/${g.job.id}/stop`, { method: "POST", body: "{}" }); } catch {}
    g.job = null; gamesSave(); viewGames();
  });
  $("#rvSave").onclick = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ csw24games: 1, games: GAMES.map(g => ({ ...g, job: null })) })], { type: "application/json" }));
    a.download = `csw24-games-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $("#rvLoad").onchange = async ev => {
    const f = ev.target.files[0]; if (!f) return;
    try {
      const d = JSON.parse(await f.text()); if (!Array.isArray(d.games)) throw 0;
      for (const g of d.games) { const old = gameById(g.id); if (!old) GAMES.push(g); else if (g.review && !old.review) Object.assign(old, { review: g.review, gcg: g.gcg || old.gcg, names: g.names, scores: g.scores }); }
      GAMES.sort((a, b) => b.at - a.at); gamesSave(); viewGames();
    } catch { msg("That isn't a games file from this app."); }
  };
  if (!rvHelper) { const was = rvHelper; rvCheck().then(ok => { if (ok !== was) rvRedraw(); }); }
  rvWatch();
}

// ---- the review page: the board on the left, the review on the right (the phone stacks them)
const RVS = { id: "", turn: 0, best: true, quick: {} };
const rvMoveTiles = (mv, before) => {
  // a Macondo play like "8D VOWEL" or "D8 .IGIA" as board tiles; a swap or pass has none
  const [at, w] = String(mv || "").trim().split(/\s+/), q = w && gcgSquares(at, w);
  if (!q) return null;
  return new Map(q.sq.filter(([i, ch]) => ch !== "." && before[i] === ".").map(([i, ch]) => [i, { ch: ch.toUpperCase(), b: ch === ch.toLowerCase() }]));
};
// the word a play makes, through-tiles filled in, blanks marked
const rvWord = (mv, before) => {
  const [at, w] = String(mv || "").trim().split(/\s+/), q = w && gcgSquares(at, w);
  if (!q) { const s = String(mv || "").replace(/[()]/g, "").trim(), x = s.match(/^(?:exch(?:ange)?\s+|-)([A-Z?]+)$/i);
    return `<b class="rvw">${esc(x ? "Swap " + x[1] : /^(pass|-)$/i.test(s) ? "Pass" : s)}</b>`; }
  return `<b class="rvw">${q.sq.map(([i, ch]) => { const c = ch === "." ? before[i] : ch; return c === c.toLowerCase() ? `<i>${c.toUpperCase()}</i>` : c; }).join("")}</b>`;
};
const rvAt = mv => String(mv || "").trim().split(/\s+/)[0];
const GRADES = { "": ["Best play", "opt"], SMALL: ["Small mistake", "sm"], MEDIUM: ["Medium mistake", "md"], LARGE: ["Large mistake", "lg"] };
const rvGrade = t => t ? GRADES[t.size] || GRADES[""] : null;
const pct = v => v == null ? "–" : (v * 100).toFixed(v < .1 && v > 0 ? 1 : 0) + "%";
const rvTiles = rack => `<div class="tiles mini rvrack">${[...rack].map(ch => `<div class="tile${ch === "?" ? " blank" : ""}">${ch === "?" ? "" : `${ch}<sub>${VALUES[ch]}</sub>`}</div>`).join("")}</div>`;

// the chance of winning for the first player after each turn, from the win chance of each play made
function rvWinLine(P, R) {
  const win = [.5];
  P.moves.forEach((e, k) => {
    const t = R.turns[k]; let w = null;
    if (t) { const mine = t.tops.find(p => p[0].trim() === t.played.trim()); w = mine?.[3] ?? (t.tops[0]?.[3] != null && t.loss != null ? t.tops[0][3] - t.loss : null); }
    const prev = win[k];
    win.push(w == null ? prev : e.p === 0 ? w : 1 - w);
  });
  const [a, b] = P.scores; win[win.length - 1] = a > b ? 1 : a < b ? 0 : .5;
  return win;
}
function rvGraph(P, R, cur) {
  const win = rvWinLine(P, R), n = win.length - 1, W = 460, H = 100;
  const x = k => 24 + k * (W - 32) / Math.max(1, n), y = v => 6 + (1 - v) * (H - 22);
  const pts = win.map((v, k) => `${x(k).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return `<svg class="rvgraph" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(P.names[0])}'s chance of winning through the game">
    <text x="0" y="${y(1) + 3}">100</text><text x="6" y="${y(.5) + 3}">50</text><text x="12" y="${y(0) + 3}">0</text>
    <line class="mid" x1="${x(0)}" x2="${x(n)}" y1="${y(.5)}" y2="${y(.5)}"/>
    <polygon class="area" points="${x(0)},${y(0)} ${pts} ${x(n)},${y(0)}"/><polyline class="ln" points="${pts}"/>
    <line class="cur" x1="${x(cur + 1)}" x2="${x(cur + 1)}" y1="${y(1)}" y2="${y(0)}"/>
    ${P.moves.map((e, k) => { const g = rvGrade(R.turns[k]); return `<circle class="g-${g ? g[1] : "opt"}" data-rt="${k}" cx="${x(k + 1)}" cy="${y(win[k + 1])}" r="${k === cur ? 5.5 : g && g[1] !== "opt" ? 4 : 2.6}"/>`; }).join("")}
  </svg>`;
}
// our engine's quick check of one turn: the top plays by points plus leave, straight away
function rvQuick(g, P, k) {
  const e = P.moves[k], key = g.id + ":" + k;
  if (RVS.quick[key] || e.rack.length < 1 || e.rack.length > 7) return RVS.quick[key];
  RVS.quick[key] = { busy: true };
  ENG.call({ type: "moves", board: e.before, rack: e.rack, limit: 6, find: e.k === "play" ? { tiles: e.t } : e.k === "swap" ? { exch: e.x } : { pass: true } })
    .then(res => { RVS.quick[key] = res; if (RVS.id === g.id && RVS.turn === k) rvRedraw(); })
    .catch(err => { RVS.quick[key] = { error: err.message }; });
  return RVS.quick[key];
}
function viewReview(id) {
  const g = gameById(id);
  if (!g) { location.replace("#board/games"); return; }
  if (!g.gcg) {
    $("#view").innerHTML = `${rvSeg()}<div class="card"><h2 class="lbl">${esc(g.names.join(" "))}</h2>
      <p>${g.job ? `Macondo is loading and reviewing this game on the Mac…` : g.err ? `<span class="bad">${esc(g.err)}</span>` : "This Woogles game is fetched by the reviewer on the Mac."}</p>
      <div class="row">${!g.job && rvHelper ? `<button class="btn primary" data-greview="${g.id}">Review on the Mac</button>` : ""}<button class="btn" id="rvDel">Remove</button></div></div>`;
    $("#view").querySelector("[data-greview]")?.addEventListener("click", async () => { await rvStart(g); rvRedraw(); });
    confirmBtn($("#rvDel"), () => { GAMES = GAMES.filter(x => x !== g); gamesSave(); location.hash = "board/games"; });
    rvWatch(); return;
  }
  const P = gcgParse(g.gcg), R = g.review, n = P.moves.length;
  if (RVS.id !== id) Object.assign(RVS, { id, turn: R ? Math.max(0, R.turns.findIndex(t => t.size)) : 0, best: true });
  RVS.turn = Math.min(Math.max(0, RVS.turn), n - 1);
  const k = RVS.turn, e = P.moves[k], t = R?.turns[k], grade = rvGrade(t);
  const quick = !t ? rvQuick(g, P, k) : null;
  const bestMv = t ? t.best : quick?.moves?.[0] ? (quick.moves[0].tiles.length ? `${mvAt(quick.moves[0])} ${quick.moves[0].word}` : mvWord(quick.moves[0])) : null;
  const showBest = RVS.best && bestMv && bestMv.trim() !== (t?.played || "").trim() && !(quick?.found?.rank === 1);
  const bestTiles = showBest ? rvMoveTiles(bestMv, e.before) : null;
  const news = bestTiles || (e.k === "play" ? new Map(e.t.map(([i, l, b]) => [i, { ch: AZ[l], b: !!b }])) : new Map());
  // the scores going into this turn
  const before = [0, 1].map(p => { const last = [...P.ev.slice(0, P.ev.indexOf(e))].reverse().find(x => x.p === p); return last ? last.tot : 0; });
  const sumOf = p => R?.sums.find(s => s.who === P.nicks[p]) || R?.sums[p];
  const nextMistake = R ? (() => { for (let j = 1; j <= n; j++) { const q = (k + j) % n; if (R.turns[q]?.size) return q; } return k; })() : k;
  const tops = t ? t.tops : quick?.moves ? quick.moves.slice(0, 6).map(m => [m.tiles.length ? `${mvAt(m)} ${m.word}` : mvWord(m), m.score, sortRack(m.leave), null, m.eq]) : [];
  const playedKey = t ? t.played.trim() : null, qRank = quick?.found?.rank;
  $("#view").innerHTML = `${rvSeg()}
  <div class="bgrid rvgrid"><div class="gmain">
    <div class="gscore">${[0, 1].map(p => `<div class="${e.p === p ? "on" : ""} p${p}"><span>${esc(P.names[p])}</span><b>${before[p]}</b></div>`).join(`<div class="gbag"><b>${e.k === "play" || t ? (t ? t.bag : "") : ""}</b>${t ? "in bag" : ""}</div>`)}</div>
    <div id="rvBoard" class="${bestTiles ? "rvbest" : ""}">${boardHTML(strCells(e.before), news, -1, 0, false, bestTiles ? {} : { last: new Set(news.keys()) })}</div>
    <div class="rvnav"><button class="btn" data-rn="0" aria-label="First turn">⏮</button><button class="btn" data-rn="${k - 1}" aria-label="Previous turn">←</button><span class="rvturn">Turn ${k + 1} of ${n}</span><button class="btn" data-rn="${k + 1}" aria-label="Next turn">→</button><button class="btn" data-rn="${n - 1}" aria-label="Last turn">⏭</button></div>
    <div class="rvnav"><button type="button" class="rvtoggle ${RVS.best ? "on" : ""}" id="rvBest" ${bestMv ? "" : "disabled"}><i></i>Show best play</button><span style="flex:1"></span>${R ? `<button class="btn primary" data-rn="${nextMistake}">Next mistake</button>` : ""}</div>
  </div>
  <div class="bside">
    <div class="card">
      <div class="rvhead"><h2 class="lbl">${R ? "Game review" : "Quick check"}</h2><span class="small">${R ? `Macondo · ${new Date(R.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : srcName[g.src] || ""}</span></div>
      ${R ? `<div class="rvsums">${[0, 1].map(p => { const s = sumOf(p); return s ? `<div><span class="rvav">${esc(P.names[p][0] || "?")}</span><span><b>${s.best}/${s.turns}</b>best</span><span><b>${s.mi.toFixed(1)}</b>mistakes</span><span><b>${s.elo}</b>rating</span></div>` : ""; }).join("")}</div>
        <p class="lbl rvsub2">${whose(P.names[0])} chance of winning<span class="small">tap a dot</span></p>${rvGraph(P, R, k)}`
      : `<p class="small" style="margin:0 0 10px">Our engine's top plays for each turn, by points and the tiles kept. A full review from Macondo adds win chances, a look ahead and the endgame solved exactly.</p>
        ${g.job ? `<div class="rvprog"><span class="simbar"><i style="width:${g.job.total ? (g.job.done / g.job.total * 100).toFixed(0) : 2}%"></i></span><span class="small">${g.job.total ? `Reviewing · turn ${g.job.done} of ${g.job.total}` : "Starting the review"}</span></div>`
        : rvHelper ? `<button class="btn primary" data-greview="${g.id}">Full review on the Mac</button>` : `<p class="small">${rvHelper === false ? "The reviewer isn't running on this device. On the Mac, run <code>reviewer/install.sh</code> once." : "Looking for the Mac…"}</p>`}
        ${g.err ? `<p class="small bad">${esc(g.err)}</p>` : ""}`}
    </div>
    <div class="card rvturncard">
      <div class="rvhead"><h2 class="lbl">${esc(P.names[e.p])} · ${e.k === "play" ? "a play" : e.k === "swap" ? "a swap" : "a pass"}</h2>${grade ? `<span class="rvgrade g-${grade[1]}">${grade[0]}</span>` : qRank === 1 ? `<span class="rvgrade g-opt">Engine's top play</span>` : ""}</div>
      ${rvTiles(e.rack)}
      <div class="rvvs">
        <div><small>Played</small>${e.k === "play" ? `<b class="rvw">${[...e.w].map(c => c === c.toLowerCase() ? `<i>${c.toUpperCase()}</i>` : c).join("")}</b>` : `<b class="rvw">${e.k === "swap" ? "Swap " + esc(sortRack(e.x)) : "Pass"}</b>`}<span class="small">${e.at || ""} · ${e.k === "play" ? e.s : 0} pts${t?.phony ? ` · <span class="bad">phony</span>` : ""}</span></div>
        <div class="best"><small>${t ? (t.size ? "Best" : "Macondo agrees") : "Engine's best"}</small>${bestMv ? `${rvWord(bestMv, e.before)}<span class="small">${rvAt(bestMv)} · ${t ? t.bs : quick?.moves?.[0]?.score ?? ""} pts</span>` : `<span class="small">${quick?.error ? esc(quick.error) : "Thinking…"}</span>`}</div>
      </div>
      ${t && t.size ? `<p class="rvcost g-${grade[1]}"><b>${t.loss != null && t.phase !== "ENDGAME" ? "−" + pct(t.loss) : t.spread != null ? "−" + t.spread : ""}</b><span>${t.loss != null && t.phase !== "ENDGAME" ? "chance of winning lost" : "points lost in the endgame"}${t.ps > t.bs ? `, though it scored ${t.ps - t.bs} more` : ""}</span></p>` : ""}
      ${t && (t.missed || t.blown || t.bingo) ? `<p class="small" style="margin:8px 0 0">${[t.missed && "A phony from the other player went unchallenged.", t.blown && "This turned a winning endgame into a loss or a tie.", t.bingo && "There was a bingo."].filter(Boolean).join(" ")}</p>` : ""}
      ${!t && quick?.found && qRank > 1 ? `<p class="small" style="margin:8px 0 0">Your play was number ${qRank} of ${quick.total.toLocaleString()} by points and leave.</p>` : ""}
      ${tops.length ? `<h2 class="lbl" style="margin:12px 0 4px">${t ? "Top plays · chance of winning" : "Top plays · points + leave"}</h2>
      <div class="rvtops">${tops.map((p, j) => { const mine = t ? p[0].trim() === playedKey : quick?.found?.rank === j + 1;
        return `<div class="${mine ? "mine" : ""}"><span class="n">${j + 1}</span><span>${rvWord(p[0], e.before)} <span class="rvat">${esc(rvAt(p[0]))}</span>${j === 0 ? `<span class="rvtag best">best</span>` : mine ? `<span class="rvtag">yours</span>` : ""}</span><span class="lv">${esc(p[2] || "–")}</span><span class="s">${p[1]}</span>${t ? `<span class="wb"><i><b style="width:${((p[3] ?? 0) * 100).toFixed(0)}%"></b></i>${pct(p[3])}</span>` : `<span class="s">${p[4]?.toFixed(1) ?? ""}</span>`}</div>`; }).join("")}</div>` : ""}
      ${t?.phase === "ENDGAME" && t.final != null ? `<p class="small" style="margin:8px 0 0">The endgame, solved exactly: the best line ends ${t.final > 0 ? "ahead by " + t.final : t.final < 0 ? "behind by " + -t.final : "level"}.</p>` : ""}
      <div class="row" style="margin-top:10px"><button class="btn sm" id="rvAna">Open in Analyse</button></div>
    </div>
    <div class="card"><h2 class="lbl">Moves</h2><div class="rvsheet">${P.moves.map((m, j) => { const gr = rvGrade(R?.turns[j]);
      return `<button type="button" data-rt="${j}" class="p${m.p}${j === k ? " on" : ""}"><span class="rvdot g-${gr ? gr[1] : "none"}"></span><span class="rvwho2">${esc(P.names[m.p][0] || "")}${j + 1}</span><span class="rvmw">${m.k === "play" ? esc(m.w.toUpperCase()) : m.k === "swap" ? "Swap" : "Pass"}</span><span class="rvms">${m.k === "play" ? m.s : 0}</span></button>`; }).join("")}</div></div>
    <div class="card"><div class="row"><span class="small" style="margin-right:auto">${srcName[g.src] || ""} · ${new Date(g.at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
      ${R && rvHelper ? `<button class="btn sm" data-greview="${g.id}">Review again</button>` : ""}<button class="btn sm" id="rvGcg">Save .gcg</button><button class="btn sm" id="rvDel">Remove game</button></div></div>
  </div></div>${bLookSheet()}`;
  const go = j => { RVS.turn = Math.min(n - 1, Math.max(0, j)); const y = scrollY; viewReview(id); scrollTo(0, y); };
  $("#view").querySelectorAll("[data-rn]").forEach(b => b.onclick = () => go(+b.dataset.rn));
  $("#view").querySelectorAll("[data-rt]").forEach(b => b.addEventListener("click", () => go(+b.dataset.rt)));
  $("#rvBest").onclick = () => { RVS.best = !RVS.best; go(k); };
  $("#rvAna").onclick = () => anaOpen(e.before, e.rack);
  $("#view").querySelectorAll("[data-greview]").forEach(b => b.onclick = async () => { await rvStart(g); rvRedraw(); });
  $("#rvGcg").onclick = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([g.gcg], { type: "text/plain" })); a.download = `${g.names.join("-v-").replace(/[^\w-]+/g, "_")}.gcg`; a.click(); };
  confirmBtn($("#rvDel"), () => { GAMES = GAMES.filter(x => x !== g); gamesSave(); location.hash = "board/games"; });
  document.onkeydown = ev => { if (ev.target.matches?.("input, textarea")) return; if (ev.key === "ArrowLeft") go(k - 1); else if (ev.key === "ArrowRight") go(k + 1); else return; ev.preventDefault(); };
  $("#view .rvsheet .on")?.scrollIntoView({ block: "nearest" });
  if (rvHelper === null) rvCheck().then(rvRedraw);
  rvWatch();
}

// ---- typing in a real game: put each play on the board (tap a square, type the letters), the score is worked out
let TY = null;
const tyGet = () => TY ||= { names: ["You", "Opponent"], log: [], board: ".".repeat(225), scores: [0, 0], turn: 0, rack: "", pend: new Map(), cur: -1, dir: 0, swap: "", ...(s => s ? { ...s, pend: new Map() } : {})(store.get("typed", null)) };
const tySave = () => store.set("typed", { names: TY.names, log: TY.log, board: TY.board, scores: TY.scores, turn: TY.turn });
function viewType() {
  const T = tyGet(), r = T.pend.size ? scorePlay(strCells(T.board), T.pend) : null;
  const g = { names: T.names, mode: "typed", log: T.log };
  $("#view").innerHTML = `${rvSeg()}${bLookBar()}
  <div class="bgrid rvgrid"><div class="gmain">
    <div class="gscore">${[0, 1].map(p => `<div class="${T.turn === p ? "on" : ""} p${p}"><span>${esc(T.names[p])}</span><b>${T.scores[p]}</b></div>`).join(`<div class="gbag"><b>${T.log.length}</b>turns</div>`)}</div>
    <div id="tyBoard">${boardHTML(strCells(T.board), T.pend, T.cur, T.dir, false, { pend: true })}</div>
  </div>
  <div class="bside">
    <div class="card"><h2 class="lbl">Type in a game</h2>
      <div class="row"><input class="arack gname" id="tyN0" value="${esc(T.names[0])}" maxlength="20" aria-label="First player"><input class="arack gname" id="tyN1" value="${esc(T.names[1])}" maxlength="20" aria-label="Second player"></div>
      <p class="small" style="margin:8px 0 0">For each turn: tap where the word starts, type it (letters already on the board are skipped; ? then a letter is a blank; Space turns the arrow). The score is worked out for you.</p></div>
    <div class="card"><h2 class="lbl">${whose(T.names[T.turn])} turn</h2>
      <div class="row"><input class="arack" id="tyRack" value="${esc(T.rack)}" maxlength="7" placeholder="Rack, if you know it" autocapitalize="characters" autocomplete="off" spellcheck="false"></div>
      <p class="small" style="margin:6px 0 10px">The rack makes the review useful: Macondo compares the play with everything that rack could have done. Leave it empty for the other player if you don't know it.</p>
      ${r?.error ? `<p class="small">${r.error}</p>` : r ? workHTML(r, true) : ""}
      <div class="row" style="margin-top:10px"><button class="btn primary" id="tyAdd" ${r && !r.error ? "" : "disabled"}>Add play${r && !r.error ? " " + r.total : ""}</button><button class="btn" id="tyPass">Pass</button>
        <input class="arack" id="tySwap" value="${esc(T.swap)}" maxlength="7" placeholder="Swapped" style="width:7em" autocapitalize="characters" autocomplete="off" spellcheck="false"><button class="btn" id="tySwapGo">Swap</button></div></div>
    <div class="card"><h2 class="lbl">Plays</h2>${logHTML(g)}
      <div class="row" style="margin-top:10px"><button class="btn sm" id="tyUndo" ${T.log.length ? "" : "disabled"}>Undo last</button><button class="btn sm" id="tyClear" ${T.log.length ? "" : "disabled"}>Start again</button><span style="flex:1"></span><button class="btn sm primary" id="tyDone" ${T.log.length ? "" : "disabled"}>Finish and save</button></div></div>
  </div></div>${bLookSheet()}`;
  const redraw = () => { tySave(); const y = scrollY; viewType(); scrollTo(0, y); };
  bLookWire(redraw);
  const rackOf = () => (T.rack || [...T.pend.values()].map(t => t.b ? "?" : t.ch).join("")).toUpperCase();
  const push = e => { e.before = { board: T.board, rack: rackOf(), bag: "" }; T.log.push(e); T.turn = 1 - e.p; T.rack = ""; T.swap = ""; T.pend = new Map(); T.cur = -1; redraw(); };
  $("#tyN0").onchange = $("#tyN1").onchange = () => { T.names = [$("#tyN0").value.trim() || "Player 1", $("#tyN1").value.trim() || "Player 2"]; redraw(); };
  const clean = el => { const v = el.value.toUpperCase().replace(/[^A-Z?]/g, "").slice(0, 7); if (el.value !== v) el.value = v; return v; };
  $("#tyRack").oninput = () => { T.rack = clean($("#tyRack")); };
  $("#tySwap").oninput = () => { T.swap = clean($("#tySwap")); };
  $("#tyAdd").onclick = () => {
    const r = scorePlay(strCells(T.board), T.pend); if (!r || r.error) return;
    const w0 = r.words[0];
    const p = T.turn, before = T.board, tiles = [...T.pend].sort((a, b) => a[0] - b[0]).map(([i, t]) => [i, t.ch.charCodeAt(0) - 65, t.b ? 1 : 0]);
    T.scores[p] += r.total;
    const e = { p, k: "play", w: w0.parts.map(x => x.b ? x.ch.toLowerCase() : x.ch).join(""), at: bAt(w0.start, w0.dir), s: r.total, t: tiles, tot: T.scores[p] };
    T.board = putPlay(before, { tiles }); e.before = { board: before, rack: rackOf(), bag: "" };
    T.log.push(e); T.turn = 1 - p; T.rack = ""; T.pend = new Map(); T.cur = -1; redraw();
  };
  $("#tyPass").onclick = () => push({ p: T.turn, k: "pass", tot: T.scores[T.turn] });
  $("#tySwapGo").onclick = () => { if (T.swap) push({ p: T.turn, k: "swap", x: T.swap, tot: T.scores[T.turn] }); };
  $("#tyUndo").onclick = () => { const e = T.log.pop(); if (!e) return; if (e.k === "play") { T.board = e.before.board; T.scores[e.p] -= e.s; } T.turn = e.p; T.rack = ""; redraw(); };
  confirmBtn($("#tyClear"), () => { TY = null; store.set("typed", null); viewType(); });
  $("#tyDone").onclick = () => { const gm = gameAdd("typed", gcgFromLog(T.names, T.log)); TY = null; store.set("typed", null); location.hash = "board/rv-" + gm.id; };
  $("#tyBoard").addEventListener("click", ev => {
    const sq = ev.target.closest(".sq"); if (!sq) return;
    const i = +sq.dataset.i;
    if (T.pend.has(i)) T.pend.delete(i); else if (i === T.cur) T.dir = 1 - T.dir; else T.cur = i;
    redraw(); if (coarse.matches) bkInput().focus({ preventScroll: true });
  });
  let blankNext = false;
  boardKeys(k => {
    const step = T.dir ? 15 : 1, inLine = (a, b) => b >= 0 && b < 225 && (T.dir || (a / 15 | 0) === (b / 15 | 0));
    const free = i => T.board[i] === "." && !T.pend.has(i);
    if (k === "?") { blankNext = true; return; }
    if (cursorKey(T, k)) { redraw(); return; }
    if (k === "Enter") { $("#tyAdd").click(); return; }
    if (k === "Escape") { T.pend = new Map(); redraw(); return; }
    if (k === "Backspace") { const last = [...T.pend.keys()].pop(); if (last !== undefined) { T.pend.delete(last); T.cur = last; } redraw(); return; }
    if (!/^[a-z]$/i.test(k) || T.cur < 0) return false;
    let at = T.cur; while (inLine(T.cur, at) && !free(at)) at += step;
    if (!inLine(T.cur, at)) return;
    T.pend.set(at, { ch: k.toUpperCase(), b: blankNext }); blankNext = false;
    let nx = at + step; while (inLine(at, nx) && !free(nx)) nx += step;
    T.cur = inLine(at, nx) ? nx : at;
    redraw();
  });
}
// a finished game from Play goes into Games for a review
function gameFromPlay(G) {
  const gm = gameAdd("app", gcgFromLog(G.names, G.log));
  G.savedAs = gm.id; gSave();
  return gm;
}
