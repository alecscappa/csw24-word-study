// ---------- games: short ways to make words stick. Every game draws from the same "Words from" choice on the Games
// page, so a game can drill one list or folder. A game in progress is kept, so leaving it and coming back carries on.
// No words live in this file: they all come from the lexicon loaded on this device ----------
STUDY.push("games");
if (typeof SYNC_KEYS !== "undefined") SYNC_KEYS.push("gameStats", "stories");
const MINIGAMES = [
  { id: "fixer", name: "Phony Fixer", blurb: "One tile is wrong. Find it and swap it to make a real word.", stat: g => `Best ${g.best}` },
  { id: "walk", name: "Word Walk", blurb: "Get from one word to another, changing one letter at a time.", stat: g => `${g.plays} walked` },
  { id: "boss", name: "Word Boss", blurb: "Your missed words form a monster. Right answers hit it, wrong ones heal it.", stat: g => `${g.best ? `${g.best} beaten` : `${g.plays} fought`}` },
  { id: "story", name: "Silly Story", blurb: "Tie three hard words into one daft sentence, then fill in the blanks later.", stat: g => `${g.plays} written` },
  { id: "quartets", name: "Quartets", blurb: "Sixteen words, four secret groups. Sort them by meaning, hooks and more.", stat: g => `Best ${g.best}/4` },
];
const gmSetup = () => ({ src: "", lens: [], skipKnown: false, ...store.get("gameSetup", {}) });
let gmMemo = { key: null, words: [] };
// the words the games draw from
function gameWords() {
  const s = gmSetup(), g = s.src.startsWith("g:") ? groupOf(s.src.slice(2)) : null, f = s.src.startsWith("f:") ? folderById(s.src.slice(2)) : null;
  const mine = { stars: getStars, missed: () => store.get("missed", []), last: () => lastResults }[s.src]?.();
  const base = f ? f.words : mine || (g ? groupWords(g) : ALL);
  const key = JSON.stringify(s) + ":" + base.length + ":" + (s.skipKnown ? getKnown().length : "");
  if (gmMemo.key === key) return gmMemo.words;
  const known = s.skipKnown ? new Set(getKnown()) : null;
  const words = [...new Set(base)].filter(w => DICT.has(w) && (!s.lens.length || s.lens.includes(w.length)) && !known?.has(w));
  gmMemo = { key, words };
  return words;
}
const gmSrcName = () => { const s = gmSetup(); return s.src.startsWith("g:") ? groupOf(s.src.slice(2))?.name : s.src.startsWith("f:") ? folderById(s.src.slice(2))?.name : { stars: "Starred words", missed: "Missed words", last: "Last search results" }[s.src] || "Any word"; };
const gmGet = id => store.get("gm_" + id, null), gmPut = (id, G) => store.set("gm_" + id, G);
const gmStats = () => store.get("gameStats", {});
function gmDone(id, score) { const s = gmStats(), g = s[id] || { plays: 0, best: 0 }; g.plays++; if (score > g.best) g.best = score; s[id] = g; store.set("gameStats", s); return g; }
const gmTop = (name, right = "") => `<div class="gm-top"><a class="ib2" href="#games" aria-label="Back to games" title="Back to games (your game is kept)">×</a><b>${name}</b><span class="gm-stat">${right}</span></div>`;
const gmEmpty = (name, msg) => { $("#view").innerHTML = `<div class="gm">${gmTop(name)}<div class="card"><p class="empty">${esc(msg)}</p><div class="row" style="justify-content:center"><a class="btn" href="#games">Change the words</a></div></div></div>`; };
// a row of tiles you can tap to pick one; sel is the picked tile, hint the one to look at
const gmTiles = (word, sel = null, hint = null, cls = "") => `<div class="tiles gm-row ${cls}" style="--n:${word.length}">${[...word].map((c, i) => `<div class="tile gm-t ${i === sel ? "sel" : ""} ${i === hint ? "hint" : ""}" data-t="${i}" role="button" tabindex="0" aria-label="Tile ${i + 1}, ${c}">${c}<sub>${VALUES[c]}</sub></div>`).join("")}</div>`;
const gmPad = () => `<div class="gm-pad">${[...AZ].map(c => `<button type="button" class="gm-key" data-k="${c}">${c}</button>`).join("")}</div>`;
const gmShake = el => { el?.classList.remove("gm-shake"); void el?.offsetWidth; el?.classList.add("gm-shake"); };
// tiles, a letter pad and the computer's keys: tap or arrow to a tile, then pick its letter
function gmWireTiles(G, draw, tryLetter, n) {
  const v = $("#view");
  v.querySelectorAll("[data-t]").forEach(t => t.onclick = () => { G.sel = +t.dataset.t === G.sel ? null : +t.dataset.t; draw(); });
  v.querySelectorAll("[data-k]").forEach(b => b.onclick = () => tryLetter(b.dataset.k));
  document.onkeydown = ev => {
    if (ev.metaKey || ev.ctrlKey || ev.altKey || ev.target.closest?.("input, textarea, select")) return;
    if (ev.key === "ArrowLeft" || ev.key === "ArrowRight") { ev.preventDefault(); G.sel = ((G.sel ?? (ev.key === "ArrowLeft" ? 0 : -1)) + (ev.key === "ArrowLeft" ? n - 1 : 1)) % n; draw(); }
    else if (/^[a-z]$/i.test(ev.key)) tryLetter(ev.key.toUpperCase());
  };
}
const gmArt = {
  fixer: `<div class="gm-art"><i class="mt">F</i><i class="mt wrong">Q</i><i class="mt">X</i></div>`,
  walk: `<div class="gm-art steps"><i class="mt">C</i><i class="mt up1">A</i><i class="mt up2">T</i></div>`,
  boss: `<div class="gm-art">${bossArt(1, 54)}</div>`,
  story: `<div class="gm-art"><svg viewBox="0 0 64 54" width="64" height="54" aria-hidden="true"><path d="M6 8h52a4 4 0 0 1 4 4v24a4 4 0 0 1-4 4H26L14 51v-11H6a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4z" fill="var(--tile)" stroke="var(--line)"/><path d="M12 19h40M12 29h26" stroke="var(--ink)" stroke-width="3" stroke-linecap="round" opacity=".55"/></svg></div>`,
  quartets: `<div class="gm-art grid"><i class="mt"></i><i class="mt on"></i><i class="mt on"></i><i class="mt"></i></div>`,
};
// the monster: it looks crosser as its health runs out
function bossArt(frac, size = 150, name = "") {
  const mad = frac < .5, brow = mad ? 7 : 0;
  return `<svg class="boss" viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-label="${name || "Monster"}">
    <path d="M26 34 16 8l24 14M94 34l10-26-24 14" fill="var(--accent)" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round"/>
    <rect x="16" y="22" width="88" height="88" rx="16" fill="var(--tile)" stroke="var(--ink)" stroke-width="3"/>
    <rect x="16" y="98" width="88" height="12" rx="6" fill="var(--ink)" opacity=".16"/>
    <circle cx="42" cy="56" r="11" fill="#fff" stroke="var(--ink)" stroke-width="3"/><circle cx="78" cy="56" r="11" fill="#fff" stroke="var(--ink)" stroke-width="3"/>
    <circle class="pupil" cx="${mad ? 45 : 42}" cy="58" r="4.5" fill="var(--ink)"/><circle class="pupil" cx="${mad ? 75 : 78}" cy="58" r="4.5" fill="var(--ink)"/>
    <path d="M28 ${40 - brow / 2}l26 ${brow}M92 ${40 - brow / 2}l-26 ${brow}" stroke="var(--ink)" stroke-width="5" stroke-linecap="round"/>
    <path d="M34 ${mad ? 90 : 80}q26 ${mad ? -16 : 14} 52 0" fill="none" stroke="var(--ink)" stroke-width="4" stroke-linecap="round"/>
    <path d="M42 ${mad ? 84 : 83}l4 8 4-6M70 ${mad ? 84 : 83}l4 8 4-8" fill="#fff" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round"/>
    <text x="96" y="104" text-anchor="end" font-size="11" font-weight="700" fill="var(--ink)" opacity=".7">10</text></svg>`;
}
function gamesHome() {
  const s = gmSetup(), stats = gmStats(), n = gameWords().length;
  $("#view").innerHTML = `<nav class="studyseg">${[["lists", "Lists"], ["practice", "Practice"], ["quiz", "Quiz"], ["scoring", "Scoring"], ["games", "Games"]].map(([h, t]) => `<a href="#${h}" class="${h === "games" ? "on" : ""}">${t}</a>`).join("")}</nav>
    <div class="card"><div class="form">
      <div class="field wide"><label for="gmsrc">Words from</label><select id="gmsrc"><option value="">Any word</option>
        <optgroup label="Mine"><option value="stars" ${s.src === "stars" ? "selected" : ""}>Starred words (${getStars().length})</option><option value="missed" ${s.src === "missed" ? "selected" : ""}>Missed words (${store.get("missed", []).length})</option><option value="last" ${s.src === "last" ? "selected" : ""}>Last search results (${lastResults.length})</option>${getFolders().map(f => `<option value="f:${f.id}" ${s.src === "f:" + f.id ? "selected" : ""}>📁 ${esc(f.name)} (${f.words.length})</option>`).join("")}</optgroup>
        ${groupOptions(s.src.startsWith("g:") ? s.src.slice(2) : "").replace(/value="/g, 'value="g:')}</select></div>
      <div class="field wide"><span class="flabel">Length</span>${lenPick("gmlens", s.lens)}</div>
      <div class="field wide"><label class="check"><input type="checkbox" id="gmknown" ${s.skipKnown ? "checked" : ""}> Leave out words I've crossed off</label></div>
    </div><p class="small" style="margin:10px 0 0">${n.toLocaleString()} word${n === 1 ? "" : "s"} in play. Every game draws from these.</p></div>
    <div class="gm-home">${MINIGAMES.map(g => { const st = stats[g.id], run = gmGet(g.id), going = run && !run.done && (g.id !== "story" || run.text);
      return `<a class="gm-card" href="#games/${g.id}">${gmArt[g.id]}<span class="gm-ct"><b>${g.name}</b><span>${g.blurb}</span><em>${going ? "In progress · carry on" : st ? g.stat(st) : "New"}</em></span></a>`; }).join("")}</div>`;
  const save = p => { store.set("gameSetup", { ...gmSetup(), ...p }); gamesHome(); };
  $("#gmsrc").onchange = e => { const v = e.target.value; save({ src: v, lens: v.startsWith("g:") ? (groupOf(v.slice(2))?.len ? [groupOf(v.slice(2)).len] : []) : [] }); };
  $("#gmlens").onchange = e => save({ lens: lensOf(e.target.value) });
  $("#gmknown").onchange = e => save({ skipKnown: e.target.checked });
}
VIEWS.games = arg => {
  document.body.classList.toggle("full", !!arg);
  const f = { fixer: viewFixer, walk: viewWalk, boss: viewBoss, story: viewStory, quartets: viewQuartets }[arg];
  (f || gamesHome)();
};

