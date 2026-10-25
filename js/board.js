// ---------- board: Look (the Board tab: place tiles and see the score worked out) and Count (Study → Scoring: practise adding up a play) ----------
// Squares are numbered 0–224 across the rows. Across plays are named row then column (8H), down plays column then row (H8).
const BPREM = (() => {
  const p = Array(225).fill(""), q = { tw: [[0, 0], [0, 7]], dw: [[1, 1], [2, 2], [3, 3], [4, 4], [7, 7]], tl: [[1, 5], [5, 5]], dl: [[0, 3], [2, 6], [3, 7], [6, 6]] };
  for (const [k, l] of Object.entries(q)) for (const [r, c] of l) for (const [a, b] of [[r, c], [c, r]]) for (const R of [a, 14 - a]) for (const C of [b, 14 - b]) p[R * 15 + C] = k;
  return p;
})();
const BWORDS = { tw: "Triple<br>word<br>score", dw: "Double<br>word<br>score", tl: "Triple<br>letter<br>score", dl: "Double<br>letter<br>score" };
// the Deluxe centre star: eight points, outlined like the printed one
const DSTAR = (() => { let d = ""; for (let i = 0; i < 16; i++) { const a = Math.PI * i / 8 - Math.PI / 2, r = i % 2 ? 19 : 44; d += (i ? "L" : "M") + (50 + r * Math.cos(a)).toFixed(1) + " " + (50 + r * Math.sin(a)).toFixed(1); }
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="${d}Z" fill="rgb(255 240 232 / .55)" stroke="rgb(150 70 60 / .7)" stroke-width="3" stroke-linejoin="round"/></svg>`; })();
const BWORDS2 = { tw: "Triple<br>word", dw: "Double<br>word", tl: "Triple<br>letter", dl: "Double<br>letter" };
const BLABELS = { letters: { tw: "TW", dw: "DW", tl: "TL", dl: "DL" }, nums: { tw: "3W", dw: "2W", tl: "3L", dl: "2L" } }, BLM = { dl: 2, tl: 3 }, BWM = { dw: 2, tw: 3 }, BCOLS = "ABCDEFGHIJKLMNO";
const bAt = (i, d) => d ? BCOLS[i % 15] + (1 + (i / 15 | 0)) : (1 + (i / 15 | 0)) + BCOLS[i % 15];
const rnd = n => Math.floor(Math.random() * n), pickOne = a => a[rnd(a.length)];
// the score of the new tiles `news` (square → {ch, b}) on `cells`: every word made, or an error saying why it isn't a play
function scorePlay(cells, news) {
  const idx = [...news.keys()];
  if (!idx.length) return null;
  const at = i => news.get(i) || cells[i];
  const rows = new Set(idx.map(i => i / 15 | 0)), cols = new Set(idx.map(i => i % 15));
  if (rows.size > 1 && cols.size > 1) return { error: "The tiles need to be in one row or column." };
  const run = (i, d) => {
    const step = d ? 15 : 1, ok = j => j >= 0 && j < 225 && (d || (j / 15 | 0) === (i / 15 | 0)) && at(j);
    let s = i; while (ok(s - step)) s -= step;
    const out = []; for (let j = s; ok(j); j += step) out.push(j);
    return out;
  };
  // one tile goes whichever way makes the longer word
  const dir = rows.size > 1 ? 1 : cols.size > 1 ? 0 : run(idx[0], 1).length > run(idx[0], 0).length ? 1 : 0;
  const main = run(idx[0], dir);
  if (!idx.every(i => main.includes(i))) return { error: "There's a gap in the play." };
  const scoreRun = (sq, d) => {
    let sum = 0, wm = 1;
    const parts = sq.map(i => {
      const t = at(i), fresh = news.has(i), v = t.b ? 0 : VALUES[t.ch], lm = fresh && BLM[BPREM[i]] || 1;
      if (fresh) wm *= BWM[BPREM[i]] || 1;
      sum += v * lm;
      return { ch: t.ch, b: t.b, v, lm, fresh };
    });
    return { word: sq.map(i => at(i).ch).join(""), start: sq[0], dir: d, parts, wm, score: sum * wm };
  };
  const words = [];
  if (main.length > 1) words.push(scoreRun(main, dir));
  for (const i of idx) { const c = run(i, 1 - dir); if (c.length > 1) words.push(scoreRun(c, 1 - dir)); }
  if (!words.length) return { error: "A word needs at least two letters." };
  const first = cells.every(c => !c);
  if (first ? !news.has(112) : !words.some(w => w.parts.some(p => !p.fresh)))
    return { error: first ? "The first play goes through the centre star." : "The play isn't joined to the tiles on the board." };
  const bingo = news.size === 7 ? 50 : 0;
  return { words, bingo, total: words.reduce((s, w) => s + w.score, 0) + bingo };
}
// badges: the play's direction (0 across, 1 down) to show the bonus of new tiles on bonus squares on a tab (Count), or false
// marks: last (squares of the last play, outlined) and pend (new tiles are a play being made, so they're tinted)
function boardHTML(cells, news = new Map(), cur = -1, dir = 0, badges = false, marks = {}) {
  // which side of square i the tab goes on: the first of the play's two sides that's an empty square on the board
  const side = i => {
    const free = (j, ok) => ok && !cells[j] && !news.has(j), r = i / 15 | 0, c = i % 15;
    const sides = badges ? [["rt", i + 1, c < 14], ["lt", i - 1, c > 0]] : [["up", i - 15, r > 0], ["dn", i + 15, r < 14]];
    return (sides.find(([, j, ok]) => free(j, ok)) || ["in"])[0];
  };
  const lab = SET.bLabels === "none" ? {} : SET.bLabels === "words" ? BWORDS : SET.bLabels === "words2" ? BWORDS2 : BLABELS[SET.bLabels] || BLABELS.letters, blab = BLABELS[SET.bLabels] || BLABELS.letters;
  const dlx = /^dlx/.test(SET.bStyle);
  let h = "";
  for (let i = 0; i < 225; i++) {
    const t = news.get(i) || cells[i], k = BPREM[i], r = i / 15 | 0, c = i % 15;
    const edge = k ? (r === 0 ? " et" : r === 14 ? " eb" : "") + (c === 0 ? " el" : c === 14 ? " er" : "") : "";
    const label = dlx && k && lab[k] ? `<i class="l">${lab[k]}</i><i class="s">${blab[k]}</i>` : lab[k] || "";
    h += `<div class="sq ${k}${edge}${i === 112 ? " st" : ""}${i === cur ? " cur" + (dir ? " dn" : "") : ""}" data-i="${i}"${dlx ? ` style="--r:${r};--c:${c}"` : ""}>${t
      ? `<div class="tile${news.has(i) ? " new" + (marks.pend ? " pend" : "") : ""}${marks.last?.has(i) ? " last" : ""}${t.b ? " blank" : ""}">${t.ch}${t.b ? "" : `<sub>${VALUES[t.ch]}</sub>`}${badges !== false && k && news.has(i) ? `<i class="bb ${k} ${side(i)}">${blab[k]}</i>` : ""}</div>`
      : `<span>${i === 112 ? (dlx ? DSTAR : "★") : label}</span>`}</div>`;
  }
  const bts = SET.bTile !== "same" && TILE_STYLES[SET.bTile] ? ` data-bts="${SET.bTile}"` : "";
  return `<div class="bwrap st-${SET.bStyle} pal-${SET.bPal} ${badges !== false ? " mk-" + (BMARKS.some(([v]) => v === SET.bMark) ? SET.bMark : "bright") : ""}${SET.bCoords ? "" : " nocoord"}${SET.bArrows ? " arrows" : ""} lab-${SET.bLabels}"${bts}${bVars()}><div class="bcx">${[...BCOLS].map(c => `<span>${c}</span>`).join("")}</div><div class="bcy">${BCOLS.split("").map((_, i) => `<span>${i + 1}</span>`).join("")}</div><div class="bd">${h}</div></div>`;
}
// a board-only tile style: clear what the Settings style added, then lay this one on
document.head.insertAdjacentHTML("beforeend", `<style>${Object.entries(TILE_STYLES).map(([id, [, css, sub]]) => `.bwrap[data-bts="${id}"] .tile { background-image: none; transform: none; margin: 0; border-radius: 3px; ${css} }${sub ? ` .bwrap[data-bts="${id}"] .tile sub { ${sub} }` : ""}`).join("\n")}</style>`);
// Theme board colours can come from a different theme than the app's: its colours go on the board as inline tokens
const bThemeDecls = (id = SET.bTheme) => {
  const t = THEMES[id]; if (!t) return [];
  const c = isDark() ? t.dark : lightOf(id, t);
  return ["head", "panel", "accent", "link", "ink", "muted"].map(k => `--${k}:${c[k]}`);
};
const bThemeVars = id => { const d = bThemeDecls(id); return d.length ? ` style="${d.join(";")}"` : ""; };
// board-only tile colours: [name, colour or "" for Settings'], set on the board as tile tokens
const BTILECOLS = { same: ["Same as Settings", ""], burgundy: ["Burgundy wood", "#6e1b24"], natural: ["Natural wood", "#ecd6ac"], ivory: ["Ivory", "#f5eedb"] };
const bVars = () => {
  const c = BTILECOLS[SET.bTileCol]?.[1];
  const d = [...(SET.bPal === "theme" ? bThemeDecls() : []), ...(c ? Object.entries(tileTok(c)).map(([k, v]) => `--${k}:${v}`) : [])];
  return d.length ? ` style="${d.join(";")}"` : "";
};
// one tap for a whole look: the wooden Deluxe set of about 2000 (from photos of a real board), in two sizes of frame
const BPRESETS = { dlx: ["Deluxe", { bStyle: "dlx", bPal: "dlxd", bLabels: "words2", bTileCol: "natural", bTile: "wood", bArrows: true }],
  dlxc: ["Deluxe compact", { bStyle: "dlxc", bPal: "dlxa", bLabels: "letters", bTileCol: "natural", bTile: "wood", bArrows: true }] };
const BMARKS = [["bright", "Brighter"], ["halo", "Soft light"], ["shine", "Shine"], ["lift", "Lifted"], ["tint", "Warm tint"], ["dim", "Others faded"]];
// Board look: one sheet, opened from the Board tab and from Scoring, saved with the other settings so both follow it.
// Its ~70 little boards are only built when it's opened: pages just hold an empty place for it
const bLookBar = () => `<div class="bbar"><button type="button" class="btn sm" id="bLookOpen">Board look</button></div>`;
const bLookSheet = () => `<div class="sheetwrap" id="bsheet" hidden></div>`;
function bLookSheetFull() {
  const seg = (key, opts) => `<div class="seg">${opts.map(([v, t]) => `<button type="button" class="btn ${String(SET[key]) === String(v) ? "on" : ""}" data-bset="${key}" data-val="${v}">${t}</button>`).join("")}</div>`;
  const ts = (id, n, look) => `<button type="button" class="${SET.bTile === id ? "on" : ""}" data-bset="bTile" data-val="${id}"><div class="tile ts-${look}">A<sub>1</sub></div>${n}</button>`;
  // a 5×5 corner of the board in a style and colours, with one tile on it
  const MINI = ["tw", "", "", "dl", "", "", "dw", "", "", "", "", "", "dw", "", "", "dl", "", "", "dw", "", "", "", "", "", "tl"];
  const mini = (st, pal, th = SET.bTheme) => `<div class="bwrap bmini st-${st} pal-${pal}"${pal === "theme" ? bThemeVars(th) : ""}><div class="bd">${MINI.map((k, i) => `<div class="sq ${k}">${k ? "<span></span>" : ""}${i === 7 ? `<div class="tile">A</div>` : ""}</div>`).join("")}</div></div>`;
  const picks = (key, opts, prev) => `<div class="bpicks">${opts.map(([v, n]) => `<button type="button" class="${SET[key] === v ? "on" : ""}" data-bset="${key}" data-val="${v}">${prev(v)}${n}</button>`).join("")}</div>`;
  return sheetHTML("bsheet", `<h3>Board look<button type="button" id="bLookDone">Done</button></h3>
    <div class="fs"><h2 class="lbl">Ready-made looks</h2><div class="bpicks">${Object.entries(BPRESETS).map(([id, [n, o]]) =>
      `<button type="button" class="${Object.entries(o).every(([k, v]) => SET[k] === v) ? "on" : ""}" data-bpreset="${id}">${mini(o.bStyle, o.bPal)}${n}</button>`).join("")}</div></div>
    <div class="fs"><h2 class="lbl">Board style</h2>${picks("bStyle", [["gaps", "Gaps"], ["lined", "Lined"], ["dlx", "Deluxe"], ["dlxc", "Deluxe compact"], ["ridged", "Ridged"], ["wood", "Wooden"], ["leather", "Leather"], ["stone", "Stone"], ["glass", "Glass"], ["raised", "Raised"], ["inset", "Sunken"], ["felt", "Felt"], ["print", "Printed"]], v => mini(v, SET.bPal))}</div>
    <div class="fs"><h2 class="lbl">Board colours</h2>${picks("bPal", [["theme", "Theme"], ["classic", "Classic"], ["dlxd", "Deluxe"], ["dlxa", "Deluxe crimson"], ["vintage", "Vintage"], ["pastel", "Pastel"], ["night", "Night"], ["plain", "Plain"]], v => mini(SET.bStyle, v))}
      ${SET.bPal === "theme" ? `<h2 class="lbl" style="margin-top:14px">Theme for the board</h2>
        <div class="bpicks"><button type="button" class="${THEMES[SET.bTheme] ? "" : "on"}" data-bset="bTheme" data-val="">${mini(SET.bStyle, "theme", "")}Same as app</button></div>
        ${bThemeGroups().map(([g, ids]) => `<div class="sect" style="margin:12px 0 6px">${g}</div><div class="bpicks">${ids.map(id =>
          `<button type="button" class="${SET.bTheme === id ? "on" : ""}" data-bset="bTheme" data-val="${id}">${mini(SET.bStyle, "theme", id)}${esc(THEMES[id].name)}</button>`).join("")}</div>`).join("")}` : ""}</div>
    <div class="fs"><h2 class="lbl">Bonus squares</h2>${seg("bLabels", [["letters", "TW · DL"], ["nums", "3W · 2L"], ["words", "Written out"], ["words2", "Two words"], ["none", "No labels"]])}</div>
    <div class="fs"><h2 class="lbl">Arrows on bonus squares</h2>${seg("bArrows", [[true, "Show"], [false, "Hide"]])}</div>
    <div class="fs"><h2 class="lbl">Edge letters and numbers</h2>${seg("bCoords", [[true, "Show"], [false, "Hide"]])}</div>
    <div class="fs"><h2 class="lbl">New tiles in Scoring</h2>${seg("bMark", BMARKS)}</div>
    <div class="fs"><h2 class="lbl">Tiles</h2><div class="tilepick tstyles">${ts("same", "Same as Settings", tileLookOf())}${Object.entries(TILE_STYLES).map(([id, [n]]) => ts(id, n, id)).join("")}</div>
      <h2 class="lbl" style="margin-top:14px">Tile colour</h2>${seg("bTileCol", Object.entries(BTILECOLS).map(([id, [n]]) => [id, n]))}
      <p class="small" style="margin:8px 0 0">Tile letters come from Settings.</p></div>`);
}
// wire the button and sheet; redraw is the page's own redraw, and the sheet opens again after it
function bLookWire(redraw) {
  const close = () => sheet("bsheet", false);
  const open = () => {
    $("#bsheet").outerHTML = bLookSheetFull();
    $("#bLookDone").onclick = $("#bsheet .scrim").onclick = close;
    $("#bsheet").querySelectorAll("[data-bset], [data-bpreset]").forEach(b => b.onclick = () => {
      const k = b.dataset.bset, v = b.dataset.val;
      saveSettings(b.dataset.bpreset ? BPRESETS[b.dataset.bpreset][1] : { [k]: k === "bCoords" || k === "bArrows" ? v === "true" : v });
      const sc = $("#bsheet .sheet").scrollTop;
      redraw(); open(); $("#bsheet .sheet").scrollTop = sc;
    });
    sheet("bsheet", true);
  };
  $("#bLookOpen").onclick = open;
}
// the working for a play: each word's letters (with bonuses), its word bonus and total, then the bingo and the total
function workHTML(r, checkWords) {
  return r.words.map(w => `<div class="bk"><span class="bkw${checkWords && !DICT.has(w.word) ? " bad" : ""}">${w.word}</span>${w.parts.map(p =>
    `<i class="${p.fresh && p.lm > 1 ? (p.lm === 3 ? "tl" : "dl") : ""}${p.b ? " bl" : ""}">${p.ch} ${p.v}${p.lm > 1 ? "×" + p.lm : ""}</i>`).join("+")}${w.wm > 1 ? `<span class="wm">then ×${w.wm}</span>` : ""}<b>${w.score}</b></div>`).join("")
    + (r.bingo ? `<div class="bk"><span class="bkw">Bingo</span><span class="small">all seven tiles</span><b>+50</b></div>` : "")
    + (r.words.length > 1 || r.bingo ? `<div class="btotal"><span>Total</span><b>${r.total}</b></div>` : "");
}
const coarse = matchMedia("(pointer: coarse)");
// letters typed onto the board: on a phone through a hidden box (so its keyboard opens), on a computer straight from the keys.
// The box lives outside the page so redrawing the board doesn't close the phone's keyboard.
let bkOnKey = null;
function bkInput() {
  let inp = $("#bkIn");
  if (inp) return inp;
  const KEEP = "  ";
  document.body.insertAdjacentHTML("beforeend", `<input class="bkin" id="bkIn" autocapitalize="characters" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="done" aria-label="Type letters onto the board">`);
  inp = $("#bkIn"); inp.value = KEEP;
  inp.addEventListener("input", () => {
    const v = inp.value; inp.value = KEEP;
    if (!bkOnKey || !/^#(board|scoring|lab)/.test(location.hash)) return;
    if (v.length < KEEP.length) bkOnKey("Backspace");
    else for (const ch of v.slice(KEEP.length)) bkOnKey(ch);
  });
  return inp;
}
// the board's arrow: arrow keys move it (from the star if it isn't out), Space turns it across or down.
// S is any board state with cur (the square, or -1) and dir (0 across, 1 down); true if the key was one of these
function cursorKey(S, k) {
  const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k];
  if (d) { const r = (S.cur / 15 | 0) + d[1], c = S.cur % 15 + d[0]; if (S.cur < 0) S.cur = 112; else if (r >= 0 && r < 15 && c >= 0 && c < 15) S.cur = r * 15 + c; return true; }
  if (k === " " && S.cur >= 0) { S.dir = 1 - S.dir; return true; }
  return false;
}
function boardKeys(onKey) {
  const inp = bkInput();
  bkOnKey = onKey;
  document.onkeydown = ev => {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (ev.target.matches?.("input, textarea, select") && (ev.target !== inp || ev.key !== "Enter")) return;
    if (onKey(ev.key) !== false) ev.preventDefault();
  };
}

// Look: your own board, kept between visits
let LOOK = null;
const lookGet = () => LOOK ||= { cells: Array(225).fill(null), moves: [], ...store.get("board", {}), news: new Map(store.get("boardNew", [])), cur: -1, dir: 0, blank: false };
const lookSave = () => { store.set("board", { cells: LOOK.cells, moves: LOOK.moves }); store.set("boardNew", [...LOOK.news]); };
function viewLook() {
  const L = lookGet(), r = scorePlay(L.cells, L.news), used = L.cells.filter(Boolean).length + L.news.size;
  const main = r && !r.error && r.words[0];
  $("#view").innerHTML = `${boardSeg("")}${bLookBar()}
  <div class="bgrid"><div>${boardHTML(L.cells, L.news, L.cur, L.dir)}</div>
  <div class="bside">
    <div class="card"><h2 class="lbl">This play</h2>${!r ? `<p class="empty">Tap a square and type to place tiles. Tap the same square again to go down instead of across.</p>`
      : r.error ? `<p class="empty">${r.error}</p>`
      : `<p class="bq" style="margin-bottom:6px">${main.word} <span class="small">${bAt(main.start, main.dir)}</span></p>${workHTML(r, true)}`}
      <div class="row" style="margin-top:12px"><button class="btn primary" id="bPlay" ${r && !r.error ? "" : "disabled"}>Play</button><button class="btn ${L.blank ? "on" : ""}" id="bBlank" aria-pressed="${L.blank}" title="The next letter is a blank (or type ? first)">Blank</button><button class="btn" id="bUndo" ${L.news.size || L.moves.length ? "" : "disabled"}>${L.news.size ? "Take back" : "Undo last play"}</button></div></div>
    <div class="card"><h2 class="lbl">Plays</h2>${L.moves.length ? `<div class="bmoves">${L.moves.map((m, n) => `<div class="${m.ok ? "" : "bad"}"><span>${n + 1}</span><span>${m.at}</span><span>${m.w}</span><b>${m.s}</b></div>`).join("")}</div>
      <div class="btotal"><span>Total</span><b>${L.moves.reduce((s, m) => s + m.s, 0)}</b></div>` : `<p class="empty">Plays you make on this board are listed here.</p>`}
      <div class="row" style="margin-top:12px"><span class="small" style="margin-right:auto">${100 - used} tiles left in the bag</span><button class="btn sm" id="bAna" ${used ? "" : "disabled"}>Analyse</button><button class="btn sm" id="bClear" ${used ? "" : "disabled"}>Clear board</button></div></div>
  </div></div>${bLookSheet()}`;
  const redraw = () => { lookSave(); const sy = window.scrollY; viewLook(); window.scrollTo(0, sy); };
  bLookWire(redraw);
  const step = () => L.dir ? 15 : 1, inLine = (a, b) => b >= 0 && b < 225 && (L.dir || (a / 15 | 0) === (b / 15 | 0));
  let blankNext = false;
  $("#view .bd").addEventListener("click", ev => {
    const sq = ev.target.closest(".sq"); if (!sq) return;
    const i = +sq.dataset.i;
    if (i === L.cur) L.dir = 1 - L.dir; else L.cur = i;
    redraw();
    if (coarse.matches) bkInput().focus({ preventScroll: true });
  });
  boardKeys(k => {
    if (k === "Enter") { $("#bPlay")?.click(); return; }
    if (k === "?") { blankNext = true; return; }
    if (cursorKey(L, k)) { redraw(); return; }
    if (L.cur < 0) return false;
    if (k === "Backspace") {
      // take back the tile here, or the last one placed before it
      let i = L.cur;
      if (!L.news.has(i)) { i -= step(); while (inLine(L.cur, i) && L.cells[i]) i -= step(); }
      if (inLine(L.cur, i) && L.news.has(i)) { L.news.delete(i); L.cur = i; }
      redraw(); return;
    }
    if (!/^[a-z]$/i.test(k)) return false;
    let i = L.cur;
    while (inLine(L.cur, i) && L.cells[i]) i += step();
    if (!inLine(L.cur, i)) return;
    L.news.set(i, { ch: k.toUpperCase(), b: L.blank || blankNext });
    blankNext = false; L.blank = false;
    let n = i + step();
    while (inLine(i, n) && L.cells[n]) n += step();
    L.cur = inLine(i, n) ? n : i;
    redraw();
  });
  $("#bPlay").onclick = () => {
    const r = scorePlay(L.cells, L.news); if (!r || r.error) return;
    const m = r.words[0];
    L.moves.push({ w: m.word, at: bAt(m.start, m.dir), s: r.total, t: [...L.news.keys()], ok: r.words.every(w => DICT.has(w.word)) });
    for (const [i, t] of L.news) L.cells[i] = t;
    L.news = new Map(); L.cur = -1;
    redraw();
  };
  $("#bBlank").onclick = () => { L.blank = !L.blank; redraw(); if (coarse.matches && L.cur >= 0) bkInput().focus({ preventScroll: true }); };
  $("#bUndo").onclick = () => {
    if (L.news.size) L.news = new Map();
    else { const m = L.moves.pop(); if (m) { for (const i of m.t) L.cells[i] = null; } }
    redraw();
  };
  $("#bAna").onclick = () => anaOpen(cellsStr(L.cells), "");
  confirmBtn($("#bClear"), () => { LOOK = { cells: Array(225).fill(null), moves: [], news: new Map(), cur: -1, dir: 0, blank: false }; redraw(); });
}

// Count: a made-up position with a new play outlined; you add up its score
const BLEVELS = { mix: ["Mixed", () => true], simple: ["Simple", r => r.words.length === 1 && r.words[0].wm === 1 && !r.bingo],
  word: ["Word bonus", r => r.words[0].wm > 1 && !r.bingo], cross: ["Cross-words", r => r.words.length > 1 && !r.bingo], bingo: ["Bingos", r => !!r.bingo] };
// a play that fits: a random word laid across a square next to the tiles, with every word it makes real
function findPlay(cells, ok, tries, lens) {
  const anchors = [];
  for (let i = 0; i < 225; i++) if (!cells[i] && [-15, 15, -1, 1].some(d => { const j = i + d; return j >= 0 && j < 225 && (Math.abs(d) === 15 || (j / 15 | 0) === (i / 15 | 0)) && cells[j]; })) anchors.push(i);
  if (!anchors.length) anchors.push(112);
  for (let t = 0; t < tries; t++) {
    const a = pickOne(anchors), dir = rnd(2), step = dir ? 15 : 1, len = pickOne(lens), pool = BYLEN[len];
    if (!pool) continue;
    const word = pickOne(pool), start = a - rnd(len) * step, end = start + (len - 1) * step;
    if (start < 0 || end > 224 || (!dir && (start / 15 | 0) !== (end / 15 | 0))) continue;
    const news = new Map(); let fits = true;
    for (let j = 0; j < len; j++) { const sq = start + j * step, c = cells[sq]; if (c) { if (c.ch !== word[j]) { fits = false; break; } } else news.set(sq, { ch: word[j], b: false }); }
    if (!fits || !news.size || news.size > 7) continue;
    const r = scorePlay(cells, news);
    if (!r || r.error || r.words[0].word !== word || !r.words.every(w => DICT.has(w.word)) || !ok(r)) continue;
    return { news, r };
  }
  return null;
}
function makeCount(level) {
  const ok = BLEVELS[level]?.[1] || BLEVELS.mix[1];
  for (let attempt = 0; attempt < 40; attempt++) {
    const cells = Array(225).fill(null);
    const plays = 3 + rnd(9);
    for (let n = 0; n < plays; n++) { const p = findPlay(cells, () => true, 3000, [2, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 7, 7, 8]); if (p) for (const [i, t] of p.news) cells[i] = t; }
    // now and then one tile already down is a blank
    if (Math.random() < .25) { const ts = cells.filter(Boolean); if (ts.length) pickOne(ts).b = true; }
    const q = findPlay(cells, ok, 8000, level === "bingo" ? [7, 8, 8, 8] : [2, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 7, 8]);
    if (!q) continue;
    // and sometimes one of the new tiles is a blank, which scores nothing
    if ((level === "mix" || level === "bingo") && Math.random() < .2) { const k = pickOne([...q.news.keys()]); q.news.set(k, { ...q.news.get(k), b: true }); q.r = scorePlay(cells, q.news); }
    return { cells, news: q.news, r: q.r, t0: Date.now(), typed: "", done: false };
  }
  return null;
}
let CNT = null;
const cntStats = () => ({ n: 0, right: 0, ms: 0, streak: 0, best: 0, ...store.get("boardStats", {}) });
function viewCount() {
  const level = store.get("boardLevel", "mix");
  if (!CNT || CNT.level !== level) { CNT = makeCount(level); if (CNT) CNT.level = level; }
  const st = cntStats(), C = CNT;
  if (!C) { $("#view").innerHTML = `<div class="card"><p class="empty">Couldn't make a position just now. Try again.</p></div>`; return; }
  const m = C.r.words[0], right = C.done && +C.typed === C.r.total;
  $("#view").innerHTML = `${bLookBar()}
  <div class="bgrid"><div>${boardHTML(C.cells, C.news, -1, 0, C.r.words[0].dir)}</div>
  <div class="bside">
    <div class="seg blevels">${Object.entries(BLEVELS).map(([k, [n]]) => `<button type="button" class="btn sm ${k === level ? "on" : ""}" data-lv="${k}">${n}</button>`).join("")}</div>
    <div class="card">
      <p class="bq">What does <em>${m.word}</em> score?</p>
      <p class="small" style="margin:2px 0 0">${bAt(m.start, m.dir)}, the glowing tiles${[...C.news.values()].some(t => t.b) ? " (the coloured letter is a blank)" : ""}</p>
      <div class="bans"><div class="box ${C.done ? (right ? "right" : "wrong") : ""}" id="bBox">${C.typed}</div></div>
      ${C.done ? `<p class="bres ${right ? "right" : "wrong"}">${right ? `Right, in ${(C.ms / 1000).toFixed(1)}s` : `It's ${C.r.total}`}</p>${workHTML(C.r)}
        <div class="row" style="margin-top:12px"><button class="btn primary" id="bNext" style="flex:1;min-height:46px">Next</button><button class="btn" id="bToLook" style="min-height:46px">Open in Look</button></div>`
      : `<div class="bpad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(d => `<button type="button" data-d="${d}">${d}</button>`).join("")}<button type="button" data-d="del" aria-label="Delete">⌫</button><button type="button" class="go" data-d="ok" aria-label="Check">✓</button></div>`}
    </div>
    <div class="card btally"><div><b>${st.right}/${st.n}</b>right</div><div><b>${st.n ? (st.ms / st.n / 1000).toFixed(1) + "s" : "–"}</b>average</div><div><b>${st.streak}</b>in a row</div><div><b>${st.best}</b>best run</div>
      <button class="btn sm" id="bReset" style="margin-left:auto;align-self:center" ${st.n ? "" : "disabled"}>Reset</button></div>
  </div></div>${bLookSheet()}`;
  // redraw for the Board look sheet: the same view with Study's switch put back along the top
  bLookWire(() => { const sy = window.scrollY; VIEWS.scoring(); window.scrollTo(0, sy); });
  const check = () => {
    if (C.done || !C.typed) return;
    C.done = true; C.ms = Date.now() - C.t0;
    const s = cntStats(), ok = +C.typed === C.r.total;
    s.n++; s.ms += C.ms; if (ok) { s.right++; s.streak++; s.best = Math.max(s.best, s.streak); } else s.streak = 0;
    store.set("boardStats", s); VIEWS.scoring();
  };
  const next = () => { CNT = null; VIEWS.scoring(); };
  const key = k => {
    if (C.done) { if (k === "Enter" || k === " ") { next(); return; } return false; }
    if (/^\d$/.test(k) && C.typed.length < 4) C.typed += k;
    else if (k === "Backspace" || k === "del") C.typed = C.typed.slice(0, -1);
    else if (k === "Enter" || k === "ok") return check();
    else return false;
    $("#bBox").textContent = C.typed;
  };
  boardKeys(key);
  $("#view").querySelectorAll(".bpad [data-d]").forEach(b => b.onclick = () => key(b.dataset.d));
  $("#view").querySelectorAll("[data-lv]").forEach(b => b.onclick = () => { store.set("boardLevel", b.dataset.lv); CNT = null; VIEWS.scoring(); });
  if ($("#bNext")) $("#bNext").onclick = next;
  if ($("#bToLook")) $("#bToLook").onclick = () => {
    LOOK = { cells: C.cells.map(t => t && { ...t }), moves: [], news: new Map([...C.news].map(([i, t]) => [i, { ...t }])), cur: -1, dir: 0, blank: false };
    lookSave(); location.hash = "board";
  };
  confirmBtn($("#bReset"), () => { store.set("boardStats", {}); VIEWS.scoring(); });
}
// ---------- the computer: the engine (js/engine.js) runs in a worker so the page stays smooth while it thinks.
// If a worker can't start, the same code runs here instead ----------
const ENG = (() => {
  let port = null, seq = 0;
  const jobs = new Map();
  const got = m => { const j = jobs.get(m.id); if (!j) return; if (m.more) return j.prog?.(m); jobs.delete(m.id); m.error ? j.no(new Error(m.error)) : j.ok(m); };
  const boot = () => {
    if (port) return;
    try {
      const w = new Worker(URL.createObjectURL(new Blob([`const E = (${ENGINE})();`, "\nconst stopped = new Set();\nonmessage = e => e.data.type === 'stop' ? stopped.add(e.data.of) : E.serve(e.data, m => postMessage(m), id => stopped.has(id));"], { type: "text/javascript" })));
      w.onmessage = e => got(e.data);
      // if the worker dies, every request waiting on it fails (so nothing waits forever) and the next one starts a new worker
      w.onerror = e => { console.error("engine", e.message); port = null; for (const j of jobs.values()) j.no(new Error("The computer stopped working")); jobs.clear(); };
      port = q => w.postMessage(q);
    } catch {
      const Eng = ENGINE(), stopped = new Set();
      port = q => q.type === "stop" ? stopped.add(q.of) : setTimeout(() => Eng.serve(q, m => setTimeout(() => got(m)), id => stopped.has(id)));
    }
    port({ id: 0, type: "load", words: ALL.join("\n") });
  };
  return {
    // q: { type: "moves" | "sim" | "puzzle", ... }; prog gets the progress of a look-ahead. The promise has the job's id
    call(q, prog) { boot(); const id = ++seq, p = new Promise((ok, no) => { jobs.set(id, { ok, no, prog }); port({ ...q, id }); }); p.id = id; return p; },
    stop(id) { if (port) port({ type: "stop", of: id }); }
  };
})();
const FULLBAG = Object.entries(BAG).map(([ch, n]) => ch.repeat(n)).join("") + "??";
// boards as 225 characters ("." empty, a small letter for a blank) and as the cells boardHTML draws
const cellsStr = (cells, news) => cells.map((t, i) => { t = news?.get(i) || t; return t ? (t.b ? t.ch.toLowerCase() : t.ch) : "."; }).join("");
const strCells = s => [...s].map(ch => ch === "." ? null : { ch: ch.toUpperCase(), b: ch !== ch.toUpperCase() });
const tilesNews = tiles => new Map(tiles.map(([i, l, b]) => [i, { ch: AZ[l], b: !!b }]));
// laying a play on a board and taking its tiles off a rack: the engine's own, so the page and the computer agree
const { put: putPlay, rackLeft } = ENGINE();
const rackPts = r => [...r].reduce((s, ch) => s + (VALUES[ch] || 0), 0);
const sortRack = r => [...r].sort((a, b) => (a === "?") - (b === "?") || (a < b ? -1 : 1)).join("");
// a play's name: where (8H across, H8 down), the word (blanks in small letters), a swap or a pass
const mvAt = m => m.tiles?.length ? bAt(m.start, m.dir) : "";
const mvWord = m => m.pass ? "Pass" : m.exch !== undefined ? `Swap ${sortRack(m.exch)}` : m.word;
const signed = v => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(1).replace(/\.0$/, "");
const wait = ms => new Promise(r => setTimeout(r, ms));
// the board tab's switch: Free board · Analyse · Play · Games
const boardSeg = k => `<nav class="studyseg">${[["", "Free board"], ["analyse", "Analyse"], ["play", "Play"], ["games", "Games"]].map(([h, n]) =>
  `<a href="#board${h ? "/" + h : ""}" class="${h === k ? "on" : ""}">${n}</a>`).join("")}</nav>`;

// ---------- placing tiles from a rack (Play and the Lab). S: { board, rack, pend: [{ i, ri, ch, b }], cur, dir, sel, swap }.
// Tap a square then tap tiles or type; or tap a tile then a square. A placed tile goes back with a tap ----------
const pNews = S => new Map(S.pend.map(p => [p.i, { ch: p.ch, b: p.b }]));
const pFree = (S, i) => S.board[i] === "." && !S.pend.some(p => p.i === i);
const pInLine = (S, a, b) => b >= 0 && b < 225 && (S.dir || (a / 15 | 0) === (b / 15 | 0));
const pTiles = S => S.pend.map(p => [p.i, p.ch.charCodeAt(0) - 65, p.b ? 1 : 0]);
function pPlace(S, ri, i, ch) {
  S.pend.push({ i, ri, ch, b: S.rack[ri] === "?" });
  S.sel = -1;
  const step = S.dir ? 15 : 1;
  let n = i + step;
  while (pInLine(S, i, n) && !pFree(S, n)) n += step;
  S.cur = pInLine(S, i, n) ? n : -1;
}
// the next square along from the arrow that's free, or -1
function pNextFree(S) {
  if (S.cur < 0) return -1;
  let i = S.cur; const step = S.dir ? 15 : 1;
  while (pInLine(S, S.cur, i) && !pFree(S, i)) i += step;
  return pInLine(S, S.cur, i) ? i : -1;
}
let blankPick = null;
const blankSheet = () => sheetHTML("blankpick", `<h3>Blank stands for<button type="button" id="bpX">Cancel</button></h3><div class="lgrid">${[...AZ].map(ch => `<button type="button" data-bp="${ch}">${ch}</button>`).join("")}</div>`);
function askBlank(fn) {
  blankPick = fn; sheet("blankpick", true);
}
function pRack(S, hidden) {
  if (hidden) return `<div class="rack wood-${SET.rackLook || "oak"} prack"><div class="tiles" style="--n:7">${[...S.rack].map(() => `<div class="tile back"></div>`).join("")}</div></div>`;
  return `<div class="rack wood-${SET.rackLook || "oak"} prack"><div class="tiles" style="--n:7">${[...S.rack].map((ch, ri) => {
    const used = S.pend.some(p => p.ri === ri);
    return `<button type="button" class="tile${used ? " used" : ""}${S.sel === ri ? " sel" : ""}${S.swap?.has(ri) ? " swap" : ""}${ch === "?" ? " blank" : ""}" data-ri="${ri}" aria-label="${ch === "?" ? "Blank" : ch}">${ch === "?" ? "" : `${ch}<sub>${VALUES[ch]}</sub>`}</button>`;
  }).join("")}</div></div>`;
}
// wire the board, rack and keys. redraw draws the page again; enter is the Play button. locked: no placing just now
function pWire(S, redraw, enter, locked = () => false) {
  const v = $("#view");
  v.querySelector(".bd")?.addEventListener("click", ev => {
    const sq = ev.target.closest(".sq"); if (!sq || locked()) return;
    const i = +sq.dataset.i, k = S.pend.findIndex(p => p.i === i);
    if (k >= 0) { S.pend.splice(k, 1); S.cur = i; }
    else if (S.sel >= 0 && pFree(S, i)) {
      const ri = S.sel;
      if (S.rack[ri] === "?") { askBlank(ch => { pPlace(S, ri, i, ch); redraw(); }); return; }
      pPlace(S, ri, i, S.rack[ri]);
    } else if (i === S.cur) S.dir = 1 - S.dir;
    else S.cur = i;
    redraw();
    if (coarse.matches && S.cur >= 0) bkInput().focus({ preventScroll: true });
  });
  v.querySelectorAll(".prack [data-ri]").forEach(b => b.onclick = () => {
    if (locked()) return;
    const ri = +b.dataset.ri;
    if (S.swap) { S.swap.has(ri) ? S.swap.delete(ri) : S.swap.add(ri); return redraw(); }
    const k = S.pend.findIndex(p => p.ri === ri);
    if (k >= 0) { S.pend.splice(k, 1); return redraw(); }
    const at = pNextFree(S);
    if (at >= 0) {
      if (S.rack[ri] === "?") return askBlank(ch => { pPlace(S, ri, at, ch); redraw(); });
      pPlace(S, ri, at, S.rack[ri]);
    } else S.sel = S.sel === ri ? -1 : ri;
    redraw();
  });
  v.querySelectorAll("[data-bp]").forEach(b => b.onclick = () => { sheet("blankpick", false); const f = blankPick; blankPick = null; f?.(b.dataset.bp); });
  if ($("#bpX")) $("#bpX").onclick = $("#blankpick .scrim").onclick = () => { blankPick = null; sheet("blankpick", false); };
  let blankNext = false;
  boardKeys(k => {
    if (locked()) return false;
    if (k === "Enter") { enter(); return; }
    if (k === "?") { blankNext = true; return; }
    if (k === "Escape") { S.pend = []; S.swap = null; redraw(); return; }
    if (cursorKey(S, k)) { redraw(); return; }
    if (k === "Backspace") { const p = S.pend.pop(); if (p) S.cur = p.i; redraw(); return; }
    if (!/^[a-z]$/i.test(k)) return false;
    const ch = k.toUpperCase(), free = c => [...S.rack].findIndex((x, ri) => x === c && !S.pend.some(p => p.ri === ri));
    let ri = blankNext ? -1 : free(ch);
    if (ri < 0) ri = free("?");
    blankNext = false;
    if (S.cur < 0 && pFree(S, 112)) S.cur = 112;
    const at = pNextFree(S);
    if (ri < 0 || at < 0) return;
    pPlace(S, ri, at, ch);
    redraw();
  });
}
// the pending play's score and working, or why it isn't a play yet
function pPreview(S) {
  if (!S.pend.length) return null;
  const r = scorePlay(strCells(S.board), pNews(S));
  if (!r || r.error) return r;
  r.phony = r.words.filter(w => !DICT.has(w.word)).map(w => w.word);
  return r;
}

// ---------- Analyse: set up any board, give a rack, and see every play ranked; a look ahead weighs the best few
// against the other player's replies ----------
let AZY = null;
const anaGet = () => {
  if (AZY) return AZY;
  const s = store.get("ana", {});
  return AZY = { cells: s.board ? strCells(s.board) : Array(225).fill(null), rack: s.rack || "", cur: -1, dir: 0, blank: false, res: null, sel: -1, sim: null, sort: "eq", more: false, edit: !s.board };
};
const anaSave = () => store.set("ana", { board: cellsStr(AZY.cells), rack: AZY.rack });
function anaOpen(board, rack) {
  if (AZY) anaSimDrop(AZY);
  AZY = null; store.set("ana", { board, rack: rack || "" }); anaGet().edit = false;
  location.hash = "board/analyse";
}
function anaRows(A) {
  if (!A.res) return [];
  let rows = A.res.moves.map((m, i) => ({ m, i, sim: A.sim?.idx.includes(i) ? A.sim.vals[A.sim.idx.indexOf(i)] : null }));
  if (A.sort === "score") rows = [...rows].sort((a, b) => b.m.score - a.m.score);
  if (A.sort === "sim" && A.sim) rows = rows.filter(r => r.sim !== null).sort((a, b) => b.sim - a.sim);
  return rows;
}
function anaListHTML(A) {
  if (!A.rack) return `<h2 class="lbl">Plays</h2><p class="empty">Type your rack above to see every play.</p>`;
  const u = unseenTiles(cellsStr(A.cells), A.rack);
  if (!u.ok) return `<h2 class="lbl">Plays</h2><p class="empty">${u.err}: check the board and rack.</p>`;
  if (!A.res) return `<h2 class="lbl">Plays</h2><p class="empty">Thinking…</p>`;
  if (A.res.error) return `<h2 class="lbl">Plays</h2><p class="empty">${esc(A.res.error)}. Change the rack to try again.</p>`;
  const rows = anaRows(A), show = rows.slice(0, A.more ? 80 : 15), S = A.sim;
  const sel = A.sel >= 0 ? A.res.moves[A.sel] : null, r = sel?.tiles.length ? scorePlay(A.cells, tilesNews(sel.tiles)) : null;
  return `<div class="alhead"><h2 class="lbl">Plays <span class="small">${A.res.total.toLocaleString()} found</span></h2>
    <div class="seg">${[["eq", "Best"], ["score", "Points"], ...(S ? [["sim", "Look-ahead"]] : [])].map(([k, n]) => `<button type="button" class="btn sm ${A.sort === k ? "on" : ""}" data-asort="${k}">${n}</button>`).join("")}</div></div>
  <div class="alist${S ? " withsim" : ""}"><div class="alh"><span></span><span>Play</span><span>Pts</span><span>Leave</span><span title="points plus what the kept tiles are worth">Value</span>${S ? `<span title="value less the other player's best reply, on average">Ahead</span>` : ""}</div>
  ${show.map((x, n) => `<button type="button" class="alr${x.i === A.sel ? " on" : ""}" data-am="${x.i}"><span>${n + 1}</span><span class="aw"><b>${esc(mvWord(x.m))}</b> <i>${mvAt(x.m)}</i></span><span>${x.m.score}</span><span class="lv">${sortRack(x.m.leave) || "–"}</span><span>${x.m.eq.toFixed(1)}</span>${S ? `<span>${x.sim === null ? "" : x.sim.toFixed(1)}</span>` : ""}</button>
    ${x.i === A.sel ? `<div class="alwork">${r && !r.error ? workHTML(r) : sel.exch !== undefined ? `<p class="small">Put back ${sortRack(sel.exch)}, keep ${sortRack(sel.leave) || "nothing"}.</p>` : `<p class="small">Keep the rack and pass.</p>`}
      <div class="row" style="margin-top:8px">${sel.tiles.length ? `<button class="btn sm primary" id="anaPut">Put it on the board</button>` : ""}</div></div>` : ""}`).join("")}</div>
  ${rows.length > 15 ? `<button type="button" class="btn sm" id="anaMore" style="margin-top:8px">${A.more ? "Fewer" : "More plays"}</button>` : ""}
  <div class="simrow">${S?.running ? `<div class="simbar"><i style="width:${(S.it / S.iters * 100).toFixed(1)}%"></i></div><span class="small">${S.it} of ${S.iters} racks</span><button class="btn sm" id="anaStop">Stop</button>`
    : `<button class="btn" id="anaSim" ${A.res.moves.length > 1 ? "" : "disabled"}>${S ? "Look ahead again" : "Look ahead"}</button><span class="small">${S ? `${S.it} racks dealt to the other player` : "Plays out the other player's reply for the top 10"}</span>`}</div>`;
}
const anaUnseenHTML = A => { const u = unseenTiles(cellsStr(A.cells), A.rack);
  return u.ok ? `${u.n} tiles unseen · ${Math.max(0, u.n - 7)} in the bag${u.n <= 7 ? " · the bag is empty, so the end counts" : ""}` : `<span class="bad">${u.err}</span>`; };
// a look-ahead that's no longer wanted is stopped, so the worker doesn't keep going
const anaSimDrop = A => { if (A.sim?.running) ENG.stop(A.sim.job); A.sim = null; };
function viewAnalyse() {
  const A = anaGet(), sel = A.sel >= 0 && A.res ? A.res.moves[A.sel] : null;
  const news = sel?.tiles.length ? tilesNews(sel.tiles) : new Map();
  $("#view").innerHTML = `${boardSeg("analyse")}${bLookBar()}
  <div class="bgrid"><div id="anaBoard">${boardHTML(A.cells, news, A.edit ? A.cur : -1, A.dir, sel?.tiles.length ? sel.dir : false)}</div>
  <div class="bside">
    <div class="card"><h2 class="lbl">Your rack</h2>
      <div class="row"><input id="anaRack" class="arack" value="${A.rack}" maxlength="7" placeholder="AEINRST · ? is a blank" autocapitalize="characters" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="done" aria-label="Your rack">
        <button class="btn" id="anaDeal" title="Seven random tiles from the unseen ones">Random</button></div>
      <p class="small" id="anaUnseen" style="margin:8px 0 0">${anaUnseenHTML(A)}</p></div>
    <div class="card" id="anaPlays">${anaListHTML(A)}</div>
    <div class="card"><h2 class="lbl">The board</h2>
      ${A.edit ? `<p class="small" style="margin:0 0 10px">Tap a square and type to put tiles down, any order, no rules. ? then a letter is a blank. Backspace takes a tile off.</p>` : ""}
      <div class="row"><button class="btn ${A.edit ? "on" : ""}" id="anaEdit" aria-pressed="${A.edit}">${A.edit ? "Done setting up" : "Set up tiles"}</button>${A.edit ? `<button class="btn ${A.blank ? "on" : ""}" id="anaBlank">Blank</button>` : ""}
        <button class="btn" id="anaFree">Copy Free board</button><button class="btn" id="anaClear" ${A.cells.some(Boolean) ? "" : "disabled"}>Clear</button></div></div>
  </div></div>${bLookSheet()}`;
  const redraw = () => { anaSave(); const sy = window.scrollY; viewAnalyse(); window.scrollTo(0, sy); };
  bLookWire(redraw);
  const listDraw = () => { $("#anaPlays").innerHTML = anaListHTML(A); listWire(); };
  const find = () => {
    A.res = null; A.sel = -1; anaSimDrop(A); if (A.sort === "sim") A.sort = "eq";
    if (!A.rack || !unseenOK()) return;
    const key = cellsStr(A.cells) + A.rack;
    ENG.call({ type: "moves", board: cellsStr(A.cells), rack: A.rack, limit: 300 }).then(res => {
      if (key !== cellsStr(A.cells) + A.rack || AZY !== A) return;
      A.res = res; if (location.hash === "#board/analyse") listDraw();
    }).catch(e => { if (AZY !== A) return; A.res = { moves: [], total: 0, error: e.message }; if (location.hash === "#board/analyse") listDraw(); });
  };
  const unseenOK = () => unseenTiles(cellsStr(A.cells), A.rack).ok;
  const listWire = () => {
    const v = $("#anaPlays");
    v.querySelectorAll("[data-am]").forEach(b => b.onclick = () => { A.sel = A.sel === +b.dataset.am ? -1 : +b.dataset.am; redraw(); });
    v.querySelectorAll("[data-asort]").forEach(b => b.onclick = () => { A.sort = b.dataset.asort; listDraw(); });
    if ($("#anaMore")) $("#anaMore").onclick = () => { A.more = !A.more; listDraw(); };
    if ($("#anaPut")) $("#anaPut").onclick = () => {
      const m = A.res.moves[A.sel];
      for (const [i, t] of tilesNews(m.tiles)) A.cells[i] = t;
      A.rack = m.leave; A.sel = -1; A.res = null; redraw();
    };
    if ($("#anaSim")) $("#anaSim").onclick = () => {
      const idx = A.res.moves.slice(0, 10).map((_, i) => i), iters = 300;
      const S = A.sim = { idx, vals: idx.map(i => A.res.moves[i].eq), it: 0, iters, running: true }, res = A.res;
      const job = ENG.call({ type: "sim", board: cellsStr(A.cells), rack: A.rack, cands: idx.map(i => res.moves[i]), iters }, p => {
        if (A.sim !== S) return; S.vals = p.vals; S.it = p.it; if (location.hash === "#board/analyse") listDraw();
      });
      S.job = job.id;
      job.then(p => { if (A.sim !== S) return; S.vals = p.vals; S.it = p.it; S.running = false; A.sort = "sim"; if (location.hash === "#board/analyse") listDraw(); })
        .catch(() => { if (A.sim === S) { S.running = false; if (location.hash === "#board/analyse") listDraw(); } });
      listDraw();
    };
    if ($("#anaStop")) $("#anaStop").onclick = () => ENG.stop(A.sim.job);
  };
  listWire();
  if (!A.res && A.rack) find();
  const rk = $("#anaRack");
  let t = 0;
  rk.addEventListener("input", () => {
    const v = rk.value.toUpperCase().replace(/[^A-Z?]/g, "").slice(0, 7);
    if (rk.value !== v) rk.value = v;
    clearTimeout(t); t = setTimeout(() => {
      if (v === A.rack) return;
      const had = A.sel >= 0;
      A.rack = v; anaSave(); A.res = null; A.sel = -1;
      $("#anaUnseen").innerHTML = anaUnseenHTML(A);
      if (had) $("#anaBoard").innerHTML = boardHTML(A.cells, new Map(), A.edit ? A.cur : -1, A.dir);
      find(); listDraw();
    }, 300);
  });
  rk.addEventListener("keydown", ev => { if (ev.key === "Enter") rk.blur(); });
  $("#anaDeal").onclick = () => { A.rack = shuffle([...unseenTiles(cellsStr(A.cells), "").pool]).slice(0, 7).join(""); A.res = null; redraw(); };
  $("#anaEdit").onclick = () => { A.edit = !A.edit; A.cur = -1; redraw(); };
  if ($("#anaBlank")) $("#anaBlank").onclick = () => { A.blank = !A.blank; redraw(); if (coarse.matches && A.cur >= 0) bkInput().focus({ preventScroll: true }); };
  $("#anaFree").onclick = () => { const L = lookGet(); A.cells = L.cells.map(t => t && { ...t }); A.res = null; anaSimDrop(A); redraw(); };
  confirmBtn($("#anaClear"), () => { A.cells = Array(225).fill(null); A.res = null; anaSimDrop(A); A.edit = true; redraw(); });
  // setting up: letters go straight onto the board where the arrow is
  $("#anaBoard").addEventListener("click", ev => {
    const sq = ev.target.closest(".sq"); if (!sq) return;
    if (!A.edit) { A.edit = true; }
    const i = +sq.dataset.i;
    if (i === A.cur) A.dir = 1 - A.dir; else A.cur = i;
    A.sel = -1; redraw();
    if (coarse.matches) bkInput().focus({ preventScroll: true });
  });
  let blankNext = false;
  boardKeys(k => {
    if (!A.edit) return false;
    const step = A.dir ? 15 : 1, inLine = (a, b) => b >= 0 && b < 225 && (A.dir || (a / 15 | 0) === (b / 15 | 0));
    const changed = () => { A.res = null; anaSimDrop(A); A.sel = -1; redraw(); };
    if (k === "?") { blankNext = true; return; }
    if (cursorKey(A, k)) { redraw(); return; }
    if (A.cur < 0) return false;
    if (k === "Enter") { A.edit = false; A.cur = -1; redraw(); return; }
    if (k === "Backspace" || k === "Delete") {
      if (A.cells[A.cur] || k === "Delete") A.cells[A.cur] = null;
      else { const p = A.cur - step; if (inLine(A.cur, p)) { A.cur = p; A.cells[p] = null; } }
      changed(); return;
    }
    if (!/^[a-z]$/i.test(k)) return false;
    A.cells[A.cur] = { ch: k.toUpperCase(), b: A.blank || blankNext };
    blankNext = false; A.blank = false;
    const n = A.cur + step; if (inLine(A.cur, n)) A.cur = n;
    changed();
  });
}
// the tiles not on the board or the rack; err when the board and rack use more of a letter than the set has
function unseenTiles(board, rack) {
  const n = { ...BAG, "?": 2 };
  for (const ch of board) if (ch !== ".") n[ch === ch.toUpperCase() ? ch : "?"]--;
  for (const ch of rack) n[ch]--;
  const over = Object.entries(n).filter(([, k]) => k < 0).map(([ch]) => ch === "?" ? "blanks" : ch + "s");
  const pool = Object.entries(n).flatMap(([ch, k]) => Array(Math.max(0, k)).fill(ch));
  return over.length ? { ok: false, err: `More ${over.join(", ")} than a set has`, n: pool.length, pool } : { ok: true, n: pool.length, pool };
}

// ---------- games: two seats, a bag, racks and a log. Shared by Play and the Lab's computer-v-computer ----------
const LEVELS = { easy: ["Beginner", "Short words, often not the best"], club: ["Club", "Good plays, sometimes not the best"], expert: ["Expert", "The best play for points and leave"],
  champ: ["Champion", "Looks ahead at your replies before it plays"] };
function gNew(o) {
  const g = { mode: o.mode, level: o.level || "expert", levels: o.levels, rule: o.rule || "reject", names: o.names, bag: shuffle([...FULLBAG]).join(""), racks: ["", ""],
    board: ".".repeat(225), scores: [0, 0], turn: o.first ?? rnd(2), log: [], zeros: 0, over: false, cover: o.mode === "friend", hints: 0 };
  gDraw(g, 0); gDraw(g, 1);
  return g;
}
function gDraw(g, p) { const n = Math.min(7 - g.racks[p].length, g.bag.length); g.racks[p] += g.bag.slice(0, n); g.bag = g.bag.slice(n); }
const gBefore = (g, p) => ({ board: g.board, rack: g.racks[p], bag: g.bag });
function gNext(g, p) { if (g.zeros >= 6) gEnd(g, -1); else { g.turn = 1 - p; if (g.mode === "friend") g.cover = true; } }
function gPlay(g, p, m) {
  const before = gBefore(g, p);
  g.board = putPlay(g.board, m); g.racks[p] = rackLeft(g.racks[p], m.tiles); g.scores[p] += m.score; gDraw(g, p);
  g.log.push({ p, k: "play", w: m.word, at: m.at, s: m.score, t: m.tiles, before, tot: g.scores[p], phony: m.phony || "" });
  g.zeros = 0;
  // going out ends the game, though in a friends' game with challenges the other player gets to challenge first
  if (!g.racks[p] && !g.bag) { if (g.mode === "friend" && g.rule === "chal") { g.outWait = true; g.turn = 1 - p; g.cover = true; } else gEnd(g, p); }
  else gNext(g, p);
}
function gSwap(g, p, out) {
  const before = gBefore(g, p), a = [...g.racks[p]];
  for (const ch of out) a.splice(a.indexOf(ch), 1);
  g.racks[p] = a.join(""); gDraw(g, p);
  g.bag = shuffle([...g.bag + out]).join("");
  g.log.push({ p, k: "swap", x: out, before, tot: g.scores[p] }); g.zeros++;
  gNext(g, p);
}
function gPass(g, p) { g.log.push({ p, k: "pass", before: gBefore(g, p), tot: g.scores[p] }); g.zeros++; gNext(g, p); }
// a challenge by player c of the last play: a phony comes off (a turn lost); a good play costs the challenger 5
function gChallenge(g, c) {
  const e = g.log.at(-1);
  if (!e || e.k !== "play" || e.p === c) return;
  if (e.phony) {
    g.board = e.before.board; g.racks[e.p] = e.before.rack; g.bag = e.before.bag; g.scores[e.p] -= e.s;
    e.k = "off"; e.tot = g.scores[e.p]; g.zeros++; g.outWait = false;
    if (g.zeros >= 6) gEnd(g, -1);
  } else {
    g.scores[c] -= 5; e.held = true;
    g.log.push({ p: c, k: "chal", w: e.w, s: -5, tot: g.scores[c] });
    if (g.outWait) { g.outWait = false; gEnd(g, e.p); }
  }
}
// the end: going out earns twice the other rack; after six scoreless turns each player loses what's on their rack
function gEnd(g, out) {
  if (out >= 0) { const v = 2 * rackPts(g.racks[1 - out]); g.scores[out] += v; g.log.push({ p: out, k: "out", s: v, x: g.racks[1 - out], tot: g.scores[out] }); }
  else for (const p of [0, 1]) { const v = rackPts(g.racks[p]); g.scores[p] -= v; g.log.push({ p, k: "left", s: -v, x: g.racks[p], tot: g.scores[p] }); }
  g.over = true; g.cover = false; g.outWait = false;
}
// what the engine's play means for a game
function gDo(g, p, m) {
  if (m.pass) gPass(g, p);
  else if (m.exch !== undefined) gSwap(g, p, m.exch);
  else gPlay(g, p, { tiles: m.tiles, word: m.word, at: mvAt(m), score: m.score });
}
// the computer's choice at each level
async function cpuPick(g, p, level) {
  const rack = g.racks[p], res = await ENG.call({ type: "moves", board: g.board, rack, bag: g.bag.length, limit: level === "easy" ? 0 : 40 });
  const ms = res.moves;
  if (level === "easy") {
    const plays = ms.filter(m => m.n && m.n <= 4);
    if (plays.length) return plays[Math.floor(plays.length * (.2 + Math.random() * .5))];
  }
  if (level === "club") { const top = ms.slice(0, 8); return top[Math.floor(Math.random() ** 2 * top.length)]; }
  if (level === "champ" && g.bag.length && ms.length > 1) {
    const cands = ms.slice(0, 6), r = await ENG.call({ type: "sim", board: g.board, rack, bag: g.bag.length, cands, iters: 40 });
    let b = 0; r.vals.forEach((v, i) => { if (v > r.vals[b]) b = i; });
    return cands[b];
  }
  return ms[0];
}
function logLine(g, e) {
  const nm = g.names[e.p], hide = g.mode === "friend" && e.k === "swap";
  return e.k === "play" ? `${nm} played ${e.w} at ${e.at} for ${e.s}${e.held ? " (challenged, it's good)" : ""}`
    : e.k === "swap" ? `${nm} swapped ${hide ? e.x.length + " tiles" : sortRack(e.x)}` : e.k === "pass" ? `${nm} passed`
    : e.k === "off" ? `${nm}'s ${e.w} was challenged off` : e.k === "chal" ? `${nm} challenged ${e.w}: it's good, so −5`
    : e.k === "out" ? `${nm} went out: +${e.s}, twice ${sortRack(e.x)}` : `${nm} is left with ${sortRack(e.x) || "nothing"}: ${e.s}`;
}
const logHTML = (g, hl) => g.log.length ? `<div class="glog">${g.log.map((e, n) => `<div class="p${e.p}${e.k === "off" ? " off" : ""}${hl === n ? " on" : ""}">
  <span>${esc(g.names[e.p][0])}</span><span>${e.at || ""}</span><span>${e.k === "play" || e.k === "off" ? esc(e.w) : e.k === "swap" ? (g.mode === "friend" ? "Swap" : "Swap " + sortRack(e.x)) : e.k === "pass" ? "Pass" : e.k === "chal" ? "Challenge" : e.k === "out" ? "Out " + sortRack(e.x) : "Left " + (sortRack(e.x) || "–")}</span>
  <b>${e.k === "play" ? e.s : e.k === "off" ? "0" : e.k === "swap" || e.k === "pass" ? "0" : (e.s > 0 ? "+" : "") + e.s}</b><span class="small">${e.tot}</span></div>`).join("")}</div>` : `<p class="empty">No plays yet.</p>`;
const scoreHTML = (g, active) => `<div class="gscore">${[0, 1].map(p => `<div class="${active === p ? "on" : ""} p${p}"><span>${esc(g.names[p])}</span><b>${g.scores[p]}</b></div>`).join(`<div class="gbag"><b>${g.bag.length}</b>in bag</div>`)}</div>`;
// the tiles a player can't see, by letter
function unseenHTML(board, rack) {
  const u = unseenTiles(board, rack);
  if (!u.n) return `<p class="empty">None: every tile is on the board or your rack.</p>`;
  const c = counts(u.pool.join("")), vw = u.pool.filter(ch => "AEIOU".includes(ch)).length;
  return `<div class="unseen">${[...AZ, "?"].filter(ch => c[ch]).map(ch => `<span>${ch === "?" ? "?" : ch}<i>${c[ch]}</i></span>`).join("")}</div>
    <p class="small" style="margin:8px 0 0">${u.n} tiles · ${vw} vowels, ${u.n - vw - (c["?"] || 0)} consonants${c["?"] ? `, ${c["?"]} blank${c["?"] > 1 ? "s" : ""}` : ""}</p>`;
}

// ---------- Play: a game against the computer, or two people passing one phone or computer ----------
let GAME = store.get("game", null);
const GUI = { board: "", rack: "", pend: [], cur: -1, dir: 0, sel: -1, swap: null, key: "", err: "", think: false, review: null, hl: -1 };
const gSave = () => store.set("game", GAME);
// the seat whose rack is on show: yours against the computer, the player to move between friends
const gMe = () => GAME.mode === "cpu" ? 0 : GAME.over ? (GAME.log.at(-1)?.p ?? 0) : GAME.turn;
function viewPlay() {
  if (!GAME) return playSetup();
  const me = gMe(), key = GAME.log.length + ":" + GAME.turn + ":" + GAME.racks[me];
  if (GUI.key !== key) Object.assign(GUI, { pend: [], cur: -1, sel: -1, swap: null, key, err: "" });
  GUI.board = GAME.board; GUI.rack = GAME.racks[me];
  const myTurn = !GAME.over && GAME.turn === me && !GUI.think, cover = GAME.mode === "friend" && GAME.cover && !GAME.over;
  const r = pPreview(GUI), last = [...GAME.log].reverse().find(e => e.k === "play");
  const lastSet = new Set(last && !GUI.pend.length ? last.t.map(t => t[0]) : []);
  const lastE = GAME.log.at(-1), err = GUI.err;
  GUI.err = "";
  let status;
  if (GAME.over) {
    const [a, b] = GAME.scores, w = a === b ? -1 : a > b ? 0 : 1;
    status = `<p class="bq">${w < 0 ? "A draw" : GAME.mode === "cpu" ? (w === 0 ? "You won" : "The computer won") : esc(GAME.names[w]) + " won"}, ${Math.max(a, b)}–${Math.min(a, b)}</p>
      ${GAME.resigned !== undefined ? `<p class="small">${esc(GAME.names[GAME.resigned])} resigned.</p>` : ""}
      <div class="row" style="margin-top:12px"><button class="btn primary" id="gToGames">${GAME.savedAs && gameById(GAME.savedAs) ? "Open its review" : "Full review"}</button><button class="btn" id="gReview">${GUI.review ? "Quick check again" : "Quick check"}</button><button class="btn" id="gNew2">New game</button></div>`;
  } else if (cover) {
    const canChal = GAME.rule === "chal" && lastE?.k === "play" && lastE.p !== GAME.turn && !lastE.held;
    status = `<p class="bq">${esc(GAME.names[GAME.turn])}'s turn</p>${lastE ? `<p class="small" style="margin:4px 0 0">${esc(logLine(GAME, lastE))}</p>` : ""}
      <div class="row" style="margin-top:12px">${canChal ? `<button class="btn" id="gChal">Challenge ${esc(lastE.w)}</button>` : ""}<button class="btn primary" id="gShow">${GAME.outWait ? "Accept, and end the game" : `Show ${esc(GAME.names[GAME.turn])}'s rack`}</button></div>`;
  } else if (GUI.cpuFail && GAME.turn === 1) status = `<p class="bq">The computer couldn't move</p><p class="small bad">${esc(GUI.cpuFail)}</p><div class="row" style="margin-top:12px"><button class="btn primary" id="gRetry">Try again</button></div>`;
  else if (GUI.think) status = `<p class="bq thinking">The computer is thinking…</p>${lastE ? `<p class="small">${esc(logLine(GAME, lastE))}</p>` : ""}`;
  else {
    status = `<p class="bq">${GAME.mode === "cpu" ? "Your turn" : esc(GAME.names[GAME.turn]) + "'s turn"}</p>`;
    if (err) status += `<p class="bres wrong">${esc(err)}</p>`;
    else if (r?.error) status += `<p class="small" style="margin-top:6px">${r.error}</p>`;
    else if (r) status += `<div style="margin-top:8px">${workHTML(r, true)}</div>${r.phony.length ? `<p class="small bad" style="margin:6px 0 0">${r.phony.join(", ")} ${r.phony.length > 1 ? "aren't words" : "isn't a word"}${GAME.rule === "chal" ? ", but you can still try it" : ""}</p>` : ""}`;
    else if (GUI.swap) status += `<p class="small" style="margin-top:6px">Tap the tiles to put back, then Swap.</p>`;
    else if (lastE) status += `<p class="small" style="margin-top:6px">${esc(logLine(GAME, lastE))}</p>`;
    else status += `<p class="small" style="margin-top:6px">Tap a square, then tap tiles or type. The first play goes through the star.</p>`;
  }
  const playable = r && !r.error && (GAME.rule === "chal" || !r.phony.length);
  $("#view").innerHTML = `${boardSeg("play")}${bLookBar()}
  <div class="bgrid"><div class="gmain">
    ${scoreHTML(GAME, GAME.over ? -1 : GAME.turn)}
    <div id="gBoard">${boardHTML(strCells(GAME.board), pNews(GUI), myTurn && !cover ? GUI.cur : -1, GUI.dir, false, { last: lastSet, pend: true })}</div>
    ${pRack(GUI, cover)}
    ${GAME.over || cover ? "" : `<div class="gbtns">${GUI.swap
      ? `<button class="btn primary" id="gSwapGo" ${GUI.swap.size ? "" : "disabled"}>Swap ${GUI.swap.size || ""}</button><button class="btn" id="gSwapX">Cancel</button>`
      : `<button class="btn primary" id="gPlay" ${myTurn && playable ? "" : "disabled"}>Play${r && !r.error ? " " + r.total : ""}</button>
        <button class="btn" id="gRecall" ${myTurn ? "" : "disabled"}>${GUI.pend.length ? "Recall" : "Shuffle"}</button>
        <button class="btn" id="gSwap" ${myTurn && GAME.bag.length >= 7 ? "" : "disabled"} title="${GAME.bag.length >= 7 ? "Put tiles back and draw new ones" : "Swapping needs 7 tiles in the bag"}">Swap</button>
        <button class="btn" id="gPass" ${myTurn ? "" : "disabled"}>Pass</button>
        <button class="btn" id="gHint" ${myTurn ? "" : "disabled"} title="Puts the computer's best play on the board">Hint</button>`}</div>`}
  </div>
  <div class="bside">
    <div class="card">${status}</div>
    ${GUI.review ? `<div class="card" id="gRev">${reviewHTML()}</div>` : ""}
    <div class="card"><h2 class="lbl">Plays</h2>${logHTML(GAME, GUI.hl)}</div>
    ${cover ? "" : `<div class="card"><h2 class="lbl">Tiles you can't see</h2>${unseenHTML(GAME.board, GAME.racks[me])}</div>`}
    <div class="card"><div class="row"><span class="small" style="margin-right:auto">${GAME.mode === "cpu" ? `Computer: ${LEVELS[GAME.level][0]}` : "Two players"} · ${GAME.rule === "chal" ? "challenges" : "phonies refused"}${GAME.hints ? ` · ${GAME.hints} hint${GAME.hints > 1 ? "s" : ""}` : ""}</span>
      ${cover ? "" : `<button class="btn sm" id="gAna">Analyse this position</button>`}${GAME.over ? "" : `<button class="btn sm" id="gResign">Resign</button>`}<button class="btn sm" id="gNew">New game</button></div></div>
  </div></div>${bLookSheet()}${blankSheet()}`;
  const redraw = () => { gSave(); const sy = window.scrollY; viewPlay(); window.scrollTo(0, sy); };
  bLookWire(redraw);
  pWire(GUI, redraw, () => $("#gPlay")?.click(), () => !myTurn || cover);
  const on = (id, f) => { const b = $("#" + id); if (b) b.onclick = f; };
  on("gPlay", () => {
    const r = pPreview(GUI); if (!r || r.error) return;
    const p = GAME.turn, m = { tiles: pTiles(GUI), word: r.words[0].parts.map(x => x.b ? x.ch.toLowerCase() : x.ch).join(""), at: bAt(r.words[0].start, r.words[0].dir), score: r.total, phony: r.phony.join(" ") };
    if (r.phony.length && GAME.rule !== "chal") { GUI.err = `${r.phony.join(", ")} isn't in CSW24`; return redraw(); }
    if (r.phony.length && GAME.mode === "cpu") {
      // the computer always challenges a phony: it comes off and the turn is lost
      GAME.log.push({ p, k: "off", w: m.word, at: m.at, s: m.score, t: m.tiles, before: gBefore(GAME, p), tot: GAME.scores[p] }); GAME.zeros++; gNext(GAME, p);
    } else gPlay(GAME, p, m);
    redraw(); cpuGo();
  });
  on("gRecall", () => { if (GUI.pend.length) GUI.pend = []; else { GAME.racks[me] = shuffle([...GAME.racks[me]]).join(""); GUI.key = ""; } redraw(); });
  on("gSwap", () => { GUI.pend = []; GUI.swap = new Set(); redraw(); });
  on("gSwapX", () => { GUI.swap = null; redraw(); });
  on("gSwapGo", () => { const out = [...GUI.swap].map(ri => GUI.rack[ri]).join(""); GUI.swap = null; gSwap(GAME, GAME.turn, out); redraw(); cpuGo(); });
  confirmBtn($("#gPass"), () => { gPass(GAME, GAME.turn); redraw(); cpuGo(); });
  on("gHint", async () => {
    let res;
    try { res = await ENG.call({ type: "moves", board: GAME.board, rack: GAME.racks[me], bag: GAME.bag.length, limit: 1 }); } catch (e) { GUI.err = e.message; return redraw(); }
    const m = res.moves[0];
    GAME.hints++; GUI.pend = []; GUI.swap = null;
    if (m.tiles.length) {
      const used = new Set();
      for (const [i, l, b] of m.tiles) { const ch = b ? "?" : AZ[l], ri = [...GUI.rack].findIndex((x, k) => x === ch && !used.has(k)); used.add(ri); GUI.pend.push({ i, ri, ch: AZ[l], b: !!b }); }
      GUI.err = "";
    } else GUI.err = m.pass ? "The computer would pass here." : `The computer would swap ${sortRack(m.exch)}.`;
    redraw();
  });
  on("gShow", () => { if (GAME.outWait) { const e = [...GAME.log].reverse().find(e => e.k === "play"); gEnd(GAME, e.p); } GAME.cover = false; redraw(); });
  on("gChal", () => { gChallenge(GAME, GAME.turn); redraw(); });
  on("gAna", () => anaOpen(GAME.board, GAME.over ? "" : GAME.racks[me]));
  confirmBtn($("#gResign"), () => { GAME.resigned = GAME.mode === "cpu" ? 0 : GAME.turn; GAME.over = true; GAME.cover = false; redraw(); });
  const fresh = () => { GAME = null; GUI.review = null; GUI.hl = -1; store.set("game", null); redraw(); };
  GAME.over ? on("gNew", fresh) : confirmBtn($("#gNew"), fresh);
  on("gNew2", fresh);
  on("gReview", () => runReview());
  on("gToGames", () => { const gm = GAME.savedAs && gameById(GAME.savedAs) || gameFromPlay(GAME); location.hash = "board/rv-" + gm.id; });
  on("gRetry", () => { GUI.cpuFail = ""; cpuGo(); });
  wireReview();
  cpuGo();
}
// the computer moves when it's its turn (and the page is on Play)
async function cpuGo() {
  if (!GAME || GAME.mode !== "cpu" || GAME.over || GAME.turn !== 1 || GUI.think || GUI.cpuFail) return;
  const g = GAME, t0 = Date.now();
  GUI.think = true; if (location.hash === "#board/play") viewPlay();
  try {
    const m = await cpuPick(g, 1, g.level);
    await wait(Math.max(0, 700 - (Date.now() - t0)));
    if (GAME !== g) return;
    gDo(g, 1, m);
  } catch (e) { GUI.cpuFail = e.message || "Something went wrong"; }
  finally { GUI.think = false; }
  gSave();
  if (location.hash === "#board/play") { const sy = window.scrollY; viewPlay(); window.scrollTo(0, sy); }
}
function playSetup() {
  const o = { mode: "cpu", level: "expert", rule: "reject", first: "me", n1: "", n2: "", ...store.get("gameOpts", {}) };
  const seg = (k, opts) => `<div class="seg">${opts.map(([v, t]) => `<button type="button" class="btn ${o[k] === v ? "on" : ""}" data-gk="${k}" data-gv="${v}">${t}</button>`).join("")}</div>`;
  $("#view").innerHTML = `${boardSeg("play")}<div class="card gsetup"><h3 class="title" style="margin-top:0">New game</h3>
    <div class="fs"><h2 class="lbl">Play against</h2>${seg("mode", [["cpu", "The computer"], ["friend", "A friend, on this screen"]])}</div>
    ${o.mode === "cpu" ? `<div class="fs"><h2 class="lbl">How strong</h2>${seg("level", Object.entries(LEVELS).map(([k, [n]]) => [k, n]))}<p class="small" style="margin:6px 0 0">${LEVELS[o.level][1]}.</p></div>
      <div class="fs"><h2 class="lbl">Who starts</h2>${seg("first", [["me", "Me"], ["cpu", "The computer"], ["rand", "Draw for it"]])}</div>`
    : `<div class="fs"><h2 class="lbl">Names</h2><div class="row"><input class="arack gname" id="gN1" value="${esc(o.n1)}" placeholder="Player 1" maxlength="14"><input class="arack gname" id="gN2" value="${esc(o.n2)}" placeholder="Player 2" maxlength="14"></div></div>
      <div class="fs"><h2 class="lbl">Who starts</h2>${seg("first", [["me", "Player 1"], ["cpu", "Player 2"], ["rand", "Draw for it"]])}</div>`}
    <div class="fs"><h2 class="lbl">Words not in CSW24</h2>${seg("rule", [["reject", "Refused"], ["chal", "Allowed, can be challenged"]])}
      <p class="small" style="margin:6px 0 0">${o.rule === "chal" ? (o.mode === "cpu" ? "The computer challenges every phony: it comes off and you lose the turn." : "The next player can challenge. A phony comes off; a good word costs the challenger 5.") : "A play with a word that isn't in the list can't be made."}</p></div>
    <button class="btn primary block" id="gStart">Start</button></div>`;
  const keep = () => { if ($("#gN1")) { o.n1 = $("#gN1").value.trim(); o.n2 = $("#gN2").value.trim(); } store.set("gameOpts", o); };
  $("#view").querySelectorAll("[data-gk]").forEach(b => b.onclick = ev => { ev.stopPropagation(); keep(); o[b.dataset.gk] = b.dataset.gv; store.set("gameOpts", o); playSetup(); });
  $("#gStart").onclick = () => {
    keep();
    GAME = gNew({ mode: o.mode, level: o.level, rule: o.rule, first: o.first === "me" ? 0 : o.first === "cpu" ? 1 : rnd(2),
      names: o.mode === "cpu" ? ["You", "Computer"] : [o.n1 || "Player 1", o.n2 || "Player 2"] });
    GUI.review = null; GUI.hl = -1; gSave(); viewPlay();
  };
}
// after the game: each of your plays against the computer's best from the same rack
async function runReview() {
  const g = GAME, seats = g.mode === "cpu" ? [0] : [0, 1];
  const turns = g.log.map((e, n) => ({ e, n })).filter(({ e }) => seats.includes(e.p) && e.before && ["play", "swap", "pass", "off"].includes(e.k));
  GUI.review = { rows: [], done: 0, of: turns.length };
  viewPlay();
  for (const { e, n } of turns) {
    const find = e.k === "play" ? { tiles: e.t } : e.k === "swap" ? { exch: e.x } : { pass: true };
    let res;
    try { res = await ENG.call({ type: "moves", board: e.before.board, rack: e.before.rack, bag: e.before.bag.length, limit: 1, find }); } catch { GUI.review.of = GUI.review.done; break; }
    if (GAME !== g) return;
    const best = res.moves[0], mine = e.k === "off" ? null : res.found?.move;
    GUI.review.rows.push({ n, p: e.p, e, best, lost: mine ? best.eq - mine.eq : null, rank: res.found?.rank, total: res.total });
    GUI.review.done++;
    if (location.hash === "#board/play" && $("#gRev")) { $("#gRev").innerHTML = reviewHTML(); wireReview(); }
  }
}
function reviewHTML() {
  const R = GUI.review, g = GAME;
  const lost = R.rows.filter(r => r.lost !== null), sum = lost.reduce((s, r) => s + Math.max(0, r.lost), 0), tops = lost.filter(r => r.rank === 1).length;
  return `<h2 class="lbl">Review ${R.done < R.of ? `<span class="small">${R.done} of ${R.of}…</span>` : ""}</h2>
    ${R.done ? `<p class="small" style="margin:0 0 8px">${tops} of ${R.rows.length} were the computer's top play · about ${sum.toFixed(0)} points of value left on the table</p>` : ""}
    <div class="grev">${R.rows.map(r => `<button type="button" data-rv="${r.n}" class="${r.rank === 1 ? "top" : r.lost > 10 || r.lost === null ? "big" : ""}">
      <span>${esc(g.names[r.p][0])}${r.n + 1}</span><span><b>${esc(r.e.k === "play" || r.e.k === "off" ? r.e.w : r.e.k === "swap" ? "Swap " + sortRack(r.e.x) : "Pass")}</b>${r.e.k === "off" ? " (phony)" : ""}<br><i>best: ${esc(mvWord(r.best))} ${mvAt(r.best)} ${r.best.tiles.length ? r.best.score : ""}</i></span>
      <span>${r.rank === 1 ? "✓" : r.lost === null ? "–" : signed(-r.lost)}</span></button>`).join("")}</div>
    <p class="small" style="margin:8px 0 0">Tap a turn to open it in Analyse.</p>`;
}
function wireReview() {
  $("#view").querySelectorAll("[data-rv]").forEach(b => b.onclick = () => { const e = GAME.log[+b.dataset.rv]; anaOpen(e.before.board, e.before.rack); });
}

// ---------- Lab: extras that aren't on the tab bar (#lab). Top play and Bingo hunt puzzles, the computer playing
// itself, and a tile tracker for games on a real board ----------
const LABS = [["top", "Top play"], ["bingo", "Bingo hunt"], ["cvc", "Watch"], ["track", "Tile tracker"]];
const labSeg = k => `<nav class="studyseg labseg">${LABS.map(([h, n]) => `<a href="#lab/${h}" class="${h === k ? "on" : ""}">${n}</a>`).join("")}</nav>`;
VIEWS.lab = arg => {
  const k = LABS.some(([h]) => h === arg) ? arg : store.get("labLast", "top");
  store.set("labLast", k);
  ({ top: labPuzzle, bingo: labPuzzle, cvc: labCvc, track: labTrack })[k](k);
};
let PZ = null;
const pzStats = () => ({ top: { n: 0, best: 0, pts: 0, max: 0 }, bingo: { n: 0, found: 0 }, ...store.get("labStats", {}) });
function labPuzzle(mode) {
  if (!PZ || PZ.mode !== mode) {
    PZ = { mode, loading: true };
    ENG.call({ type: "puzzle", turns: 2 + rnd(mode === "bingo" ? 6 : 10), bingo: mode === "bingo" }).then(res => {
      if (PZ?.mode !== mode || !PZ.loading) return;
      const z = res.puzzle;
      if (!z) { PZ = null; if (location.hash.startsWith("#lab")) labPuzzle(mode); return; }
      PZ = { mode, ...z, S: { board: z.board, rack: z.rack, pend: [], cur: -1, dir: 0, sel: -1, swap: null }, done: null, show: -1 };
      if (location.hash.startsWith("#lab")) labPuzzle(mode);
    }).catch(e => { if (PZ?.mode === mode && PZ.loading) { PZ = null; $("#view").innerHTML = `${labSeg(mode)}<div class="card"><p class="empty">${esc(e.message)}. Open the page again to retry.</p></div>`; } });
  }
  const st = pzStats(), Z = PZ;
  const intro = mode === "top" ? "Find the highest-scoring play on this board." : "There's a bingo (all seven tiles) somewhere. Find one.";
  if (Z.loading) { $("#view").innerHTML = `${labSeg(mode)}<div class="card"><p class="empty">Setting up a board…</p></div>`; return; }
  const r = pPreview(Z.S), D = Z.done, shown = D && Z.show >= 0 ? (mode === "top" ? Z.top : Z.bingos)[Z.show] : null;
  const list = mode === "top" ? Z.top.slice(0, 10) : Z.bingos.slice(0, 20);
  $("#view").innerHTML = `${labSeg(mode)}${bLookBar()}
  <div class="bgrid"><div class="gmain">
    <div id="gBoard">${boardHTML(strCells(Z.board), shown ? tilesNews(shown.tiles) : pNews(Z.S), D ? -1 : Z.S.cur, Z.S.dir, shown ? shown.dir : false, { pend: !shown })}</div>
    ${pRack(Z.S)}
    <div class="gbtns">${D ? `<button class="btn primary" id="pzNext">Next board</button>` : `<button class="btn primary" id="pzGo" ${r && !r.error ? "" : "disabled"}>Check${r && !r.error ? " " + r.total : ""}</button>
      <button class="btn" id="pzRecall">${Z.S.pend.length ? "Recall" : "Shuffle"}</button><button class="btn" id="pzGive">Show me</button>`}</div>
  </div>
  <div class="bside">
    <div class="card"><p class="bq">${mode === "top" ? "Top play" : "Bingo hunt"}</p><p class="small" style="margin:4px 0 0">${intro}</p>
      ${D ? `<p class="bres ${D.good ? "right" : "wrong"}">${esc(D.text)}</p>` : r?.error ? `<p class="small" style="margin-top:8px">${r.error}</p>` : r ? `<div style="margin-top:8px">${workHTML(r, true)}</div>` : ""}</div>
    ${D ? `<div class="card"><h2 class="lbl">${mode === "top" ? "Top plays" : `Bingos <span class="small">${Z.bingos.length}${Z.bingos.length >= 60 ? "+" : ""}</span>`}</h2><div class="alist">${list.map((m, i) =>
      `<button type="button" class="alr${Z.show === i ? " on" : ""}" data-pz="${i}"><span>${i + 1}</span><span class="aw"><b>${esc(m.word)}</b> <i>${mvAt(m)}</i></span><span>${m.score}</span></button>`).join("")}</div>
      <p class="small" style="margin:8px 0 0">Tap one to see it on the board.</p></div>` : ""}
    <div class="card btally">${mode === "top" ? `<div><b>${st.top.best}/${st.top.n}</b>top play</div><div><b>${st.top.max ? Math.round(st.top.pts / st.top.max * 100) + "%" : "–"}</b>of the top scores</div>`
      : `<div><b>${st.bingo.found}/${st.bingo.n}</b>found</div>`}<button class="btn sm" id="pzReset" style="margin-left:auto;align-self:center">Reset</button></div>
    <div class="card"><div class="row"><span class="small" style="margin-right:auto">The Lab is hidden: open it at #lab.</span><button class="btn sm" id="pzAna">Analyse this board</button></div></div>
  </div></div>${bLookSheet()}${blankSheet()}`;
  const redraw = () => { const sy = window.scrollY; labPuzzle(mode); window.scrollTo(0, sy); };
  bLookWire(redraw);
  pWire(Z.S, redraw, () => $("#pzGo")?.click(), () => !!D);
  const on = (id, f) => { const b = $("#" + id); if (b) b.onclick = f; };
  const finish = (good, text, mine) => {
    const s = pzStats();
    if (mode === "top") { s.top.n++; if (good) s.top.best++; s.top.pts += mine || 0; s.top.max += Z.top[0].score; } else { s.bingo.n++; if (good) s.bingo.found++; }
    store.set("labStats", s); Z.done = { good, text }; Z.show = good ? -1 : 0; redraw();
  };
  on("pzGo", () => {
    const r = pPreview(Z.S); if (!r || r.error) return;
    if (r.phony.length) return finish(false, `${r.phony.join(", ")} isn't a word. The top play is ${Z.top[0].word} for ${Z.top[0].score}.`, 0);
    if (mode === "top") {
      const better = new Set(Z.scores.filter(s => s > r.total)).size, best = Z.top[0];
      finish(r.total >= best.score, r.total >= best.score ? `Yes! ${r.total} is the top score.` : `${r.total} is the #${better + 1} score. The top play is ${best.word} at ${mvAt(best)} for ${best.score}.`, r.total);
    } else finish(Z.S.pend.length === 7, Z.S.pend.length === 7 ? `Yes! ${r.words[0].word} for ${r.total}.` : `That's not a bingo. ${Z.bingos[0].word} at ${mvAt(Z.bingos[0])} is one.`);
  });
  on("pzGive", () => finish(false, mode === "top" ? `The top play is ${Z.top[0].word} at ${mvAt(Z.top[0])} for ${Z.top[0].score}.` : `${Z.bingos[0].word} at ${mvAt(Z.bingos[0])} is one.`, 0));
  on("pzRecall", () => { if (Z.S.pend.length) Z.S.pend = []; else Z.S.rack = shuffle([...Z.S.rack]).join(""); redraw(); });
  on("pzNext", () => { PZ = null; redraw(); });
  on("pzAna", () => anaOpen(Z.board, Z.rack));
  $("#view").querySelectorAll("[data-pz]").forEach(b => b.onclick = () => { Z.show = Z.show === +b.dataset.pz ? -1 : +b.dataset.pz; redraw(); });
  confirmBtn($("#pzReset"), () => { const s = pzStats(); s[mode] = mode === "top" ? { n: 0, best: 0, pts: 0, max: 0 } : { n: 0, found: 0 }; store.set("labStats", s); redraw(); });
}
// two computers playing; pick their levels and the speed
let CV = null;
function labCvc() {
  CV ||= { levels: store.get("cvcLevels", ["expert", "club"]), speed: 900, g: null, run: false };
  const g = CV.g, last = g && [...g.log].reverse().find(e => e.k === "play");
  const pick = p => `<div class="seg">${Object.entries(LEVELS).map(([k, [n]]) => `<button type="button" class="btn sm ${CV.levels[p] === k ? "on" : ""}" data-cl="${p}" data-cv="${k}">${n}</button>`).join("")}</div>`;
  $("#view").innerHTML = `${labSeg("cvc")}${bLookBar()}
  <div class="bgrid"><div class="gmain">
    ${g ? scoreHTML(g, g.over ? -1 : g.turn) : ""}
    <div id="gBoard">${boardHTML(strCells(g ? g.board : ".".repeat(225)), new Map(), -1, 0, false, { last: new Set(last ? last.t.map(t => t[0]) : []) })}</div>
  </div>
  <div class="bside">
    <div class="card"><h2 class="lbl">Left</h2>${pick(0)}<h2 class="lbl" style="margin-top:12px">Right</h2>${pick(1)}
      <h2 class="lbl" style="margin-top:12px">Speed</h2><div class="seg">${[[1800, "Slow"], [900, "Steady"], [250, "Fast"], [0, "Flat out"]].map(([v, n]) => `<button type="button" class="btn sm ${CV.speed === v ? "on" : ""}" data-cs="${v}">${n}</button>`).join("")}</div>
      <div class="row" style="margin-top:14px"><button class="btn primary" id="cvGo">${CV.run ? "Pause" : g && !g.over ? "Carry on" : "Start a game"}</button>${g ? `<button class="btn" id="cvNew">New game</button><button class="btn" id="cvAna">Analyse this position</button>` : ""}</div>
      ${g?.over ? `<p class="bres">${g.scores[0] === g.scores[1] ? "A draw" : esc(g.names[g.scores[0] > g.scores[1] ? 0 : 1]) + " won"}, ${Math.max(...g.scores)}–${Math.min(...g.scores)}</p>` : ""}</div>
    ${g ? `<div class="card"><h2 class="lbl">Racks</h2><div class="cvracks">${[0, 1].map(p => `<div><span class="small">${esc(g.names[p])}</span><div class="tiles mini">${[...g.racks[p]].map(ch => `<div class="tile">${ch === "?" ? "" : `${ch}<sub>${VALUES[ch]}</sub>`}</div>`).join("") || `<span class="small">empty</span>`}</div></div>`).join("")}</div></div>
      <div class="card"><h2 class="lbl">Plays</h2>${logHTML(g)}</div>` : ""}
  </div></div>${bLookSheet()}`;
  const redraw = () => { const sy = window.scrollY; labCvc(); window.scrollTo(0, sy); };
  bLookWire(redraw);
  $("#view").querySelectorAll("[data-cl]").forEach(b => b.onclick = () => { CV.levels[+b.dataset.cl] = b.dataset.cv; store.set("cvcLevels", CV.levels); if (CV.g && !CV.run) CV.g.names = cvNames(); redraw(); });
  $("#view").querySelectorAll("[data-cs]").forEach(b => b.onclick = () => { CV.speed = +b.dataset.cs; redraw(); });
  $("#cvGo").onclick = () => { if (CV.run) { CV.run = false; return redraw(); } if (!CV.g || CV.g.over) CV.g = gNew({ mode: "cvc", names: cvNames(), first: 0 }); CV.run = true; redraw(); cvLoop(); };
  if ($("#cvNew")) $("#cvNew").onclick = () => { CV.g = gNew({ mode: "cvc", names: cvNames(), first: 0 }); CV.run = true; redraw(); cvLoop(); };
  if ($("#cvAna")) $("#cvAna").onclick = () => { CV.run = false; anaOpen(CV.g.board, CV.g.over ? "" : CV.g.racks[CV.g.turn]); };
}
const cvNames = () => CV.levels.map((l, p) => `${LEVELS[l][0]}${CV.levels[0] === CV.levels[1] ? " " + (p + 1) : ""}`);
let cvBusy = false;
async function cvLoop() {
  if (cvBusy) return; cvBusy = true;
  try {
    while (CV.run && CV.g && !CV.g.over) {
      const g = CV.g, p = g.turn, m = await cpuPick(g, p, CV.levels[p]);
      if (CV.g !== g || !CV.run) break;
      gDo(g, p, m);
      if (location.hash === "#lab/cvc") labCvc();
      await wait(CV.speed);
    }
  } finally { cvBusy = false; }
  if (CV.g?.over) { CV.run = false; if (location.hash === "#lab/cvc") labCvc(); }
}
// tap each tile as it goes down on a real board (and the ones on your rack): what's left is what you can't see
function labTrack() {
  const T = { used: {}, hist: [], ...store.get("track", {}) }, full = { ...BAG, "?": 2 };
  const left = ch => full[ch] - (T.used[ch] || 0), n = [...AZ, "?"].reduce((s, ch) => s + left(ch), 0), vw = [..."AEIOU"].reduce((s, ch) => s + left(ch), 0);
  $("#view").innerHTML = `${labSeg("track")}<div class="card"><p class="bq">Tile tracker</p><p class="small" style="margin:4px 0 12px">For a game on a real board: tap each tile as it's played, and the tiles on your rack. What's left is the bag and the other rack.</p>
    <div class="tgrid">${[...AZ, "?"].map(ch => `<button type="button" data-tt="${ch}" class="${left(ch) ? "" : "gone"}"><b>${ch}</b><i>${left(ch)}</i></button>`).join("")}</div>
    <div class="btally" style="margin-top:14px"><div><b>${n}</b>unseen</div><div><b>${Math.max(0, n - 7)}</b>in the bag</div><div><b>${vw}</b>vowels</div><div><b>${n - vw - left("?")}</b>consonants</div><div><b>${left("?")}</b>blanks</div></div>
    <div class="row" style="margin-top:14px"><button class="btn" id="ttUndo" ${T.hist.length ? "" : "disabled"}>Undo ${T.hist.at(-1) || ""}</button><button class="btn" id="ttReset" ${T.hist.length ? "" : "disabled"}>Start again</button></div></div>`;
  const save = () => { store.set("track", T); labTrack(); };
  $("#view").querySelectorAll("[data-tt]").forEach(b => b.onclick = () => { const ch = b.dataset.tt; if (!left(ch)) return; T.used[ch] = (T.used[ch] || 0) + 1; T.hist.push(ch); save(); });
  $("#ttUndo").onclick = () => { const ch = T.hist.pop(); if (ch) T.used[ch]--; save(); };
  confirmBtn($("#ttReset"), () => { T.used = {}; T.hist = []; save(); });
}
// the Board tab: Free board (Look), Analyse, Play. Count used to be #board/count; old links go to Scoring
VIEWS.board = arg => arg === "count" ? location.replace("#scoring") : arg === "analyse" ? viewAnalyse() : arg === "play" ? viewPlay()
  : arg === "games" ? viewGames() : arg === "type" ? viewType() : arg?.startsWith("rv-") ? viewReview(arg.slice(3)) : viewLook();

