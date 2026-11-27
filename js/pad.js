// ---------- Scratch pad (My words): pages to write and draw on with a finger, pen or mouse, in a few colours.
// Each page keeps its strokes as points on a 1000 × 1333 sheet, so it looks the same on any screen size;
// saved as you go and synced like Notes. The page fills the screen with one small bar floating on it; pages,
// paper, Clear and Delete are in the menus at the top. A page can be a study sheet (write out a rack's anagrams,
// a word's hooks or a folder's words from memory, then Check), and a page can belong to a word, shown on its
// Word page. The bar can be dragged to any edge, or folded away. Besides strokes, a page holds typed text and
// letter tiles (k "txt"); Neat letters reads capitals written one at a time and puts back typed ones ----------
const PAD_W = 1000, PAD_H = 1333;
// colour 0 is the theme's ink, so it reads on light and dark
const PAD_COLS = [["Ink", ""], ["Red", "#d9483b"], ["Blue", "#2f6fd6"], ["Green", "#2f9a55"], ["Orange", "#e08a1e"], ["Purple", "#8a4fd0"]];
const PAD_SIZES = [["Fine", 3], ["Medium", 6], ["Thick", 12]];
const PAD_PAPER = [["plain", "Plain"], ["lines", "Lines"], ["grid", "Grid"]];
const PAD_TOOLS = [["pen", "Pen", "P"], ["hi", "Highlight", "H"], ["erase", "Erase", "E"], ["type", "Type", "T"], ["lasso", "Select", "S"]];
// typed text's height on the sheet, by size
const PAD_TEXT = [40, 64, 100];
const getPad = () => store.get("pad", []);
// true while a stroke is being drawn, so a sync coming down doesn't redraw the page under the pen
let padBusy = false;
const PAD = { tool: "pen", col: 0, size: 1, undo: [], redo: [], menu: "" };
// the letter being written with Neat letters on: its strokes so far, and the wait before it's read
const NEAT = { st: [], t: 0 };
const padNewPage = (n, extra = {}) => ({ id: Date.now().toString(36) + rnd(1e6).toString(36), name: "Page " + n, paper: "plain", s: [], at: Date.now(), ...extra });
const padSave = page => { page.at = Date.now(); const all = getPad(), i = all.findIndex(p => p.id === page.id); i >= 0 ? all[i] = page : all.unshift(page); store.set("pad", all); };
const padOpen = id => { store.set("padOn", id); PAD.undo = []; PAD.redo = []; PAD.menu = ""; };
// a study sheet's answers: a rack's words, a word's front and back hooks, or a folder's words
function sheetAnswers(sh) {
  if (sh.k === "ana") return anagrams(sh.q);
  if (sh.k === "hooks") { const e = DICT.get(sh.q); return e ? [...[...e.fh].map(c => c.toUpperCase() + sh.q), ...[...e.bh].map(c => sh.q + c.toUpperCase())] : []; }
  const f = folderById(sh.q); return f ? fWords(f).slice(0, 300) : [];
}
const sheetTitle = sh => sh.k === "ana" ? `The anagrams of ${sh.q}` : sh.k === "hooks" ? `The hooks of ${sh.q}` : `${folderById(sh.q)?.name || "A folder"}, from memory`;
function newSheet(k, q) {
  const page = padNewPage(getPad().length + 1, { paper: "lines", sheet: { k, q, shown: false, got: [] } });
  page.name = k === "folder" ? (folderById(q)?.name || "Folder") : q + (k === "hooks" ? " hooks" : "");
  store.set("pad", [page, ...getPad()]); padOpen(page.id); return page;
}
// a page for a word: the one it has, or a new one named after it
function padForWord(w) {
  const has = getPad().find(p => p.word === w);
  if (has) { padOpen(has.id); return has; }
  const page = padNewPage(1, { name: w, word: w });
  store.set("pad", [page, ...getPad()]); padOpen(page.id); return page;
}

