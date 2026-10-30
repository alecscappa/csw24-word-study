// ---------- views ----------
const VIEWS = {};
// phones get their own layouts for Word, Search, Lists, Practice and Settings; crossing the breakpoint redraws the page
const phoneMQ = matchMedia("(max-width: 620px)"), phone = () => phoneMQ.matches;
phoneMQ.addEventListener?.("change", () => route());
// bottom sheets (phone): a scrim and a panel that slides up
const sheetHTML = (id, body) => `<div class="sheetwrap" id="${id}" hidden><div class="scrim"></div><div class="sheet"><div class="grab"></div>${body}</div></div>`;
function sheet(id, open) { const s = $("#" + id); if (!s) return; s.hidden = !open; document.body.classList.toggle("sheet-open", open); }

let wordShown = "";
VIEWS.w = (arg) => {
  const w = (arg || store.get("hist", [])[0] || "QI").toUpperCase().replace(/[^A-Z]/g, "");
  if (!w) return;
  $("#q").value = wordShown = w;
  const e = DICT.get(w), valid = !!e;
  if (valid) addHistory(w);
  const ana = anagrams(w).filter(x => x !== w);
  const plus = plusOne(w), minus = minusOne(w);
  const plusN = plus.reduce((s, g) => s + g[1].length, 0), minusN = minus.reduce((s, g) => s + g[1].length, 0);
  const starred = getStars().includes(w);
  const qs = store.get("stats", {})[w];
  const inGroups = valid ? GROUPS.filter(g => g.test && !["threes", "twos", "fours", "jqxz", "j", "q", "x", "z"].includes(g.id) && g.test(w, e)) : [];
  const hooks = (s, side) => s
    ? `<div class="hook ${side}">${[...s].map(h => `<button type="button" data-go="${side === "f" ? h.toUpperCase() + w : w + h.toUpperCase()}" title="${side === "f" ? h.toUpperCase() + w : w + h.toUpperCase()}">${h}${(side === "f" ? e.fhNew : e.bhNew).includes(h) ? "<sup>+</sup>" : ""}</button>`).join("")}</div>`
    : `<div class="hook none ${side}">no ${side === "f" ? "front" : "back"}<br>hooks</div>`;
  let html = `<div class="card">
    <div class="tilerow">${valid ? hooks(e.fh, "f") : ""}${tilesHTML(w)}${valid ? hooks(e.bh, "b") : ""}</div>
    <div class="badges">
      ${valid ? `<span class="badge good">Valid in CSW24</span>` : `<span class="badge bad">Not valid · phony</span>`}
      ${e?.n ? `<span class="badge new">New in CSW24</span>` : ""}
      <span class="badge plain">${score(w)} pts</span>
      ${qs ? `<span class="badge plain">Record ${qs[0]}✓ ${qs[1]}✗</span>` : ""}
      ${inGroups.map(g => `<a class="badge plain" href="#lists/${g.id}">${esc(g.name)}</a>`).join("")}
      ${valid ? `<span style="margin-left:auto"></span><button class="btn sm ${getKnown().includes(w) ? "on" : ""}" id="knownBtnW">${getKnown().includes(w) ? "✓ Known" : "✓ Cross off"}</button><button class="btn sm" id="folderBtn">Add to folder</button><button class="btn sm ${starred ? "on" : ""}" id="starBtn">${starred ? "★ Starred" : "☆ Star"}</button>` : ""}
    </div>
  </div>`;
  html += valid
    ? `<div class="grid2"><div class="card"><h2 class="lbl">CSW24 definition</h2><p class="def">${defHTML(e.d)}</p>${soundAlikes(w).length ? `<p class="saw">Sounds like ${saLinks(soundAlikes(w))}</p>` : ""}</div>
       <div class="card"><h2 class="lbl">Facts</h2><div class="stats">
         <div class="stat"><b>${alpha(w)}</b><span>alphagram</span></div>
         <div class="stat"><b>#${e.p.toLocaleString()}</b><span>probability of ${BYLEN[w.length].length.toLocaleString()} ${w.length}s</span></div>
         <div class="stat"><b>#${e.pl.toLocaleString()}</b><span>playability</span></div>
         <div class="stat"><b>${vowels(w)} of ${w.length}</b><span>vowels</span></div>
       </div></div></div>`
    : `<div class="card"><h2 class="lbl">Not in the lexicon</h2><p class="empty">${esc(w)} is not a valid CSW24 word.${ana.length ? " Valid anagrams of these letters:" : ""}</p>${ana.length ? `<div class="words" style="margin-top:8px">${ana.map(chip).join("")}</div>` : ""}</div>`;
  const groupsHTML = list => list.map(([L, g]) => `<div class="grp"><b>${L}</b><div class="words">${g.map(chip).join("")}</div></div>`).join("");
  html += `<div class="card"><h2 class="lbl">Anagrams (${ana.length})</h2>${ana.length ? `<div class="words">${ana.map(chip).join("")}</div>` : `<p class="empty">No other anagrams.</p>`}</div>
  <div class="grid2">
    <div class="card"><h2 class="lbl">Add one letter (${plusN})${w.length === 6 ? " · 7-letter bingos" : ""}</h2>
      ${plus.length ? `<p class="small" style="margin:0 0 6px">Letters: <b style="color:var(--accent);letter-spacing:.08em">${plus.map(g => g[0]).join("")}</b></p>${groupsHTML(plus)}` : `<p class="empty">Nothing.</p>`}</div>
    <div class="card"><h2 class="lbl">Drop one letter (${minusN})</h2>${minus.length ? groupsHTML(minus) : `<p class="empty">Nothing.</p>`}</div>
  </div>`;
  const onlineCard = SET.online ? `<div class="card online" id="online"><h2 class="lbl">Pronunciation, examples &amp; origin</h2><p class="small">Looking up ${esc(w.toLowerCase())} online…</p></div>` : "";
  const noteCard = `<div class="card"><h2 class="lbl">Your notes</h2>
      <textarea id="note" placeholder="A sentence, picture or trick that helps you remember ${esc(w)}…">${esc(getNotes()[w] || "")}</textarea>
      <p class="small" style="margin:6px 0 0">Saved in this browser as you type.</p></div>`;
  if (valid) html += `${onlineCard}
    ${noteCard}`;
  // phone: tiles, hooks, badges and definition in a big header; Anagrams / +1 / −1 / Facts as tabs underneath
  if (phone()) {
    const wt = store.get("wtab", "ana");
    const hk = (s, side) => s ? `<div class="hk ${side}">${[...s].map(h => { const x = side === "f" ? h.toUpperCase() + w : w + h.toUpperCase(); return `<button type="button" data-go="${x}" title="${x}">${h}${(side === "f" ? e.fhNew : e.bhNew).includes(h) ? "<sup>+</sup>" : ""}</button>`; }).join("")}</div>` : `<div class="hk none ${side}">none</div>`;
    const panes = {
      ana: ana.length ? `<div class="bigchips">${ana.map(x => `<a href="#w/${x}">${x}${DICT.get(x).n ? "<sup>+</sup>" : ""}<small>›</small></a>`).join("")}</div>` : `<p class="empty">No other anagrams.</p>`,
      plus: `<div class="card">${plus.length ? `<p class="small" style="margin:0 0 6px">Letters: <b style="color:var(--accent);letter-spacing:.08em">${plus.map(g => g[0]).join("")}</b>${w.length === 6 ? " · 7-letter bingos" : ""}</p>${groupsHTML(plus)}` : `<p class="empty">Nothing.</p>`}</div>`,
      minus: `<div class="card">${minus.length ? groupsHTML(minus) : `<p class="empty">Nothing.</p>`}</div>`,
      facts: valid ? `<div class="card"><div class="stats">
          <div class="stat"><b>${alpha(w)}</b><span>alphagram</span></div>
          <div class="stat"><b>#${e.pl.toLocaleString()}</b><span>playability</span></div>
          <div class="stat"><b>${vowels(w)} of ${w.length}</b><span>vowels</span></div>
          ${qs ? `<div class="stat"><b>${qs[0]}✓ ${qs[1]}✗</b><span>your record</span></div>` : ""}
        </div>${inGroups.length ? `<div class="badges">${inGroups.map(g => `<a class="badge plain" href="#lists/${g.id}">${esc(g.name)}</a>`).join("")}</div>` : ""}</div>${onlineCard}` : `<div class="card"><p class="empty">${esc(w)} is not a valid CSW24 word.</p></div>`,
    };
    html = `<div class="wtop"><div class="hero">
        ${valid ? `<button type="button" class="hstar ${starred ? "on" : ""}" id="starBtn" aria-label="Star ${w}">${starred ? "★" : "☆"}</button>` : ""}
        ${tilesHTML(w)}
        ${valid ? `<div class="hooksline">${hk(e.fh, "f")}<span>hooks</span>${hk(e.bh, "b")}</div>` : ""}
        <div class="badges">${valid ? `<span class="badge ok">✓ Valid</span>` : `<span class="badge bad">✗ Phony</span>`}${e?.n ? `<span class="badge">New</span>` : ""}<span class="badge">${score(w)} pts</span>${valid ? `<span class="badge">#${e.p.toLocaleString()} of ${w.length}s</span>` : ""}</div>
        <p class="hdef">${valid ? defHTML(e.d) : "Not in the lexicon"}</p>
        ${valid && soundAlikes(w).length ? `<p class="saw">Sounds like ${saLinks(soundAlikes(w))}</p>` : ""}
        ${valid ? `<div class="hacts"><button type="button" class="btn sm ${getKnown().includes(w) ? "on" : ""}" id="knownBtnW">${getKnown().includes(w) ? "✓ Known" : "✓ Cross off"}</button><button type="button" class="btn sm" id="folderBtn">Add to folder</button></div>` : ""}</div>
      <nav class="segtabs">${[["ana", "Anagrams", ana.length], ["plus", "Add one", plusN], ["minus", "Drop one", minusN], ["facts", "Facts"]].map(([k, n, c]) => `<button type="button" class="${k === wt ? "on" : ""}" data-wtab="${k}">${n}${c !== undefined ? `<em>${c}</em>` : ""}</button>`).join("")}</nav></div>
      ${Object.entries(panes).map(([k, h]) => `<div class="wpane" data-pane="${k}" ${k === wt ? "" : "hidden"}>${h}</div>`).join("")}
      ${valid ? noteCard : ""}`;
  }
  $("#view").innerHTML = html;
  // a long word reaches the star in the corner, so the tiles drop below it
  const hs = $("#view .hstar"), ht = $("#view .hero .tiles");
  if (hs && ht?.lastElementChild && hs.getBoundingClientRect().left < ht.lastElementChild.getBoundingClientRect().right) $("#view .hero").classList.add("long");
  $("#view").querySelectorAll("[data-wtab]").forEach(b => b.onclick = () => {
    store.set("wtab", b.dataset.wtab);
    $("#view").querySelectorAll("[data-wtab]").forEach(x => x.classList.toggle("on", x === b));
    $("#view").querySelectorAll("[data-pane]").forEach(p => p.hidden = p.dataset.pane !== b.dataset.wtab);
  });
  if (!valid) return;
  if (SET.online) fetchOnline(w);
  $("#note").addEventListener("input", ev => { const n = getNotes(); if (ev.target.value.trim()) n[w] = ev.target.value; else delete n[w]; store.set("notes", n); });
  $("#knownBtnW").addEventListener("click", ev => { const on = toggleKnown(w); ev.currentTarget.classList.toggle("on", on); ev.currentTarget.textContent = on ? "✓ Known" : "✓ Cross off"; });
  $("#folderBtn").addEventListener("click", () => folderSheet([w]));
  $("#starBtn").addEventListener("click", ev => { const b = ev.currentTarget, on = toggleStar(w); b.classList.toggle("on", on); b.textContent = b.classList.contains("hstar") ? (on ? "★" : "☆") : on ? "★ Starred" : "☆ Star"; });
};

async function fetchOnline(w) {
  const lw = w.toLowerCase();
  const parts = []; let phon = "", audio = "", origin = "";
  try {
    const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(lw)}`);
    if (r.ok) for (const ent of await r.json()) {
      phon ||= ent.phonetic || ent.phonetics?.find(p => p.text)?.text || "";
      audio ||= ent.phonetics?.find(p => p.audio)?.audio || "";
      origin ||= ent.origin || "";
      for (const m of ent.meanings || []) for (const d of m.definitions || [])
        parts.push({ pos: m.partOfSpeech, def: d.definition, ex: d.example, syn: [...(d.synonyms || []), ...(m.synonyms || [])] });
    }
  } catch {}
  try {
    const r = await fetch(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(lw)}`);
    if (r.ok) {
      const data = await r.json();
      // parsed, not put in the page, so nothing in Wiktionary's HTML (an image, a script) can run
      const strip = h => new DOMParser().parseFromString(h, "text/html").body.textContent.trim();
      for (const ent of data.en || []) for (const d of ent.definitions || []) {
        const def = strip(d.definition || ""); if (!def) continue;
        const ex = (d.parsedExamples || []).map(x => strip(x.example)).concat((d.examples || []).map(strip)).filter(Boolean)[0];
        if (ex || parts.length < 3) parts.push({ pos: ent.partOfSpeech, def, ex });
      }
    }
  } catch {}
  const b = $("#online");
  if (!b || wordShown !== w) return;
  parts.sort((a, b) => (b.ex ? 1 : 0) - (a.ex ? 1 : 0));
  const shown = parts.slice(0, 6);
  const syns = [...new Set(parts.flatMap(p => p.syn || []))].map(s => s.toUpperCase()).filter(s => DICT.has(s)).slice(0, 12);
  b.innerHTML = `<h2 class="lbl">Pronunciation, examples &amp; origin</h2>
    ${phon || audio ? `<div class="row small">${phon ? `<span style="font-size:1rem">${esc(phon)}</span>` : ""}${audio ? `<button class="btn sm" type="button" id="say">▶\uFE0E Hear it</button>` : ""}</div>` : ""}
    ${shown.length ? `<ol style="margin-top:10px">${shown.map(p => `<li><span class="pos">${esc(p.pos)}</span> ${esc(p.def)}${p.ex ? `<span class="ex">${esc(p.ex)}</span>` : ""}</li>`).join("")}</ol>`
      : `<p class="empty">No online dictionary entry. Many Scrabble words are rare, so lean on the CSW definition and your own notes.</p>`}
    ${syns.length ? `<p class="small" style="margin:10px 0 4px">Valid synonyms</p><div class="words">${syns.map(chip).join("")}</div>` : ""}
    ${origin ? `<p class="small" style="margin-top:10px">Origin: ${esc(origin)}</p>` : ""}
    <div class="links">
      <a href="https://en.wiktionary.org/wiki/${encodeURIComponent(lw)}" target="_blank" rel="noopener">Wiktionary</a>
      <a href="https://www.collinsdictionary.com/dictionary/english/${encodeURIComponent(lw)}" target="_blank" rel="noopener">Collins</a>
      <a href="https://www.google.com/search?tbm=isch&q=${encodeURIComponent(lw + " meaning")}" target="_blank" rel="noopener">Images</a>
    </div>`;
  if (audio) $("#say").addEventListener("click", () => new Audio(audio).play().catch(() => {}));
}

// ---------- search ----------
// lens = the lengths picked with the chips; min and max are still understood (Practice uses them) but not shown
const SEARCH_DEFAULT = { pattern: "", rack: "", mode: "exact", lens: "", min: "", max: "", starts: "", ends: "", contains: "", incl: "", excl: "", def: "", group: "", anas: "", pfrom: "", pto: "", pby: "rank", plax: "", from: "", to: "" };
let searchState = Object.fromEntries(Object.keys(SEARCH_DEFAULT).map(k => [k, store.get("search", {})[k] ?? SEARCH_DEFAULT[k]]));
if (store.get("search", {}).top && !searchState.pto) searchState.pto = store.get("search", {}).top;
if (!groupOf(searchState.group) || groupOf(searchState.group).special) searchState.group = "";
// a search saved before the length chips: its shortest–longest becomes those lengths
if (searchState.min || searchState.max) { searchState.lens ||= range(+searchState.min || 2, +searchState.max || 15).join(","); searchState.min = searchState.max = ""; }
// the length chips (Search, Practice and Quiz): the value sits in a hidden input, so forms read it like any field
const lenPick = (id, v) => { const on = new Set(lensOf(v));
  return `<div class="chips lenpick"><input type="hidden" id="${id}" value="${[...on].join(",")}"><button type="button" class="btn sm ${on.size ? "" : "on"}" data-l="0">Any</button>${range(2, 15).map(n => `<button type="button" class="btn sm ${on.has(n) ? "on" : ""}" data-l="${n}">${n}</button>`).join("")}</div>`; };
const paintLens = box => { const on = new Set(lensOf(box.querySelector("input").value)); box.querySelectorAll("[data-l]").forEach(x => x.classList.toggle("on", +x.dataset.l ? on.has(+x.dataset.l) : !on.size)); };
document.addEventListener("click", ev => {
  const b = ev.target.closest(".lenpick [data-l]"); if (!b) return;
  const box = b.closest(".lenpick"), inp = box.querySelector("input"), n = +b.dataset.l, on = new Set(lensOf(inp.value));
  if (!n) on.clear(); else on.has(n) ? on.delete(n) : on.add(n);
  inp.value = lensOf([...on]).join(","); paintLens(box);
  inp.dispatchEvent(new Event("input", { bubbles: true })); inp.dispatchEvent(new Event("change", { bubbles: true }));
});
const lensText = v => { const l = lensOf(v); return l.length ? `${l.join(", ")} letters` : ""; };

function patternRegex(p) {
  if (!/^[A-Z.?*\[\]^]+$/.test(p)) return null;
  let out = "", inSet = false;
  for (const c of p) {
    if (c === "[") inSet = true; else if (c === "]") inSet = false;
    out += inSet ? (c === "." || c === "?" || c === "*" ? "\\" + c : c) : c === "." || c === "?" ? "[A-Z]" : c === "*" ? "[A-Z]*" : c === "^" ? "" : c;
  }
  try { return new RegExp("^" + out + "$"); } catch { return null; }
}
function runSearch(s) {
  const up = v => (v || "").toUpperCase().replace(/[^A-Z?.*\[\]^]/g, "");
  const letters = v => (v || "").toUpperCase().replace(/[^A-Z]/g, "");
  const pat = up(s.pattern), rack = up(s.rack).replace(/[^A-Z?]/g, "");
  const re = pat ? patternRegex(pat) : null;
  if (pat && !re) return { error: "That pattern isn't valid. Use letters, . or ?, *, and [ABC] sets." };
  const min = +s.min || 0, max = +s.max || 99, lens = new Set(lensOf(s.lens));
  const starts = letters(s.starts), ends = letters(s.ends), contains = letters(s.contains);
  const incl = counts(letters(s.incl)), excl = new Set(letters(s.excl));
  const def = (s.def || "").trim().toLowerCase();
  const group = s.group ? groupOf(s.group) : null;
  const ar = anaRange(s.anas);
  const rl = rack.replace(/\?/g, ""), rb = rack.length - rl.length, rc = counts(rl);
  const masks = rack && rb ? new Map() : null;
  const pool = rack && s.mode === "exact" ? BYLEN[rack.length] || [] : group ? groupWords(group) : ALL;
  const out = [];
  for (const w of pool) {
    const len = w.length;
    if (len < min || len > max || (lens.size && !lens.has(len))) continue;
    if (starts && !w.startsWith(starts)) continue;
    if (ends && !w.endsWith(ends)) continue;
    if (contains && !w.includes(contains)) continue;
    if (re && !re.test(w)) continue;
    if (excl.size && [...w].some(c => excl.has(c))) continue;
    const e = DICT.get(w);
    if (ar) { const n = ANA.get(alpha(w)).length; if (n < ar[0] || n > ar[1]) continue; }
    if (group && !group.test(w, e)) continue;
    if (Object.keys(incl).length) { const wc = counts(w); if (Object.entries(incl).some(([c, n]) => (wc[c] || 0) < n)) continue; }
    if (rack) {
      if (s.mode === "exact" || s.mode === "build") { if (blanksNeeded(w, rc) > rb) continue; }
      else { const wc = counts(w); if (len < rl.length || Object.entries(rc).some(([c, n]) => (wc[c] || 0) < n)) continue; }
      if (masks && s.mode !== "super") masks.set(w, blankMask(w, rc));
    }
    if (def && !e.d.toLowerCase().includes(def)) continue;
    out.push(w);
  }
  return { words: likelyRange(out, s.pfrom, s.pto, s.pby, s.plax), masks };
}

// "Most likely words" (Search and Practice): All, a usual amount, or ranks from–to, all on one line.
// Ranks count in probability order within each length of the words found, so 100 with 7s and 8s keeps the top 100 of each
const LIKELY = [30, 50, 100, 500];
const likelyField = (pre, from, to, by = "rank", lax = false) => `<div class="field wide"><span class="flabel">Probability rank</span><div class="numpick likely">
    <button type="button" class="btn sm ${+from > 1 || +to ? "" : "on"}" data-lk="0">All</button>${LIKELY.map(n => `<button type="button" class="btn sm ${!(+from > 1) && +to === n ? "on" : ""}" data-lk="${n}">${n}</button>`).join("")}
    <span class="lkr"><span class="small">or</span><input id="${pre}from" value="${esc(from || "")}" placeholder="1" inputmode="numeric" aria-label="From rank"><span class="small">to</span><input id="${pre}to" value="${esc(to || "")}" placeholder="all" inputmode="numeric" aria-label="To rank"></span></div>
    <div class="lkopts"><select id="${pre}by" aria-label="Count the ranks"><option value="rank" ${by !== "place" ? "selected" : ""}>Each word's own rank</option><option value="place" ${by === "place" ? "selected" : ""}>Place in these results</option></select>
      <label class="check small"><input type="checkbox" id="${pre}lax" ${lax ? "checked" : ""}> Lax (keep ties at the edges)</label></div></div>`;
const paintLikely = box => { const [f, t] = box.querySelectorAll("input"); box.querySelectorAll("[data-lk]").forEach(b => b.classList.toggle("on", +b.dataset.lk ? !(+f.value > 1) && +t.value === +b.dataset.lk : !(+f.value > 1) && !+t.value)); };
document.addEventListener("click", ev => {
  const b = ev.target.closest(".likely [data-lk]"); if (!b) return;
  const box = b.closest(".likely"), [f, t] = box.querySelectorAll("input");
  f.value = ""; t.value = +b.dataset.lk || ""; paintLikely(box);
  t.dispatchEvent(new Event("input", { bubbles: true })); box.dispatchEvent(new Event("likely", { bubbles: true }));
});
document.addEventListener("input", ev => { const box = ev.target.closest?.(".likely"); if (box) paintLikely(box); });
// a probability range, counted within each length. by "rank": the word's own rank among every word of its length
// (#100 to #300 of the 7s, keeping those that match); by "place": its place among these words, most likely first.
// lax: words exactly as likely as the ones at the edges come too, so a range never splits a tie (Zyzzyva's "lax")
const ranked = {};
const wordAtRank = (n, r) => (ranked[n] ||= [...BYLEN[n]].sort((a, b) => DICT.get(a).p - DICT.get(b).p))[r - 1];
function likelyRange(words, from, to, by = "rank", lax = false) {
  from = parseInt(from) || 0; to = parseInt(to) || 0;
  if (from && to && to < from) [from, to] = [to, from];
  if (!(from > 1 || to)) return words;
  const lo = Math.max(1, from), hi = to || Infinity, keep = new Set(), groups = {};
  for (const w of words) (groups[w.length] ||= []).push(w);
  for (const [n, ws] of Object.entries(groups)) {
    const list = by === "place" ? [...ws].sort(sorters.prob) : ws, rank = (w, i) => by === "place" ? i + 1 : DICT.get(w).p;
    const edge = r => { const w = by === "place" ? list[r - 1] : wordAtRank(+n, r); return w ? draws(alpha(w)) : null; };
    const dLo = lax ? edge(lo) : null, dHi = lax && hi !== Infinity ? edge(hi) : null;
    list.forEach((w, i) => {
      const r = rank(w, i);
      if (r >= lo && r <= hi) keep.add(w);
      else if (lax && (r < lo ? dLo : dHi) === draws(alpha(w))) keep.add(w);
    });
  }
  return words.filter(w => keep.has(w));
}
const likelyText = (from, to, by = "rank", lax) => (+from > 1 ? (by === "place" ? `Places ${from}–${to || "all"}` : `#${from}–${to ? "#" + to : "end"}`)
  : +to ? (by === "place" ? `${to} most likely here` : `Top ${to} of each length`) : "") + (lax && (+from > 1 || +to) ? " (lax)" : "");