// ---------- Phony Fixer: ten phonies; change one tile to make any real word ----------
const FIXER_N = 10;
const swapsOf = w => { const out = []; [...w].forEach((c, i) => { for (const L of AZ) { const x = w.slice(0, i) + L + w.slice(i + 1); if (L !== c && DICT.has(x)) out.push(x); } }); return out; };
function dealFixer() {
  const qs = [];
  for (const w of shuffle(gameWords().filter(x => x.length >= 3 && x.length <= 9)).slice(0, FIXER_N * 4)) {
    const show = makePhony(w);
    if (show) qs.push({ w, show });
    if (qs.length === FIXER_N) break;
  }
  return qs.length ? { qs, i: 0, score: 0, streak: 0, top: 0, tries: 0, hint: null, sel: null, fixed: null, gave: false, right: 0, done: false } : null;
}
function viewFixer() {
  let G = gmGet("fixer");
  if (!G) G = dealFixer();
  if (!G) return gmEmpty("Phony Fixer", "No words of 3 to 9 letters here. Pick another list.");
  const save = () => gmPut("fixer", G), again = () => { G = dealFixer(); if (!G) return viewFixer(); draw(); window.scrollTo(0, 0); };
  const draw = () => {
    save();
    if (G.done) return drawEnd();
    const q = G.qs[G.i], over = G.fixed !== null || G.gave, target = G.fixed || q.w, others = over ? swapsOf(q.show).filter(x => x !== target) : [];
    $("#view").innerHTML = `<div class="gm">${gmTop("Phony Fixer", `${G.i + 1} of ${G.qs.length} · <b>${G.score}</b> pts`)}
      <div class="pbar"><div style="width:${(G.i + (over ? 1 : 0)) / G.qs.length * 100}%"></div></div>
      <div class="gm-stage card">
        ${over ? gmTiles(target, null, null, G.fixed ? "good" : "shown") : gmTiles(q.show, G.sel, G.hint)}
        <p class="gm-msg ${over ? (G.fixed ? "ok" : "no") : ""}" id="fxMsg">${over ? (G.fixed ? `Fixed! +${G.pts}${G.streak > 2 ? ` · streak ${G.streak}` : ""}` : `${q.show} comes from ${q.w}`) : G.sel === null ? "One tile is wrong. Tap it." : `Replace tile ${G.sel + 1} with…`}</p>
        ${over ? `<div class="rows" style="text-align:left">${rowHTML(target)}</div>${others.length ? `<p class="small" style="margin:10px 0 4px">Other fixes</p><div class="words" style="justify-content:center">${others.slice(0, 12).map(chip).join("")}</div>` : ""}` : gmPad()}
      </div>
      <div class="gm-acts">${over ? `<button type="button" class="btn primary" id="fxNext">${G.i + 1 < G.qs.length ? "Next phony" : "See my score"}</button>`
        : `<button type="button" class="btn" id="fxHint" ${G.hint !== null ? "disabled" : ""}>Which tile?</button><button type="button" class="btn" id="fxGive">Show me</button>`}</div>
      ${over ? "" : `<p class="small gm-tries">${"●".repeat(3 - G.tries)}${"○".repeat(G.tries)} tries · a clean fix is 3 points</p>`}</div>`;
    if (over) {
      $("#fxNext").onclick = next;
      $("#fxNext").focus();
      document.onkeydown = ev => { if (ev.key === "Enter" && !ev.target.closest?.("a, button")) { ev.preventDefault(); next(); } };
      return;
    }
    gmWireTiles(G, draw, tryLetter, q.show.length);
    $("#fxHint").onclick = () => { G.hint = [...q.show].findIndex((c, i) => c !== q.w[i]); G.sel = G.hint; draw(); };
    $("#fxGive").onclick = () => { G.gave = true; G.streak = 0; record(q.w, false); draw(); };
  };
  const tryLetter = c => {
    const q = G.qs[G.i];
    if (G.sel === null) { const m = $("#fxMsg"); m.textContent = "Tap the tile to change first."; gmShake(m); return; }
    const w = q.show.slice(0, G.sel) + c + q.show.slice(G.sel + 1);
    if (w === q.show) return;
    if (DICT.has(w)) {
      G.pts = Math.max(1, 3 - G.tries - (G.hint !== null ? 1 : 0));
      G.fixed = w; G.score += G.pts; G.right++; G.streak++; G.top = Math.max(G.top, G.streak);
      record(w, true);
      return draw();
    }
    G.tries++; G.streak = 0;
    if (G.tries >= 3) { G.gave = true; record(q.w, false); return draw(); }
    draw();
    const m = $("#fxMsg"); m.textContent = `${w} isn't a word`; m.className = "gm-msg no"; gmShake(m);
  };
  const next = () => {
    G.i++; G.tries = 0; G.hint = null; G.sel = null; G.fixed = null; G.gave = false; G.pts = 0;
    if (G.i >= G.qs.length) { G.done = true; G.best = (gmStats().fixer?.best || 0); gmDone("fixer", G.score); }
    draw(); window.scrollTo(0, 0);
  };
  const drawEnd = () => {
    document.onkeydown = null;
    $("#view").innerHTML = `<div class="gm">${gmTop("Phony Fixer")}<div class="card gm-end">${gmArt.fixer}
      <p class="gm-big">${G.score}<small> / ${G.qs.length * 3}</small></p><p class="gm-msg">${G.score > G.best ? "New best!" : `Best ${G.best}`} · ${G.right} of ${G.qs.length} fixed · top streak ${G.top}</p>
      <div class="words" style="justify-content:center">${G.qs.map(q => chip(q.w)).join("")}</div></div>
      <div class="gm-acts"><button type="button" class="btn primary" id="fxAgain">Play again</button><a class="btn" href="#games">All games</a></div></div>`;
    $("#fxAgain").onclick = again;
  };
  draw();
}