// draws a page onto a canvas context at a scale (screen px per sheet unit); used by the pad and the Word page preview
function padPaint(cx, page, scale, ink) {
  const line = getComputedStyle(document.documentElement).getPropertyValue("--line").trim();
  const colOf = i => PAD_COLS[i]?.[1] || ink;
  if (page.paper && page.paper !== "plain") {
    cx.strokeStyle = line; cx.lineWidth = 1; cx.beginPath();
    for (let y = page.sheet ? 260 : 60; y < PAD_H; y += page.sheet ? 70 : 50) { cx.moveTo(0, y * scale); cx.lineTo(PAD_W * scale, y * scale); }
    if (page.paper === "grid") for (let x = 50; x < PAD_W; x += 50) { cx.moveTo(x * scale, 0); cx.lineTo(x * scale, PAD_H * scale); }
    cx.stroke();
  }
  // a study sheet: its tiles (or the word with a gap each side, or the folder's name) drawn faintly at the top
  if (page.sheet) {
    const sh = page.sheet, ts = sh.k === "folder" ? [] : sh.k === "hooks" ? ["?", ...sh.q, "?"] : [...sh.q];
    cx.save(); cx.globalAlpha = .32; cx.fillStyle = cx.strokeStyle = ink; cx.textAlign = "center"; cx.textBaseline = "middle";
    if (ts.length) {
      const t = Math.min(110, 900 / ts.length), x0 = (PAD_W - t * ts.length) / 2;
      ts.forEach((c, i) => { const x = x0 + i * t;
        cx.lineWidth = 3 * scale; cx.setLineDash(c === "?" ? [10 * scale, 8 * scale] : []);
        cx.beginPath(); cx.roundRect((x + 6) * scale, 70 * scale, (t - 12) * scale, (t - 12) * scale, 12 * scale); cx.stroke();
        cx.font = `700 ${(t * .5) * scale}px ui-sans-serif, system-ui`; cx.fillText(c, (x + t / 2) * scale, (70 + (t - 12) / 2) * scale); });
    } else { cx.font = `700 ${64 * scale}px ui-sans-serif, system-ui`; cx.fillText(folderById(sh.q)?.name || "Folder", PAD_W / 2 * scale, 130 * scale); }
    cx.restore();
  }
  for (const st of page.s) {
    if (st.k === "txt") { padText(cx, st, scale, colOf(st.c)); continue; }
    const p = st.p; if (!p.length) continue;
    cx.save(); cx.lineCap = cx.lineJoin = "round"; cx.strokeStyle = cx.fillStyle = colOf(st.c);
    cx.lineWidth = st.w * (st.h ? 3 : 1) * scale; if (st.h) cx.globalAlpha = .3;
    if (p.length <= 2) { cx.beginPath(); cx.arc(p[0] * scale, p[1] * scale, cx.lineWidth / 2, 0, 7); cx.fill(); cx.restore(); continue; }
    // a pen that feels pressure: each bit as thick as it was pressed
    if (st.pr && !st.h) {
      for (let i = 2; i < p.length; i += 2) { cx.lineWidth = st.w * scale * (.35 + (st.pr[i / 2] ?? .5) * 1.3); cx.beginPath(); cx.moveTo(p[i - 2] * scale, p[i - 1] * scale); cx.lineTo(p[i] * scale, p[i + 1] * scale); cx.stroke(); }
      cx.restore(); continue;
    }
    // a tidied line or box keeps its corners
    if (st.sh) { cx.beginPath(); cx.moveTo(p[0] * scale, p[1] * scale); for (let i = 2; i < p.length; i += 2) cx.lineTo(p[i] * scale, p[i + 1] * scale); cx.stroke(); cx.restore(); continue; }
    // smooth through the midpoints
    cx.beginPath(); cx.moveTo(p[0] * scale, p[1] * scale);
    for (let i = 2; i < p.length - 2; i += 2) cx.quadraticCurveTo(p[i] * scale, p[i + 1] * scale, (p[i] + p[i + 2]) / 2 * scale, (p[i + 1] + p[i + 3]) / 2 * scale);
    cx.lineTo(p[p.length - 2] * scale, p[p.length - 1] * scale); cx.stroke(); cx.restore();
  }
}
const padInk = () => getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#222";
const padVar = (v, or) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || or;
// typed text (x, y its top left, z its height), or a row of letter tiles
const padTextBox = st => [st.x, st.y, st.tl ? st.v.length * st.z * 1.08 : Math.max(st.z * .3, st.v.length * st.z * .6), st.z];
function padText(cx, st, scale, col) {
  const z = st.z * scale, font = padVar("--display", "system-ui");
  cx.save(); cx.textBaseline = "middle";
  if (st.tl) {
    cx.textAlign = "center";
    [...st.v].forEach((c, i) => { const x = (st.x + i * st.z * 1.08) * scale, y = st.y * scale;
      cx.fillStyle = padVar("--tile", "#f1dcaa"); cx.strokeStyle = padVar("--tile-edge", "#c4a566"); cx.lineWidth = Math.max(1, z * .04);
      cx.beginPath(); cx.roundRect(x, y, z, z, z * .14); cx.fill(); cx.stroke();
      cx.fillStyle = padVar("--tile-ink", "#2b2213"); cx.font = `700 ${z * .62}px ${font}`; cx.fillText(c, x + z / 2, y + z * .54); });
  } else { cx.fillStyle = col; cx.font = `600 ${z * .86}px ${font}`; cx.fillText(st.v, st.x * scale, (st.y + st.z * .55) * scale); }
  cx.restore();
}
// how far a stroke or text reaches, for erasing and Select
function padBox(st) {
  if (st.k === "txt") { const [x, y, w, h] = padTextBox(st); return [x, y, x + w, y + h]; }
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (let i = 0; i < st.p.length; i += 2) { a = Math.min(a, st.p[i]); c = Math.max(c, st.p[i]); b = Math.min(b, st.p[i + 1]); d = Math.max(d, st.p[i + 1]); }
  const m = st.w * (st.h ? 1.5 : .5); return [a - m, b - m, c + m, d + m];
}
const padMove = (st, dx, dy) => st.k === "txt" ? { ...st, x: st.x + dx, y: st.y + dy } : { ...st, p: st.p.map((v, i) => v + (i % 2 ? dy : dx)) };
// a stroke held still at its end: a nearly straight one becomes a line (level or upright if it's close), a
// nearly round closed one an ellipse or circle, a boxy one a rectangle. null if it's none of those
function padTidy(p) {
  const n = p.length / 2; if (n < 6) return null;
  const x0 = p[0], y0 = p[1], x1 = p[p.length - 2], y1 = p[p.length - 1], chord = Math.hypot(x1 - x0, y1 - y0);
  let len = 0; for (let i = 2; i < p.length; i += 2) len += Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]);
  if (chord > 40 && len / chord < 1.06) {
    const a = Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI, flat = Math.abs(((a % 180) + 180) % 180), lvl = flat < 7 || flat > 173, up = Math.abs(flat - 90) < 7;
    return { p: [x0, y0, lvl ? x1 : up ? x0 : x1, lvl ? y0 : y1], sh: 1 };
  }
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (let i = 0; i < p.length; i += 2) { a = Math.min(a, p[i]); c = Math.max(c, p[i]); b = Math.min(b, p[i + 1]); d = Math.max(d, p[i + 1]); }
  const w = c - a, h = d - b, size = Math.max(w, h);
  if (size < 40 || chord > size * .3 || len < size * 2) return null;
  const mx = (a + c) / 2, my = (b + d) / 2, rx = w / 2 || 1, ry = h / 2 || 1;
  let box = 0, rs = []; for (let i = 0; i < p.length; i += 2) { box += Math.min(p[i] - a, c - p[i], p[i + 1] - b, d - p[i + 1]) / size; rs.push(Math.hypot((p[i] - mx) / rx, (p[i + 1] - my) / ry)); }
  box /= n; const mean = rs.reduce((s, r) => s + r, 0) / n, sd = Math.sqrt(rs.reduce((s, r) => s + (r - mean) ** 2, 0) / n);
  if (box < .035) return { p: [a, b, c, b, c, d, a, d, a, b].map(Math.round), sh: 1 };
  if (sd < .1) { const round = Math.abs(rx - ry) / Math.max(rx, ry) < .15, r = (rx + ry) / 2, ex = round ? r : rx, ey = round ? r : ry;
    return { p: Array.from({ length: 49 }, (_, i) => [Math.round(mx + ex * Math.cos(i / 48 * Math.PI * 2)), Math.round(my + ey * Math.sin(i / 48 * Math.PI * 2))]).flat(), sh: 1 }; }
  return null;
}