// anagrams: how many words the rack makes, typed as 3, 2-4 or 5+
const anaRange = v => { const m = String(v || "").match(/^\s*(\d+)\s*(?:([-–]\s*(\d+))|(\+))?\s*$/); if (!m) return null; const lo = +m[1], hi = m[4] ? Infinity : m[3] ? +m[3] : lo; return lo > hi ? [hi, lo] : [lo, hi]; };
const anaText = v => { const r = anaRange(v); return r ? `${r[1] === Infinity ? r[0] + "+" : r[0] === r[1] ? r[0] : r[0] + "–" + r[1]} anagram${r[0] === 1 && r[1] === 1 ? "" : "s"}` : ""; };
// the two search sections' fields (letters come from the top bar), shared by the folding form and the phone's sheets
function searchSecs(s) {
  const f = (id, label, p, hint = "", cls = "") => `<div class="field"><label for="s_${id}">${label}</label><input id="s_${id}" class="${cls}" value="${esc(s[id])}" placeholder="${p}" spellcheck="false" autocorrect="off" autocapitalize="${cls ? "none" : "characters"}">${hint ? `<span class="hint">${hint}</span>` : ""}</div>`;
  return {
    group: `<div class="form">
        <div class="field wide"><label for="s_group">Group</label><select id="s_group"><option value="">Any word</option>${groupOptions(s.group)}</select>
          <span class="hint" id="groupHint">${esc(groupOf(s.group)?.blurb || "")}</span></div>
        <div class="field wide"><span class="flabel">Length</span>${lenPick("s_lens", s.lens)}</div>
      </div>`,
    narrow: `<div class="form">
        ${f("def", "Definition contains", "e.g. fish", "", "lc")}
        ${f("starts", "Starts with", "e.g. UN")}
        ${f("ends", "Ends with", "e.g. ZA")}
        ${f("contains", "Contains in a row", "e.g. QI")}
        ${f("incl", "Must include", "e.g. VV")}
        ${f("excl", "Must exclude", "e.g. AEIOU")}
        ${f("anas", "Anagrams", "e.g. 3, 2-4 or 5+")}
        ${likelyField("s_p", s.pfrom, s.pto, s.pby, s.plax)}
      </div>`,
  };
}
const SEARCH_SECS = { group: ["Group and length", ["group", "lens"]], narrow: ["Filters", ["def", "starts", "ends", "contains", "incl", "excl", "anas", "pfrom", "pto", "pby", "plax"]] };
VIEWS.search = () => {
  if (phone()) return searchPhone();
  const s = searchState, secs = searchSecs(s);
  // each section folds; it starts open if it was left open or has something filled in
  // searching from the top bar folds every section so the results show straight away
  const fold = searchFromBar; searchFromBar = false;
  const opened = fold ? {} : store.get("searchOpen", { group: true });
  const acc = (key, title) => `<details class="fs acc" data-acc="${key}" ${!fold && (opened[key] || accSummary(key)) ? "open" : ""}><summary class="lbl">${title}<span class="accn" id="accn_${key}">${esc(accSummary(key))}</span></summary>`;
  $("#view").innerHTML = `${searchTabsHTML()}<div class="card">
    <form id="sform" autocomplete="off">
      ${acc("group", "Group and length")}${secs.group}</details>
      ${acc("narrow", "Filters")}${secs.narrow}</details>
      <div class="actions">
        <button class="btn primary" type="submit">Search</button>
        <button class="btn" type="button" id="sClear">Clear all</button>
      </div>
    </form>
  </div>
  ${typeBar()}
  <div class="card" id="sres"><p class="empty">Pick a group or fill in any options, then press Search. Hooks show either side of each word; red lowercase letters are blanks.</p></div>`;
  const read = () => { for (const k of Object.keys(SEARCH_DEFAULT)) { const el = $("#s_" + k); if (el) searchState[k] = el.type === "checkbox" ? (el.checked ? "1" : "") : el.value; } store.set("search", searchState); };
  $("#sform").querySelectorAll("details.acc").forEach(d => d.addEventListener("toggle", () => { const o = store.get("searchOpen", { group: true }); o[d.dataset.acc] = d.open; store.set("searchOpen", o); }));
  $("#sform").addEventListener("input", () => { read(); nameSearchTab(); for (const k of ["group", "narrow"]) $("#accn_" + k).textContent = accSummary(k); });
  $("#s_group").onchange = e => { $("#groupHint").textContent = groupOf(e.target.value)?.blurb || ""; read(); nameSearchTab(); doSearch(); };
  $("#sform").addEventListener("submit", ev => { ev.preventDefault(); read(); doSearch(); });
  $("#sClear").onclick = () => { searchState = { ...SEARCH_DEFAULT }; store.set("search", searchState); VIEWS.search(); };
  bindTypeBar(); bindSearchTabs();
  if (Object.entries(searchState).some(([k, v]) => v && v !== SEARCH_DEFAULT[k])) doSearch();
};
// short "what's set" text shown beside each folded search section
let searchFromBar = false;
// search tabs, like a browser's: each keeps its own search and scroll place (on this device only). The open tab's
// search is searchState (saved as "search"); the others wait in "searchTabs"
const MAX_TABS = 8;
let searchTabs = store.get("searchTabs", null), searchTabOn = store.get("searchTabOn", 0);
if (!Array.isArray(searchTabs) || !searchTabs.length) { searchTabs = [{ id: 1, s: { ...searchState }, y: 0 }]; searchTabOn = 1; }
if (!searchTabs.some(t => t.id === searchTabOn)) searchTabOn = searchTabs[0].id;
const searchSet = s => Object.entries(s).some(([k, v]) => !["mode", "from", "to"].includes(k) && v);
function searchName(s) {
  return [barText(s), groupOf(s.group)?.name, !groupOf(s.group)?.len && lensText(s.lens), accSummary("narrow", s)].filter(Boolean).join(" · ") || "New search";
}
// the open tab's name follows the filters as they're filled in
function nameSearchTab() {
  const t = $("#view .stab.on"), n = searchName(searchState);
  if (t) { t.title = n; t.querySelector("b").textContent = n; }
}
// a search started from another page gets its own tab (or the open one, if that's still empty)
function searchInNewTab(s) {
  saveSearchTabs();
  if (searchSet(searchState)) {
    if (searchTabs.length >= MAX_TABS) searchTabs.splice(searchTabs.findIndex(t => t.id !== searchTabOn), 1);
    const id = Math.max(...searchTabs.map(t => t.id)) + 1;
    searchTabs.push({ id, s: {}, y: 0 }); searchTabOn = id;
  }
  searchState = { ...SEARCH_DEFAULT, ...s }; store.set("search", searchState); saveSearchTabs();
}
function saveSearchTabs() {
  const on = searchTabs.find(t => t.id === searchTabOn);
  if (on) on.s = { ...searchState };
  store.set("searchTabs", searchTabs); store.set("searchTabOn", searchTabOn);
}
function searchTabsHTML() {
  saveSearchTabs();
  return `<div class="stabs" role="tablist">${searchTabs.map(t => `<span class="stab ${t.id === searchTabOn ? "on" : ""}" role="tab" aria-selected="${t.id === searchTabOn}" data-stab="${t.id}" title="${esc(searchName(t.s))}"><b>${esc(searchName(t.s))}</b><button type="button" class="x" data-stabx="${t.id}" aria-label="Close tab">×</button></span>`).join("")}
    <button type="button" class="stab plus" id="stabNew" ${searchTabs.length >= MAX_TABS ? `disabled title="Up to ${MAX_TABS} tabs: close one first"` : `title="New search tab"`} aria-label="New search tab">+</button></div>`;
}
function openSearchTab(id, s) {
  const cur = searchTabs.find(t => t.id === searchTabOn);
  if (cur) cur.y = window.scrollY;
  if (s) { id = Math.max(...searchTabs.map(t => t.id)) + 1; searchTabs.push({ id, s, y: 0 }); }
  const t = searchTabs.find(x => x.id === id);
  searchTabOn = id; searchState = { ...SEARCH_DEFAULT, ...t.s }; store.set("search", searchState);
  VIEWS.search(); window.scrollTo({ top: 0 }); pendingScroll = t.y || 0; restoreScroll();
}
function bindSearchTabs() {
  const v = $("#view");
  v.querySelectorAll("[data-stab]").forEach(el => el.onclick = ev => {
    const x = ev.target.closest("[data-stabx]");
    if (x) return closeSearchTab(+x.dataset.stabx);
    if (+el.dataset.stab !== searchTabOn) openSearchTab(+el.dataset.stab);
  });
  $("#stabNew").onclick = () => openSearchTab(0, { ...SEARCH_DEFAULT });
  v.querySelector(".stab.on")?.scrollIntoView({ block: "nearest", inline: "nearest" });
}
function closeSearchTab(id) {
  const i = searchTabs.findIndex(t => t.id === id);
  if (searchTabs.length === 1) { searchTabs[0].s = { ...SEARCH_DEFAULT }; searchTabs[0].y = 0; return openSearchTab(searchTabs[0].id); }
  searchTabs.splice(i, 1);
  if (id === searchTabOn) { searchTabOn = 0; openSearchTab(searchTabs[Math.min(i, searchTabs.length - 1)].id); return; }
  // closing another tab leaves the page as it is
  saveSearchTabs();
  $(`#view [data-stab="${id}"]`)?.remove();
  const plus = $("#stabNew"); plus.disabled = false; plus.title = "New search tab";
}
// recent searches: the last 10 that ran, newest first, shown under the empty search bar
const getRecent = () => store.get("searchRecent", []);
const searchKey = s => JSON.stringify(Object.keys(SEARCH_DEFAULT).filter(k => !["from", "to"].includes(k) && s[k] && s[k] !== SEARCH_DEFAULT[k]).map(k => [k, s[k]]));
function addRecentSearch(s, n) {
  if (!searchSet(s)) return;
  const key = searchKey(s);
  store.set("searchRecent", [{ s: { ...s }, n, t: Date.now() }, ...getRecent().filter(r => searchKey(r.s) !== key)].slice(0, 10));
}
// the top bar guesses what kind of search it is: letters (blanks only at the end) are an anagram, ? or . anywhere
// else is a fixed-position pattern, and * means starts with (QU*), ends with (*ING), contains (*QU*) or has any of (*[JX]*)
const LETTER_KEYS = ["pattern", "rack", "mode", "starts", "ends", "contains", "from", "to"];
function barSearch(q) {
  let m;
  if (/^[A-Z]+\?*$/.test(q)) return { rack: q, mode: "exact" };
  if ((m = q.match(/^\*([A-Z]+)\*$/))) return { contains: m[1] };
  if ((m = q.match(/^([A-Z]*)\*([A-Z]*)$/)) && (m[1] || m[2])) return { starts: m[1], ends: m[2] };
  return { pattern: q };
}
// and back: the letters part of a search, as it would be typed in the top bar
function barText(s) {
  const t = s.rack || s.pattern || (s.contains ? `*${s.contains}*` : s.starts || s.ends ? `${s.starts}*${s.ends}` : "");
  return t.toUpperCase();
}
const patLabel = p => { const m = p.toUpperCase().match(/^\*\[([A-Z]+)\]\*$/); return m ? `Has ${[...m[1]].join(" or ")}` : `Pattern ${p.toUpperCase()}`; };
// Anagram / Build / Contains all / Pattern: the same letters run as another kind of search
const STYPES = [["exact", "Anagram"], ["build", "Subanagram"], ["super", "Superanagram"], ["pattern", "Pattern"]];
function typeBar() {
  const s = searchState, l = (s.rack || s.pattern || "").toUpperCase();
  if (!/^[A-Z?.]+$/.test(l) || (s.rack && s.pattern)) return "";
  const cur = s.rack ? s.mode : "pattern";
  return `<div class="seg stype">${STYPES.map(([k, n]) => `<button type="button" class="btn sm ${k === cur ? "on" : ""}" data-stype="${k}">${n}</button>`).join("")}</div>`;
}
function bindTypeBar() {
  $("#q").value = barText(searchState);
  $("#view").querySelectorAll("[data-stype]").forEach(b => b.onclick = () => {
    const s = searchState, l = (s.rack || s.pattern).toUpperCase(), k = b.dataset.stype;
    Object.assign(s, k === "pattern" ? { rack: "", mode: "exact", pattern: l } : { pattern: "", rack: l.replace(/\./g, "?"), mode: k }, { from: "", to: "" });
    store.set("search", s); searchFromBar = true; VIEWS.search();
  });
}
function accSummary(key, s = searchState) {
  const up = v => String(v || "").toUpperCase();
  const parts = {
    group: [groupOf(s.group)?.name, lensText(s.lens)],
    letters: [s.pattern && patLabel(s.pattern), s.rack && `rack ${up(s.rack)}`],
    narrow: [s.def && `“${s.def}”`, s.starts && `${up(s.starts)}…`, s.ends && `…${up(s.ends)}`, s.contains && `has ${up(s.contains)}`,
      s.incl && `uses ${up(s.incl)}`, s.excl && `no ${up(s.excl)}`, anaText(s.anas).toLowerCase(), likelyText(s.pfrom, s.pto, s.pby, s.plax).toLowerCase()],
  }[key];
  return parts.filter(Boolean).join(" · ");
}
function doSearch() {
  const box = $("#sres"), s = searchState;
  if (!Object.entries(s).some(([k, v]) => !["mode", "from", "to"].includes(k) && v)) { box.innerHTML = `<p class="empty">Pick a group or set at least one option.</p>`; return; }
  box.innerHTML = `<p class="small">Searching…</p>`;
  setTimeout(() => {
    const r = runSearch(s);
    if (r.error) { box.innerHTML = `<p class="empty">${esc(r.error)}</p>`; return; }
    addRecentSearch(s, r.words.length);
    const g = s.group && groupOf(s.group);
    const onlyGroup = g && !Object.entries(s).some(([k, v]) => !["mode", "group", "from", "to"].includes(k) && v);
    results(box, r.words, { masks: r.masks, len: onlyGroup ? g.len : 0, range: { from: s.from, to: s.to, save: (from, to) => { searchState.from = from; searchState.to = to; store.set("search", searchState); } } });
  }, 10);
}
// phone search: each filter that's set is a chip (× removes it); tapping a chip or a "+" opens that section in a bottom sheet
function searchPhone() {
  searchFromBar = false;
  const s = searchState, up = v => String(v || "").toUpperCase();
  const chips = [
    ["group", groupOf(s.group)?.name, ["group"]], ["narrow", s.def && `“${s.def}”`, ["def"]],
    ["bar", s.pattern && patLabel(s.pattern), ["pattern"]], ["bar", s.rack && `Rack ${up(s.rack)}${s.mode === "build" ? " · subanagram" : s.mode === "super" ? " · superanagram" : ""}`, ["rack", "mode"]],
    ["group", lensText(s.lens), ["lens"]], ["narrow", s.starts && `${up(s.starts)}…`, ["starts"]], ["narrow", s.ends && `…${up(s.ends)}`, ["ends"]],
    ["narrow", s.contains && `Has ${up(s.contains)}`, ["contains"]], ["narrow", s.incl && `Uses ${up(s.incl)}`, ["incl"]], ["narrow", s.excl && `No ${up(s.excl)}`, ["excl"]], ["narrow", anaText(s.anas), ["anas"]], ["narrow", likelyText(s.pfrom, s.pto, s.pby, s.plax), ["pfrom", "pto", "pby", "plax"]],
  ].filter(c => c[1]);
  const secs = searchSecs(s);
  $("#view").innerHTML = `${searchTabsHTML()}<div class="filterbar"><div class="hscroll">
      ${chips.map((c, i) => `<span class="pill on" data-sheet="${c[0]}">${esc(c[1])}<button type="button" class="x" data-clear="${i}" aria-label="Remove">×</button></span>`).join("")}
      ${[["group", "Group"], ["narrow", "Filters"]].map(([k, n]) => `<button type="button" class="pill add" data-sheet="${k}">+ ${n}</button>`).join("")}
      ${chips.length > 1 ? `<button type="button" class="pill add" id="sClear">Clear all</button>` : ""}</div></div>
    ${typeBar()}
    <div class="card" id="sres"><p class="empty">Type letters in the search bar, or tap + Group or + Filters. Hooks show either side of each word; red lowercase letters are blanks.</p></div>
    ${sheetHTML("ssheet", `<form id="sform" autocomplete="off">${Object.entries(SEARCH_SECS).map(([k, [t]]) => `<div data-sec="${k}"><h3>${t}<button type="button" data-reset="${k}">Reset</button></h3>${secs[k]}</div>`).join("")}
      <button class="btn primary block" type="submit" id="sGo">Show results</button></form>`)}`;
  const read = () => { for (const k of Object.keys(SEARCH_DEFAULT)) { const el = $("#s_" + k); if (el) searchState[k] = el.type === "checkbox" ? (el.checked ? "1" : "") : el.value; } store.set("search", searchState); };
  // live count on the sheet's button
  let ct;
  const count = () => { clearTimeout(ct); ct = setTimeout(() => {
    if (!Object.entries(searchState).some(([k, v]) => !["mode", "from", "to"].includes(k) && v)) { $("#sGo").textContent = "Show results"; return; }
    const r = runSearch(searchState);
    $("#sGo").textContent = r.error ? "Check the pattern" : `Show ${r.words.length.toLocaleString()} word${r.words.length === 1 ? "" : "s"}`;
  }, 200); };
  const v = $("#view");
  v.querySelectorAll("[data-sheet]").forEach(b => b.onclick = ev => {
    if (ev.target.closest("[data-clear]")) return;
    // letters come from the top bar, so their chip just goes back to it
    if (b.dataset.sheet === "bar") return $("#q").focus();
    v.querySelectorAll("[data-sec]").forEach(d => d.hidden = d.dataset.sec !== b.dataset.sheet);
    sheet("ssheet", true); count();
  });
  v.querySelectorAll("[data-clear]").forEach(b => b.onclick = () => { for (const k of chips[+b.dataset.clear][2]) searchState[k] = SEARCH_DEFAULT[k]; store.set("search", searchState); searchPhone(); });
  $("#sClear")?.addEventListener("click", () => { searchState = { ...SEARCH_DEFAULT }; store.set("search", searchState); searchPhone(); });
  v.querySelectorAll("[data-reset]").forEach(b => b.onclick = () => {
    for (const k of SEARCH_SECS[b.dataset.reset][1]) { const el = $("#s_" + k); if (el) el.value = SEARCH_DEFAULT[k]; }
    $("#groupHint").textContent = groupOf($("#s_group").value)?.blurb || ""; syncPick($("#s_group")); v.querySelectorAll(".lenpick").forEach(paintLens); v.querySelectorAll(".likely").forEach(paintLikely); read(); count();
  });
  $("#sform").addEventListener("input", () => { read(); nameSearchTab(); count(); });
  $("#s_group").onchange = e => { $("#groupHint").textContent = groupOf(e.target.value)?.blurb || ""; read(); nameSearchTab(); count(); };
  // closing the sheet either way applies what's in it
  const apply = () => { read(); sheet("ssheet", false); searchPhone(); };
  $("#sform").addEventListener("submit", ev => { ev.preventDefault(); apply(); });
  $("#ssheet .scrim").onclick = apply;
  bindTypeBar(); bindSearchTabs();
  if (Object.entries(searchState).some(([k, v]) => !["mode", "from", "to"].includes(k) && v)) doSearch();
}

