// ---------- Scratch pad (My words): pages to write and draw on with a finger, pen or mouse, in a few colours.
// Each page keeps its strokes as points on a 1000 × 1333 sheet, so it looks the same on any screen size;
// saved as you go and synced like Notes ----------
const PAD_W = 1000, PAD_H = 1333;
// colour 0 is the theme's ink, so it reads on light and dark
const PAD_COLS = [["Ink", ""], ["Red", "#d9483b"], ["Blue", "#2f6fd6"], ["Green", "#2f9a55"], ["Orange", "#e08a1e"], ["Purple", "#8a4fd0"]];
const PAD_SIZES = [["Fine", 3], ["Medium", 6], ["Thick", 12]];
const PAD_PAPER = [["plain", "Plain"], ["lines", "Lines"], ["grid", "Grid"]];
const getPad = () => store.get("pad", []);
// true while a stroke is being drawn, so a sync coming down doesn't redraw the page under the pen
let padBusy = false;
const PAD = { tool: "pen", col: 0, size: 1, undo: [], redo: [] };

function padView() {
  let pages = getPad();
  if (!pages.length) { pages = [padNewPage(1)]; store.set("pad", pages); }
  let page = pages.find(p => p.id === store.get("padOn")) || pages[0];
  const save = () => { page.at = Date.now(); const all = getPad(), i = all.findIndex(p => p.id === page.id); i >= 0 ? all[i] = page : all.unshift(page); store.set("pad", all); };
  const swatch = (i) => `<button type="button" class="padcol ${PAD.col === i ? "on" : ""}" data-padcol="${i}" title="${PAD_COLS[i][0]}" aria-label="${PAD_COLS[i][0]}" style="--c:${PAD_COLS[i][1] || "var(--ink)"}"></button>`;
  $("#mres").innerHTML = `<div class="padpages">${pages.map(p => `<button type="button" class="btn sm ${p.id === page.id ? "on" : ""}" data-padpg="${p.id}">${esc(p.name || "Untitled")}</button>`).join("")}<button type="button" class="btn sm" id="padNew">+ New page</button></div>
    <input class="nbtitle padname" value="${esc(page.name)}" placeholder="Page name" aria-label="Page name">
    <div class="padbar">
      <span class="padgrp">${PAD_COLS.map((_, i) => swatch(i)).join("")}</span>
      <span class="padgrp">${PAD_SIZES.map(([n, w], i) => `<button type="button" class="btn sm padsz ${PAD.size === i ? "on" : ""}" data-padsz="${i}" title="${n}" aria-label="${n}"><i style="width:${w + 2}px;height:${w + 2}px"></i></button>`).join("")}</span>
      <span class="padgrp">${[["pen", "Pen"], ["hi", "Highlighter"], ["erase", "Eraser"]].map(([k, n]) => `<button type="button" class="btn sm ${PAD.tool === k ? "on" : ""}" data-padtool="${k}">${n}</button>`).join("")}</span>
      <span class="padgrp"><button type="button" class="btn sm" id="padUndo">Undo</button><button type="button" class="btn sm" id="padRedo">Redo</button>
        <button type="button" class="btn sm" id="padPaper">${PAD_PAPER.find(x => x[0] === (page.paper || "plain"))[1]}</button></span>
    </div>
    <canvas class="padcanvas" id="padCv" aria-label="Drawing page"></canvas>
    <div class="nbfoot"><span class="small" id="padMsg">${page.s.length ? "Edited " + edited(page.at) : "Draw or write anywhere on the page."}</span>
      <span class="padgrp"><button type="button" class="btn sm" id="padClear">Clear page</button>${pages.length > 1 ? `<button type="button" class="btn sm" id="padDel">Delete page</button>` : ""}</span></div>`;
  const cv = $("#padCv"), cx = cv.getContext("2d");
  let scale = 1;
  const colOf = i => PAD_COLS[i]?.[1] || getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#222";
  const drawStroke = st => {
    const p = st.p; if (!p.length) return;
    cx.save(); cx.lineCap = cx.lineJoin = "round"; cx.strokeStyle = cx.fillStyle = colOf(st.c);
    cx.lineWidth = st.w * (st.h ? 3 : 1) * scale; if (st.h) cx.globalAlpha = .3;
    if (p.length <= 2) { cx.beginPath(); cx.arc(p[0] * scale, p[1] * scale, cx.lineWidth / 2, 0, 7); cx.fill(); cx.restore(); return; }
    // smooth through the midpoints
    cx.beginPath(); cx.moveTo(p[0] * scale, p[1] * scale);
    for (let i = 2; i < p.length - 2; i += 2) cx.quadraticCurveTo(p[i] * scale, p[i + 1] * scale, (p[i] + p[i + 2]) / 2 * scale, (p[i + 1] + p[i + 3]) / 2 * scale);
    cx.lineTo(p[p.length - 2] * scale, p[p.length - 1] * scale); cx.stroke(); cx.restore();
  };
  const paint = () => {
    const css = getComputedStyle(document.documentElement), dpr = window.devicePixelRatio || 1, w = cv.clientWidth;
    if (!w) return;
    scale = w / PAD_W; cv.width = Math.round(w * dpr); cv.height = Math.round(w * PAD_H / PAD_W * dpr);
    cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, cv.width, cv.height);
    if (page.paper && page.paper !== "plain") {
      cx.strokeStyle = css.getPropertyValue("--line").trim(); cx.lineWidth = 1; cx.beginPath();
      for (let y = 60; y < PAD_H; y += 50) { cx.moveTo(0, y * scale); cx.lineTo(PAD_W * scale, y * scale); }
      if (page.paper === "grid") for (let x = 50; x < PAD_W; x += 50) { cx.moveTo(x * scale, 0); cx.lineTo(x * scale, PAD_H * scale); }
      cx.stroke();
    }
    page.s.forEach(drawStroke);
  };
  paint();
  const ro = new ResizeObserver(() => { if (!cv.isConnected) return ro.disconnect(); paint(); }); ro.observe(cv);
  // undo and redo keep copies of the page's strokes, for this visit to the page
  const snap = () => { PAD.undo.push(page.s.slice()); if (PAD.undo.length > 100) PAD.undo.shift(); PAD.redo = []; };
  const msg = t => $("#padMsg").textContent = t;
  // drawing: one pointer at a time; once a stylus is seen, fingers on the page are left alone (a resting palm)
  let cur = null, erased = false, penSeen = false;
  const at = ev => { const r = cv.getBoundingClientRect(); return [Math.round((ev.clientX - r.left) / scale), Math.round((ev.clientY - r.top) / scale)]; };
  const eraseAt = ([x, y]) => {
    const r = 18 + PAD_SIZES[PAD.size][1] * 2, keep = page.s.filter(st => { for (let i = 0; i < st.p.length; i += 2) if (Math.hypot(st.p[i] - x, st.p[i + 1] - y) < r + st.w) return false; return true; });
    if (keep.length !== page.s.length) { if (!erased) { PAD.undo.push(page.s.slice()); PAD.redo = []; } erased = true; page.s = keep; paint(); }
  };
  cv.addEventListener("pointerdown", ev => {
    if (ev.pointerType === "pen") penSeen = true;
    if (cur || (penSeen && ev.pointerType === "touch") || ev.button > 0) return;
    ev.preventDefault(); cv.setPointerCapture(ev.pointerId); padBusy = true;
    cur = { id: ev.pointerId };
    if (PAD.tool === "erase") { erased = false; eraseAt(at(ev)); return; }
    cur.st = { c: PAD.col, w: PAD_SIZES[PAD.size][1], p: at(ev) }; if (PAD.tool === "hi") cur.st.h = 1;
    drawStroke(cur.st);
  });
  cv.addEventListener("pointermove", ev => {
    if (!cur || ev.pointerId !== cur.id) return;
    for (const e of ev.getCoalescedEvents?.() || [ev]) {
      const pt = at(e);
      if (!cur.st) { eraseAt(pt); continue; }
      const p = cur.st.p; if (Math.hypot(pt[0] - p[p.length - 2], pt[1] - p[p.length - 1]) < 2) continue;
      // the newest bit only; the whole stroke is drawn again smoothly when it ends
      cx.save(); cx.lineCap = "round"; cx.strokeStyle = colOf(cur.st.c); cx.lineWidth = cur.st.w * (cur.st.h ? 3 : 1) * scale; if (cur.st.h) cx.globalAlpha = .3;
      cx.beginPath(); cx.moveTo(p[p.length - 2] * scale, p[p.length - 1] * scale); cx.lineTo(pt[0] * scale, pt[1] * scale); cx.stroke(); cx.restore();
      p.push(...pt);
    }
  });
  const end = ev => {
    if (!cur || ev.pointerId !== cur.id) return;
    if (cur.st) { snap(); page.s.push(cur.st); paint(); save(); msg("Edited just now"); }
    else if (erased) { save(); msg("Edited just now"); }
    cur = null; padBusy = false;
  };
  cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
  $("#mres").querySelectorAll("[data-padcol]").forEach(b => b.onclick = () => { PAD.col = +b.dataset.padcol; if (PAD.tool === "erase") PAD.tool = "pen"; padView(); });
  $("#mres").querySelectorAll("[data-padsz]").forEach(b => b.onclick = () => { PAD.size = +b.dataset.padsz; padView(); });
  $("#mres").querySelectorAll("[data-padtool]").forEach(b => b.onclick = () => { PAD.tool = b.dataset.padtool; padView(); });
  $("#padUndo").onclick = () => { if (!PAD.undo.length) return; PAD.redo.push(page.s); page.s = PAD.undo.pop(); paint(); save(); };
  $("#padRedo").onclick = () => { if (!PAD.redo.length) return; PAD.undo.push(page.s); page.s = PAD.redo.pop(); paint(); save(); };
  $("#padPaper").onclick = () => { const i = PAD_PAPER.findIndex(x => x[0] === (page.paper || "plain")); page.paper = PAD_PAPER[(i + 1) % PAD_PAPER.length][0]; save(); padView(); };
  let nameT = 0;
  $(".padname").addEventListener("input", ev => { clearTimeout(nameT); nameT = setTimeout(() => { page.name = ev.target.value; save(); const b = $(`[data-padpg="${page.id}"]`); if (b) b.textContent = page.name || "Untitled"; }, 400); });
  const open = id => { store.set("padOn", id); PAD.undo = []; PAD.redo = []; padView(); window.scrollTo(0, 0); };
  $("#mres").querySelectorAll("[data-padpg]").forEach(b => b.onclick = () => b.dataset.padpg !== page.id && open(b.dataset.padpg));
  $("#padNew").onclick = () => { const p = padNewPage(getPad().length + 1); store.set("pad", [p, ...getPad()]); open(p.id); };
  confirmBtn($("#padClear"), () => { if (!page.s.length) return; snap(); page.s = []; paint(); save(); msg("Cleared (Undo brings it back)"); });
  confirmBtn($("#padDel"), () => { store.set("pad", getPad().filter(p => p.id !== page.id)); open(getPad()[0]?.id); });
}
const padNewPage = n => ({ id: Date.now().toString(36) + rnd(1e6).toString(36), name: "Page " + n, paper: "plain", s: [], at: Date.now() });