// the bar's grip (drag it to an edge, tap it to fold the bar away) and its six dots
const PAD_GRIP = '<svg viewBox="0 0 10 16" aria-hidden="true"><circle cx="3" cy="3" r="1.4"/><circle cx="7" cy="3" r="1.4"/><circle cx="3" cy="8" r="1.4"/><circle cx="7" cy="8" r="1.4"/><circle cx="3" cy="13" r="1.4"/><circle cx="7" cy="13" r="1.4"/></svg>';
function padView() {
  let pages = getPad();
  if (!pages.length) { pages = [padNewPage(1)]; store.set("pad", pages); }
  if (PAD.menu === "new") return padNewView();
  clearTimeout(NEAT.t); NEAT.st = [];
  const page = pages.find(p => p.id === store.get("padOn")) || pages[0], sh = page.sheet;
  const save = () => padSave(page);
  const dock = store.get("padDock", "bottom"), folded = store.get("padFold", false), neat = store.get("padNeat", false), tiles = store.get("padTiles", false);
  const swatch = i => `<button type="button" class="padcol ${PAD.col === i ? "on" : ""}" data-padcol="${i}" title="${PAD_COLS[i][0]} (${i + 1})" aria-label="${PAD_COLS[i][0]}" style="--c:${PAD_COLS[i][1] || "var(--ink)"}"></button>`;
  const ans = sh?.shown ? sheetAnswers(sh) : [];
  const hint = { type: "Click where the text goes, type, then Enter.", lasso: "Draw round things to pick them, then drag them. Delete removes them." }[PAD.tool];
  $("#mres").innerHTML = `<div class="padtop">
      <a class="bbk" href="#mine">‹ My words</a>
      <button type="button" class="btn padpick" id="padPick" aria-expanded="${PAD.menu === "pages"}">${esc(page.name || "Untitled")} <span aria-hidden="true">▾</span></button>
      ${page.word ? `<a class="badge plain" href="#w/${page.word}">${page.word} ›</a>` : ""}
      <span class="small padmsg" id="padMsg">${hint || (neat && PAD.tool === "pen" ? "Neat letters: write capitals one at a time." : page.s.length ? "Edited " + edited(page.at) : sh ? "Write them out, then Check." : "Draw or write anywhere.")}</span>
      ${sh ? `<button type="button" class="btn sm ${sh.shown ? "on" : ""}" id="padCheck">${sh.shown ? "Hide answers" : "Check"}</button>` : ""}
      <button type="button" class="btn sm" id="padMore" aria-label="More" aria-expanded="${PAD.menu === "more"}">⋯</button>
    </div>
    ${PAD.menu === "pages" ? `<div class="padmenu" id="padPages">${pages.map(p => `<button type="button" class="padrow ${p.id === page.id ? "on" : ""}" data-padpg="${p.id}"><b>${esc(p.name || "Untitled")}</b><span class="small">${p.sheet ? "Study sheet · " : p.word ? "For " + p.word + " · " : ""}${edited(p.at)}</span></button>`).join("")}
      <button type="button" class="padrow add" id="padNew"><b>+ New page</b><span class="small">Blank, lined, or a study sheet</span></button></div>` : ""}
    ${PAD.menu === "more" ? `<div class="padmenu padmore">
      <label class="padrn"><span class="small">Name</span><input class="nbtitle padname" value="${esc(page.name)}" placeholder="Page name" aria-label="Page name"></label>
      <div class="padline"><span class="small">Paper</span><span class="padgrp">${PAD_PAPER.map(([k, n]) => `<button type="button" class="btn sm ${(page.paper || "plain") === k ? "on" : ""}" data-padpaper="${k}">${n}</button>`).join("")}</span></div>
      <div class="padline"><button type="button" class="btn sm" id="padRedo">Redo</button><button type="button" class="btn sm" id="padClear">Clear page</button>${pages.length > 1 ? `<button type="button" class="btn sm" id="padDel">Delete page</button>` : ""}</div>
      ${phone() ? "" : `<p class="small padkeys">Keys: <b>P</b> pen, <b>H</b> highlight, <b>E</b> erase, <b>T</b> type, <b>S</b> select, <b>1</b>–<b>6</b> colours, <b>[</b> <b>]</b> size, <b>Ctrl+Z</b> undo, <b>Ctrl+Shift+Z</b> redo.
        Hold <b>Shift</b> for a straight line, or hold still at the end of a line, circle or box to tidy it. Right-click drag erases. Ctrl + scroll (or pinch) zooms; then hold <b>Space</b> and drag, or scroll, to move about.</p>`}</div>` : ""}
    <div class="padwrap" id="padWrap">
      <canvas class="padcanvas tool-${PAD.tool}" id="padCv" aria-label="Drawing page"></canvas>
      <button type="button" class="padzoom" id="padZoom" hidden>Zoom 1×</button>
      <div class="padpop dock-${dock}" id="padPop" hidden><span class="padgrp">${PAD_COLS.map((_, i) => swatch(i)).join("")}</span>
        <span class="padgrp">${PAD_SIZES.map(([n, w], i) => `<button type="button" class="btn sm padsz ${PAD.size === i ? "on" : ""}" data-padsz="${i}" title="${n}" aria-label="${n}"><i style="width:${w + 2}px;height:${w + 2}px"></i>${n}</button>`).join("")}</span>
        <span class="padgrp"><span class="small">Type</span><button type="button" class="btn sm ${tiles ? "" : "on"}" data-padtiles="0">Text</button><button type="button" class="btn sm ${tiles ? "on" : ""}" data-padtiles="1">Tiles</button></span>
        <label class="padneat"><input type="checkbox" id="padNeat" ${neat ? "checked" : ""}><span><b>Neat letters</b><span class="small">Write capitals one at a time with the pen; each turns into a typed letter.</span></span></label></div>
      <div class="padfloat dock-${dock} ${folded ? "fold" : ""}" id="padBar">
        <button type="button" class="padgrip" id="padGrip" aria-label="${folded ? "Open the toolbar" : "Move the toolbar (drag), or fold it away (tap)"}" title="Drag to move, tap to ${folded ? "open" : "fold"}">${PAD_GRIP}</button>
        ${PAD_TOOLS.map(([k, n, key]) => `<button type="button" class="${PAD.tool === k ? "on" : ""}" data-padtool="${k}" title="${n} (${key})">${n}</button>`).join("")}<i></i>
        <button type="button" class="paddot" id="padDot" aria-label="Colour and size" style="--c:${PAD_COLS[PAD.col][1] || "var(--ink)"}"><span style="--s:${PAD_SIZES[PAD.size][1] + 6}px"></span></button><i></i>
        <button type="button" id="padUndo" aria-label="Undo" title="Undo (Ctrl+Z, or tap with two fingers)">↶</button></div>
    </div>
    ${sh?.shown ? `<div class="card padans"><h2 class="lbl">${esc(sheetTitle(sh))}<em>${ans.length}</em></h2><p class="small" style="margin:0 0 8px">Tap the ones you wrote down.</p>
      <div class="words">${ans.map(w => `<button type="button" class="w ${sh.got.includes(w) ? "got" : ""}" data-padgot="${w}">${w}</button>`).join("")}</div>
      <p class="small" id="padScore" style="margin:8px 0 0">${sh.got.length} of ${ans.length}</p></div>` : ""}`;
  const cv = $("#padCv"), wrap = $("#padWrap"), cx = cv.getContext("2d");
  // zoom: two fingers pinch, or Ctrl + scroll; z is the zoom and tx, ty how far the page is moved, in screen px
  const Z = { z: 1, tx: 0, ty: 0 };
  let scale = 1;
  // what Select has picked (strokes and text on the page)
  let sel = [];
  const place = () => { cv.style.transform = Z.z === 1 ? "" : `translate(${Z.tx}px, ${Z.ty}px) scale(${Z.z})`; $("#padZoom").hidden = Z.z === 1; };
  const clampZ = () => { const W = wrap.clientWidth, H = cv.clientHeight; Z.tx = Math.min(0, Math.max(W - W * Z.z, Z.tx)); Z.ty = Math.min(0, Math.max(H - H * Z.z, Z.ty)); };
  const selBox = () => { const bs = sel.map(padBox); return bs.length ? [Math.min(...bs.map(b => b[0])), Math.min(...bs.map(b => b[1])), Math.max(...bs.map(b => b[2])), Math.max(...bs.map(b => b[3]))] : null; };
  const paint = () => {
    const dpr = (window.devicePixelRatio || 1) * Math.min(Z.z, 2), w = cv.clientWidth;
    if (!w) return;
    scale = w / PAD_W; cv.width = Math.round(w * dpr); cv.height = Math.round(w * PAD_H / PAD_W * dpr);
    cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, cv.width, cv.height);
    padPaint(cx, page, scale, padInk());
    const b = selBox();
    if (b) { cx.save(); cx.strokeStyle = padVar("--accent", "#c60"); cx.lineWidth = 1.5; cx.setLineDash([6, 5]); cx.strokeRect((b[0] - 8) * scale, (b[1] - 8) * scale, (b[2] - b[0] + 16) * scale, (b[3] - b[1] + 16) * scale); cx.restore(); }
  };
  paint();
  const ro = new ResizeObserver(() => { if (!cv.isConnected) return ro.disconnect(); paint(); }); ro.observe(cv);
  // undo and redo keep copies of the page's strokes, for this visit to the page
  const snap = () => { PAD.undo.push(page.s.slice()); if (PAD.undo.length > 100) PAD.undo.shift(); PAD.redo = []; };
  const msg = t => $("#padMsg").textContent = t;
  const undo = () => { if (!PAD.undo.length) return; PAD.redo.push(page.s); page.s = PAD.undo.pop(); sel = []; paint(); save(); };
  const redo = () => { if (!PAD.redo.length) return; PAD.undo.push(page.s); page.s = PAD.redo.pop(); sel = []; paint(); save(); };
  // drawing: one pointer at a time; once a stylus is seen, fingers on the page are left alone (a resting palm).
  // Two fingers at once pinch to zoom, or undo if they just tap
  let cur = null, erased = false, penSeen = false, pinch = null, pan = null, space = false;
  const touches = new Map();
  const at = ev => { const r = cv.getBoundingClientRect(), k = r.width / PAD_W; return [Math.round((ev.clientX - r.left) / k), Math.round((ev.clientY - r.top) / k)]; };
  const eraseAt = ([x, y]) => {
    const r = 18 + PAD_SIZES[PAD.size][1] * 2, keep = page.s.filter(st => {
      if (st.k === "txt") { const b = padBox(st); return !(x > b[0] - r && x < b[2] + r && y > b[1] - r && y < b[3] + r); }
      for (let i = 0; i < st.p.length; i += 2) if (Math.hypot(st.p[i] - x, st.p[i + 1] - y) < r + st.w) return false; return true; });
    if (keep.length !== page.s.length) { if (!erased) { PAD.undo.push(page.s.slice()); PAD.redo = []; } erased = true; page.s = keep; paint(); }
  };
  // Neat letters: the strokes written so far are read as one capital and swapped for a typed one, if they look
  // like a letter; if not they stay as written
  const neatDone = () => {
    clearTimeout(NEAT.t); const sts = NEAT.st.filter(st => page.s.includes(st)); NEAT.st = [];
    if (!sts.length || sts.length > 4 || typeof neatRead === "undefined") return;
    const bs = sts.map(padBox), b = [Math.min(...bs.map(x => x[0])), Math.min(...bs.map(x => x[1])), Math.max(...bs.map(x => x[2])), Math.max(...bs.map(x => x[3]))];
    if (b[3] - b[1] < 24) return;
    const pts = sts.map(st => { const o = []; for (let i = 0; i < st.p.length; i += 2) o.push([st.p[i], st.p[i + 1]]); return o; });
    const got = neatRead(pts); if (!got || got.d > NEAT_MAX) { msg("Couldn't read that one, so it stays as written."); return; }
    const z = b[3] - b[1], w = z * .6;
    snap(); page.s = page.s.filter(st => !sts.includes(st));
    page.s.push({ k: "txt", x: Math.round((b[0] + b[2]) / 2 - w / 2), y: Math.round(b[1]), v: got.L, c: sts[0].c, z: Math.round(z) });
    paint(); save(); msg(`Read as ${got.L}. Undo if it's wrong.`);
  };
  // Type: a box on the page where it was clicked; Enter (or clicking away) puts the text on the page
  const typeAt = (ev, pt) => {
    $("#padType")?.blur();
    const r = wrap.getBoundingClientRect(), z = PAD_TEXT[PAD.size];
    const box = document.createElement("input");
    box.className = "padtype"; box.id = "padType"; box.maxLength = 60; box.spellcheck = false; box.setAttribute("aria-label", "Text for the page");
    if (tiles) { box.autocapitalize = "characters"; box.style.textTransform = "uppercase"; }
    box.style.left = ev.clientX - r.left + "px"; box.style.top = ev.clientY - r.top + "px"; box.style.fontSize = z * scale * Z.z * .86 + "px";
    box.style.color = PAD_COLS[PAD.col][1] || "var(--ink)";
    wrap.append(box); setTimeout(() => box.focus(), 0);
    let done = false;
    const put = keep => { if (done) return; done = true; const v = tiles ? box.value.toUpperCase().replace(/[^A-Z?]/g, "") : box.value.trim(); box.remove();
      if (!keep || !v) return; snap(); page.s.push({ k: "txt", x: pt[0], y: Math.round(pt[1] - z / 2), v, c: PAD.col, z, ...(tiles ? { tl: 1 } : {}) }); paint(); save(); msg("Edited just now"); };
    box.onkeydown = e => { e.stopPropagation(); if (e.key === "Enter") put(true); if (e.key === "Escape") put(false); };
    box.onblur = () => put(true);
  };
  const two = () => { const [a, b] = [...touches.values()], r = wrap.getBoundingClientRect(); return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2 - r.left, my: (a.y + b.y) / 2 - r.top }; };
  const inPoly = (x, y, poly) => { let o = false; for (let i = 0, j = poly.length - 2; i < poly.length; j = i, i += 2) { const xi = poly[i], yi = poly[i + 1], xj = poly[j], yj = poly[j + 1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) o = !o; } return o; };
  cv.addEventListener("contextmenu", ev => ev.preventDefault());
  cv.addEventListener("pointerdown", ev => {
    $("#padPop").hidden = true; $("#padType")?.blur();
    if (ev.pointerType === "pen") penSeen = true;
    if (ev.pointerType === "touch" && !penSeen) {
      touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (touches.size === 2) {
        // a second finger: the first finger's stroke (if it only just started) is dropped, and the pinch begins
        if (cur?.st && cur.st.p.length < 12) { cur = null; padBusy = false; paint(); }
        else if (cur) return;
        pinch = { ...two(), z: Z.z, tx: Z.tx, ty: Z.ty, at: Date.now(), moved: false };
        ev.preventDefault(); return;
      }
      if (touches.size > 2 || pinch) return;
    }
    if (cur || (penSeen && ev.pointerType === "touch")) return;
    // Space + drag, or the middle button, moves a zoomed-in page about
    if ((space || ev.button === 1) && Z.z > 1) { ev.preventDefault(); cv.setPointerCapture(ev.pointerId); pan = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, tx: Z.tx, ty: Z.ty }; return; }
    if (ev.button > 2 || ev.button === 1) return;
    ev.preventDefault();
    const pt = at(ev);
    if (PAD.tool === "type" && ev.button === 0) { typeAt(ev, pt); return; }
    cv.setPointerCapture(ev.pointerId); padBusy = true;
    cur = { id: ev.pointerId };
    // the right button erases, whatever the tool
    if (PAD.tool === "erase" || ev.button === 2) { cur.erase = true; erased = false; eraseAt(pt); return; }
    if (PAD.tool === "lasso") {
      const b = selBox();
      if (b && pt[0] > b[0] - 10 && pt[0] < b[2] + 10 && pt[1] > b[1] - 10 && pt[1] < b[3] + 10) { snap(); cur.move = { from: pt, idx: sel.map(st => page.s.indexOf(st)), base: sel.slice() }; return; }
      sel = []; paint(); cur.lasso = [...pt]; return;
    }
    if (neat && PAD.tool === "pen" && NEAT.st.length) {
      // a stroke starting clear of the letter being written means that letter is finished
      const bs = NEAT.st.map(padBox), h = Math.max(...bs.map(b => b[3])) - Math.min(...bs.map(b => b[1]));
      if (pt[0] > Math.max(...bs.map(b => b[2])) + h * .25 || pt[0] < Math.min(...bs.map(b => b[0])) - h * .5) neatDone(); else clearTimeout(NEAT.t);
    }
    cur.st = { c: PAD.col, w: PAD_SIZES[PAD.size][1], p: pt }; if (PAD.tool === "hi") cur.st.h = 1;
    if (ev.pointerType === "pen" && ev.pressure > 0 && PAD.tool === "pen") cur.st.pr = [+ev.pressure.toFixed(2)];
    cur.mouse = ev.pointerType === "mouse"; cur.last = pt; cur.start = pt;
    padPaint(cx, { s: [cur.st] }, scale, padInk());
  });
  // a mouse stroke is smoothed: each point goes part of the way towards the pointer
  cv.addEventListener("pointermove", ev => {
    if (touches.has(ev.pointerId)) touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pinch && touches.size === 2) {
      const g = two(), z = Math.min(4, Math.max(1, pinch.z * g.d / pinch.d));
      if (Math.abs(g.d - pinch.d) > 12 || Math.hypot(g.mx - pinch.mx, g.my - pinch.my) > 12) pinch.moved = true;
      // the point of the page under the fingers stays under them
      const ux = (pinch.mx - pinch.tx) / pinch.z, uy = (pinch.my - pinch.ty) / pinch.z;
      Z.z = z; Z.tx = g.mx - ux * z; Z.ty = g.my - uy * z; clampZ();
      place(); return;
    }
    if (pan && ev.pointerId === pan.id) { Z.tx = pan.tx + ev.clientX - pan.x; Z.ty = pan.ty + ev.clientY - pan.y; clampZ(); place(); return; }
    if (!cur || ev.pointerId !== cur.id) return;
    if (cur.move) {
      const pt = at(ev), dx = pt[0] - cur.move.from[0], dy = pt[1] - cur.move.from[1];
      cur.move.idx.forEach((i, k) => { if (i >= 0) page.s[i] = padMove(cur.move.base[k], dx, dy); });
      sel = cur.move.idx.map(i => page.s[i]).filter(Boolean); paint(); return;
    }
    if (cur.tidied) return;
    const co = ev.getCoalescedEvents?.();
    for (const e of co?.length ? co : [ev]) {
      const raw = at(e);
      if (cur.erase) { eraseAt(raw); continue; }
      if (cur.lasso) { const l = cur.lasso; cx.save(); cx.strokeStyle = padVar("--accent", "#c60"); cx.lineWidth = 1.5; cx.setLineDash([5, 4]); cx.beginPath(); cx.moveTo(l[l.length - 2] * scale, l[l.length - 1] * scale); cx.lineTo(raw[0] * scale, raw[1] * scale); cx.stroke(); cx.restore(); l.push(...raw); continue; }
      // Shift: a straight line from where it started
      if (ev.shiftKey) { cur.st.p = [...cur.start, ...raw]; delete cur.st.pr; cur.st.sh = 1; paint(); padPaint(cx, { s: [cur.st] }, scale, padInk()); continue; }
      const pt = cur.mouse ? [Math.round(cur.last[0] + (raw[0] - cur.last[0]) * .45), Math.round(cur.last[1] + (raw[1] - cur.last[1]) * .45)] : raw;
      const p = cur.st.p; if (Math.hypot(pt[0] - p[p.length - 2], pt[1] - p[p.length - 1]) < 2) continue;
      cur.last = pt;
      // the newest bit only; the whole stroke is drawn again smoothly when it ends
      cx.save(); cx.lineCap = "round"; cx.strokeStyle = PAD_COLS[cur.st.c]?.[1] || padInk(); cx.lineWidth = cur.st.w * (cur.st.h ? 3 : 1) * scale * (cur.st.pr ? .35 + e.pressure * 1.3 : 1); if (cur.st.h) cx.globalAlpha = .3;
      cx.beginPath(); cx.moveTo(p[p.length - 2] * scale, p[p.length - 1] * scale); cx.lineTo(pt[0] * scale, pt[1] * scale); cx.stroke(); cx.restore();
      p.push(...pt); if (cur.st.pr) cur.st.pr.push(+e.pressure.toFixed(2));
      // held still at the end for a moment: a rough line, circle or box is tidied
      if (cur.st && !neat) { clearTimeout(cur.ht); const c0 = cur; cur.ht = setTimeout(() => { if (cur !== c0 || !c0.st) return; const t = padTidy(c0.st.p); if (!t) return; c0.st.p = t.p; c0.st.sh = 1; delete c0.st.pr; c0.tidied = true; paint(); padPaint(cx, { s: [c0.st] }, scale, padInk()); }, 550); }
    }
  });
  const end = ev => {
    touches.delete(ev.pointerId);
    if (pinch) {
      if (touches.size < 2 && !pinch.done) { pinch.done = true; if (!pinch.moved && Date.now() - pinch.at < 350) { undo(); msg("Undone"); } else paint(); }
      if (!touches.size) pinch = null;
      return;
    }
    if (pan && ev.pointerId === pan.id) { pan = null; paint(); return; }
    if (!cur || ev.pointerId !== cur.id) return;
    clearTimeout(cur.ht);
    if (cur.move) { save(); msg("Moved"); }
    else if (cur.lasso) {
      const l = cur.lasso;
      // picked: a stroke with most of its points inside the loop, or text whose middle is
      sel = l.length > 6 ? page.s.filter(st => { if (st.k === "txt") { const b = padBox(st); return inPoly((b[0] + b[2]) / 2, (b[1] + b[3]) / 2, l); }
        let n = 0; for (let i = 0; i < st.p.length; i += 2) n += inPoly(st.p[i], st.p[i + 1], l); return n >= st.p.length / 2 * .6; }) : [];
      paint(); msg(sel.length ? `${sel.length} picked. Drag to move, Delete to remove.` : "Nothing picked. Draw round what you want.");
    }
    else if (cur.st) {
      if (cur.mouse && !cur.tidied && !cur.st.sh) { const p = cur.st.p, raw = at(ev); if (Math.hypot(raw[0] - p[p.length - 2], raw[1] - p[p.length - 1]) > 2) p.push(...raw); }
      snap(); page.s.push(cur.st); paint(); save(); msg(cur.tidied ? "Tidied" : "Edited just now");
      if (neat && PAD.tool === "pen" && !cur.st.sh) { NEAT.st.push(cur.st); clearTimeout(NEAT.t); NEAT.t = setTimeout(neatDone, 900); }
    }
    else if (erased) { save(); msg("Edited just now"); }
    cur = null; padBusy = false;
  };
  cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
  // Ctrl + scroll (and a trackpad pinch) zooms round the pointer; a plain scroll moves a zoomed-in page
  cv.addEventListener("wheel", ev => {
    const r = wrap.getBoundingClientRect(), mx = ev.clientX - r.left, my = ev.clientY - r.top;
    if (ev.ctrlKey || ev.metaKey) {
      ev.preventDefault();
      const z = Math.min(4, Math.max(1, Z.z * Math.exp(-ev.deltaY * .01))), ux = (mx - Z.tx) / Z.z, uy = (my - Z.ty) / Z.z;
      Z.z = z; Z.tx = mx - ux * z; Z.ty = my - uy * z; clampZ(); place();
      clearTimeout(Z.t); Z.t = setTimeout(paint, 150);
    } else if (Z.z > 1) { ev.preventDefault(); Z.tx -= ev.deltaX; Z.ty -= ev.deltaY; clampZ(); place(); }
  }, { passive: false });
  // keys (on a computer): tools, colours, sizes, undo and redo, Space to move about, Delete for what's picked
  const setTool = t => { if (PAD.tool !== t) { PAD.tool = t; padView(); } };
  document.onkeydown = ev => {
    if (!cv.isConnected || ev.target.closest?.("input, textarea, select")) return;
    const k = ev.key.toLowerCase(), mod = ev.ctrlKey || ev.metaKey;
    if (mod && k === "z") { ev.preventDefault(); ev.shiftKey ? redo() : undo(); return; }
    if (mod && k === "y") { ev.preventDefault(); redo(); return; }
    if (mod || ev.altKey) return;
    if (k === " ") { ev.preventDefault(); if (!space) { space = true; cv.classList.add("panning"); } return; }
    if ((k === "delete" || k === "backspace") && sel.length) { ev.preventDefault(); snap(); page.s = page.s.filter(st => !sel.includes(st)); sel = []; paint(); save(); msg("Removed (Undo brings it back)"); return; }
    if (k === "escape" && sel.length) { sel = []; paint(); return; }
    const t = PAD_TOOLS.find(x => x[2].toLowerCase() === k); if (t) return setTool(t[0]);
    if (/^[1-6]$/.test(k)) { PAD.col = +k - 1; if (PAD.tool === "erase") PAD.tool = "pen"; return padView(); }
    if (k === "[" || k === "]") { PAD.size = Math.max(0, Math.min(PAD_SIZES.length - 1, PAD.size + (k === "]" ? 1 : -1))); return padView(); }
  };
  const keyUp = ev => { if (!cv.isConnected) return document.removeEventListener("keyup", keyUp); if (ev.key === " ") { space = false; cv.classList.remove("panning"); } };
  document.addEventListener("keyup", keyUp);
  $("#padZoom").onclick = () => { Z.z = 1; Z.tx = Z.ty = 0; place(); paint(); };
  // the bar: drag the grip and it goes to the nearest edge of the page; a tap folds it away or opens it
  const bar = $("#padBar"), grip = $("#padGrip");
  grip.onpointerdown = ev => {
    ev.preventDefault(); grip.setPointerCapture(ev.pointerId);
    const r = wrap.getBoundingClientRect(), b = bar.getBoundingClientRect(), ox = ev.clientX - b.left, oy = ev.clientY - b.top, x0 = ev.clientX, y0 = ev.clientY;
    let moved = false;
    grip.onpointermove = e => {
      if (!moved && Math.hypot(e.clientX - x0, e.clientY - y0) < 6) return;
      moved = true; bar.classList.add("drag"); $("#padPop").hidden = true;
      bar.style.left = Math.max(0, Math.min(r.width - b.width, e.clientX - r.left - ox)) + "px"; bar.style.top = Math.max(0, Math.min(r.height - b.height, e.clientY - r.top - oy)) + "px";
    };
    grip.onpointerup = grip.onpointercancel = e => {
      grip.onpointermove = grip.onpointerup = grip.onpointercancel = null;
      if (!moved) { store.set("padFold", !folded); return padView(); }
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height, d = { top: y, bottom: 1 - y, left: x, right: 1 - x };
      store.set("padDock", Object.keys(d).sort((a, c) => d[a] - d[c])[0]); padView();
    };
  };
  const M = $("#mres");
  M.querySelectorAll("[data-padcol]").forEach(b => b.onclick = () => { PAD.col = +b.dataset.padcol; if (PAD.tool === "erase") PAD.tool = "pen"; padView(); });
  M.querySelectorAll("[data-padsz]").forEach(b => b.onclick = () => { PAD.size = +b.dataset.padsz; padView(); });
  M.querySelectorAll("[data-padtiles]").forEach(b => b.onclick = () => { store.set("padTiles", b.dataset.padtiles === "1"); PAD.tool = "type"; padView(); });
  $("#padNeat").onchange = ev => { store.set("padNeat", ev.target.checked); if (ev.target.checked) PAD.tool = "pen"; padView(); };
  M.querySelectorAll("[data-padtool]").forEach(b => b.onclick = () => setTool(b.dataset.padtool));
  $("#padDot").onclick = () => { $("#padPop").hidden = !$("#padPop").hidden; };
  $("#padUndo").onclick = undo;
  $("#padPick").onclick = () => { PAD.menu = PAD.menu === "pages" ? "" : "pages"; padView(); };
  $("#padMore").onclick = () => { PAD.menu = PAD.menu === "more" ? "" : "more"; padView(); };
  $("#padCheck")?.addEventListener("click", () => { sh.shown = !sh.shown; save(); padView(); if (sh.shown) $(".padans")?.scrollIntoView({ block: "nearest", behavior: "smooth" }); });
  M.querySelectorAll("[data-padgot]").forEach(b => b.onclick = () => { const w = b.dataset.padgot, i = sh.got.indexOf(w); i >= 0 ? sh.got.splice(i, 1) : sh.got.push(w); b.classList.toggle("got", i < 0); save(); $("#padScore").textContent = `${sh.got.length} of ${ans.length}`; });
  M.querySelectorAll("[data-padpg]").forEach(b => b.onclick = () => { padOpen(b.dataset.padpg); padView(); window.scrollTo(0, 0); });
  $("#padNew")?.addEventListener("click", () => { PAD.menu = "new"; padView(); });
  M.querySelectorAll("[data-padpaper]").forEach(b => b.onclick = () => { page.paper = b.dataset.padpaper; save(); padView(); });
  $("#padRedo")?.addEventListener("click", redo);
  let nameT = 0;
  $(".padname")?.addEventListener("input", ev => { clearTimeout(nameT); nameT = setTimeout(() => { page.name = ev.target.value; save(); $("#padPick").firstChild.textContent = (page.name || "Untitled") + " "; }, 400); });
  if ($("#padClear")) confirmBtn($("#padClear"), () => { if (!page.s.length) return; snap(); page.s = []; sel = []; paint(); save(); msg("Cleared (Undo brings it back)"); });
  if ($("#padDel")) confirmBtn($("#padDel"), () => { store.set("pad", getPad().filter(p => p.id !== page.id)); padOpen(getPad()[0]?.id); padView(); });
}