// ---------- word lists ----------
VIEWS.lists = (id) => {
  const g = groupOf(id);
  if (!g) return listsHome();
  store.set("lastList", g.id);
  $("#view").innerHTML = `<div class="row"><a class="btn sm" href="#lists">← All lists</a><a class="btn sm" href="#" id="toSearch">Open in Search</a></div>
    <div><h3 class="title">${esc(g.name)}</h3><p class="sub">${esc(g.blurb)}</p></div><div class="card" id="lres"><p class="small">Building list…</p></div>`;
  $("#toSearch").hidden = !!g.special;
  // forget what's been learnt in Practice for this list (asks once more before it clears)
  const racks = new Set(g.special ? [] : groupWords(g).map(alpha)), L = getLearnt(), nL = [...racks].filter(a => L.has(a)).length;
  if (nL) {
    $("#toSearch").insertAdjacentHTML("afterend", `<button type="button" class="btn sm" id="forgetList">Reset learnt (${nL.toLocaleString()})</button>`);
    confirmBtn($("#forgetList"), () => { store.set("plearnt", [...getLearnt()].filter(a => !racks.has(a))); VIEWS.lists(g.id); });
  }
  $("#toSearch").onclick = ev => { ev.preventDefault(); searchInNewTab({ group: g.id }); location.hash = "search"; };
  setTimeout(() => {
    const box = $("#lres");
    if (g.special === "stems") return drawStems(box, g);
    results(box, groupWords(g), { len: g.len });
  }, 10);
};
// lists home: a Continue card for the last list opened, then a row per section (sideways on a phone).
// Bars show how much of each list is learnt in Practice (racks marked known there).
function listsHome() {
  const L = getLearnt();
  const words = x => x.special === "stems" ? stems(x.n).flatMap(s => s.words) : groupWords(x);
  const learnt = x => { const ws = words(x); return [ws.filter(w => L.has(alpha(w))).length, ws.length]; };
  // a sample word for the mini tiles: the first valid example in the blurb, else filled in once the list is built
  const sample = x => x.special === "stems" ? "" : (x.blurb.match(/\b[A-Z]{2,8}\b/g) || []).find(t => DICT.has(t)) || "";
  const last = groupOf(store.get("lastList"));
  let html = `<div class="bigtitle">Word lists</div>`;
  if (last) html += `<div class="cont" data-list="${last.id}"><div class="ct"><small>Continue</small><b>${esc(last.name)}</b><div class="pbar"><div id="pg_cont" style="width:0"></div></div><div class="small" id="cont_n"></div></div>
    ${last.special ? "" : `<button type="button" class="go" data-play="${last.id}" aria-label="Practice ${esc(last.name)}">${ICON_PLAY}</button>`}</div>`;
  let open = false;
  for (const x of GROUPS) {
    if (x.sect) { html += `${open ? "</div></div>" : ""}<div class="carow"><h4>${x.sect}<button type="button" data-all>See all</button></h4><div class="hscroll">`; open = true; continue; }
    const sw = sample(x);
    html += `<button type="button" class="cc" data-list="${x.id}"><span id="sm_${x.id}">${sw ? tilesHTML(sw, true) : ""}</span><b>${esc(x.name)}</b>
      <span class="foot"><i id="cnt_${x.id}">${cache[x.id] ? cache[x.id].length.toLocaleString() + (x.special ? " stems" : " words") : "…"}</i><span class="prog"><i id="pg_${x.id}" style="width:0"></i></span></span></button>`;
  }
  $("#view").innerHTML = html + "</div></div>";
  const v = $("#view");
  v.querySelectorAll("[data-list]").forEach(b => b.onclick = () => location.hash = "lists/" + b.dataset.list);
  v.querySelectorAll("[data-all]").forEach(b => b.onclick = () => { const r = b.closest(".carow"); r.classList.toggle("all"); b.textContent = r.classList.contains("all") ? "Show less" : "See all"; });
  v.querySelector("[data-play]")?.addEventListener("click", ev => { ev.stopPropagation(); saveSettings({ practice: { ...PO_DEFAULT, order: SET.practice?.order || "rand", rev: !!SET.practice?.rev, src: "g:" + last.id, lens: last.len ? [last.len] : [] } }); location.hash = "practice/go"; });
  const fill = x => {
    const ws = groupWords(x), [n, all] = learnt(x), pct = all ? n / all * 100 : 0;
    const c = $("#cnt_" + x.id); if (c) c.textContent = ws.length.toLocaleString() + (x.special ? " stems" : " words") + (n ? ` · ${n.toLocaleString()} learnt` : "");
    const p = $("#pg_" + x.id); if (p) p.style.width = pct + "%";
    const sm = $("#sm_" + x.id); if (sm && !sm.innerHTML) { const s = x.special ? ws[0] : ws.find(w => w.length === (x.len || 4)) || ws[0]; if (s) sm.innerHTML = tilesHTML(s, true); }
    if (x === last) { $("#pg_cont").style.width = pct + "%"; $("#cont_n").textContent = n ? `${n.toLocaleString()} of ${all.toLocaleString()} learnt` : "Nothing learnt yet"; }
  };
  // fill in counts and bars without blocking the first paint, the continue card first
  const todo = [last, ...GROUPS.filter(x => x.id && x !== last)].filter(Boolean);
  const step = () => { const x = todo.shift(); if (!x || location.hash !== "#lists") return; fill(x); setTimeout(step, 0); };
  setTimeout(step, 30);
}
function drawStems(box, g) {
  const data = stems(g.n);
  lastResults = data.flatMap(s => s.words);
  let shown = 25;
  const draw = () => {
    box.innerHTML = `<div class="toolbar"><span class="count">Top ${data.length} stems</span><button class="btn sm" id="quizThese">Quiz the bingos</button></div>
      <p class="small" style="margin:10px 0 0">Learn the red letter string for each stem. Any of those letters plus the stem makes a bingo.</p>` +
      data.slice(0, shown).map(s => {
        const groups = plusOne(s.stem);
        return `<div class="stem"><div class="row">${tilesHTML(s.stem, true)}<b style="font-family:var(--display)">${s.n} bingos</b></div>
          <div class="letters">+ ${groups.map(x => x[0]).join(" ")}</div>
          ${groups.map(([L, ws]) => `<div class="grp"><b>${L}</b><div class="words">${ws.map(chip).join("")}</div></div>`).join("")}</div>`;
      }).join("") + (shown < data.length ? `<button class="btn more" id="moreBtn">Show 25 more</button>` : "");
    $("#moreBtn")?.addEventListener("click", () => { shown += 25; draw(); });
    $("#quizThese").onclick = () => { lastResults = data.flatMap(s => s.words); quizSetup.source = "last"; quizSetup.mode = "anagram"; quizSetup.lens = []; location.hash = "quiz"; };
  };
  draw();
}

// ---------- quiz ----------
const MODES = {
  anagram: { name: "Anagram", help: "See the tiles, type every valid word they make." },
  hooks: { name: "Hooks", help: "See a word, type every letter that can go on its front, and on its back." },
  pattern: { name: "Patterns", help: "See a word with one letter gone, type every letter that fits the gap." },
  phony: { name: "Valid or phony", help: "Is the word good? Phonies are one letter off real words. Keys: V and P." },
  def: { name: "Definition", help: "Read the definition, type the word." },
};
// hooks and patterns, for Quiz and Practice. A pattern is a word with one letter gone ("CA?E"); the answer is every
// letter that makes a word there. The gap goes inside the word (an end gap is just a hook question) where it leaves
// the most choices, so a word's card is the same every time, and CAKE, CARE and CAPE all give CA?E. Words of two
// letters, or with only one choice inside, have the gap at an end
const fitsOf = pat => { const i = pat.indexOf("?"); return [...AZ].filter(c => DICT.has(pat.slice(0, i) + c + pat.slice(i + 1))); };
const fitWords = pat => fitsOf(pat).map(c => pat.replace("?", c));
const patMemo = new Map();
function patternOf(w) {
  let p = patMemo.get(w), n = -1;
  if (p) return p;
  const at = i => w.slice(0, i) + "?" + w.slice(i + 1);
  for (let i = 1; i < w.length - 1; i++) { const k = fitsOf(at(i)).length; if (k > n) { n = k; p = at(i); } }
  if (n < 2) for (const i of [0, w.length - 1]) { const k = fitsOf(at(i)).length; if (k > n) { n = k; p = at(i); } }
  patMemo.set(w, p);
  return p;
}
const hookWords = w => { const e = DICT.get(w); return [...[...e.fh].map(c => c.toUpperCase() + w), ...[...e.bh].map(c => w + c.toUpperCase())]; };
const letterSet = s => [...new Set(String(s || "").toUpperCase().replace(/[^A-Z]/g, ""))].sort().join("");
// the word's tiles with an empty, dashed tile for each gap
const gapTile = `<div class="tile gap">?</div>`, aTile = c => `<div class="tile">${c}<sub>${VALUES[c]}</sub></div>`;
const gapHTML = pat => `<div class="tiles gapt">${[...pat].map(c => c === "?" ? gapTile : aTile(c)).join("")}</div>`;
const hookHTML = w => `<div class="tiles gapt">${gapTile}${[...w].map(aTile).join("")}${gapTile}</div>`;
// a pattern card while you play: each letter that fits makes a word, shown as it's found; dots for the rest
const patChips = (pat, found) => `<div class="found lfound">${fitsOf(pat).map(c => { const w = pat.replace("?", c); return found.includes(c) ? `<a class="w got" href="#w/${w}">${w}</a>` : `<span class="w blank">${"•".repeat(w.length)}</span>`; }).join("")}</div>`;
// one letter typed into a pattern box: a fitting new letter is taken (true), anything else is refused (false)
const flashBox = (el, good) => { el.classList.remove("lgood", "lbad"); void el.offsetWidth; el.classList.add(good ? "lgood" : "lbad"); };
// what you typed against the answer: letters you got, letters you missed, and letters that don't fit
const letterMarks = (typed, want) => { const t = new Set(letterSet(typed)), w = new Set(want);
  return `<span class="lmk">${[...new Set([...want, ...t])].sort().map(c => `<i class="${w.has(c) ? (t.has(c) ? "hit" : "miss") : "extra"}">${c}</i>`).join("") || "<em>none</em>"}</span>`; };