// ---------- Word Walk: a ladder from one list word to another, a letter at a time. Every step must be a word; with
// "only my list" on, every step must be on the chosen list too ----------
const WALK_LENS = [3, 4, 5, 6], walkBuckets = {};
function walkBucket(L) {
  if (walkBuckets[L]) return walkBuckets[L];
  const m = walkBuckets[L] = new Map();
  for (const w of BYLEN[L] || []) for (let i = 0; i < L; i++) { const k = w.slice(0, i) + "_" + w.slice(i + 1); if (m.has(k)) m.get(k).push(w); else m.set(k, [w]); }
  return m;
}
const walkNext = (w, allow) => { const m = walkBucket(w.length), out = []; for (let i = 0; i < w.length; i++) for (const x of m.get(w.slice(0, i) + "_" + w.slice(i + 1)) || []) if (x !== w && (!allow || allow.has(x))) out.push(x); return out; };
// every word within depth steps of start, each with the word before it on a shortest way there
function walkFrom(start, allow, depth) {
  const prev = new Map([[start, null]]), dist = new Map([[start, 0]]);
  let front = [start];
  for (let d = 1; d <= depth && front.length; d++) {
    const nx = [];
    for (const w of front) for (const x of walkNext(w, allow)) if (!dist.has(x)) { dist.set(x, d); prev.set(x, w); nx.push(x); }
    front = nx;
  }
  return { dist, prev };
}
const walkPath = (prev, end) => { const p = []; for (let w = end; w; w = prev.get(w)) p.unshift(w); return p; };
const walkDiff = (a, b) => [...a].findIndex((c, i) => c !== b[i]);
const walkAllow = (G, w) => G.strict ? new Set(gameWords().filter(x => x.length === w.length)) : null;
function dealWalk(strict) {
  const pool = gameWords().filter(w => WALK_LENS.includes(w.length));
  if (!pool.length) return null;
  const inList = new Set(pool);
  for (const start of shuffle(pool).slice(0, 40)) {
    const allow = strict ? new Set(pool.filter(x => x.length === start.length)) : null, { dist, prev } = walkFrom(start, allow, 5);
    const far = w => dist.get(w) >= 3;
    // both ends from the list when it can be done; a short list may need a far end from outside it
    let ends = [...dist.keys()].filter(w => far(w) && inList.has(w));
    if (!ends.length && !strict) ends = [...dist.keys()].filter(far);
    if (!ends.length) continue;
    const end = ends[Math.floor(Math.random() * ends.length)], best = walkPath(prev, end);
    return { start, end, par: best.length - 1, best, path: [start], sel: null, hints: 0, hint: null, strict: !!strict, gave: false, done: false };
  }
  return null;
}
function viewWalk() {
  let strict = store.get("walkStrict", false), G = gmGet("walk");
  if (!G) G = dealWalk(strict);
  const hasList = !!gmSetup().src;
  if (!G) return gmEmpty("Word Walk", strict ? "No walk fits using only this list's words. Pick a bigger list, or turn off Only my list." : "Word Walk needs words of 3 to 6 letters that link up. Pick another list.");
  const save = () => gmPut("walk", G), fresh = () => { const n = dealWalk(strict); gmPut("walk", n); viewWalk(); window.scrollTo(0, 0); };
  const rung = (w, before, cls = "") => `<div class="gm-rung ${cls}">${[...w].map((c, i) => `<i class="${before && before[i] !== c ? "ch" : ""}">${c}</i>`).join("")}</div>`;
  const toggle = () => hasList ? `<div class="gm-toggle"><button type="button" class="pill ${strict ? "on" : ""}" id="wkStrict">Only my list</button></div>` : "";
  const draw = () => {
    save();
    if (G.done) return drawEnd();
    const cur = G.path[G.path.length - 1], steps = G.path.length - 1;
    $("#view").innerHTML = `<div class="gm">${gmTop("Word Walk", `<b>${steps}</b> step${steps === 1 ? "" : "s"} · best ${G.par}`)}${toggle()}
      <div class="gm-stage card">
        <div class="gm-rungs">${G.path.slice(0, -1).map((w, i) => rung(w, G.path[i - 1])).join("")}</div>
        ${gmTiles(cur, G.sel, G.hint)}
        <p class="gm-msg" id="wkMsg">${G.sel === null ? "Tap a tile to change it" : `Tile ${G.sel + 1} becomes…`}</p>
        <div class="gm-goal"><small>Get to</small>${rung(G.end, null, "goal")}</div>
        ${gmPad()}
      </div>
      <div class="gm-acts"><button type="button" class="btn" id="wkUndo" ${steps ? "" : "disabled"}>Undo</button><button type="button" class="btn" id="wkHint">Hint</button><button type="button" class="btn" id="wkGive">Show a way</button></div></div>`;
    gmWireTiles(G, draw, tryLetter, cur.length);
    $("#wkUndo").onclick = () => { G.path.pop(); G.sel = null; G.hint = null; draw(); };
    $("#wkHint").onclick = () => {
      const { prev, dist } = walkFrom(cur, walkAllow(G, cur), 12);
      if (!dist.has(G.end)) { const m = $("#wkMsg"); m.textContent = "No way through from here. Try Undo."; m.className = "gm-msg no"; return; }
      G.hints++; G.hint = G.sel = walkDiff(cur, walkPath(prev, G.end)[1]); draw();
    };
    $("#wkGive").onclick = () => { G.gave = true; G.done = true; draw(); };
    wireStrict();
  };
  const wireStrict = () => { if ($("#wkStrict")) $("#wkStrict").onclick = () => { strict = !strict; store.set("walkStrict", strict); fresh(); }; };
  const say = t => { const m = $("#wkMsg"); m.textContent = t; m.className = "gm-msg no"; gmShake(m); };
  const tryLetter = c => {
    if (G.sel === null) return say("Tap a tile first");
    const cur = G.path[G.path.length - 1], w = cur.slice(0, G.sel) + c + cur.slice(G.sel + 1);
    if (w === cur) return;
    if (!DICT.has(w)) return say(`${w} isn't a word`);
    if (G.strict && !gameWords().includes(w)) return say(`${w} isn't on your list`);
    G.path.push(w); G.hint = null;
    if (w === G.end) { G.done = true; G.sel = null; G.stars = G.hints ? 1 : G.path.length - 1 === G.par ? 3 : G.path.length - 1 <= G.par + 2 ? 2 : 1; gmDone("walk", G.stars); }
    draw();
  };
  const drawEnd = () => {
    document.onkeydown = null;
    const steps = G.path.length - 1, shown = G.gave ? G.best : G.path;
    $("#view").innerHTML = `<div class="gm">${gmTop("Word Walk")}${toggle()}<div class="card gm-end">
      ${G.gave ? `<p class="gm-msg no">One shortest way, in ${G.par} steps</p>` : `<p class="gm-stars" aria-label="${G.stars} of 3 stars">${"★".repeat(G.stars)}<span>${"★".repeat(3 - G.stars)}</span></p><p class="gm-msg ok">${steps} step${steps === 1 ? "" : "s"}${steps === G.par ? ", the shortest way" : `. The shortest is ${G.par}`}${G.hints ? ` · ${G.hints} hint${G.hints === 1 ? "" : "s"}` : ""}</p>`}
      <div class="gm-rungs">${shown.map((w, i) => rung(w, shown[i - 1])).join("")}</div>
      ${!G.gave && steps > G.par ? `<p class="small" style="margin:8px 0 4px">A shorter way</p><div class="gm-rungs">${G.best.map((w, i) => rung(w, G.best[i - 1])).join("")}</div>` : ""}
      <div class="rows" style="text-align:left">${[...new Set(shown)].slice(0, 12).map(w => rowHTML(w)).join("")}</div></div>
      <div class="gm-acts"><button type="button" class="btn primary" id="wkNew">Next walk</button><a class="btn" href="#games">All games</a></div></div>`;
    $("#wkNew").onclick = fresh;
    wireStrict();
  };
  draw();
}