// a new page: blank, lined or grid, or a study sheet to fill in from memory
function padNewView() {
  const fs = getFolders().filter(f => fWords(f).length);
  $("#mres").innerHTML = `<button type="button" class="bbk" id="padBack">‹ Scratch pad</button>
    <h3 class="title" style="margin:6px 0 10px">New page</h3>
    <div class="mlist">${PAD_PAPER.map(([k, n]) => `<button type="button" class="mrow" data-padblank="${k}"><span class="mic">${k === "plain" ? "□" : k === "lines" ? "≡" : "▦"}</span><span class="mt">${k === "plain" ? "Blank" : n}</span><span class="mch">›</span></button>`).join("")}</div>
    <p class="lbl" style="margin:18px 0 8px">Study sheets</p>
    <p class="small" style="margin:0 0 10px">Write them out from memory, then press Check to see the answers. It doesn't read your writing; you tick the ones you got.</p>
    <div class="mlist">
      <div class="mrow mform"><span class="mic">⇄</span><span class="mt">The anagrams of…</span><input class="arack" id="padAna" placeholder="Letters" maxlength="15" autocapitalize="characters" spellcheck="false"><button type="button" class="btn sm primary" id="padAnaGo">Start</button></div>
      <div class="mrow mform"><span class="mic">⊢</span><span class="mt">The hooks of…</span><input class="arack" id="padHk" placeholder="Word" maxlength="15" autocapitalize="characters" spellcheck="false"><button type="button" class="btn sm primary" id="padHkGo">Start</button></div>
      ${fs.length ? `<div class="mrow mform"><span class="mic">▦</span><span class="mt">A folder's words</span><select id="padFold" aria-label="Folder">${fs.map(f => `<option value="${f.id}">${esc(folderPath(f))} (${fWords(f).length})</option>`).join("")}</select><button type="button" class="btn sm primary" id="padFoldGo">Start</button></div>` : ""}
    </div>
    <p class="small bad" id="padNewMsg" style="margin:8px 0 0"></p>`;
  $("#padBack").onclick = () => { PAD.menu = ""; padView(); };
  document.querySelectorAll("[data-padblank]").forEach(b => b.onclick = () => { const p = padNewPage(getPad().length + 1, { paper: b.dataset.padblank }); store.set("pad", [p, ...getPad()]); padOpen(p.id); padView(); });
  const go = (id, k) => { const v = $(id).value.toUpperCase().replace(/[^A-Z]/g, "");
    if (k === "ana" && !anagrams(v).length) return $("#padNewMsg").textContent = v ? `${v} makes no words.` : "Type some letters.";
    if (k === "hooks" && !DICT.has(v)) return $("#padNewMsg").textContent = v ? `${v} isn't in CSW24.` : "Type a word.";
    newSheet(k, k === "ana" ? alpha(v) : v); padView(); };
  $("#padAnaGo").onclick = () => go("#padAna", "ana"); $("#padAna").onkeydown = ev => ev.key === "Enter" && go("#padAna", "ana");
  $("#padHkGo").onclick = () => go("#padHk", "hooks"); $("#padHk").onkeydown = ev => ev.key === "Enter" && go("#padHk", "hooks");
  $("#padFoldGo")?.addEventListener("click", () => { newSheet("folder", $("#padFold").value); padView(); });
}