// a first quiz draws from the two-letter words until something is starred
let quizSetup = { source: store.get("stars", []).length ? "stars" : "list:twos", mode: "anagram", ...store.get("quizSetup", {}) };
// lengths used to be one choice ("" any, "main" the list's own length, or a number)
if (!Array.isArray(quizSetup.lens)) {
  const len = quizSetup.len ?? (quizSetup.lenOnly ? "main" : ""), g = groupOf(quizSetup.source.replace("list:", ""));
  quizSetup.lens = len === "main" ? (g?.len ? [g.len] : []) : +len ? [+len] : [];
  delete quizSetup.len; delete quizSetup.lenOnly;
}
// the quiz in progress is kept in storage, so leaving the tab or reloading carries on where it was
let Q = store.get("quiz", null);
const saveQ = () => store.set("quiz", Q);
function quizSources() {
  return [["stars", `Starred words (${getStars().length})`], ["missed", `Missed words (${store.get("missed", []).length})`], ["last", `Last search results (${lastResults.length})`],
    ...getFolders().map(f => ["folder:" + f.id, `📁 ${f.name} (${f.words.length})`])];
}
function sourceWords(src) {
  const g = groupOf(src.replace("list:", ""));
  let words = src === "stars" ? getStars() : src === "missed" ? store.get("missed", []) : src === "last" ? lastResults : src.startsWith("folder:") ? folderById(src.slice(7))?.words || []
    : !g ? [] : g.special === "stems" ? stems(g.n).flatMap(s => s.words) : groupWords(g);
  const lens = quizSetup.lens || [];
  if (lens.length) words = words.filter(w => lens.includes(w.length));
  if (quizSetup.starOnly && src !== "stars") { const s = new Set(getStars()); words = words.filter(w => s.has(w)); }
  if (quizSetup.skipKnown) { const k = new Set(getKnown()); words = words.filter(w => !k.has(w)); }
  return words;
}
function makePhony(w) {
  const V = "AEIOU", C = "BCDFGHKLMNPRSTVWY";
  for (let t = 0; t < 60; t++) {
    const i = Math.floor(Math.random() * w.length), pool = V.includes(w[i]) ? V : C;
    const p = w.slice(0, i) + pool[Math.floor(Math.random() * pool.length)] + w.slice(i + 1);
    if (p !== w && !DICT.has(p)) return p;
  }
  return null;
}
function buildQuestions(words, mode, n, order = "rand", rev = false) {
  let src = [...new Set(words.filter(w => DICT.has(w)))];
  if (mode === "def") src = src.filter(w => !DICT.get(w).d.startsWith("<"));
  // anagrams: one question per rack (the first of its words in the list), so a rack with three words is no likelier than one with one
  if (mode === "anagram") { const rep = new Map(); for (const w of src) if (!rep.has(alpha(w))) rep.set(alpha(w), w); src = ordered([...rep.keys()], order, true, rev).map(a => rep.get(a)); }
  else src = ordered(src, order, false, rev);
  // patterns: one question per pattern, so CAKE and CARE in the list don't both ask CA?E
  if (mode === "pattern") { const seen = new Set(); return src.map(w => ({ w, show: patternOf(w) })).filter(q => !seen.has(q.show) && seen.add(q.show)).slice(0, n); }
  return src.slice(0, n).map(w => {
    if (mode === "phony" && Math.random() * 100 < SET.phony) { const p = makePhony(w); if (p) return { w, show: p, phony: true }; }
    return { w, show: w };
  });
}
// quiz setup, laid out like Practice: a card to carry on a quiz in progress (× on a question pauses it),
// the last quiz's score, then what to quiz on and a big Start button
VIEWS.quiz = () => {
  if (Q && !Q.done && !Q.paused) return drawQuestion();
  document.body.classList.remove("full");
  const going = Q && !Q.done;
  $("#view").innerHTML = `${going ? `<div class="cont" id="qGo"><div class="ct"><small>Quiz in progress</small><b>${MODES[Q.mode].name} · question ${Q.i + 1} of ${Q.qs.length}</b>
      <div class="pbar"><div style="width:${Q.i / Q.qs.length * 100}%"></div></div><div class="small">${Q.right} right · ${Q.wrong.length} missed</div></div>
      <button type="button" class="go" aria-label="Carry on with the quiz">${ICON_PLAY}</button></div>
    <div class="row"><button type="button" class="btn sm" id="qEnd">End this quiz</button></div>` : ""}
  ${Q?.done ? summaryHTML() : ""}
  <div class="card"><h2 class="lbl">Type</h2><div class="seg">${Object.entries(MODES).map(([k, m]) => `<button type="button" class="btn ${k === quizSetup.mode ? "on" : ""}" data-mode="${k}">${m.name}</button>`).join("")}</div>
    <p class="help" style="margin:8px 0 0">${MODES[quizSetup.mode].help} Words you miss go to “Missed words”.</p></div>
  <div class="card"><div class="form">
    <div class="field wide"><label for="qsrc">Words from</label><select id="qsrc">
      <optgroup label="Mine">${quizSources().map(([v, t]) => `<option value="${v}" ${v === quizSetup.source ? "selected" : ""}>${esc(t)}</option>`).join("")}</optgroup>
      ${groupOptions(quizSetup.source.replace("list:", ""), true).replace(/value="/g, 'value="list:')}</select></div>
    <div class="field wide"><span class="flabel">Length</span>${lenPick("qlens", quizSetup.lens)}</div>
    <div class="field wide"><label for="qcount">Questions</label><div class="numpick"><input id="qcount" value="${SET.qcount}" inputmode="numeric" aria-label="Number of questions">${[10, 20, 50, 100].map(n => `<button type="button" class="btn sm ${n === +SET.qcount ? "on" : ""}" data-qn="${n}">${n}</button>`).join("")}</div></div>
    <div class="field wide"><span class="flabel">Order</span>${orderPick("qorder", quizSetup.order, quizSetup.rev)}</div>
    <div class="field wide"><label class="check"><input type="checkbox" id="qstar" ${quizSetup.starOnly ? "checked" : ""}> Only words I've starred</label>
      <label class="check"><input type="checkbox" id="qknown" ${quizSetup.skipKnown ? "checked" : ""}> Leave out words I've crossed off</label></div>
  </div></div>
  <button type="button" class="btn primary block" id="qstart">${going ? "Start a new quiz" : "Start quiz"}</button><p class="small" id="qmsg" style="text-align:center;margin:-6px 0 0"></p>`;
  $("#view").querySelectorAll("[data-mode]").forEach(b => b.onclick = () => { quizSetup.mode = b.dataset.mode; store.set("quizSetup", quizSetup); VIEWS.quiz(); });
  // live count of the words the chosen options give
  const count = () => { const n = new Set(sourceWords(quizSetup.source).filter(w => DICT.has(w))).size; $("#qmsg").textContent = `${n.toLocaleString()} word${n === 1 ? "" : "s"} to draw from`; };
  // picking a list picks its usual length too
  $("#qsrc").onchange = e => { quizSetup.source = e.target.value; const g = groupOf(e.target.value.replace("list:", "")); quizSetup.lens = g?.len ? [g.len] : []; store.set("quizSetup", quizSetup); VIEWS.quiz(); };
  // type any number of questions, or pick one of the usual ones
  const setCount = n => { n = Math.min(500, Math.max(1, parseInt(n) || 20)); saveSettings({ qcount: n }); $("#qcount").value = n; $("#view").querySelectorAll("[data-qn]").forEach(b => b.classList.toggle("on", +b.dataset.qn === n)); };
  $("#qcount").onchange = e => setCount(e.target.value);
  $("#view").querySelectorAll("[data-qn]").forEach(b => b.onclick = () => setCount(b.dataset.qn));
  $("#qlens").onchange = e => { quizSetup.lens = lensOf(e.target.value); store.set("quizSetup", quizSetup); count(); };
  $("#qstar").onchange = e => { quizSetup.starOnly = e.target.checked; count(); };
  $("#qknown").onchange = e => { quizSetup.skipKnown = e.target.checked; store.set("quizSetup", quizSetup); count(); };
  const wireQOrder = () => {
    $("#view").querySelectorAll("#qorder [data-order]").forEach(b => b.onclick = () => { quizSetup.order = b.dataset.order; store.set("quizSetup", quizSetup); $("#qorder").outerHTML = orderPick("qorder", quizSetup.order, quizSetup.rev); wireQOrder(); });
    $("#view").querySelectorAll("#qorder [data-rev]").forEach(b => b.onclick = () => { quizSetup.rev = !quizSetup.rev; store.set("quizSetup", quizSetup); $("#qorder").outerHTML = orderPick("qorder", quizSetup.order, quizSetup.rev); wireQOrder(); });
  };
  wireQOrder();
  count();
  const begin = (qs, mode = quizSetup.mode) => { Q = { mode, qs, i: 0, right: 0, wrong: [], answered: false, done: false, start: Date.now(), res: [] }; drawQuestion(); window.scrollTo(0, 0); };
  $("#qstart").onclick = () => {
    store.set("quizSetup", quizSetup);
    const qs = buildQuestions(sourceWords(quizSetup.source), quizSetup.mode, +SET.qcount, quizSetup.order, quizSetup.rev);
    if (!qs.length) { $("#qmsg").textContent = "No words there yet. Star some words or pick a list."; return; }
    begin(qs);
  };
  $("#qGo")?.addEventListener("click", () => { Q.paused = false; drawQuestion(); window.scrollTo(0, 0); });
  $("#qEnd")?.addEventListener("click", () => { commitQuiz(); Q.done = true; Q.answered = false; saveQ(); VIEWS.quiz(); });
  $("#retryMissed")?.addEventListener("click", () => begin(buildQuestions(Q.wrong, Q.mode, 999, quizSetup.order, quizSetup.rev), Q.mode));
};
function summaryHTML() {
  const n = Q.res.length;
  return `<div class="card"><h2 class="lbl">Last quiz${n < Q.qs.length ? ` · ended after ${n} of ${Q.qs.length}` : ""}</h2><p style="margin:0 0 10px"><b style="font:700 1.6rem var(--display)">${Q.right}/${n}</b> correct</p>
    ${Q.wrong.length ? `<p class="small">Missed:</p><div class="words">${Q.wrong.map(chip).join("")}</div><div class="actions"><button class="btn" id="retryMissed">Retry these ${Q.wrong.length}</button></div>` : n ? `<p class="fb ok">Clean sweep.</p>` : ""}</div>`;
}
function record(w, ok) {
  const st = store.get("stats", {}); const s = st[w] || [0, 0]; s[ok ? 0 : 1]++; st[w] = s; store.set("stats", st);
  const m = store.get("missed", []).filter(x => x !== w); if (!ok) m.unshift(w); store.set("missed", m.slice(0, 500));
}
function drawQuestion() {
  const q = Q.qs[Q.i], e = DICT.get(q.w), mode = Q.mode;
  let prompt = "", input = "";
  // a new question starts empty; the same question drawn again (after leaving the tab or a reload) keeps what was found
  if (Q.at !== Q.i) { Q.at = Q.i; Q.found = []; Q.answered = false; }
  const nAna = anagrams(q.w).length;
  const typing = `autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false"`;
  if (mode === "anagram") { prompt = `<div class="slots" id="qslots"></div>`; input = `<div class="rows" id="found" style="margin-top:8px"></div>`; }
  if (mode === "phony") prompt = `<div class="qprompt">${q.show}</div>`;
  if (mode === "pattern") { prompt = gapHTML(q.show); input = `<input class="qinput" id="qp" placeholder="type a letter" ${typing}><p class="q" id="qpleft" style="margin:10px 0 4px"></p><div id="qpchips"></div>`; }
  if (mode === "hooks") { prompt = hookHTML(q.w); input = `<div class="pair"><input class="qinput" id="qf" placeholder="front hooks" ${typing}><input class="qinput" id="qb" placeholder="back hooks" ${typing}></div><p class="small" style="margin:6px 0 0">Leave blank if none, then press ✓.</p>`; }
  if (mode === "def") { prompt = `<div class="qdef">${esc(e.d)}</div><p class="small" style="margin:0">${q.w.length} letters · <a href="#" id="hint">show tiles</a></p><div id="hintBox"></div>`; input = `<input class="qinput" id="qa" placeholder="The word" ${typing}><p class="small" style="margin:6px 0 0">The right word is taken as you type.</p>`; }
  const rack = mode === "anagram" ? `${rackHTML("qrack")}<div class="rackbtns"><button type="button" class="btn" id="qShuf" aria-label="Shuffle">${icon(ICON_SHUF)}</button><button type="button" class="btn" id="qBack" aria-label="Take back a letter">${icon(ICON_BACK)}</button></div>` : "";
  // full screen on a phone while a question is up, like Practice
  document.body.classList.add("full");
  $("#view").innerHTML = `<div class="foc"><div class="stage">
    <div class="fc-top"><button type="button" class="ib2" id="qquit" aria-label="Leave the quiz" title="Leave the quiz (carry on later)">×</button><div class="pbar"><div style="width:${(Q.i / Q.qs.length) * 100}%"></div></div>
      <span class="n">${Q.i + 1} / ${Q.qs.length}</span><button type="button" class="ib2 phone-only" id="qStatsBtn" aria-label="Stats">${icon('<path d="M5 20V11M12 20V4M19 20v-6"/>')}</button></div>
    <div class="fc-card qcard ${rack ? "" : "solo"}"><p class="q" style="margin:0 0 12px">${MODES[mode].name}${mode === "anagram" ? ` · ${nAna > 1 ? `${nAna} words, find them all` : "one word"}` : ""}</p>
      ${prompt}<form id="qform" autocomplete="off">${input}</form><div id="qfb"></div></div>
    ${rack}
    <div class="thumb" id="qthumb"><div class="acts"><button type="button" class="btn mk" id="qAlt"></button><button type="button" class="btn mk" id="qMain"></button></div></div>
  </div>${quizRail("prail")}</div>` + sheetHTML("qstats", `<h3>Stats<button type="button" id="qStatsDone">Done</button></h3>${quizRail("")}`);
  $("#qStatsBtn").onclick = () => sheet("qstats", true);
  $("#qStatsDone").onclick = $("#qstats .scrim").onclick = () => sheet("qstats", false);
  // before answering: ✗ | ✓ (Phony | Valid in valid-or-phony). Once answered, the right button becomes Next
  // (green if right, orange if wrong) and the left one switches the mark.
  // ✓ means "knew it" for anagrams; for hooks and definitions it checks what was typed.
  const key = k => `<kbd>${k}</kbd>`, tx = t => `<span class="tx">${t}</span>`;
  Q.marks = () => {
    const v = Q.answered ? Q.ok : null, a = $("#qAlt"), m = $("#qMain"), ph = mode === "phony" && v === null;
    a.className = `btn mk ${v === false ? "yes" : "no"}`; a.innerHTML = ph ? `${tx("Phony")}${key("P")}` : `${v === false ? "✓" : "✗"}${key("1")}`;
    a.setAttribute("aria-label", ph ? "Phony" : v === null ? "Didn't know" : v ? "Switch to wrong" : "Switch to right");
    m.className = `btn mk ${v === null ? "yes" : v ? "yes on" : "no on"}`; m.innerHTML = ph ? `${tx("Valid")}${key("V")}` : v === null ? `✓${key("2")}` : `${tx(Q.i + 1 < Q.qs.length ? "Next" : "Finish")}${key("↵")}`;
    m.setAttribute("aria-label", ph ? "Valid" : v === null ? (mode === "anagram" ? "Knew it" : "Check") : "Next question");
  };
  Q.marks();
  $("#qAlt").onclick = () => Q.answered ? Q.mark(!Q.ok) : mode === "phony" ? check("phony") : check(undefined, false);
  $("#qMain").onclick = () => Q.answered ? next() : mode === "phony" ? check("valid") : check(undefined, mode === "anagram" || mode === "pattern" ? true : undefined);
  // × leaves the quiz without ending it; the setup page then has a card to carry on
  $("#qquit").onclick = () => { Q.paused = true; saveQ(); VIEWS.quiz(); window.scrollTo(0, 0); };
  $("#hint")?.addEventListener("click", ev => { ev.preventDefault(); $("#hintBox").innerHTML = tilesHTML(alpha(q.w), true); });
  // on a phone, focusing the box pops the keyboard up over the tiles, so only do it where there's a real keyboard
  if (!(mode === "anagram" && phone())) ($("#qa") || $("#qf") || $("#qp"))?.focus();
  // anagram questions: tiles can be dragged into the slots as well as typed
  const takeWord = v => {
    const want = anagrams(q.w);
    if (Q.answered || !want.includes(v) || Q.found.includes(v)) return false;
    Q.found.push(v); saveQ();
    $("#found").insertAdjacentHTML("beforeend", quizRow(v, "got"));
    if (Q.found.length === want.length) check();
    return true;
  };
  let board = null;
  if (mode === "anagram") {
    board = rackBoard($("#qslots"), $("#qrack"), alpha(q.w), x => { if (Q.answered) return null; const r = takeWord(x); return r && Q.answered ? "keep" : r; });
    $("#qShuf").onclick = board.shuffle; $("#qBack").onclick = board.back;
  }
  // take a correct answer the moment it is typed; with several anagrams, clear the box after each one
  // patterns: a letter at a time, each one that fits shows its word; all found ends the question
  const patDraw = () => { if (mode !== "pattern") return; const want = fitsOf(q.show), f = Q.found.length;
    $("#qpleft").textContent = Q.answered ? "" : `${want.length} letter${want.length === 1 ? " fits" : "s fit"} · ${f} found · ${want.length - f} left`; $("#qpchips").innerHTML = Q.answered ? "" : patChips(q.show, Q.found.join("")); };
  $("#qp")?.addEventListener("input", ev => {
    const t = ev.target.value.toUpperCase().replace(/[^A-Z]/g, ""), want = fitsOf(q.show); ev.target.value = "";
    if (Q.answered || !t) return;
    let good = false, bad = false;
    for (const c of t) { if (want.includes(c) && !Q.found.includes(c)) { Q.found.push(c); good = true; } else if (!Q.found.includes(c)) bad = true; }
    flashBox(ev.target, good && !bad); saveQ(); patDraw();
    if (Q.found.length === want.length) check();
  });
  patDraw();
  $("#qa")?.addEventListener("input", ev => {
    if (Q.answered) return;
    const v = ev.target.value.toUpperCase().replace(/[^A-Z]/g, "");
    if (mode === "def" && (v === q.w || (v.length === q.w.length && DICT.get(v)?.d === e.d))) check();
  });
  $("#qform").addEventListener("submit", ev => { ev.preventDefault(); Q.answered ? next() : check(); });
  // drawn again after leaving: put back the words found, and the mark if it was already answered
  if (mode === "anagram") Q.found.forEach(v => $("#found").insertAdjacentHTML("beforeend", quizRow(v, "got")));
  if (Q.answered) check(undefined, Q.ok);
  saveQ();
  // keys (not while typing in a box): V / P answer valid or phony, 1 is the left button, 2 the right
  document.onkeydown = ev => {
    if (location.hash !== "#quiz" || pkOpen || ev.metaKey || ev.ctrlKey || ev.altKey || ev.target.closest?.("input, textarea, select")) return;
    if (Q.mode === "phony" && !Q.answered) { if (/^[vp]$/i.test(ev.key)) check(ev.key.toLowerCase() === "v" ? "valid" : "phony"); return; }
    // anagrams: letters place tiles, Backspace takes one back, Space shuffles, Enter gives up or moves on
    if (board && /^[a-z]$/i.test(ev.key)) board.type(ev.key.toUpperCase());
    else if (board && ev.key === "Backspace") board.back();
    else if (board && ev.key === " ") { ev.preventDefault(); board.shuffle(); }
    else if (board && ev.key === "Enter" && ev.target === document.body) { ev.preventDefault(); Q.answered ? next() : check(); }
    else if (Q.answered && /^Arrow(Left|Right)$/.test(ev.key)) { if (stepStems(ev.key === "ArrowLeft" ? -1 : 1)) ev.preventDefault(); }
    else if (ev.key === "1") $("#qAlt")?.click();
    else if (ev.key === "2") $("#qMain")?.click();
  };
}
// the stats panel beside a quiz question: score so far, a dot per question, and the words missed
function quizRail(cls) {
  const done = Q.res.length, mins = Math.round((Date.now() - Q.start) / 60000);
  let streak = 0; for (let k = done - 1; k >= 0 && Q.res[k]; k--) streak++;
  return `<aside class="rail ${cls}">
    <div><h4>This quiz<em>${mins ? `${mins} min` : "just started"}</em></h4>
      <div class="kpis"><div><b>${Q.right}/${done}</b><span>right so far</span></div><div><b>${done ? Math.round(Q.right / done * 100) + "%" : "–"}</b><span>accuracy</span></div>
        <div><b>${streak}</b><span>streak</span></div><div><b>${Q.qs.length - done}</b><span>to go</span></div></div></div>
    <div><h4>Questions<em>${Q.i + 1} of ${Q.qs.length}</em></h4>
      <div class="dots">${Q.res.map(x => `<i class="${x ? "" : "x"}"></i>`).join("")}${'<i class="e"></i>'.repeat(Math.max(0, Math.min(Q.qs.length, 100) - done))}</div></div>
    <div><h4>Missed<em>${Q.wrong.length}</em></h4>${Q.wrong.length ? `<div class="words">${Q.wrong.slice(-12).map(w => `<span class="w">${w}</span>`).join("")}</div>` : `<p class="small" style="margin:0">None yet.</p>`}</div>
  </aside>`;
}
// force: the ✓ button counts it right whatever was typed
function check(ans, force) {
  const q = Q.qs[Q.i], e = DICT.get(q.w), mode = Q.mode;
  let ok = false, reveal = "", rest = () => {};
  const letters = s => [...new Set((s || "").toUpperCase().replace(/[^A-Z]/g, ""))].sort().join("");
  if (mode === "anagram") {
    const want = anagrams(q.w);
    ok = want.every(a => Q.found.includes(a));
    // found words are already listed; add the rest, marked to match ✗ / ✓ (redrawn if the mark is switched)
    $("#found").insertAdjacentHTML("beforeend", `<div id="qrest"></div>`);
    rest = v => { $("#qrest").innerHTML = want.filter(w => !Q.found.includes(w)).map(w => quizRow(w, v ? "got" : "miss")).join(""); };
    reveal = !ok && Q.found.length ? `<span class="small">You found ${Q.found.length} of ${want.length}.</span>` : "";
  } else if (mode === "phony") {
    ok = (ans === "phony") === !!q.phony;
    reveal = q.phony ? `<span>${q.show} is phony. It came from</span> ${chip(q.w)}` : `${chip(q.w)} <span>is valid</span>`;
  } else if (mode === "hooks") {
    ok = letters($("#qf").value) === letters(e.fh) && letters($("#qb").value) === letters(e.bh);
    reveal = `<span class="small">front</span> ${letterMarks($("#qf").value, letterSet(e.fh))} <span class="small">back</span> ${letterMarks($("#qb").value, letterSet(e.bh))}`;
  } else if (mode === "pattern") {
    const want = fitsOf(q.show).join("");
    ok = letterSet(Q.found.join("")) === want;
    reveal = `<span class="small">fits</span> ${letterMarks(Q.found.join(""), want)}`;
    $("#qpleft").textContent = ""; $("#qpchips").innerHTML = "";
  } else {
    const g = $("#qa").value.toUpperCase().replace(/[^A-Z]/g, "");
    ok = g === q.w || (g.length === q.w.length && DICT.get(g)?.d === e.d);
    reveal = chip(q.w);
  }
  if (force !== undefined) ok = force;
  Q.answered = true;
  // the mark is only saved on Next, so the left button can still switch it
  $("#qfb").innerHTML = `<p class="fb" id="qverdict" style="margin:12px 0 6px"></p><div class="words" style="align-items:center;justify-content:center">${reveal}</div>
    ${mode === "anagram" ? stemsHTML(alpha(q.w)) : mode === "pattern" ? `<div class="rows" style="margin-top:8px">${fitWords(q.show).map(w => rowHTML(w)).join("")}</div>`
      : mode === "hooks" ? `<div class="rows" style="margin-top:8px">${[q.w, ...hookWords(q.w)].map(w => rowHTML(w)).join("")}</div>` : `<p class="small" style="margin:8px 0 0">${esc(e.d)}</p>`}`;
  const mark = Q.mark = v => { Q.ok = v; rest(v); $("#qverdict").className = "fb " + (v ? "ok" : "no"); $("#qverdict").textContent = v ? "Correct" : "Not quite"; Q.marks(); saveQ(); };
  mark(ok);
  $("#qthumb").hidden = false;
  $("#qMain").focus();
}
function commitQuiz() {
  if (!Q.answered) return;
  const w = Q.qs[Q.i].w;
  if (Q.ok) Q.right++; else Q.wrong.push(w);
  Q.res.push(Q.ok);
  record(w, Q.ok);
}
// a result row for the quiz and practice, marked ✓ or ✗; it opens the word page (the question waits as it was)
const quizRow = (w, cls) => rowHTML(w).replace('class="r"', `class="r ${cls}"`).replace('<span class="wl">', `<span class="wl">${cls === "got" ? "✓ " : "✗ "}`);
// 8-letter racks: the 7-letter bingo racks inside them (one tile taken out), most likely first.
// Shown under the answers once a card is marked; ‹ › or the arrow keys step through them.
function stemsOf(letters) {
  if (letters.length !== 8) return [];
  const best = ws => Math.min(...ws.map(w => DICT.get(w).p)), out = [];
  for (const c of new Set(letters)) { const s = letters.replace(c, ""); if (ANA.has(s)) out.push({ s, c, words: ANA.get(s) }); }
  return out.sort((a, b) => best(a.words) - best(b.words));
}
function stemsHTML(letters, i = 0) {
  const all = stemsOf(letters);
  if (letters.length !== 8) return "";
  if (!all.length) return `<div class="stems"><p class="lbl">Bingo stems</p><p class="small" style="margin:0 0 8px">No 7-letter bingo inside these tiles.</p></div>`;
  const k = (i + all.length) % all.length, st = all[k], eights = ANA.get(letters);
  return `<div class="stems" data-letters="${letters}" data-i="${k}"><p class="lbl"><span>Bingo stems</span><span>${k + 1} of ${all.length}</span></p>
    <div class="stemrow"><button type="button" class="ib2" data-stem="-1" aria-label="Previous stem" ${all.length > 1 ? "" : "disabled"}>‹</button>
      <p><b class="al">${st.s}</b> is ${st.words.map(chip).join(" ")} · add <b class="al">${st.c}</b> to make ${eights.map(chip).join(" ")}</p>
      <button type="button" class="ib2" data-stem="1" aria-label="Next stem" ${all.length > 1 ? "" : "disabled"}>›</button></div></div>`;
}
const stepStems = d => { const b = document.querySelector(".stems[data-letters]"); if (b) b.outerHTML = stemsHTML(b.dataset.letters, +b.dataset.i + d); return !!b; };
document.addEventListener("click", ev => { const b = ev.target.closest("[data-stem]"); if (b) stepStems(+b.dataset.stem); });
function next() {
  commitQuiz();
  Q.i++; Q.answered = false;
  if (Q.i >= Q.qs.length) { Q.done = true; document.onkeydown = null; saveQ(); VIEWS.quiz(); window.scrollTo(0, 0); } else drawQuestion();
}