// ---------- Word Boss: the monster's health is its words. A right answer is a hit and clears the word from Missed; a
// wrong one costs a heart, heals the monster and brings the word back twice. Three hearts lost and it gets away ----------
const BOSS_MAX = 12, BOSS_HEAL_CAP = 18, bossName = n => n <= 4 ? "Bogus Imp" : n <= 7 ? "Rack Goblin" : n <= 10 ? "Vowel Ogre" : "The Challenge Troll";
const bossWords = () => { const s = gmSetup(); return s.src ? gameWords() : [...new Set(store.get("missed", []))].filter(w => DICT.has(w) && (!s.lens.length || s.lens.includes(w.length))); };
function bossCard(w) {
  const e = DICT.get(w), kinds = ["phony"];
  if (w.length >= 3 && w.length <= 9) kinds.push("scramble", "scramble");
  if (!e.d.startsWith("<")) kinds.push("def", "def");
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  if (kind === "phony") { const p = Math.random() < .5 ? makePhony(w) : null; return { w, kind, show: p || w, phony: !!p }; }
  if (kind === "scramble") return { w, kind, letters: shuffle([...w]).join("") };
  const near = shuffle(BYLEN[w.length] || []).slice(0, 60).filter(x => x !== w && !DICT.get(x).d.startsWith("<") && DICT.get(x).d !== e.d).slice(0, 3);
  return { w, kind, options: shuffle([w, ...near]) };
}
function dealBoss() {
  const queue = shuffle(bossWords()).slice(0, BOSS_MAX);
  if (!queue.length) return null;
  return { name: bossName(queue.length), total: queue.length, queue, beaten: [], hearts: 3, card: bossCard(queue[0]), result: null, fx: "", done: false, won: false };
}
function viewBoss() {
  let G = gmGet("boss");
  if (!G) G = dealBoss();
  if (!G) return gmEmpty("Word Boss", gmSetup().src ? "No words in this list. Pick another on the Games page." : "No missed words: nothing to fight! Miss some words, or pick a list on the Games page to fight that instead.");
  const save = () => gmPut("boss", G), hearts = () => `<span class="gm-hearts" aria-label="${G.hearts} hearts left">${"♥".repeat(G.hearts)}<i>${"♥".repeat(3 - G.hearts)}</i></span>`;
  const arena = () => { const hp = G.queue.length, top = Math.max(G.total, hp), frac = hp / top;
    return `<div class="gm-arena ${G.fx}"><div class="gm-bossart">${bossArt(frac, 112, G.name)}${G.fx === "hit" ? `<b class="gm-pop">−1</b>` : G.fx === "heal" ? `<b class="gm-pop heal">+1</b>` : ""}</div>
      <div class="gm-bossinfo"><b>${G.name}</b><div class="gm-hp ${frac < .34 ? "low" : ""}" role="img" aria-label="${hp} of ${top} health"><div style="width:${frac * 100}%"></div></div><span class="small">${hp} word${hp === 1 ? "" : "s"} left</span></div></div>`; };
  const answer = ok => {
    const w = G.card.w;
    G.result = { ok };
    record(w, ok); G.queue.shift();
    if (ok) { if (!G.beaten.includes(w)) G.beaten.push(w); G.fx = "hit"; }
    else { G.hearts--; G.fx = "heal"; G.queue.push(w); if (G.queue.length < BOSS_HEAL_CAP) G.queue.push(w); }
    draw();
  };
  const next = () => {
    G.fx = ""; G.result = null;
    if (!G.queue.length || G.hearts <= 0) { G.done = true; G.won = !G.queue.length; const s = gmStats(), g = s.boss || { plays: 0, best: 0 }; g.plays++; if (G.won) g.best++; s.boss = g; store.set("gameStats", s); }
    else G.card = bossCard(G.queue[0]);
    draw(); window.scrollTo(0, 0);
  };
  const draw = () => {
    save();
    if (G.done) return drawEnd();
    const c = G.card, r = G.result, top = gmTop("Word Boss", hearts());
    let body = "";
    if (r) {
      const out = !G.queue.length ? "It's down!" : G.hearts <= 0 ? "It got away!" : "Next word";
      body = `<p class="gm-msg ${r.ok ? "ok" : "no"}">${r.ok ? "Hit!" : c.kind === "phony" ? `${c.show} ${c.phony ? "is phony" : "is valid"}. It heals!` : "It heals, and that word comes back twice."}</p>
        ${c.kind === "phony" && c.phony ? `<p class="small" style="margin:0 0 6px">It came from</p>` : ""}<div class="rows" style="text-align:left">${rowHTML(c.w)}</div>
        <div class="gm-acts" style="margin-top:12px"><button type="button" class="btn primary" id="gbNext">${out}</button></div>`;
    } else if (c.kind === "phony") {
      body = `<p class="q">Valid or phony?</p><div class="qprompt">${c.show}</div><div class="gm-acts" style="margin-top:14px"><button type="button" class="btn" id="gbPhony">Phony</button><button type="button" class="btn" id="gbValid">Valid</button></div>`;
    } else if (c.kind === "scramble") {
      body = `<p class="q">Unscramble it</p><div class="slots" id="gbSlots"></div>${rackHTML("gbRack")}<div class="gm-acts" style="margin-top:10px"><button type="button" class="btn" id="gbShuf">Shuffle</button><button type="button" class="btn" id="gbNo">I don't know</button></div>`;
    } else {
      body = `<p class="q">Which word is this?</p><div class="qdef">${esc(DICT.get(c.w).d)}</div><div class="gm-opts">${c.options.map((o, i) => `<button type="button" class="btn" data-opt="${o}">${o}</button>`).join("")}</div>`;
    }
    $("#view").innerHTML = `<div class="gm">${top}${arena()}<div class="card gm-stage">${body}</div></div>`;
    document.onkeydown = null;
    if (r) {
      $("#gbNext").onclick = next; $("#gbNext").focus();
      document.onkeydown = ev => { if (ev.key === "Enter" && !ev.target.closest?.("a, button")) { ev.preventDefault(); next(); } };
    } else if (c.kind === "phony") {
      $("#gbPhony").onclick = () => answer(c.phony); $("#gbValid").onclick = () => answer(!c.phony);
      document.onkeydown = ev => { if (/^[vp]$/i.test(ev.key) && !ev.metaKey && !ev.ctrlKey) answer((ev.key.toLowerCase() === "p") === c.phony); };
    } else if (c.kind === "scramble") {
      const want = anagrams(c.w);
      const board = rackBoard($("#gbSlots"), $("#gbRack"), c.letters, x => { if (!want.includes(x)) return false; setTimeout(() => answer(true), 250); return "keep"; });
      $("#gbShuf").onclick = board.shuffle; $("#gbNo").onclick = () => answer(false);
      document.onkeydown = ev => { if (ev.metaKey || ev.ctrlKey || ev.altKey) return; if (/^[a-z]$/i.test(ev.key)) board.type(ev.key.toUpperCase()); else if (ev.key === "Backspace") board.back(); else if (ev.key === " ") { ev.preventDefault(); board.shuffle(); } };
    } else {
      $("#view").querySelectorAll("[data-opt]").forEach(b => b.onclick = () => answer(b.dataset.opt === c.w));
      document.onkeydown = ev => { const b = $("#view").querySelectorAll("[data-opt]")[+ev.key - 1]; if (b && !ev.metaKey && !ev.ctrlKey) b.click(); };
    }
  };
  const drawEnd = () => {
    document.onkeydown = null;
    const left = [...new Set(G.queue)];
    $("#view").innerHTML = `<div class="gm">${gmTop("Word Boss")}<div class="card gm-end"><div class="gm-bossart ${G.won ? "down" : ""}" style="justify-content:center">${bossArt(G.won ? 0 : 1, 130, G.name)}</div>
      <p class="gm-big" style="font-size:1.7rem">${G.won ? `${G.name} is down!` : `${G.name} got away`}</p>
      <p class="gm-msg ${G.won ? "ok" : ""}">${G.beaten.length} word${G.beaten.length === 1 ? "" : "s"} beaten${gmSetup().src ? "" : " and off your Missed list"}</p>
      ${G.beaten.length ? `<div class="words" style="justify-content:center">${G.beaten.map(chip).join("")}</div>` : ""}
      ${left.length ? `<p class="small" style="margin:12px 0 4px">Still standing</p><div class="words" style="justify-content:center">${left.map(chip).join("")}</div>` : ""}</div>
      <div class="gm-acts"><button type="button" class="btn primary" id="gbAgain">${bossWords().length ? "Fight again" : "All clear"}</button><a class="btn" href="#games">All games</a></div></div>`;
    $("#gbAgain").onclick = () => { G = dealBoss(); gmPut("boss", G); if (!G) return location.replace("#games"); draw(); window.scrollTo(0, 0); };
  };
  draw();
}