// the Word page's drawing card: this word's page as a small picture, or buttons to start one
function padWordCard(w) {
  const p = getPad().find(x => x.word === w);
  return `<div class="card padword"><h2 class="lbl">Your drawing</h2>
    ${p ? `<a href="#mine/pad" class="padthumb" data-padword="${w}"><canvas id="padWordCv" aria-label="Your drawing for ${w}"></canvas></a>` : `<p class="small" style="margin:0">Draw or write something that helps you remember ${w}. It shows here.</p>`}
    <div class="row" style="margin-top:8px"><button type="button" class="btn sm" data-padword="${w}">${p ? "Open drawing" : "✎ Draw for " + w}</button>
      ${anagrams(w).length > 1 ? `<button type="button" class="btn sm" data-padwrite="${w}">Write out its anagrams</button>` : ""}</div></div>`;
}
function padWordWire(w) {
  document.querySelectorAll("[data-padword]").forEach(b => b.onclick = ev => { ev.preventDefault(); padForWord(w); location.hash = "mine/pad"; });
  document.querySelectorAll("[data-padwrite]").forEach(b => b.onclick = () => { newSheet("ana", alpha(w)); location.hash = "mine/pad"; });
  const cv = $("#padWordCv"), p = getPad().find(x => x.word === w);
  if (!cv || !p) return;
  requestAnimationFrame(() => { const dpr = window.devicePixelRatio || 1, cw = cv.clientWidth; if (!cw) return;
    cv.width = Math.round(cw * dpr); cv.height = Math.round(cw * PAD_H / PAD_W * dpr);
    const cx = cv.getContext("2d"); cx.setTransform(dpr, 0, 0, dpr, 0, 0); padPaint(cx, p, cw / PAD_W, padInk()); });
}