// ---------- practice: endless anagram cards, no setup ----------
// this practice session (streak, marks) and the card on screen are kept in storage, so leaving the tab or
// reloading comes back to the same card with the words already found
let P = store.get("psess", null);
const saveP = () => store.set("psess", { key: P.key, streak: P.streak, solved: P.solved, seen: P.seen, start: P.start, hist: P.hist.slice(-20) });
// ok: the card's mark once it's marked (null before)
const saveCard = () => store.set("pcur", { key: P.key, letters: P.letters, found: P.found, ok: P.verdict ? P.verdict.ok : null });
// practice options: where words come from + the same filters as Search
const PO_DEFAULT = { mode: "anagram", by: "rank", lax: false, src: "", lens: [7], top: "", starts: "", ends: "", contains: "", incl: "", excl: "", pattern: "", from: "", to: "", anas: "", order: "rand", rev: false };
// the saved options, with a single length from before the length chips turned into a list
function practiceOpts() {
  const sp = SET.practice || {}, o = { ...PO_DEFAULT, ...sp };
  if (!Array.isArray(sp.lens)) o.lens = "len" in sp ? (+sp.len ? [+sp.len] : []) : PO_DEFAULT.lens;
  // the old "top N" box is now the Top buttons of the Probability field
  if (o.top) { if (!o.from && !o.to) o.to = o.top; o.top = ""; }
  delete o.len;
  return o;
}
let poolCache = { key: "", pool: [] };
// practice on "Last search results" keeps the results it started with: a later search doesn't change it
const practiceLast = () => store.get("pLast", null) ?? lastResults;
const keepLast = () => store.set("pLast", [...lastResults]);
function practicePool(o) {
  const folder = o.src.startsWith("f:") ? folderById(o.src.slice(2)) : null;
  const key = JSON.stringify(o) + (o.src.startsWith("my:") || folder || o.starOnly || o.skipKnown ? getStars().length + ":" + store.get("missed", []).length + ":" + practiceLast().length + ":" + (folder?.words.join() || "") + ":" + getKnown().length : "");
  if (poolCache.key === key) return poolCache.pool;
  const g = o.src.startsWith("g:") ? o.src.slice(2) : "";
  const r = runSearch({ ...SEARCH_DEFAULT, group: g, lens: o.lens.join(","), starts: o.starts, ends: o.ends, contains: o.contains, incl: o.incl, excl: o.excl, pattern: o.pattern, anas: o.anas });
  let pool = r.words || [];
  const mine = folder ? folder.words : { "my:stars": getStars(), "my:missed": store.get("missed", []), "my:last": practiceLast() }[o.src];
  if (mine) { const set = new Set(mine); pool = pool.filter(w => set.has(w)); }
  if (o.starOnly) { const set = new Set(getStars()); pool = pool.filter(w => set.has(w)); }
  if (o.skipKnown) { const set = new Set(getKnown()); pool = pool.filter(w => !set.has(w)); }
  // optional rank range, counted in probability order within each length (e.g. ranks 1–50 or 30–80)
  pool = likelyRange(pool, o.from, o.to, o.by, o.lax);
  return (poolCache = { key, pool, error: r.error }).pool;
}
const leftText = () => { const n = P.want.length, f = P.found.length; return n === 1 ? (f ? "Found it" : "1 word") : `${n} words · ${f} found · ${n - f} left`; };
// Review queue, like a cardbox: a missed rack comes back ~4 cards later; each correct
// answer on a review pushes it further out (10, then 25 cards); a third correct retires it.
const GAPS = [4, 10, 25];
const getLearnt = () => new Set(store.get("plearnt", []));
function setLearnt(a, ok) { const L = getLearnt(); ok ? L.add(a) : L.delete(a); store.set("plearnt", [...L]); }
// a practice card: a rack (anagrams), a word (hooks) or a pattern. Learnt and review keys say which ("h:ARE", "p:CA?E";
// racks have none, as before)
const PMODES = [["anagram", "Anagrams"], ["hooks", "Hooks"], ["pattern", "Patterns"]];
const UNITS = { anagram: "racks", hooks: "words", pattern: "patterns" };
const cardKey = (mode, id) => mode === "hooks" ? "h:" + id : mode === "pattern" ? "p:" + id : id;
const cardName = k => k.startsWith("h:") ? k.slice(2) + " hooks" : k.startsWith("p:") ? k.slice(2) : k;
let cardsMemo = { pool: null, mode: "", cards: [] };
function cardsOf(pool, mode) {
  if (cardsMemo.pool !== pool || cardsMemo.mode !== mode) cardsMemo = { pool, mode, cards: [...new Set(mode === "hooks" ? pool : mode === "pattern" ? pool.map(patternOf) : pool.map(alpha))] };
  return cardsMemo.cards;
}
function progress(pool, mode = "anagram") {
  const L = getLearnt(), cards = cardsOf(pool, mode);
  return { racks: cards.filter(c => L.has(cardKey(mode, c))).length, racksAll: cards.length, unit: UNITS[mode] || "racks" };
}
const getPQ = () => store.get("pq", { n: 0, items: [] });
function schedule(a, ok) {
  const q = getPQ(); q.n++;
  const it = q.items.find(x => x.a === a);
  if (!ok) { if (it) { it.lvl = 0; it.due = q.n + GAPS[0]; } else q.items.push({ a, lvl: 0, due: q.n + GAPS[0] }); }
  else if (it) { it.lvl++; if (it.lvl >= GAPS.length) q.items = q.items.filter(x => x !== it); else it.due = q.n + GAPS[it.lvl]; }
  store.set("pq", q);
}
const recent = [];
let rackCache = { pool: null, order: "", rev: false, racks: [] };
// a due review first; otherwise a new rack (each rack as likely as any other, however many words it has),
// either at random (now and then a learnt one) or the next one in the chosen order
function pickPractice(pool, order = "rand", rev = false) {
  if (rackCache.pool !== pool || rackCache.order !== order || rackCache.rev !== rev) { const r = [...new Set(pool.map(alpha))]; rackCache = { pool, order, rev, racks: order === "rand" ? r : ordered(r, order, true, rev) }; }
  const q = getPQ(), racks = rackCache.racks, inPool = new Set(racks);
  const due = q.items.filter(x => x.due <= q.n && inPool.has(x.a) && !recent.includes(x.a)).sort((a, b) => a.due - b.due)[0];
  let a = due ? due.a : null;
  // new racks first; racks waiting in the review queue come back through the queue instead
  const L = getLearnt(), queued = new Set(q.items.map(x => x.a));
  const fresh = racks.filter(c => !L.has(c) && !queued.has(c) && !recent.includes(c));
  if (!a && order !== "rand") a = fresh[0];
  const from = fresh.length && Math.random() < 0.85 ? fresh : racks;
  for (let t = 0; !a && t < 30; t++) { const c = from[Math.floor(Math.random() * from.length)]; if (!recent.includes(c) || t === 29) a = c; }
  recent.unshift(a); recent.length = Math.min(recent.length, Math.min(20, Math.floor(racks.length / 2)));
  return ANA.get(a)[0];
}
// the same for hook and pattern cards: a due review first, then new cards, at random or in the chosen order
let cardCache = { pool: null, mode: "", order: "", rev: false, ids: [] };
function pickCard(pool, mode, order = "rand", rev = false) {
  if (cardCache.pool !== pool || cardCache.mode !== mode || cardCache.order !== order || cardCache.rev !== rev) {
    const ws = order === "rand" ? null : ordered([...new Set(pool)], order, false, rev);
    cardCache = { pool, mode, order, rev, ids: !ws ? cardsOf(pool, mode) : mode === "hooks" ? ws : [...new Set(ws.map(patternOf))] };
  }
  const q = getPQ(), ids = cardCache.ids, key = id => cardKey(mode, id), inPool = new Set(ids.map(key));
  const remember = k => { recent.unshift(k); recent.length = Math.min(recent.length, Math.min(20, Math.floor(ids.length / 2))); };
  const due = q.items.filter(x => x.due <= q.n && inPool.has(x.a) && !recent.includes(x.a)).sort((a, b) => a.due - b.due)[0];
  if (due) { remember(due.a); return due.a.slice(2); }
  const L = getLearnt(), queued = new Set(q.items.map(x => x.a));
  const fresh = ids.filter(c => !L.has(key(c)) && !queued.has(key(c)) && !recent.includes(key(c)));
  let a = order !== "rand" ? fresh[0] : null;
  const from = fresh.length && Math.random() < 0.85 ? fresh : ids;
  for (let t = 0; !a && t < 30; t++) { const c = from[Math.floor(Math.random() * from.length)]; if (!recent.includes(key(c)) || t === 29) a = c; }
  remember(key(a));
  return a;
}
// a practice mark is saved only on Next (or when the options change under a marked card). Until then the marked
// card stays as it is, so opening a word from it and coming back finds it unchanged.
function commitPractice() {
  const c = store.get("pcur"); if (typeof c?.ok !== "boolean") return;
  store.set("pcur", null);
  if (!P) return;
  P.verdict = null; P.seen++; P.hist.push(c.ok);
  const card = c.mode && c.mode !== "anagram" ? cardKey(c.mode, c.card) : c.letters;
  schedule(card, c.ok); setLearnt(card, c.ok);
  if (c.ok) { P.streak++; P.solved++; } else P.streak = 0;
  for (const x of c.mode === "hooks" ? [c.card] : c.mode === "pattern" ? fitWords(c.card) : anagrams(c.letters)) record(x, c.ok);
  saveP();
}
VIEWS.practice = () => {
  const o = practiceOpts();
  const pool = practicePool(o);
  const key = JSON.stringify(o);
  if (store.get("pcur")?.key !== key) commitPractice();
  if (!P || P.key !== key) { P = { key, streak: 0, solved: 0, seen: 0, start: Date.now(), hist: [] }; saveP(); }
  const open = store.get("pOpen", false);
  const tf = (id, label, ph) => `<div class="field"><label for="po_${id}">${label}</label><input id="po_${id}" value="${esc(o[id])}" placeholder="${ph}" spellcheck="false" autocorrect="off" autocapitalize="characters"></div>`;
  // main: where the words come from and their lengths (always in view); more: the rest, folded on the setup page
  const main = `<div class="form">
        <div class="field wide"><span class="flabel">Type</span><div class="seg" id="po_mode">${PMODES.map(([k, n]) => `<button type="button" class="btn sm ${o.mode === k ? "on" : ""}" data-pmode="${k}">${n}</button>`).join("")}</div>
          <p class="small" style="margin:6px 0 0">${o.mode === "hooks" ? "A word: which letters go on its front, and its back?" : o.mode === "pattern" ? "A word with a letter gone: which letters fit the gap?" : "A rack: find every word it makes."}</p></div>
        <div class="field wide"><label for="po_src">Words from</label><select id="po_src"><option value="">Any word</option>
          <optgroup label="Mine"><option value="my:stars" ${o.src === "my:stars" ? "selected" : ""}>Starred words (${getStars().length})</option><option value="my:missed" ${o.src === "my:missed" ? "selected" : ""}>Missed words (${store.get("missed", []).length})</option><option value="my:last" ${o.src === "my:last" ? "selected" : ""}>Last search results (${o.src === "my:last" ? practiceLast().length : lastResults.length})</option>${getFolders().map(f => `<option value="f:${f.id}" ${o.src === "f:" + f.id ? "selected" : ""}>📁 ${esc(f.name)} (${f.words.length})</option>`).join("")}</optgroup>
          ${groupOptions(o.src.startsWith("g:") ? o.src.slice(2) : "").replace(/value="/g, 'value="g:')}</select></div>
        <div class="field wide"><span class="flabel">Length</span>${lenPick("po_lens", o.lens)}</div>
        <div class="field wide"><span class="flabel">Order</span>${orderPick("po_order", o.order, o.rev)}</div>
      </div>`;
  const more = `
    <details class="card" id="pOpts" ${open ? "open" : ""}><summary class="lbl" style="cursor:pointer;margin:0">More options · ${pool.length.toLocaleString()} words in play</summary>
      <div class="form" style="margin-top:12px">
        ${tf("starts", "Starts with", "e.g. UN")}${tf("ends", "Ends with", "e.g. ING")}${tf("contains", "Contains in a row", "e.g. QI")}
        <div class="field"><span class="flabel">Starred</span><label class="check"><input type="checkbox" id="po_star" ${o.starOnly ? "checked" : ""}> Only words I've starred</label>
          <label class="check"><input type="checkbox" id="po_known" ${o.skipKnown ? "checked" : ""}> Leave out words I've crossed off</label></div>
        ${tf("incl", "Must include", "e.g. Z")}${tf("excl", "Must exclude", "e.g. S")}${tf("pattern", "Pattern", "e.g. .A.E*")}
        ${tf("anas", "Anagrams", "e.g. 3, 2-4 or 5+")}
      </div>
      <div style="margin-top:14px">${likelyField("po_", o.from, o.to, o.by, o.lax)}</div>
      <div class="row" style="margin-top:16px">
        <span style="margin-left:auto"></span><button class="btn sm" id="poApply">Apply</button><button class="btn sm" id="poReset">Reset options</button><button class="btn sm" id="poForget">Reset learnt for these words</button>
      </div>

    </details>`;
  const wireOrder = () => {
    $("#view").querySelectorAll("#po_order [data-order]").forEach(b => b.onclick = () => { saveSettings({ practice: { ...o, order: b.dataset.order } }); VIEWS.practice(); });
    $("#view").querySelectorAll("#po_order [data-rev]").forEach(b => b.onclick = () => { saveSettings({ practice: { ...o, rev: !o.rev } }); VIEWS.practice(); });
  };
  const wire = () => {
    // only the setup page's folding box remembers being open (the copy in the sheet is always open)
    if (!$("#pOpts").closest(".sheet")) $("#pOpts").addEventListener("toggle", e => store.set("pOpen", e.target.open));
    wireOrder();
    $("#view").querySelectorAll("[data-pmode]").forEach(b => b.onclick = () => { saveSettings({ practice: { ...o, mode: b.dataset.pmode } }); VIEWS.practice(); });
    $("#po_star").onchange = e => { saveSettings({ practice: { ...o, starOnly: e.target.checked } }); VIEWS.practice(); };
    $("#po_known").onchange = e => { saveSettings({ practice: { ...o, skipKnown: e.target.checked } }); VIEWS.practice(); };
    const read = () => { const n = { ...o }; for (const k of ["src", "starts", "ends", "contains", "incl", "excl", "pattern", "anas", "from", "to", "by"]) n[k] = $("#po_" + k).value.trim(); n.lax = $("#po_lax").checked; n.lens = lensOf($("#po_lens").value); saveSettings({ practice: n }); VIEWS.practice(); };
    // picking a list picks its usual length too
    $("#po_src").onchange = () => { const v = $("#po_src").value; if (v === "my:last") keepLast(); if (v) $("#po_lens").value = v.startsWith("g:") ? groupOf(v.slice(2))?.len || "" : ""; read(); }; $("#po_lens").onchange = read; $("#poApply").onclick = read;
    $("#pOpts").querySelectorAll("input").forEach(i => i.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); read(); } });
    $("#pOpts .likely").addEventListener("likely", read); paintLikely($("#pOpts .likely"));
    $("#po_by").onchange = $("#po_lax").onchange = read;
    $("#poReset").onclick = () => { saveSettings({ practice: { ...PO_DEFAULT } }); VIEWS.practice(); };
    confirmBtn($("#poForget"), () => { const ks = new Set(cardsOf(pool, o.mode).map(c => cardKey(o.mode, c))); store.set("plearnt", [...getLearnt()].filter(a => !ks.has(a))); VIEWS.practice(); });
  };
  return location.hash === "#practice/go" ? practicePlay(pool, o, main + more, wire) : practiceSetup(pool, o, main, more, wire);
};
const lensLabel = o => o.lens.length ? `${o.lens.join(", ")} letters` : "Any length";