// ---------- Silly Story: three words, one daft sentence. It's saved to each word's notes, and comes back later with the
// words blanked out, because recalling your own silly picture is what makes a word stick ----------
const STORY_SCENES = ["at the dentist", "on a pirate ship", "in a very slow lift", "at your gran's birthday", "during a tournament final", "inside a giant sandwich", "on the moon", "at a wedding gone wrong", "in a haunted supermarket", "on a first date", "at a llama farm", "during a school play", "in a broken-down bus", "at a royal banquet", "in a submarine"];
const getStories = () => store.get("stories", []);
const storyPool = () => gameWords().filter(w => w.length >= 3 && w.length <= 10 && !DICT.get(w).d.startsWith("<"));
const storyPick = (have = []) => { const p = storyPool().filter(w => !have.includes(w)); return p[Math.floor(Math.random() * p.length)]; };
const storyScene = () => STORY_SCENES[Math.floor(Math.random() * STORY_SCENES.length)];
function dealStory() {
  const words = []; for (let i = 0; i < 3; i++) { const w = storyPick(words); if (w) words.push(w); }
  return { tab: "write", words, scene: storyScene(), text: "", saved: false, recall: null };
}
// the story's text with its words split out, longest first so CATS isn't read as CAT
function storyParts(s) {
  const re = new RegExp(`(${[...s.words].sort((a, b) => b.length - a.length).join("|")})`, "gi");
  return s.text.split(re).map((t, i) => i % 2 ? { w: t.toUpperCase() } : { t });
}
function viewStory() {
  let G = gmGet("story");
  if (!G) G = dealStory();
  const save = () => gmPut("story", G);
  const tabs = () => `<nav class="studyseg gm-seg">${[["write", "Write"], ["recall", `Recall (${getStories().length})`], ["list", "My stories"]].map(([k, t]) => `<a href="#" data-tab="${k}" class="${G.tab === k ? "on" : ""}">${t}</a>`).join("")}</nav>`;
  const wireTabs = () => $("#view").querySelectorAll(".gm-seg [data-tab]").forEach(a => a.onclick = ev => { ev.preventDefault(); G.tab = a.dataset.tab; draw(); window.scrollTo(0, 0); });
  const draw = () => { save(); document.onkeydown = null; ({ write: drawWrite, recall: drawRecall, list: drawList })[G.tab](); wireTabs(); };
  const has = w => G.text.toUpperCase().includes(w);
  const drawWrite = () => {
    if (G.saved) {
      $("#view").innerHTML = `<div class="gm">${gmTop("Silly Story")}${tabs()}<div class="card gm-end">${gmArt.story}<p class="gm-msg ok">Saved to your stories and each word's notes</p><p class="gm-quote">${esc(G.saved)}</p></div>
        <div class="gm-acts"><button type="button" class="btn primary" id="stNew">Write another</button><button type="button" class="btn" id="stTest">Test me on one</button></div></div>`;
      $("#stNew").onclick = () => { const t = G.recall; G = { ...dealStory(), recall: t }; draw(); };
      $("#stTest").onclick = () => { G.tab = "recall"; G.recall = null; draw(); };
      return;
    }
    if (G.words.length < 3) { $("#view").innerHTML = `<div class="gm">${gmTop("Silly Story")}${tabs()}<div class="card"><p class="empty">This list needs at least three words with definitions. Pick another on the Games page.</p></div></div>`; return; }
    $("#view").innerHTML = `<div class="gm">${gmTop("Silly Story")}${tabs()}
      <div class="gm-scene"><span>Set it…</span> <b>${esc(G.scene)}</b> <button type="button" class="gm-link" id="stScene">Another</button></div>
      <div class="gm-words">${G.words.map(w => `<div class="card gm-word ${has(w) ? "in" : ""}" data-word="${w}"><div class="gm-wh"><a href="#w/${w}"><b>${w}</b></a><span class="gm-tick">✓</span><button type="button" class="gm-link" data-stswap="${w}" aria-label="Swap ${w}">Swap</button></div><p>${esc(DICT.get(w).d)}</p></div>`).join("")}</div>
      <div class="card"><label class="flabel" for="stText">Your sentence, using all three</label><textarea id="stText" class="gm-text" rows="4" placeholder="The sillier the better. A picture you can see sticks best.">${esc(G.text)}</textarea>
        <button type="button" class="btn primary block" id="stSave" style="margin-top:10px"></button></div></div>`;
    const paint = () => {
      const left = G.words.filter(w => !has(w));
      $("#view").querySelectorAll("[data-word]").forEach(c => c.classList.toggle("in", has(c.dataset.word)));
      $("#stSave").disabled = !!left.length; $("#stSave").textContent = left.length ? `Still to use: ${left.join(", ")}` : "Save my story";
    };
    $("#stText").oninput = e => { G.text = e.target.value; save(); paint(); };
    $("#stScene").onclick = () => { G.scene = storyScene(); draw(); };
    $("#view").querySelectorAll("[data-stswap]").forEach(b => b.onclick = () => { const n = storyPick(G.words); if (n) { G.words[G.words.indexOf(b.dataset.stswap)] = n; draw(); } });
    $("#stSave").onclick = () => {
      const s = { id: Date.now().toString(36), at: Date.now(), words: G.words, text: G.text.trim(), tests: 0, right: 0 };
      store.set("stories", [s, ...getStories()]);
      const n = getNotes(); for (const w of s.words) n[w] = n[w] ? `${n[w]}\n${s.text}` : s.text; store.set("notes", n);
      gmDone("story", getStories().length);
      G.saved = s.text; G.text = ""; draw();
    };
    paint();
  };
  const drawRecall = () => {
    const all = getStories();
    if (!all.length) { $("#view").innerHTML = `<div class="gm">${gmTop("Silly Story")}${tabs()}<div class="card"><p class="empty">Write a story first, then it'll come back here with the words missing.</p></div></div>`; return; }
    // the story tested least, and longest ago, comes up next
    if (!G.recall || !all.some(s => s.id === G.recall.id)) { const s = [...all].sort((a, b) => a.tests - b.tests || (a.lastAt || a.at) - (b.lastAt || b.at))[0]; G.recall = { id: s.id, typed: {}, checked: false }; save(); }
    const r = G.recall, s = all.find(x => x.id === r.id), seen = new Set();
    const typedOk = w => (r.typed[w] || "").toUpperCase().replace(/[^A-Z]/g, "") === w;
    const blank = w => { if (r.checked) return `<b class="gm-fill ${typedOk(w) ? "ok" : "no"}">${w}</b>`;
      if (seen.has(w)) return `<span class="gm-again">${w[0]}${"·".repeat(w.length - 1)}</span>`;
      seen.add(w); return `<input class="gm-blank" data-b="${w}" value="${esc(r.typed[w] || "")}" placeholder="${w[0]}${"·".repeat(w.length - 1)}" size="${Math.max(w.length, 3)}" aria-label="Missing word, ${w.length} letters" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false">`; };
    const right = s.words.filter(typedOk).length;
    $("#view").innerHTML = `<div class="gm">${gmTop("Silly Story", s.tests ? `tested ${s.tests}×` : "")}${tabs()}<div class="card"><p class="flabel" style="margin:0 0 8px">Fill in your words</p>
        <p class="gm-quote left">${storyParts(s).map(p => p.w ? blank(p.w) : esc(p.t)).join("")}</p>
        ${r.checked ? `<p class="gm-msg ${right === s.words.length ? "ok" : "no"}" style="text-align:center">${right} of ${s.words.length}${right === s.words.length ? ". It stuck!" : ""}</p><div class="rows" style="text-align:left">${s.words.map(w => rowHTML(w)).join("")}</div>` : ""}</div>
      <div class="gm-acts">${r.checked ? `<button type="button" class="btn primary" id="stNext">Next story</button>` : `<button type="button" class="btn primary" id="stCheck">Check</button>`}</div></div>`;
    $("#view").querySelectorAll("[data-b]").forEach(i => { i.oninput = () => { r.typed[i.dataset.b] = i.value; save(); }; i.onkeydown = ev => { if (ev.key === "Enter") { ev.preventDefault(); $("#stCheck").click(); } }; });
    if ($("#stCheck")) $("#stCheck").onclick = () => {
      r.checked = true;
      for (const w of s.words) record(w, typedOk(w));
      store.set("stories", getStories().map(x => x.id === s.id ? { ...x, tests: x.tests + 1, right: x.right + s.words.filter(typedOk).length, lastAt: Date.now() } : x));
      draw();
    };
    if ($("#stNext")) $("#stNext").onclick = () => { G.recall = null; draw(); window.scrollTo(0, 0); };
  };
  const drawList = () => {
    const all = getStories();
    $("#view").innerHTML = `<div class="gm">${gmTop("Silly Story")}${tabs()}${all.length ? all.map(s => `<div class="card gm-sitem"><p class="gm-quote left">${esc(s.text)}</p><div class="words">${s.words.map(chip).join("")}</div>
        <div class="row" style="margin-top:8px"><span class="small" style="margin-right:auto">${s.tests ? `Tested ${s.tests}× · ${Math.round(s.right / (s.tests * s.words.length) * 100)}%` : "Not tested yet"}</span><button type="button" class="btn sm" data-try="${s.id}">Test</button><button type="button" class="btn sm" data-del="${s.id}">Delete</button></div></div>`).join("") : `<div class="card"><p class="empty">No stories yet.</p></div>`}</div>`;
    $("#view").querySelectorAll("[data-try]").forEach(b => b.onclick = () => { G.recall = { id: b.dataset.try, typed: {}, checked: false }; G.tab = "recall"; draw(); window.scrollTo(0, 0); });
    $("#view").querySelectorAll("[data-del]").forEach(b => confirmBtn(b, () => { store.set("stories", getStories().filter(x => x.id !== b.dataset.del)); if (G.recall?.id === b.dataset.del) G.recall = null; draw(); }));
  };
  draw();
}

