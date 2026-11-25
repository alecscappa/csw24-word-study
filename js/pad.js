// ---------- Scratch pad (My words): pages to write and draw on with a finger, pen or mouse, in a few colours.
// Each page keeps its strokes as points on a 1000 × 1333 sheet, so it looks the same on any screen size;
// saved as you go and synced like Notes. The page fills the screen with one small bar floating on it; pages,
// paper, Clear and Delete are in the menus at the top. A page can be a study sheet (write out a rack's anagrams,
// a word's hooks or a folder's words from memory, then Check), and a page can belong to a word, shown on its
// Word page ----------
const PAD_W = 1000, PAD_H = 1333;
// colour 0 is the theme's ink, so it reads on light and dark
const PAD_COLS = [["Ink", ""], ["Red", "#d9483b"], ["Blue", "#2f6fd6"], ["Green", "#2f9a55"], ["Orange", "#e08a1e"], ["Purple", "#8a4fd0"]];
const PAD_SIZES = [["Fine", 3], ["Medium", 6], ["Thick", 12]];
const PAD_PAPER = [["plain", "Plain"], ["lines", "Lines"], ["grid", "Grid"]];
const PAD_TOOLS = [["pen", "Pen"], ["hi", "Highlight"], ["erase", "Erase"]];
const getPad = () => store.get("pad", []);
// true while a stroke is being drawn, so a sync coming down doesn't redraw the page under the pen
let padBusy = false;
const PAD = { tool: "pen", col: 0, size: 1, undo: [], redo: [], menu: "" };
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
    const p = st.p; if (!p.length) continue;
    cx.save(); cx.lineCap = cx.lineJoin = "round"; cx.strokeStyle = cx.fillStyle = colOf(st.c);
    cx.lineWidth = st.w * (st.h ? 3 : 1) * scale; if (st.h) cx.globalAlpha = .3;
    if (p.length <= 2) { cx.beginPath(); cx.arc(p[0] * scale, p[1] * scale, cx.lineWidth / 2, 0, 7); cx.fill(); cx.restore(); continue; }
    // smooth through the midpoints
    cx.beginPath(); cx.moveTo(p[0] * scale, p[1] * scale);
    for (let i = 2; i < p.length - 2; i += 2) cx.quadraticCurveTo(p[i] * scale, p[i + 1] * scale, (p[i] + p[i + 2]) / 2 * scale, (p[i + 1] + p[i + 3]) / 2 * scale);
    cx.lineTo(p[p.length - 2] * scale, p[p.length - 1] * scale); cx.stroke(); cx.restore();
  }
}
const padInk = () => getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#222";