// practice card (full screen on a phone). The rack's tiles can be tapped into the next empty slot or dragged
// into any slot (and along the rack to rearrange); a full row is checked straight away. Typing works too:
// a keyboard places tiles, and the keyboard button shows a box for the phone's own keyboard.
let pSheetOpen = false;
function practicePlay(pool, o, opts, wire) {
  const v = $("#view"), pq = getPQ().items.length, pr = progress(pool, o.mode);
  const src = o.src.startsWith("g:") ? groupOf(o.src.slice(2))?.name : { "my:stars": "Starred words", "my:missed": "Missed words", "my:last": "Last search results" }[o.src] || (o.src.startsWith("f:") ? folderById(o.src.slice(2))?.name : "");
  const pills = [o.mode !== "anagram" && PMODES.find(m => m[0] === o.mode)?.[1], lensLabel(o), src, o.order !== "rand" && orderText(o.order, o.rev), o.starOnly && "★ only", likelyText(o.from, o.to, o.by, o.lax), anaText(o.anas), `Streak ${P.streak}`, pq && `${pq} to review`].filter(Boolean);
  const top = `<div class="fc-top"><button type="button" class="ib2" id="pExit" aria-label="Leave practice">×</button><div class="pbar"><div style="width:${pr.racksAll ? pr.racks / pr.racksAll * 100 : 0}%"></div></div>
      <span class="n" title="${pr.unit} learnt">${pr.racks.toLocaleString()} / ${pr.racksAll.toLocaleString()}</span><button type="button" class="ib2 phone-only" id="pStatsBtn" aria-label="Stats">${icon('<path d="M5 20V11M12 20V4M19 20v-6"/>')}</button><button type="button" class="ib2" id="pOptBtn" aria-label="Options">${icon('<path d="M4 6h16M7 12h10M10 18h4"/>')}</button></div>
    <div class="hscroll ppills">${pills.map(p => `<button type="button" class="pill" data-popt>${esc(p)}</button>`).join("")}</div>`;
  const sh = sheetHTML("psheet", `<h3>Practice options<button type="button" id="pDone">Done</button></h3>${opts.replace('id="pOpts"', 'id="pOpts" open')}`)
    + sheetHTML("pstats", `<h3>Stats<button type="button" id="pStatsDone">Done</button></h3>${practiceRail(pr, "")}`);
  const openSheet = on => { pSheetOpen = on; sheet("psheet", on); };
  const wireTop = () => {
    // × leaves to the Practice page (tabs and all); the card is kept and its Continue card brings it back
    $("#pExit").onclick = () => location.replace("#practice");
    v.querySelectorAll("#pOptBtn, [data-popt]").forEach(b => b.onclick = () => openSheet(true));
    $("#pDone").onclick = $("#psheet .scrim").onclick = () => openSheet(false);
    $("#pStatsBtn").onclick = () => sheet("pstats", true);
    $("#pStatsDone").onclick = $("#pstats .scrim").onclick = () => sheet("pstats", false);
    wire();
    if (pSheetOpen) sheet("psheet", true);
  };
  if (!pool.length) {
    v.innerHTML = `<div class="foc"><div class="stage">${top}<div class="fc-card"><p class="empty">${esc(poolCache.error || "No words match these options. Tap ☰ to change them.")}</p></div></div>${practiceRail(pr, "prail")}</div>` + sh;
    return wireTop();
  }
  if (o.mode === "hooks" || o.mode === "pattern") return practiceLetters(pool, o, top, sh, wireTop, pr);
  // the card left last time (same options) comes back with its found words, and its mark if it was marked;
  // otherwise deal a new one
  const cur = store.get("pcur");
  P.done = false; P.verdict = null;
  if (cur?.key === P.key && ANA.has(cur.letters)) { P.letters = cur.letters; P.want = anagrams(cur.letters); P.found = cur.found.filter(x => P.want.includes(x)); }
  else { const w = pickPractice(pool, o.order, !!o.rev); P.letters = alpha(w); P.want = anagrams(w); P.found = []; saveCard(); }
  P.review = !!getPQ().items.find(x => x.a === P.letters);
  const n = P.letters.length, kbd = phone() && store.get("pKbd", false), pad = store.get("pPad", false);
  const key = k => `<kbd>${k}</kbd>`;
  v.innerHTML = `<div class="foc"><div class="stage">${top}<div class="fc-card"><div class="slots" id="pslots"></div>
      <p class="q"><span id="pleft">${leftText()}</span>${P.review ? ` · <b style="color:var(--warn)">review</b>` : ""}</p><div class="found" id="pchips"></div></div>
    ${rackHTML("prack")}
    <div class="rackbtns"><button type="button" class="btn" id="pShuf" aria-label="Shuffle" title="Shuffle (Space)">${icon(ICON_SHUF)}</button>
      <button type="button" class="btn" id="pBack" aria-label="Take back a letter" title="Take back a letter (Backspace)">${icon(ICON_BACK)}</button>
      <button type="button" class="btn ${pad ? "on" : ""}" id="pPad" aria-label="Notepad" title="Notepad: write the words with your finger">${icon('<path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4"/>')}</button>
      <button type="button" class="btn phone-only ${kbd ? "on" : ""}" id="pKbd" aria-label="Type instead">${icon('<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>')}</button></div>
    <div class="notepad" id="ppad" ${pad ? "" : "hidden"}><canvas></canvas><span class="small">Write the words here</span><button type="button" class="btn sm" id="padClear">Clear</button></div>
    <div class="thumb"><input class="qinput" id="pa" placeholder="Type the answer" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" ${kbd ? "" : "hidden"}>
      <div class="acts"><button type="button" class="btn mk" id="pAlt"></button><button type="button" class="btn mk" id="pMain"></button></div></div></div>
    ${practiceRail(pr, "prail")}</div>` + sh;
  // while playing: a chip per word (dots until found). Once marked: the words with hooks and definitions, in the
  // card at the top (each opens its word page; coming back finds this card as it was)
  const chips = () => { $("#pchips").innerHTML = P.done
    ? `<div class="rows sashow">${P.want.map(x => quizRow(x, P.found.includes(x) || P.verdict.ok ? "got" : "miss")).join("")}</div>${stemsHTML(P.letters)}`
    : P.want.map(x => P.found.includes(x) ? `<a class="w got" href="#w/${x}">${x}</a>` : `<span class="w blank">${"•".repeat(x.length)}</span>`).join(""); };
  const finish = ok => {
    P.done = true; P.verdict = { letters: P.letters, want: P.want, ok };
    saveCard(); chips(); marks();
  };
  // before marking: ✗ | ✓. After ✓: ✗ | Next (green). After ✗: ✓ | Next (orange).
  const marks = () => {
    const v = P.done && P.verdict, a = $("#pAlt"), m = $("#pMain");
    a.className = `btn mk ${v && !v.ok ? "yes" : "no"}`; a.innerHTML = `${v && !v.ok ? "✓" : "✗"}${key("1")}`;
    a.setAttribute("aria-label", v ? (v.ok ? "Switch to didn't know" : "Switch to knew it") : "Didn't know");
    m.className = `btn mk ${v ? (v.ok ? "yes on" : "no on") : "yes"}`; m.innerHTML = v ? `<span class="tx">Next</span>${key("↵")}` : `✓${key("2")}`;
    m.setAttribute("aria-label", v ? "Next card" : "Knew it");
  };
  const found = x => { P.found.push(x); saveCard(); $("#pleft").textContent = leftText(); chips(); if (P.found.length === P.want.length) finish(true); };
  // the word that finishes the card stays in the slots
  const board = rackBoard($("#pslots"), $("#prack"), P.letters, x => {
    if (P.done) return null;
    const ok = P.want.includes(x) && !P.found.includes(x);
    if (ok) found(x);
    return ok && P.done ? "keep" : ok;
  });
  $("#pShuf").onclick = board.shuffle;
  $("#pBack").onclick = board.back;
  const np = notepad($("#ppad"));
  $("#pPad").onclick = () => { const on = !store.get("pPad", false); store.set("pPad", on); $("#pPad").classList.toggle("on", on); $("#ppad").hidden = !on; if (on) np.fit(); };
  $("#padClear").onclick = np.clear;
  $("#pKbd").onclick = () => { const k = !store.get("pKbd", false); store.set("pKbd", k); $("#pKbd").classList.toggle("on", k); $("#pa").hidden = !k; if (k) $("#pa").focus(); };
  $("#pa").addEventListener("input", ev => {
    const x = ev.target.value.toUpperCase().replace(/[^A-Z]/g, "");
    if (P.done || !P.want.includes(x) || P.found.includes(x)) return;
    ev.target.value = ""; found(x);
  });
  const nextCard = () => { commitPractice(); VIEWS.practice(); };
  $("#pa").addEventListener("keydown", ev => { if (ev.key === "Enter") { ev.preventDefault(); P.done ? nextCard() : finish(false); } });
  // a keyboard: letters place tiles, Backspace takes one back, Space shuffles, 1 is the left button, 2 or Enter the right
  document.onkeydown = e => {
    if (pSheetOpen || pkOpen || e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.("input, select, textarea") || !$("#prack")) return;
    const k = e.key.toUpperCase();
    if (/^[A-Z]$/.test(k)) board.type(k);
    else if (e.key === "Backspace") board.back();
    else if (e.key === " ") { e.preventDefault(); board.shuffle(); }
    else if (P.done && /^Arrow(Left|Right)$/.test(e.key)) { if (stepStems(e.key === "ArrowLeft" ? -1 : 1)) e.preventDefault(); }
    else if (e.key === "1") $("#pAlt").click();
    else if (e.key === "2" || e.key === "Enter") { e.preventDefault(); $("#pMain").click(); }
  };
  $("#pAlt").onclick = () => finish(P.done ? !P.verdict.ok : false);
  $("#pMain").onclick = () => P.done ? nextCard() : finish(true);
  marks(); chips(); wireTop();
  // a card that was marked (or fully found) before leaving comes back marked
  if (typeof cur?.ok === "boolean" && cur.key === P.key && cur.letters === P.letters) finish(cur.ok);
  else if (P.found.length === P.want.length) finish(true);
}
// the Practice notepad: write with a finger, pen or mouse. It starts blank on each card; Clear wipes it
function notepad(box) {
  const cv = box.querySelector("canvas"), cx = cv.getContext("2d");
  let last = null, mid = null;
  const fit = () => {
    const r = cv.getBoundingClientRect(), d = devicePixelRatio || 1;
    if (!r.width || cv.width === Math.round(r.width * d)) return;
    cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d);
    cx.setTransform(d, 0, 0, d, 0, 0);
    cx.lineCap = cx.lineJoin = "round"; cx.lineWidth = 3.2; cx.strokeStyle = getComputedStyle(box).color;
  };
  const at = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.onpointerdown = e => { fit(); cv.setPointerCapture(e.pointerId); last = mid = at(e); cx.beginPath(); cx.arc(last[0], last[1], cx.lineWidth / 2, 0, 7); cx.fillStyle = cx.strokeStyle; cx.fill(); };
  // smooth strokes: a curve through each point to the middle of the next
  cv.onpointermove = e => {
    if (!last) return;
    const p = at(e), m = [(last[0] + p[0]) / 2, (last[1] + p[1]) / 2];
    cx.beginPath(); cx.moveTo(mid[0], mid[1]); cx.quadraticCurveTo(last[0], last[1], m[0], m[1]); cx.stroke();
    last = p; mid = m;
  };
  cv.onpointerup = cv.onpointercancel = () => { last = null; };
  const clear = () => cx.clearRect(0, 0, cv.width, cv.height);
  if (!box.hidden) requestAnimationFrame(fit);
  return { fit, clear };
}
// a hook or pattern card: the word (gaps dashed), a box for the letters (two for hooks), then ✗ / ✓. Checking shows
// each letter as got, missed or wrong, and every word the card makes
function practiceLetters(pool, o, top, sh, wireTop, pr) {
  const v = $("#view"), mode = o.mode, cur = store.get("pcur");
  const valid = id => mode === "hooks" ? DICT.has(id) : /^[A-Z]*\?[A-Z]*$/.test(id || "") && fitsOf(id).length > 0;
  let card, typed = { f: "", b: "" }, ok = null;
  if (cur?.key === P.key && cur.mode === mode && valid(cur.card)) { card = cur.card; typed = cur.typed || typed; ok = typeof cur.ok === "boolean" ? cur.ok : null; }
  else card = pickCard(pool, mode, o.order, !!o.rev);
  const save = () => store.set("pcur", { key: P.key, mode, card, typed, ok });
  save();
  const review = !!getPQ().items.find(x => x.a === cardKey(mode, card));
  const e = mode === "hooks" ? DICT.get(card) : null, want = mode === "hooks" ? { f: letterSet(e.fh), b: letterSet(e.bh) } : { f: fitsOf(card).join("") };
  const words = mode === "hooks" ? [card, ...hookWords(card)] : fitWords(card);
  const kb = k => `<kbd>${k}</kbd>`, typing = 'autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" enterkeyhint="done"';
  v.innerHTML = `<div class="foc"><div class="stage">${top}<div class="fc-card lcard">
      <p class="q">${mode === "hooks" ? "Which letters go on the front, and the back?" : "Which letters fit the gap?"}${review ? ` · <b style="color:var(--warn)">review</b>` : ""}</p>
      ${mode === "hooks" ? hookHTML(card) : gapHTML(card)}
      <form id="lform" class="lform">${mode === "hooks" ? `<label><span>Front</span><input class="qinput" id="lf" value="${esc(typed.f)}" placeholder="none" ${typing}></label><label><span>Back</span><input class="qinput" id="lb" value="${esc(typed.b)}" placeholder="none" ${typing}></label>`
        : `<label><span>Type a letter</span><input class="qinput" id="lf" placeholder="one at a time" ${typing}></label>`}<button type="submit" hidden></button></form>
      ${mode === "pattern" ? `<p class="q" id="lleft" style="margin:10px 0 4px"></p><div id="lchips"></div>` : ""}
      <div id="lres"></div></div>
    <div class="thumb"><div class="acts"><button type="button" class="btn mk" id="pAlt"></button><button type="button" class="btn mk" id="pMain"></button></div></div></div>
    ${practiceRail(pr, "prail")}</div>` + sh;
  // patterns are typed a letter at a time (each one that fits is kept); hooks are read from their two boxes
  const read = () => { if (mode !== "pattern") typed = { f: $("#lf").value, b: $("#lb")?.value || "" }; };
  const chipsDraw = () => { if (mode !== "pattern") return; const n = want.f.length, f = typed.f.length;
    $("#lleft").textContent = ok !== null ? "" : `${n} letter${n === 1 ? " fits" : "s fit"} · ${f} found · ${n - f} left`; $("#lchips").innerHTML = ok !== null ? "" : patChips(card, typed.f); };
  const marks = () => {
    const a = $("#pAlt"), m = $("#pMain");
    a.className = `btn mk ${ok === false ? "yes" : "no"}`; a.innerHTML = `${ok === false ? "✓" : "✗"}${kb("1")}`;
    a.setAttribute("aria-label", ok === null ? "Didn't know" : ok ? "Switch to didn't know" : "Switch to knew it");
    m.className = `btn mk ${ok === null ? "yes" : ok ? "yes on" : "no on"}`; m.innerHTML = ok === null ? `✓${kb("2")}` : `<span class="tx">Next</span>${kb("↵")}`;
    m.setAttribute("aria-label", ok === null ? "Check" : "Next card");
  };
  const show = () => {
    if (ok === null) { $("#lres").innerHTML = ""; return; }
    $("#lres").innerHTML = `<p class="fb ${ok ? "ok" : "no"}" style="margin:12px 0 6px">${ok ? "Correct" : "Not quite"}</p>
      <p class="lans">${mode === "hooks" ? `<span>Front</span>${letterMarks(typed.f, want.f)}<span>Back</span>${letterMarks(typed.b, want.b)}` : `<span>Fits</span>${letterMarks(typed.f, want.f)}`}</p>
      <div class="rows">${words.map(w => rowHTML(w)).join("")}</div>`;
  };
  const finish = force => { read(); const right = letterSet(typed.f) === want.f && (mode !== "hooks" || letterSet(typed.b) === want.b); ok = force === undefined ? right : force; save(); show(); marks(); chipsDraw(); };
  const nextCard = () => { commitPractice(); VIEWS.practice(); };
  $("#lform").addEventListener("submit", ev => { ev.preventDefault(); ok === null ? finish() : nextCard(); });
  if (mode === "pattern") $("#lf").addEventListener("input", ev => {
    const typedNow = ev.target.value.toUpperCase().replace(/[^A-Z]/g, ""); ev.target.value = "";
    if (ok !== null || !typedNow) return;
    let good = false, bad = false;
    for (const c of typedNow) { if (want.f.includes(c) && !typed.f.includes(c)) { typed.f += c; good = true; } else if (!typed.f.includes(c)) bad = true; }
    flashBox(ev.target, good && !bad); save(); chipsDraw();
    if (typed.f.length === want.f.length) finish(true);
  });
  else v.querySelectorAll("#lform input").forEach(i => i.addEventListener("input", () => { read(); if (ok === null) save(); }));
  $("#pAlt").onclick = () => { if (ok === null) finish(false); else { ok = !ok; save(); show(); marks(); } };
  // ✓ before the end: "knew it" for a pattern (as with anagrams); for hooks it checks the boxes
  $("#pMain").onclick = () => ok === null ? finish(mode === "pattern" ? true : undefined) : nextCard();
  document.onkeydown = ev => {
    if (pSheetOpen || pkOpen || ev.metaKey || ev.ctrlKey || ev.altKey || ev.target.closest?.("input, select, textarea")) return;
    if (ev.key === "1") $("#pAlt").click();
    else if (ev.key === "2" || ev.key === "Enter") { ev.preventDefault(); $("#pMain").click(); }
  };
  marks(); show(); chipsDraw(); wireTop();
  if (ok === null && !phone()) $("#lf").focus();
}
const ICON_PLAY = '<svg viewBox="0 0 24 24" class="play" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
const ICON_SHUF = '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>', ICON_BACK = '<path d="M21 5H9l-6 7 6 7h12z"/><path d="M17 9l-6 6M11 9l6 6"/>';
const icon = d => `<svg viewBox="0 0 24 24">${d}</svg>`;
// the wooden rack, in the style picked in Settings
const RACKS = [["oak", "Oak"], ["walnut", "Walnut"], ["maple", "Maple"], ["cherry", "Cherry"], ["ebony", "Ebony"], ["teak", "Teak"], ["plain", "Plain"]];
const rackHTML = (id, inner = "") => `<div class="rack wood-${SET.rackLook || "oak"}" ${id ? `id="${id}"` : ""}><div class="tiles">${inner}</div></div>`;
// slots and a rack of tiles. A tap puts a rack tile in the next empty slot (or sends a slot tile back); a drag drops
// it into any slot (a tile already there swaps places or goes back to the rack) or moves it along the rack.
// A full row goes to word(x): true lights it up, false shakes it, null (nothing to answer) just clears it.
function rackBoard(slotsEl, rackEl, letters, word) {
  const n = letters.length, rt = rackEl.querySelector(".tiles");
  slotsEl.style.setProperty("--n", n); rt.style.setProperty("--n", n);
  // rack = tiles in the order shown; slots = which rack tile sits in each slot (null = empty); order = the order they went in
  let rack = [...letters].map((c, i) => ({ c, i })), slots = Array(n).fill(null), order = [], busy = false, drag = null;
  const tile = (t, cls = "", s) => `<div class="tile ${cls}" data-i="${t.i}"${s !== undefined ? ` data-s="${s}"` : ""}>${t.c}<sub>${VALUES[t.c]}</sub></div>`;
  const byI = i => rack.find(t => t.i === i);
  const draw = () => {
    if (!slotsEl.isConnected) return;
    slotsEl.innerHTML = slots.map((i, s) => i === null ? `<div class="slot" data-s="${s}"></div>` : tile(byI(i), "", s)).join("");
    rt.innerHTML = rack.map(t => tile(t, slots.includes(t.i) ? "used" : "")).join("");
  };
  const flash = cls => { slotsEl.classList.remove("bad", "good"); void slotsEl.offsetWidth; if (cls) slotsEl.classList.add(cls); };
  // a full row is checked at once: a right word stays lit for a moment, anything else shakes; then the tiles go back.
  // "keep" (the last word, which finishes the card) stays lit in the slots and the board stops taking tiles.
  const check = () => {
    if (slots.includes(null)) return;
    const ok = word(slots.map(i => byI(i).c).join(""));
    flash(ok === true || ok === "keep" ? "good" : ok === false ? "bad" : ""); busy = true;
    if (ok !== "keep") setTimeout(() => { busy = false; slots.fill(null); order = []; flash(""); draw(); }, ok ? 350 : 450);
  };
  const put = (i, s) => { slots[s] = i; order = [...order.filter(x => x !== i), i]; };
  const unput = i => { const s = slots.indexOf(i); if (s >= 0) slots[s] = null; order = order.filter(x => x !== i); };
  const place = i => { if (busy) return; if (slots.includes(i)) unput(i); else { const s = slots.indexOf(null); if (s < 0) return; put(i, s); } draw(); check(); };
  // dragging: a copy of the tile follows the finger
  const down = (e, from) => {
    const el = e.target.closest(".tile"); if (!el || busy) return;
    e.preventDefault();
    drag = { i: +el.dataset.i, from, el, x: e.clientX, y: e.clientY };
    el.setPointerCapture?.(e.pointerId);
    el.onpointermove = move; el.onpointerup = up; el.onpointercancel = () => { drag?.ghost?.remove(); drag = null; draw(); };
  };
  const move = e => {
    if (!drag) return;
    if (!drag.ghost) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 8) return;
      const r = drag.el.getBoundingClientRect(), g = drag.ghost = drag.el.cloneNode(true);
      drag.ox = drag.x - r.left; drag.oy = drag.y - r.top;
      g.classList.remove("used"); g.classList.add("drag");
      Object.assign(g.style, { width: r.width + "px", height: r.height + "px", fontSize: getComputedStyle(drag.el).fontSize });
      document.body.append(g); drag.el.classList.add("ghost");
    }
    drag.ghost.style.left = e.clientX - drag.ox + "px"; drag.ghost.style.top = e.clientY - drag.oy + "px";
  };
  const up = e => {
    const d = drag; drag = null; if (!d) return;
    if (!d.ghost) return place(d.i);
    d.ghost.remove();
    const x = e.clientX, y = e.clientY;
    const over = el => { const r = el.getBoundingClientRect(); return x > r.left - 16 && x < r.right + 16 && y > r.top - 16 && y < r.bottom + 16; };
    if (over(slotsEl)) {
      // the slot nearest the drop point
      const cells = [...slotsEl.children], dist = c => Math.abs((r => r.left + r.width / 2)(c.getBoundingClientRect()) - x);
      const s = +cells.reduce((a, b) => dist(b) < dist(a) ? b : a).dataset.s, was = slots.indexOf(d.i), there = slots[s];
      if (there !== d.i) {
        unput(d.i);
        if (there !== null) { unput(there); if (was >= 0) put(there, was); }
        put(d.i, s);
      }
    } else if (over(rackEl)) {
      const k = [...rt.querySelectorAll(".tile")].filter(c => +c.dataset.i !== d.i && (r => r.left + r.width / 2 < x)(c.getBoundingClientRect())).length, t = byI(d.i);
      rack = rack.filter(r => r !== t); rack.splice(k, 0, t);
      if (d.from === "slot") unput(d.i);
    } else if (d.from === "slot") unput(d.i);
    draw(); check();
  };
  slotsEl.onpointerdown = e => down(e, "slot");
  rt.onpointerdown = e => down(e, "rack");
  draw();
  return {
    shuffle: () => { rack = shuffle(rack); draw(); },
    back: () => { if (busy || !order.length) return; unput(order[order.length - 1]); draw(); },
    type: k => { const t = rack.find(t => t.c === k && !slots.includes(t.i)); if (t) place(t.i); },
  };
}
// the stats panel beside the card: this session, the last few marks, and the review queue
function practiceRail(pr, cls) {
  const q = getPQ(), mins = Math.round((Date.now() - P.start) / 60000), last = P.hist.slice(-20), ok = last.filter(Boolean).length;
  const due = x => x.due <= q.n ? `<em class="due">due now</em>` : `<em>in ${x.due - q.n} card${x.due - q.n === 1 ? "" : "s"}</em>`;
  return `<aside class="rail ${cls}">
    <div><h4>This session<em>${mins ? `${mins} min` : "just started"}</em></h4>
      <div class="kpis"><div><b>${P.streak}</b><span>streak</span></div><div><b>${P.seen ? Math.round(P.solved / P.seen * 100) + "%" : "–"}</b><span>known</span></div>
        <div><b>${P.seen}</b><span>${pr.unit} seen</span></div><div><b>${pr.racks.toLocaleString()}</b><span>of ${pr.racksAll.toLocaleString()} learnt</span></div></div></div>
    <div><h4>Last ${last.length || 20}<em>${last.length ? `✓ ${ok} · ✗ ${last.length - ok}` : ""}</em></h4>
      <div class="dots">${last.map(x => `<i class="${x ? "" : "x"}"></i>`).join("")}${'<i class="e"></i>'.repeat(20 - last.length)}</div></div>
    <div><h4>Review queue<em>${q.items.length}</em></h4>
      ${q.items.length ? `<div class="rq">${[...q.items].sort((a, b) => a.due - b.due).slice(0, 6).map(x => `<div><span>${esc(cardName(x.a))}</span>${due(x)}</div>`).join("")}</div>` : `<p class="small" style="margin:0">Cards you miss come back here.</p>`}</div>
  </aside>`;
}