// ---------- Quartets: sixteen words, four hidden groups. The groups come from the word list's own data: what a word
// means (from its definition), the hooks it takes, and what's left when a letter comes off. Four wrong guesses ends it ----------
const QT_MEANINGS = [["Fish", /\bfish\b/], ["Birds", /\bbirds?\b/], ["Trees", /\btree\b/], ["Plants", /\bplant\b/], ["Shrubs", /\bshrub\b/], ["Money", /\bmonetary unit\b|\bcoin\b|\bcurrency\b/], ["Dances", /\bdance\b/],
  ["Musical instruments", /\bmusical instrument\b/], ["Insects", /\binsect\b|\bbeetle\b/], ["Cloth", /\bfabric\b|\bcloth\b/], ["Clothes", /\bgarment\b/], ["Dogs", /\bdog\b/], ["Drinks", /\bdrink\b|\bliquor\b|\bwine\b/],
  ["Antelope and deer", /\bantelope\b|\bdeer\b/], ["Weapons", /\bsword\b|\bweapon\b|\bspear\b/], ["Hats", /\bhat\b/], ["Boats", /\bboat\b|\bship\b/], ["Minerals", /\bmineral\b/], ["Snakes and lizards", /\bsnake\b|\blizard\b/], ["Units of measure", /\bunit of\b/]];