function padView() {
  let pages = getPad();
  if (!pages.length) { pages = [padNewPage(1)]; store.set("pad", pages); }
  if (PAD.menu === "new") return padNewView();
  const page = pages.find(p => p.id === store.get("padOn")) || pages[0], sh = page.sheet;
  const save = () => padSave(page);
  const swatch = i => `<button type="button" class="padcol ${PAD.col === i ? "on" : ""}" data-padcol="${i}" title="${PAD_COLS[i][0]}" aria-label="${PAD_COLS[i][0]}" style="--c:${PAD_COLS[i][1] || "var(--ink)"}"></button>`;
  const ans = sh?.shown ? sheetAnswers(sh) : [];
  $("#mres").innerHTML = `<div class="padtop">
      <button type="button" class="btn padpick" id="padPick" aria-expanded="${PAD.menu === "pages"}">${esc(page.name || "Untitled")} <span aria-hidden="true">▾</span></button>
      ${page.word ? `<a class="badge plain" href="#w/${page.word}">${page.word} ›</a>` : ""}
      <span class="small padmsg" id="padMsg">${page.s.length ? "Edited " + edited(page.at) : sh ? "Write them out, then Check." : "Draw or write anywhere."}</span>
      ${sh ? `<button type="button" class="btn sm ${sh.shown ? "on" : ""}" id="padCheck">${sh.shown ? "Hide answers" : "Check"}</button>` : ""}
      <button type="button" class="btn sm" id="padMore" aria-label="More" aria-expanded="${PAD.menu === "more"}">⋯</button>
    </div>
    ${PAD.menu === "pages" ? `<div class="padmenu" id="padPages">${pages.map(p => `<button type="button" class="padrow ${p.id === page.id ? "on" : ""}" data-padpg="${p.id}"><b>${esc(p.name || "Untitled")}</b><span class="small">${p.sheet ? "Study sheet · " : p.word ? "For " + p.word + " · " : ""}${edited(p.at)}</span></button>`).join("")}
      <button type="button" class="padrow add" id="padNew"><b>+ New page</b><span class="small">Blank, lined, or a study sheet</span></button></div>` : ""}
    ${PAD.menu === "more" ? `<div class="padmenu padmore">
      <label class="padrn"><span class="small">Name</span><input class="nbtitle padname" value="${esc(page.name)}" placeholder="Page name" aria-label="Page name"></label>
      <div class="padline"><span class="small">Paper</span><span class="padgrp">${PAD_PAPER.map(([k, n]) => `<button type="button" class="btn sm ${(page.paper || "plain") === k ? "on" : ""}" data-padpaper="${k}">${n}</button>`).join("")}</span></div>
      <div class="padline"><button type="button" class="btn sm" id="padRedo">Redo</button><button type="button" class="btn sm" id="padClear">Clear page</button>${pages.length > 1 ? `<button type="button" class="btn sm" id="padDel">Delete page</button>` : ""}</div></div>` : ""}
    <div class="padwrap" id="padWrap">
      <canvas class="padcanvas" id="padCv" aria-label="Drawing page"></canvas>
      <button type="button" class="padzoom" id="padZoom" hidden>Zoom 1×</button>
      <div class="padpop" id="padPop" hidden><span class="padgrp">${PAD_COLS.map((_, i) => swatch(i)).join("")}</span>
        <span class="padgrp">${PAD_SIZES.map(([n, w], i) => `<button type="button" class="btn sm padsz ${PAD.size === i ? "on" : ""}" data-padsz="${i}" title="${n}" aria-label="${n}"><i style="width:${w + 2}px;height:${w + 2}px"></i>${n}</button>`).join("")}</span></div>
      <div class="padfloat">${PAD_TOOLS.map(([k, n]) => `<button type="button" class="${PAD.tool === k ? "on" : ""}" data-padtool="${k}">${n}</button>`).join("")}<i></i>
        <button type="button" class="paddot" id="padDot" aria-label="Colour and size" style="--c:${PAD_COLS[PAD.col][1] || "var(--ink)"}"><span style="--s:${PAD_SIZES[PAD.size][1] + 6}px"></span></button><i></i>
        <button type="button" id="padUndo" aria-label="Undo" title="Undo (or tap with two fingers)">↶</button></div>
    </div>
    ${sh?.shown ? `<div class="card padans"><h2 class="lbl">${esc(sheetTitle(sh))}<em>${ans.length}</em></h2><p class="small" style="margin:0 0 8px">Tap the ones you wrote down.</p>
      <div class="words">${ans.map(w => `<button type="button" class="w ${sh.got.includes(w) ? "got" : ""}" data-padgot="${w}">${w}</button>`).join("")}</div>
      <p class="small" id="padScore" style="margin:8px 0 0">${sh.got.length} of ${ans.length}</p></div>` : ""}`;
  const cv = $("#padCv"), wrap = $("#padWrap"), cx = cv.getContext("2d");
  // zoom: two fingers pinch; z is the zoom and tx, ty how far the page is moved, in screen px
  const Z = { z: 1, tx: 0, ty: 0 };
  let scale = 1;
  const place = () => { cv.style.transform = Z.z === 1 ? "" : `translate(${Z.tx}px, ${Z.ty}px) scale(${Z.z})`; $("#padZoom").hidden = Z.z === 1; };
  const paint = () => {
    const dpr = (window.devicePixelRatio || 1) * Math.min(Z.z, 2), w = cv.clientWidth;
    if (!w) return;
    scale = w / PAD_W; cv.width = Math.round(w * dpr); cv.height = Math.round(w * PAD_H / PAD_W * dpr);
    cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, cv.width, cv.height);
    padPaint(cx, page, scale, padInk());
  };
  paint();
  const ro = new ResizeObserver(() => { if (!cv.isConnected) return ro.disconnect(); paint(); }); ro.observe(cv);
  // undo and redo keep copies of the page's strokes, for this visit to the page
  const snap = () => { PAD.undo.push(page.s.slice()); if (PAD.undo.length > 100) PAD.undo.shift(); PAD.redo = []; };
  const msg = t => $("#padMsg").textContent = t;
  const undo = () => { if (!PAD.undo.length) return; PAD.redo.push(page.s); page.s = PAD.undo.pop(); paint(); save(); };
  // drawing: one pointer at a time; once a stylus is seen, fingers on the page are left alone (a resting palm).
  // Two fingers at once pinch to zoom, or undo if they just tap
  let cur = null, erased = false, penSeen = false, pinch = null;
  const touches = new Map();
  const at = ev => { const r = cv.getBoundingClientRect(), k = r.width / PAD_W; return [Math.round((ev.clientX - r.left) / k), Math.round((ev.clientY - r.top) / k)]; };
  const eraseAt = ([x, y]) => {
    const r = 18 + PAD_SIZES[PAD.size][1] * 2, keep = page.s.filter(st => { for (let i = 0; i < st.p.length; i += 2) if (Math.hypot(st.p[i] - x, st.p[i + 1] - y) < r + st.w) return false; return true; });
    if (keep.length !== page.s.length) { if (!erased) { PAD.undo.push(page.s.slice()); PAD.redo = []; } erased = true; page.s = keep; paint(); }
  };
  const two = () => { const [a, b] = [...touches.values()], r = wrap.getBoundingClientRect(); return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2 - r.left, my: (a.y + b.y) / 2 - r.top }; };
  cv.addEventListener("pointerdown", ev => {
    $("#padPop").hidden = true;
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
    if (cur || (penSeen && ev.pointerType === "touch") || ev.button > 0) return;
    ev.preventDefault(); cv.setPointerCapture(ev.pointerId); padBusy = true;
    cur = { id: ev.pointerId };
    if (PAD.tool === "erase") { erased = false; eraseAt(at(ev)); return; }
    cur.st = { c: PAD.col, w: PAD_SIZES[PAD.size][1], p: at(ev) }; if (PAD.tool === "hi") cur.st.h = 1;
    padPaint(cx, { s: [cur.st] }, scale, padInk());
  });
  cv.addEventListener("pointermove", ev => {
    if (touches.has(ev.pointerId)) touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pinch && touches.size === 2) {
      const g = two(), z = Math.min(4, Math.max(1, pinch.z * g.d / pinch.d)), W = wrap.clientWidth, H = cv.clientHeight;
      if (Math.abs(g.d - pinch.d) > 12 || Math.hypot(g.mx - pinch.mx, g.my - pinch.my) > 12) pinch.moved = true;
      // the point of the page under the fingers stays under them
      const ux = (pinch.mx - pinch.tx) / pinch.z, uy = (pinch.my - pinch.ty) / pinch.z;
      Z.z = z; Z.tx = Math.min(0, Math.max(W - W * z, g.mx - ux * z)); Z.ty = Math.min(0, Math.max(H - H * z, g.my - uy * z));
      place(); return;
    }
    if (!cur || ev.pointerId !== cur.id) return;
    for (const e of ev.getCoalescedEvents?.() || [ev]) {
      const pt = at(e);
      if (!cur.st) { eraseAt(pt); continue; }
      const p = cur.st.p; if (Math.hypot(pt[0] - p[p.length - 2], pt[1] - p[p.length - 1]) < 2) continue;
      // the newest bit only; the whole stroke is drawn again smoothly when it ends
      cx.save(); cx.lineCap = "round"; cx.strokeStyle = PAD_COLS[cur.st.c]?.[1] || padInk(); cx.lineWidth = cur.st.w * (cur.st.h ? 3 : 1) * scale; if (cur.st.h) cx.globalAlpha = .3;
      cx.beginPath(); cx.moveTo(p[p.length - 2] * scale, p[p.length - 1] * scale); cx.lineTo(pt[0] * scale, pt[1] * scale); cx.stroke(); cx.restore();
      p.push(...pt);
    }
  });
  const end = ev => {
    touches.delete(ev.pointerId);
    if (pinch) {
      if (touches.size < 2 && !pinch.done) { pinch.done = true; if (!pinch.moved && Date.now() - pinch.at < 350) { undo(); msg("Undone"); } else paint(); }
      if (!touches.size) pinch = null;
      return;
    }
    if (!cur || ev.pointerId !== cur.id) return;
    if (cur.st) { snap(); page.s.push(cur.st); paint(); save(); msg("Edited just now"); }
    else if (erased) { save(); msg("Edited just now"); }
    cur = null; padBusy = false;
  };
  cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
  $("#padZoom").onclick = () => { Z.z = 1; Z.tx = Z.ty = 0; place(); paint(); };
  const M = $("#mres");
  M.querySelectorAll("[data-padcol]").forEach(b => b.onclick = () => { PAD.col = +b.dataset.padcol; if (PAD.tool === "erase") PAD.tool = "pen"; padView(); });
  M.querySelectorAll("[data-padsz]").forEach(b => b.onclick = () => { PAD.size = +b.dataset.padsz; padView(); });
  M.querySelectorAll("[data-padtool]").forEach(b => b.onclick = () => { PAD.tool = b.dataset.padtool; padView(); });
  $("#padDot").onclick = () => { $("#padPop").hidden = !$("#padPop").hidden; };
  $("#padUndo").onclick = undo;
  $("#padPick").onclick = () => { PAD.menu = PAD.menu === "pages" ? "" : "pages"; padView(); };
  $("#padMore").onclick = () => { PAD.menu = PAD.menu === "more" ? "" : "more"; padView(); };
  $("#padCheck")?.addEventListener("click", () => { sh.shown = !sh.shown; save(); padView(); if (sh.shown) $(".padans")?.scrollIntoView({ block: "nearest", behavior: "smooth" }); });
  M.querySelectorAll("[data-padgot]").forEach(b => b.onclick = () => { const w = b.dataset.padgot, i = sh.got.indexOf(w); i >= 0 ? sh.got.splice(i, 1) : sh.got.push(w); b.classList.toggle("got", i < 0); save(); $("#padScore").textContent = `${sh.got.length} of ${ans.length}`; });
  M.querySelectorAll("[data-padpg]").forEach(b => b.onclick = () => { padOpen(b.dataset.padpg); padView(); window.scrollTo(0, 0); });
  $("#padNew")?.addEventListener("click", () => { PAD.menu = "new"; padView(); });
  M.querySelectorAll("[data-padpaper]").forEach(b => b.onclick = () => { page.paper = b.dataset.padpaper; save(); padView(); });
  $("#padRedo")?.addEventListener("click", () => { if (!PAD.redo.length) return; PAD.undo.push(page.s); page.s = PAD.redo.pop(); paint(); save(); });
  let nameT = 0;
  $(".padname")?.addEventListener("input", ev => { clearTimeout(nameT); nameT = setTimeout(() => { page.name = ev.target.value; save(); $("#padPick").firstChild.textContent = (page.name || "Untitled") + " "; }, 400); });
  if ($("#padClear")) confirmBtn($("#padClear"), () => { if (!page.s.length) return; snap(); page.s = []; paint(); save(); msg("Cleared (Undo brings it back)"); });
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