// practice setup: what to practise; Start (or the play button) goes full screen
function practiceSetup(pool, o, main, more, wire) {
  const pr = progress(pool, o.mode), going = P.seen || store.get("pcur")?.key === P.key;
  const src = o.src.startsWith("g:") ? groupOf(o.src.slice(2))?.name : { "my:stars": "Starred words", "my:missed": "Missed words", "my:last": "Last search results" }[o.src] || (o.src.startsWith("f:") ? folderById(o.src.slice(2))?.name : "") || "Any word";
  $("#view").innerHTML = `<div class="cont" id="pGo"><div class="ct"><small>${going ? "Continue" : "Ready to practise"}${o.mode !== "anagram" ? " · " + PMODES.find(m => m[0] === o.mode)[1].toLowerCase() : ""}</small><b>${esc(src)} · ${lensLabel(o).toLowerCase()}</b>
      <div class="pbar"><div style="width:${pr.racksAll ? pr.racks / pr.racksAll * 100 : 0}%"></div></div><div class="small">${pr.racks.toLocaleString()} of ${pr.racksAll.toLocaleString()} ${pr.unit} learnt · ${pool.length.toLocaleString()} words</div></div>
      <button type="button" class="go" aria-label="${going ? "Carry on practising" : "Start practice"}">${ICON_PLAY}</button></div>
    <div class="card">${main}</div>
    ${more}
    <button type="button" class="btn primary block" id="pStart" ${pool.length ? "" : "disabled"}>${pool.length ? (going ? "Carry on" : "Start practice") : "No words match these options"}</button>`;
  wire();
  $("#pGo").onclick = $("#pStart").onclick = () => { if (pool.length) location.hash = "practice/go"; };
}

// ---------- my words ----------
const getStars = () => store.get("stars", []);
const getNotes = () => store.get("notes", {});
function toggleStar(w) { const s = getStars(); const i = s.indexOf(w); i >= 0 ? s.splice(i, 1) : s.unshift(w); store.set("stars", s); return i < 0; }
function addHistory(w) { const h = store.get("hist", []).filter(x => x !== w); h.unshift(w); store.set("hist", h.slice(0, 50)); }