// a meaning only counts when the keyword names the thing: "large fish [n]" and "a kind of fish [n]" do, "net to catch fish [n]" doesn't
function qtMeans(d, re) {
  if (d.startsWith("<")) return false;
  return d.split(" / ").some(part => {
    if (!/\[n/.test(part)) return false;
    const p = part.toLowerCase().replace(/\b(kind|type|species|variety|sort|genus|breed) of\b/g, ""), m = p.match(re);
    return !!m && p[m.index + m[0].length] !== "-" && !/\b(to|for|of|by|in|on|with|from|like|resembling|used|made|having|without)\b/.test(p.slice(0, m.index));
  });
}
const QT_RULES = [
  ...QT_MEANINGS.map(([name, re]) => ({ id: "m:" + name, kind: "meaning", name, test: (w, e) => qtMeans(e.d, re) })),
  ...[..."YEDRTNAL"].map(L => ({ id: "b:" + L, kind: "hook", name: `All take ${L} on the end`, test: (w, e) => e.bh.toUpperCase().includes(L) })),
  ...[..."SABCDEFGHLMPRTW"].map(L => ({ id: "f:" + L, kind: "hook", name: `All take ${L} at the front`, test: (w, e) => e.fh.toUpperCase().includes(L) })),
  { id: "nohook", kind: "hook", name: "No hooks at all", test: (w, e) => !e.fh && !e.bh },
  { id: "ana", kind: "shape", name: "Each has an anagram", test: w => anagrams(w).length > 1 },
  { id: "dropf", kind: "shape", name: "Still a word without the first letter", test: w => w.length > 2 && DICT.has(w.slice(1)) },
  { id: "dropl", kind: "shape", name: "Still a word without the last letter", test: w => w.length > 2 && DICT.has(w.slice(0, -1)) },
];
const QT_MODES = [["mix", "Mixed"], ["meaning", "Meanings"], ["hook", "Hooks"]];
let qtMemo = { key: "", pool: new Map(), wide: new Map(), poolW: [], wideW: [] };
function qtWords() {
  const s = gmSetup(), pool = gameWords().filter(w => w.length >= 2 && w.length <= 8);
  const key = JSON.stringify(s) + pool.length;
  if (qtMemo.key !== key) {
    const lens = [...new Set(pool.map(w => w.length))], use = !s.src && !s.lens.length ? [4, 5] : lens;
    qtMemo = { key, pool: new Map(), wide: new Map(), poolW: shuffle(s.src ? pool : pool.filter(w => use.includes(w.length))).slice(0, 6000), wideW: shuffle(use.flatMap(n => BYLEN[n] || [])).slice(0, 8000) };
  }
  return qtMemo;
}
const qtFrom = (memo, words, r) => { if (!memo.has(r.id)) memo.set(r.id, words.filter(w => r.test(w, DICT.get(w)))); return memo.get(r.id); };
// four groups that can each fill up from these word lengths; a short word length may not have the groups asked for, so
// any four will do after that
function qtPickRules(mode, viable, loose) {
  const of = k => shuffle(viable.filter(r => r.kind === k));
  if (loose) return shuffle(viable).slice(0, 4);
  if (mode === "meaning" || mode === "hook") return of(mode).slice(0, 4);
  // no more than one word-shape group, and at least one of meaning and hook
  const hooks = of("hook");
  return shuffle([...of("meaning").slice(0, 2), hooks[0], Math.random() < .5 ? of("shape")[0] : hooks[1]].filter(Boolean));
}
function dealQuartets(mode) {
  const M = qtWords();
  if (!M.wideW.length) return null;
  const viable = QT_RULES.filter(r => qtFrom(M.wide, M.wideW, r).length >= 4);
  for (let t = 0; t < 120; t++) {
    const rules = qtPickRules(mode, viable, t >= 80), groups = [], used = new Set();
    if (rules.length < 4) continue;
    for (const r of rules) {
      // words of this group only, so there's one right answer; the chosen list's words first
      const clean = w => !used.has(w) && rules.every(o => o === r || !o.test(w, DICT.get(w)));
      const words = [...shuffle(qtFrom(M.pool, M.poolW, r)).filter(clean).slice(0, 4)];
      if (words.length < 4) for (const w of shuffle(qtFrom(M.wide, M.wideW, r))) { if (words.length === 4) break; if (!words.includes(w) && clean(w)) words.push(w); }
      if (words.length < 4) break;
      words.forEach(w => used.add(w));
      groups.push({ id: r.id, name: r.name, kind: r.kind, words });
    }
    if (groups.length === 4) return { mode, groups, tiles: shuffle(groups.flatMap(g => g.words)), sel: [], solved: [], lives: 4, tried: [], msg: "", done: false, won: false };
  }
  return null;
}
function viewQuartets() {
  let mode = store.get("quartetsMode", "mix"), G = gmGet("quartets");
  if (!G) G = dealQuartets(mode);
  if (!G) return gmEmpty("Quartets", "Quartets needs words of 2 to 8 letters. Pick another list or length.");
  const fresh = () => { G = dealQuartets(mode); gmPut("quartets", G); if (!G) return viewQuartets(); draw(); window.scrollTo(0, 0); };
  const lives = () => `<span class="qt-lives" aria-label="${G.lives} guesses left">${[0, 1, 2, 3].map(i => `<i class="${i < G.lives ? "" : "gone"}"></i>`).join("")}</span>`;
  const solvedHTML = g => `<div class="qt-solved ${G.solved.includes(g.id) ? "" : "lost"}"><b>${esc(g.name)}</b><div class="words">${g.words.map(chip).join("")}</div></div>`;
  const pills = () => `<div class="copts">${QT_MODES.map(([k, n]) => `<button type="button" class="pill ${mode === k ? "on" : ""}" data-qtmode="${k}">${n}</button>`).join("")}</div>`;
  const wirePills = () => $("#view").querySelectorAll("[data-qtmode]").forEach(b => b.onclick = () => { mode = b.dataset.qtmode; store.set("quartetsMode", mode); fresh(); });
  const finish = won => {
    G.done = true; G.won = won; G.sel = [];
    gmDone("quartets", G.solved.length);
    if (gmSetup().src) for (const g of G.groups) for (const w of g.words) if (gameWords().includes(w)) record(w, G.solved.includes(g.id));
  };
  const lock = () => {
    if (G.sel.length !== 4) return;
    const key = [...G.sel].sort().join();
    if (G.tried.includes(key)) { G.msg = "You've tried those four"; return draw(); }
    const hit = G.groups.find(g => g.words.every(w => G.sel.includes(w)));
    if (hit) {
      G.solved.push(hit.id); G.tiles = G.tiles.filter(w => !hit.words.includes(w)); G.sel = []; G.msg = "";
      if (G.solved.length === 4) finish(true);
      return draw();
    }
    G.tried.push(key); G.lives--;
    const best = Math.max(...G.groups.filter(g => !G.solved.includes(g.id)).map(g => g.words.filter(w => G.sel.includes(w)).length));
    G.msg = best === 3 ? "Three of those belong together" : "Not a group";
    if (!G.lives) finish(false);
    draw();
    if (!G.done) gmShake($("#qtBoard"));
  };
  const draw = () => {
    gmPut("quartets", G); document.onkeydown = null;
    if (G.done) return drawEnd();
    const n = G.sel.length;
    $("#view").innerHTML = `<div class="gm">${gmTop("Quartets", lives())}${pills()}
      ${G.groups.filter(g => G.solved.includes(g.id)).map(solvedHTML).join("")}
      <div class="qt-board" id="qtBoard">${G.tiles.map(w => `<button type="button" class="qt-t ${G.sel.includes(w) ? "on" : ""}" data-w="${w}" aria-pressed="${G.sel.includes(w)}">${w}</button>`).join("")}</div>
      <p class="gm-msg ${G.msg ? "no" : ""}" style="text-align:center;margin:0">${G.msg || "Find four words that share something."}</p>
      <div class="gm-acts"><button type="button" class="btn" id="qtShuf">Shuffle</button><button type="button" class="btn" id="qtClear" ${n ? "" : "disabled"}>Clear</button><button type="button" class="btn primary" id="qtLock" ${n === 4 ? "" : "disabled"}>Lock in${n && n < 4 ? ` (${n}/4)` : ""}</button></div></div>`;
    $("#view").querySelectorAll("[data-w]").forEach(b => b.onclick = () => { const w = b.dataset.w, i = G.sel.indexOf(w); if (i >= 0) G.sel.splice(i, 1); else if (G.sel.length < 4) G.sel.push(w); G.msg = ""; draw(); });
    $("#qtShuf").onclick = () => { G.tiles = shuffle(G.tiles); draw(); };
    $("#qtClear").onclick = () => { G.sel = []; G.msg = ""; draw(); };
    $("#qtLock").onclick = lock;
    wirePills();
  };
  const drawEnd = () => {
    const mistakes = 4 - G.lives;
    $("#view").innerHTML = `<div class="gm">${gmTop("Quartets", lives())}${pills()}<div class="card gm-end"><p class="gm-big">${G.solved.length}<small> / 4 groups</small></p><p class="gm-msg ${G.won ? "ok" : ""}">${G.won ? (mistakes ? `All found, with ${mistakes} wrong guess${mistakes === 1 ? "" : "es"}` : "Flawless!") : "Out of guesses. Here's what they were."}</p></div>
      ${G.groups.map(solvedHTML).join("")}
      <details class="card"><summary class="lbl" style="cursor:pointer;margin:0">What the words mean</summary><div class="rows" style="margin-top:8px">${G.groups.flatMap(g => g.words).map(w => rowHTML(w)).join("")}</div></details>
      <div class="gm-acts"><button type="button" class="btn primary" id="qtNew">New quartets</button><a class="btn" href="#games">All games</a></div></div>`;
    $("#qtNew").onclick = fresh;
    wirePills();
  };
  draw();
}