VIEWS.mine = (tab) => {
  tab ||= "stars";
  if (tab.startsWith("f-")) return folderView(tab.slice(2));
  const notes = getNotes();
  const tabs = { stars: ["Starred", getStars()], folders: ["Folders", getFolders()], missed: ["Missed", store.get("missed", [])], notebook: ["Notes", getNotebook()], notes: ["Word notes", Object.keys(notes)], hist: ["Recently viewed", store.get("hist", [])] };
  $("#view").innerHTML = `<div><h3 class="title">My words</h3><p class="sub">${typeof SYNC !== "undefined" && SYNC.user ? "Synced to your account." : "Saved in this browser."}</p></div>
    <div class="seg">${Object.entries(tabs).map(([k, [n, l]]) => `<a class="btn ${k === tab ? "on" : ""}" href="#mine/${k}">${n} (${l.length})</a>`).join("")}</div>
    ${tab === "stars" && tabs.stars[1].length ? `<div class="row"><button class="btn sm" id="copyList">Copy list</button><button class="btn sm" id="clearStars">Clear starred</button><span class="small" id="msg"></span></div>` : ""}
    ${tab === "missed" && tabs.missed[1].length ? `<div class="row"><button class="btn sm" id="clearMissed">Clear missed</button></div>` : ""}
    <div class="card" id="mres"></div>`;
  if (tab === "notebook") return notebook();
  if (tab === "folders") return folderList();
  const words = tabs[tab][1].filter(w => DICT.has(w));
  if (tab === "notes") {
    $("#mres").innerHTML = words.length ? `<div class="rows">${words.map(w => `<div class="r" data-go="${w}"><span class="meta"></span><span class="fh"></span><span class="wl">${w}</span><span class="bh"></span><span class="d">${esc(notes[w])}</span><span></span></div>`).join("")}</div>` : `<p class="empty">Write notes on any word page and it shows up here.</p>`;
  } else if (words.length) results($("#mres"), words);
  else $("#mres").innerHTML = `<p class="empty">${tab === "stars" ? "Press ☆ Star on a word, or Star all on any list." : "Nothing here yet."}</p>`;
  $("#copyList")?.addEventListener("click", () => navigator.clipboard?.writeText(getStars().join("\n")).then(() => $("#msg").textContent = "Copied").catch(() => $("#msg").textContent = "Copy blocked by the browser"));
  confirmBtn($("#clearStars"), () => { store.set("stars", []); VIEWS.mine("stars"); });
  confirmBtn($("#clearMissed"), () => { store.set("missed", []); VIEWS.mine("missed"); });
};
// ---------- folders: your own lists of words, opened like a word list and usable in Quiz and Practice. Crossing a
// word off (✓, beside the star) marks it as one you know, wherever it shows; it stays in its folders ----------
const getFolders = () => store.get("folders", []);
const getKnown = () => store.get("known", []);
const folderById = id => getFolders().find(f => f.id === id);
const saveFolder = (id, patch) => store.set("folders", getFolders().map(f => f.id === id ? { ...f, ...patch, at: Date.now() } : f));
function newFolder(name, words = []) {
  const f = { id: Date.now().toString(36) + rnd(1e6).toString(36), name: name || "New folder", words: [...new Set(words)], at: Date.now() };
  store.set("folders", [...getFolders(), f]);
  return f;
}
function toggleKnown(w) { const k = getKnown(), i = k.indexOf(w); i >= 0 ? k.splice(i, 1) : k.unshift(w); store.set("known", k); return i < 0; }
// words typed or pasted in any form (one a line, commas, spaces): the real ones, and the ones that aren't words
const wordsIn = text => { const all = [...new Set(String(text).toUpperCase().split(/[^A-Z]+/).filter(Boolean))]; return { good: all.filter(w => DICT.has(w)), bad: all.filter(w => !DICT.has(w)) }; };
function folderList() {
  const fs = getFolders(), known = new Set(getKnown());
  $("#mres").innerHTML = `<div class="row" style="margin-bottom:12px"><input class="arack" id="fName" placeholder="New folder name" maxlength="40" style="text-transform:none;flex:1;min-width:0"><button class="btn primary" id="fNew">+ New folder</button></div>
    ${fs.length ? `<div class="flist">${fs.map(f => { const k = f.words.filter(w => known.has(w)).length;
      return `<a class="fitem" href="#mine/f-${f.id}"><b>${esc(f.name)}</b><span class="small">${f.words.length} word${f.words.length === 1 ? "" : "s"}${f.words.length ? ` · ${k} crossed off` : ""}</span>${f.words.length ? `<span class="fbar"><i style="width:${k / f.words.length * 100}%"></i></span>` : ""}</a>`; }).join("")}</div>`
      : `<p class="empty">No folders yet. Name one above, then add words to it here, from a word page, or from any list with Add to folder.</p>`}`;
  const make = () => { const f = newFolder($("#fName").value.trim()); location.hash = "mine/f-" + f.id; };
  $("#fNew").onclick = make;
  $("#fName").onkeydown = ev => { if (ev.key === "Enter") make(); };
}
function folderView(id) {
  const f = folderById(id);
  if (!f) { location.replace("#mine/folders"); return; }
  const known = new Set(getKnown()), k = f.words.filter(w => known.has(w)).length;
  $("#view").innerHTML = `<div class="fhead"><a class="bbk" href="#mine/folders">‹ Folders</a><input class="ftitle" id="fTitle" value="${esc(f.name)}" maxlength="40" aria-label="Folder name"></div>
    <p class="sub" style="margin:4px 0 12px">${f.words.length} word${f.words.length === 1 ? "" : "s"} · ${k} crossed off</p>
    <div class="row" style="margin-bottom:12px"><button class="btn" id="fEdit">Add or remove words</button><button class="btn" id="fDel">Delete folder</button></div>
    <div class="card fedit" id="fBox" hidden><h2 class="lbl">The words in this folder</h2><p class="small" style="margin:0 0 8px">Paste or type words in any form: one a line, or with commas or spaces. Delete a word to take it out.</p>
      <textarea id="fWords" class="ftext" spellcheck="false" autocapitalize="characters">${f.words.join("\n")}</textarea>
      <div class="row" style="margin-top:8px"><button class="btn primary" id="fSave">Save</button><button class="btn" id="fCancel">Cancel</button><span class="small bad" id="fMsg"></span></div></div>
    <div class="card" id="mres"></div>`;
  if (f.words.length) results($("#mres"), f.words.filter(w => DICT.has(w)));
  else $("#mres").innerHTML = `<p class="empty">No words yet. Press Add or remove words, or use Add to folder on a word page or any list.</p>`;
  $("#fTitle").onchange = () => saveFolder(id, { name: $("#fTitle").value.trim() || "Folder" });
  $("#fEdit").onclick = () => { $("#fBox").hidden = !$("#fBox").hidden; if (!$("#fBox").hidden) $("#fWords").focus(); };
  $("#fCancel").onclick = () => { $("#fBox").hidden = true; $("#fWords").value = f.words.join("\n"); };
  $("#fSave").onclick = () => {
    const { good, bad } = wordsIn($("#fWords").value);
    saveFolder(id, { words: good });
    if (bad.length) { folderView(id); $("#fBox").hidden = false; $("#fMsg").textContent = `Not in CSW24, so left out: ${bad.slice(0, 12).join(", ")}${bad.length > 12 ? "…" : ""}`; }
    else folderView(id);
  };
  confirmBtn($("#fDel"), () => { store.set("folders", getFolders().filter(x => x.id !== id)); location.hash = "mine/folders"; });
}
// the folder picker: for one word, a tick for each folder it's in; for a list, a button per folder to add them all
// (pick, when given, offers to choose some of the words instead)
function folderSheet(words, pick) {
  words = [...new Set(words)];
  document.getElementById("fsheet")?.remove();
  const one = words.length === 1, fs = getFolders();
  document.body.insertAdjacentHTML("beforeend", sheetHTML("fsheet", `<h3>${one ? `Folders for ${esc(words[0])}` : `Add ${words.length.toLocaleString()} words to a folder`}<button type="button" id="fsDone">Done</button></h3>
    ${fs.length ? `<div class="fpick">${fs.map(f => one ? `<label class="check"><input type="checkbox" data-fs="${f.id}" ${f.words.includes(words[0]) ? "checked" : ""}> ${esc(f.name)} <span class="small">${f.words.length}</span></label>`
      : `<button type="button" class="btn" data-fsall="${f.id}">${esc(f.name)} <span class="small">${f.words.length}</span></button>`).join("")}</div>` : `<p class="small">No folders yet: make one here.</p>`}
    <div class="row" style="margin-top:12px"><input class="arack" id="fsName" placeholder="New folder name" maxlength="40" style="text-transform:none;flex:1;min-width:0"><button class="btn primary" id="fsNew">+ New folder</button></div>
    <p class="small" id="fsMsg" style="margin:8px 0 0"></p>
    ${pick && !one ? `<button type="button" class="btn" id="fsPick" style="margin-top:12px;width:100%">Pick some of the words instead</button>` : ""}`));
  const close = () => { sheet("fsheet", false); document.getElementById("fsheet")?.remove(); };
  sheet("fsheet", true);
  $("#fsDone").onclick = $("#fsheet .scrim").onclick = close;
  $("#fsPick")?.addEventListener("click", () => { close(); pick(); });
  document.querySelectorAll("#fsheet [data-fs]").forEach(c => c.onchange = () => {
    const f = folderById(c.dataset.fs), w = words[0];
    saveFolder(f.id, { words: c.checked ? [...new Set([...f.words, w])] : f.words.filter(x => x !== w) });
  });
  document.querySelectorAll("#fsheet [data-fsall]").forEach(b => b.onclick = () => {
    const f = folderById(b.dataset.fsall), before = f.words.length;
    saveFolder(f.id, { words: [...new Set([...f.words, ...words])] });
    $("#fsMsg").textContent = `Added ${(folderById(f.id).words.length - before).toLocaleString()} to ${f.name}.`;
  });
  $("#fsNew").onclick = () => { const f = newFolder($("#fsName").value.trim(), words); $("#fsMsg").textContent = `Made ${f.name} with ${f.words.length.toLocaleString()} word${f.words.length === 1 ? "" : "s"}.`; setTimeout(() => { folderSheet(words, pick); $("#fsMsg").textContent = `Made ${f.name}.`; }, 0); };
}
// your own notes: as many as you like, each a title and some text, saved as you type (and synced when signed in)
const getNotebook = () => store.get("notebook", []);
const edited = t => { const s = (Date.now() - t) / 1000; return s < 60 ? "just now" : s < 3600 ? Math.round(s / 60) + " min ago" : s < 86400 ? Math.round(s / 3600) + " h ago" : new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" }); };
function notebook() {
  const list = getNotebook();
  $("#mres").innerHTML = `<div class="row" style="margin-bottom:12px"><button class="btn primary" id="nbNew">+ New note</button></div>
    ${list.length ? `<div class="nbook">${list.map(n => `<div class="nbnote" data-nb="${n.id}">
      <input class="nbtitle" value="${esc(n.title)}" placeholder="Title" aria-label="Note title">
      <textarea class="nbbody" placeholder="Write anything…" aria-label="Note">${esc(n.body)}</textarea>
      <div class="nbfoot"><span class="small">Edited ${edited(n.at)}</span><button class="btn sm" data-nbdel="${n.id}">Delete</button></div></div>`).join("")}</div>`
    : `<p class="empty">No notes yet. Press + New note to start one.</p>`}`;
  const grow = t => { t.style.height = "auto"; t.style.height = t.scrollHeight + 2 + "px"; };
  let timer = 0;
  const saveNote = el => { clearTimeout(timer); timer = setTimeout(() => {
    const id = el.dataset.nb, all = getNotebook(), n = all.find(x => x.id === id); if (!n) return;
    n.title = el.querySelector(".nbtitle").value; n.body = el.querySelector(".nbbody").value; n.at = Date.now();
    store.set("notebook", all); el.querySelector(".nbfoot .small").textContent = "Edited just now";
  }, 400); };
  $("#mres").querySelectorAll(".nbnote").forEach(el => {
    const t = el.querySelector(".nbbody"); grow(t);
    el.addEventListener("input", ev => { if (ev.target === t) grow(t); saveNote(el); });
  });
  $("#nbNew").onclick = () => {
    const n = { id: Date.now().toString(36) + rnd(1e6).toString(36), title: "", body: "", at: Date.now() };
    store.set("notebook", [n, ...getNotebook()]); VIEWS.mine("notebook"); $(".nbnote .nbtitle")?.focus();
  };
  $("#mres").querySelectorAll("[data-nbdel]").forEach(b => confirmBtn(b, () => { store.set("notebook", getNotebook().filter(x => x.id !== b.dataset.nbdel)); VIEWS.mine("notebook"); }));
}
// two-press confirmation for destructive buttons
function confirmBtn(el, fn) {
  if (!el) return;
  let armed = false; const label = el.textContent;
  el.addEventListener("click", () => { if (armed) return fn(); armed = true; el.textContent = "Press again to confirm"; setTimeout(() => { armed = false; el.textContent = label; }, 3000); });
}

// ---------- settings ----------
VIEWS.settings = () => {
  const seg = (key, opts) => `<div class="seg">${opts.map(([v, t]) => `<button type="button" class="btn ${String(SET[key]) === String(v) ? "on" : ""}" data-set="${key}" data-val="${v}">${t}</button>`).join("")}</div>`;
  const chk = (key, label) => `<label class="check"><input type="checkbox" data-chk="${key}" ${SET[key] ? "checked" : ""}> ${label}</label>`;
  const tileBtn = (id, name, c) => { const tok = c ? { tile: c, ink: inkOn(c) === "#ffffff" ? "#fbf6ea" : "#2a1f0e", edge: mix(c, "#000000", .26) } : null;
    return `<button type="button" class="${SET.tiles === id ? "on" : ""}" data-tiles="${id}"><div class="tile" ${tok ? `style="background-color:${tok.tile};--tile:${tok.tile};color:${tok.ink};--tile-edge:${tok.edge}"` : ""}>A<sub>1</sub></div>${name}</button>`; };
  const colour = (key, title, sub) => `<label class="colour"><input type="color" data-colour="${key}" value="${SET[key] || getComputedStyle(document.documentElement).getPropertyValue("--" + (key === "headCustom" ? "head" : "accent")).trim()}">
      <span><b>${title}</b><span class="small">${SET[key] ? `Custom · <a href="#" data-uncolour="${key}">use theme</a>` : sub}</span></span></label>`;
  const themeList = Object.entries(THEMES);
  // the first five always show; the rest sit in their groups inside the dropdown
  const top5 = new Set(themeList.slice(0, 5).map(([id]) => id)), grouped = new Set(THEME_GROUPS.flatMap(g => g[1]));
  const moreGroups = [...THEME_GROUPS, ["Other", themeList.map(([id]) => id).filter(id => !grouped.has(id))]]
    .map(([g, ids]) => [g, ids.filter(id => THEMES[id] && !top5.has(id))]).filter(([, ids]) => ids.length);
  // a swatch: the theme preview, plus its Bright / Mellow light-mode tones (hidden while the page is dark)
  const tone = (id, t, k, n) => { const c = k === "bright" ? t.light : t.mellow, on = (SET.tones?.[id] === "bright") === (k === "bright");
    return `<button type="button" class="${on ? "on" : ""}" data-tone="${k}" data-tid="${id}"><i style="background:linear-gradient(135deg, ${c.bg} 50%, ${c.panel} 50%)"></i>${n}</button>`; };
  const swatch = (id, t) => { const c = isDark() ? t.dark : lightOf(id, t); return `<div class="swatch ${SET.theme === id ? "on" : ""}"><button type="button" class="swmain" data-theme="${id}">
      <div class="bar" style="background:${c.head}"><i style="background:${c.tile}"></i><i style="background:${c.tile}"></i><i style="background:${c.accent}"></i></div>
      <div class="body" style="background:${c.bg}"><i style="width:40%;background:${c.ink}"></i><i style="width:20%;background:${c.link}"></i></div>
      <span>${t.name}</span></button>${t.mellow && !isDark() ? `<div class="tones">${tone(id, t, "bright", "Bright")}${tone(id, t, "mellow", "Mellow")}</div>` : ""}</div>`; };
  $("#view").innerHTML = `<div><h3 class="title">Settings</h3><p class="sub">Saved in this browser and applied straight away.</p></div>
  <div class="card">
    <div class="fs"><h2 class="lbl">Colour theme</h2><div class="swatches">${themeList.slice(0, 5).map(([id, t]) => swatch(id, t)).join("")}</div>
      <details class="more-themes" id="moreThemes" ${store.get("themesOpen", false) ? "open" : ""}><summary>More themes (${themeList.length - 5})${themeList.findIndex(([id]) => id === SET.theme) >= 5 ? ` · using ${esc(THEMES[SET.theme].name)}` : ""}</summary>
        ${moreGroups.map(([g, ids]) => `<div class="sect" style="margin:14px 0 0">${g}</div><div class="swatches">${ids.map(id => swatch(id, THEMES[id])).join("")}</div>`).join("")}</details></div>
    <div class="fs"><h2 class="lbl">Light or dark</h2>${seg("mode", [["auto", "Match my device"], ["light", "Light"], ["dark", "Dark"]])}</div>
    <div class="fs"><h2 class="lbl">Light mode brightness</h2>${seg("glare", [["bright", "Bright"], ["soft", "Soft"], ["dim", "Dim"]])}<p class="small" style="margin:8px 0 0">How white the page and cards are in light mode.</p></div>
    <div class="fs"><h2 class="lbl">Text size</h2>${seg("size", [["xs", "Extra small"], ["sm", "Small"], ["md", "Normal"], ["lg", "Large"], ["xl", "Extra large"]])}</div>
    <div class="fs"><h2 class="lbl">Tile colour</h2><div class="tilepick">${Object.entries(TILES).map(([id, [n, c]]) => tileBtn(id, n, c || (isDark() ? (THEMES[SET.theme] || THEMES.board).dark : lightOf(SET.theme, THEMES[SET.theme] || THEMES.board)).tile)).join("")}
      <label class="pickc ${SET.tiles === "custom" ? "on" : ""}"><div class="tile" style="background:conic-gradient(#e74c3c,#f1c40f,#2ecc71,#3498db,#9b59b6,#e74c3c);color:#fff">?</div>Pick…<input type="color" id="tileCustom" value="${SET.tileCustom}" aria-label="Pick a tile colour"></label></div>
      <h2 class="lbl" style="margin-top:18px">Tile style</h2>
      <div class="tilepick tstyles"><button type="button" class="${SET.tileLook === "theme" ? "on" : ""}" data-tstyle-pick="theme" title="Each theme picks its own: ${esc(TILE_STYLES[THEME_TSTYLE[SET.theme] || "soft"][0])}"><div class="tile ts-${THEME_TSTYLE[SET.theme] || "soft"}">A<sub>1</sub></div>Theme</button>${Object.entries(TILE_STYLES).map(([id, [n]]) => `<button type="button" class="${SET.tileLook === id ? "on" : ""}" data-tstyle-pick="${id}"><div class="tile ts-${id}">A<sub>1</sub></div>${n}</button>`).join("")}</div>
      <h2 class="lbl" style="margin-top:18px">Tile letters</h2>${seg("tileFont", [["sans", "Bold"], ["serif", "Serif"], ["mono", "Typewriter"]])}
      <div style="margin-top:16px">${tilesHTML(sampleWord())}</div>
      <div style="margin-top:12px">${chk("values", "Show letter values on tiles")}</div>
      <h2 class="lbl" style="margin-top:18px">Rack</h2>
      <div class="rackpick">${RACKS.map(([id, n]) => `<button type="button" class="${(SET.rackLook || "oak") === id ? "on" : ""}" data-rack-pick="${id}"><div class="rack wood-${id}"><div class="tiles">${[..."RACK"].map(c => `<div class="tile">${c}<sub>${VALUES[c]}</sub></div>`).join("")}</div></div>${n}</button>`).join("")}</div></div>
    <div class="fs"><h2 class="lbl">Custom colours</h2><p class="small" style="margin:0 0 10px">Tap a colour to open the colour wheel. These sit on top of whichever theme you pick.</p>
      <div class="colours">${colour("headCustom", "Header", "From the theme")}${colour("accentCustom", "Accent", "Buttons and highlights, from the theme")}</div></div>
  </div>
  <div class="card">
    <div class="fs"><h2 class="lbl">Word lists and search results</h2><div class="form">
      <div class="field"><label for="setSort">Default sort</label><select id="setSort">${Object.entries(SORTS).map(([k, v]) => `<option value="${k}" ${k === SET.sort ? "selected" : ""}>${v}</option>`).join("")}</select></div>
      <div class="field"><label for="setPage">Words per page</label><select id="setPage">${[100, 300, 1000, 3000].map(n => `<option ${n === +SET.pageSize ? "selected" : ""}>${n}</option>`).join("")}</select></div>
      <div class="field" style="gap:8px"><span class="flabel">Show in each row</span>${chk("defs", "Definitions")}${chk("ags", "Alphagrams")}${chk("sas", "Sound-alikes")}${chk("hooks", "Hooks")}${chk("prob", "Probability rank")}</div>
    </div></div>
    <div class="fs"><h2 class="lbl">Word page</h2>${chk("online", "Look up pronunciation, examples and origin online")}</div>
    <div class="fs"><h2 class="lbl">Quiz</h2><div class="form">
      <div class="field"><label for="setPhony">Phony share in Valid-or-phony</label><select id="setPhony">${[25, 50, 75].map(n => `<option value="${n}" ${n === +SET.phony ? "selected" : ""}>${n}% phonies</option>`).join("")}</select></div>
    </div></div>
    <div class="fs"><h2 class="lbl">Random word</h2><div class="form"><div class="field"><span class="flabel">Length range</span><div class="pair">
      <select id="setRmin" aria-label="Shortest">${range(2, 15).map(n => `<option ${n === +SET.randMin ? "selected" : ""}>${n}</option>`).join("")}</select>
      <select id="setRmax" aria-label="Longest">${range(2, 15).map(n => `<option ${n === +SET.randMax ? "selected" : ""}>${n}</option>`).join("")}</select></div></div>
      <div class="field"><span class="flabel">Probability rank</span><div class="pair"><input id="setRfrom" inputmode="numeric" placeholder="1" value="${SET.randFrom || ""}" aria-label="From rank"><input id="setRto" inputmode="numeric" placeholder="any" value="${SET.randTo || ""}" aria-label="To rank"></div>
        <p class="small" style="margin:4px 0 0">Within each length: 1 to 5000 gives only the 5,000 most likely words of that length.</p></div></div></div>
  </div>
  <div class="card">
    <div class="fs"><h2 class="lbl">Lexicon</h2>${LEX.html()}</div>
  </div>
  <div class="card" id="syncCard">${syncHTML()}</div>
  <div class="card">
    <div class="fs"><h2 class="lbl">Your data</h2><p class="small" style="margin:0 0 10px">Starred ${getStars().length} · notes ${Object.keys(getNotes()).length} · quiz records ${Object.keys(store.get("stats", {})).length}</p>
      <div class="row"><button class="btn sm" id="clrHist">Clear history</button><button class="btn sm" id="clrStats">Clear quiz records</button><button class="btn sm" id="clrReview">Clear practice review (${getPQ().items.length})</button><button class="btn sm" id="resetSet">Reset settings</button></div></div>
  </div>`;
  const v = $("#view");
  v.querySelectorAll("[data-theme]").forEach(b => b.onclick = () => { saveSettings({ theme: b.dataset.theme }); VIEWS.settings(); });
  v.querySelectorAll("[data-tone]").forEach(b => b.onclick = () => { saveSettings({ theme: b.dataset.tid, tones: { ...SET.tones, [b.dataset.tid]: b.dataset.tone } }); VIEWS.settings(); });
  v.querySelectorAll("[data-set]").forEach(b => b.onclick = () => { saveSettings({ [b.dataset.set]: b.dataset.val }); VIEWS.settings(); });
  $("#moreThemes").addEventListener("toggle", e => store.set("themesOpen", e.target.open));
  v.querySelectorAll("[data-rack-pick]").forEach(b => b.onclick = () => { saveSettings({ rackLook: b.dataset.rackPick }); VIEWS.settings(); });
  v.querySelectorAll("[data-tstyle-pick]").forEach(b => b.onclick = () => { saveSettings({ tileLook: b.dataset.tstylePick }); VIEWS.settings(); });
  v.querySelectorAll("[data-tiles]").forEach(b => b.onclick = () => { saveSettings({ tiles: b.dataset.tiles }); VIEWS.settings(); });
  // colour inputs preview live while the wheel is open and redraw the page once a colour is chosen
  const tc = $("#tileCustom");
  tc.oninput = () => saveSettings({ tiles: "custom", tileCustom: tc.value });
  tc.onchange = () => VIEWS.settings();
  v.querySelectorAll("[data-colour]").forEach(i => { i.oninput = () => saveSettings({ [i.dataset.colour]: i.value }); i.onchange = () => VIEWS.settings(); });
  v.querySelectorAll("[data-uncolour]").forEach(a => a.onclick = ev => { ev.preventDefault(); saveSettings({ [a.dataset.uncolour]: "" }); VIEWS.settings(); });
  v.querySelectorAll("[data-chk]").forEach(c => c.onchange = () => saveSettings({ [c.dataset.chk]: c.checked }));
  $("#setSort").onchange = e => saveSettings({ sort: e.target.value });
  $("#setPage").onchange = e => saveSettings({ pageSize: +e.target.value });
  $("#setPhony").onchange = e => saveSettings({ phony: +e.target.value });
  $("#setRmin").onchange = e => saveSettings({ randMin: +e.target.value, randMax: Math.max(+e.target.value, SET.randMax) });
  $("#setRmax").onchange = e => saveSettings({ randMax: +e.target.value, randMin: Math.min(+e.target.value, SET.randMin) });
  const rankRange = () => { let a = parseInt($("#setRfrom").value) || "", b = parseInt($("#setRto").value) || ""; if (a && b && b < a) [a, b] = [b, a]; saveSettings({ randFrom: a, randTo: b }); $("#setRfrom").value = a; $("#setRto").value = b; };
  $("#setRfrom").onchange = $("#setRto").onchange = rankRange;
  LEX.wire(); syncWire();
  confirmBtn($("#lexDel"), () => LEX.put(null).then(() => location.reload()));
  confirmBtn($("#clrHist"), () => { store.set("hist", []); VIEWS.settings(); });
  confirmBtn($("#clrReview"), () => { store.set("pq", { n: getPQ().n, items: [] }); VIEWS.settings(); });
  confirmBtn($("#clrStats"), () => { store.set("stats", {}); store.set("missed", []); VIEWS.settings(); });
  confirmBtn($("#resetSet"), () => { SET = { ...SET_DEFAULT }; store.set("settings", SET); applySettings(); VIEWS.settings(); });
};
// the tile-colour preview shows the word in the search bar, else the last word viewed
const sampleWord = () => [$("#q").value, store.get("hist", [])[0], "SCRABBLE"].map(w => (w || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 15)).find(Boolean);

// ---------- study: Lists, Practice, Quiz and Scoring share one tab, with a switch along the top ----------
const STUDY = ["lists", "practice", "quiz", "scoring"];
VIEWS.scoring = () => viewCount();
for (const k of STUDY) {
  const f = VIEWS[k];
  VIEWS[k] = arg => {
    f(arg);
    const top = !(k === "lists" && arg) && location.hash !== "#practice/go" && !(k === "quiz" && Q && !Q.done && !Q.paused);
    if (top && !$("#view .studyseg")) $("#view").insertAdjacentHTML("afterbegin", `<nav class="studyseg">${[["lists", "Lists"], ["practice", "Practice"], ["quiz", "Quiz"], ["scoring", "Scoring"]].map(([h, n]) => `<a href="#${h}" class="${h === k ? "on" : ""}">${n}</a>`).join("")}</nav>`);
  };
}

// ---------- pickers: our own dropdown in place of every <select> ----------
// Each select is hidden and a button showing its choice goes after it. The button opens the options as a bottom
// sheet on a phone or a menu under the button on a computer (long lists get a filter box). Choosing sets the
// select and fires input and change on it, so the page's own handlers work as before.
let pkOpen = null;
const pkLabel = sel => sel.selectedOptions[0]?.textContent || "";
const syncPick = sel => { const b = sel?.nextElementSibling; if (b?.classList.contains("pk")) b.firstElementChild.textContent = pkLabel(sel); };
function enhanceSelects() {
  document.querySelectorAll("select:not([data-pk])").forEach(sel => {
    sel.dataset.pk = "1"; sel.hidden = true;
    const b = document.createElement("button");
    b.type = "button"; b.className = "pk"; b.setAttribute("aria-haspopup", "listbox");
    b.setAttribute("aria-label", sel.labels?.[0]?.textContent || sel.getAttribute("aria-label") || "");
    b.innerHTML = `<span>${esc(pkLabel(sel))}</span><svg viewBox="0 0 24 24" class="chev" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>`;
    b.onclick = () => pkOpen?.sel === sel ? closePicker() : openPicker(sel, b);
    sel.after(b);
    sel.addEventListener("change", () => syncPick(sel));
    // tapping the field's label opens it too
    sel.labels?.forEach(l => l.addEventListener("click", ev => { ev.preventDefault(); b.focus(); }));
  });
}
function closePicker() {
  if (!pkOpen) return;
  pkOpen.el.remove(); pkOpen = null;
  document.body.classList.toggle("sheet-open", !!document.querySelector(".sheetwrap:not([hidden])"));
}
function openPicker(sel, btn) {
  closePicker();
  const opt = o => `<button type="button" class="pkopt ${o.value === sel.value ? "on" : ""}" role="option" data-v="${esc(o.value)}">${esc(o.textContent)}</button>`;
  const list = [...sel.children].map(n => n.tagName === "OPTGROUP" ? `<div class="pksect">${esc(n.label)}</div>${[...n.children].map(opt).join("")}` : opt(n)).join("");
  const many = sel.options.length > 14;
  const body = `${many ? `<input class="pkfind" placeholder="Filter" aria-label="Filter" autocomplete="off" spellcheck="false">` : ""}<div class="pklist" role="listbox">${list}</div>`;
  const el = document.createElement("div");
  if (phone()) {
    el.className = "sheetwrap pkwrap";
    el.innerHTML = `<div class="scrim"></div><div class="sheet"><div class="grab"></div><h3>${esc(btn.getAttribute("aria-label"))}<button type="button" class="pkdone">Done</button></h3>${body}</div>`;
    document.body.append(el); document.body.classList.add("sheet-open");
    el.querySelector(".scrim").onclick = el.querySelector(".pkdone").onclick = closePicker;
  } else {
    el.className = "pkpop"; el.innerHTML = body;
    document.body.append(el);
    const r = btn.getBoundingClientRect(), h = el.offsetHeight, below = innerHeight - r.bottom;
    el.style.minWidth = r.width + "px";
    el.style.left = Math.max(8, Math.min(r.left, innerWidth - el.offsetWidth - 8)) + "px";
    el.style.top = (below < h + 12 && r.top > below ? Math.max(8, r.top - h - 4) : r.bottom + 4) + "px";
  }
  pkOpen = { el, btn, sel };
  el.querySelectorAll(".pkopt").forEach(o => o.onclick = () => {
    const changed = sel.value !== o.dataset.v;
    sel.value = o.dataset.v; closePicker(); syncPick(sel); btn.focus();
    if (changed) { sel.dispatchEvent(new Event("input", { bubbles: true })); sel.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  // the chosen option starts in the middle of the list
  const on = el.querySelector(".pkopt.on"), sc = phone() ? el.querySelector(".sheet") : el.querySelector(".pklist");
  if (on) sc.scrollTop = on.offsetTop - sc.clientHeight / 2 + on.offsetHeight / 2;
  const find = el.querySelector(".pkfind");
  if (find) {
    find.oninput = () => {
      const q = find.value.trim().toLowerCase();
      el.querySelectorAll(".pkopt").forEach(o => o.hidden = q && !o.textContent.toLowerCase().includes(q));
      el.querySelectorAll(".pksect").forEach(s => { let n = s.nextElementSibling, any = false; while (n && !n.classList.contains("pksect")) { any ||= !n.hidden; n = n.nextElementSibling; } s.hidden = !any; });
    };
    find.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); el.querySelector(".pkopt:not([hidden])")?.click(); } };
    if (!phone()) find.focus();
  } else if (!phone()) (on || el.querySelector(".pkopt"))?.focus();
}
new MutationObserver(enhanceSelects).observe(document.body, { childList: true, subtree: true });
enhanceSelects();
// a click outside the menu closes it; so does scrolling the page (the menu doesn't move with it)
document.addEventListener("pointerdown", ev => { if (pkOpen && !phone() && !pkOpen.el.contains(ev.target) && !pkOpen.btn.contains(ev.target)) closePicker(); });
window.addEventListener("scroll", () => { if (pkOpen && !phone()) closePicker(); }, { passive: true });
// Esc closes the menu, else the top sheet (through its scrim, so a sheet that applies on close still does)
document.addEventListener("keydown", ev => {
  if (ev.key !== "Escape") return;
  if (pkOpen) { const b = pkOpen.btn; closePicker(); b.focus(); return; }
  [...document.querySelectorAll(".sheetwrap:not([hidden])")].pop()?.querySelector(".scrim")?.click();
});

