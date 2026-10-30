// ---------- lexicon ----------
const DICT = new Map(), ANA = new Map(), BYLEN = {};
for (const line of window.CSW_TSV.split("\n")) {
  const [w, d, fh, bh, sym, p, pl] = line.split("\t");
  // Zyzzyva marks a hook that is new in CSW24 with a "+" after the letter, e.g. "d+s"
  const newOf = h => (h.match(/[a-z](?=\+)/g) || []).join("");
  DICT.set(w, { d, fh: fh.replace(/\+/g, ""), bh: bh.replace(/\+/g, ""), fhNew: newOf(fh), bhNew: newOf(bh), n: sym === "+", p: +p, pl: +pl });
  const a = alpha(w);
  (ANA.get(a) || ANA.set(a, []).get(a)).push(w);
  (BYLEN[w.length] ||= []).push(w);
}
window.CSW_TSV = null;
// probability ranks are worked out here from the tiles, whatever the file says: the number of ways to draw the word
// from a full bag, counting the two blanks (as Zyzzyva does by default). Most ways is #1 in each length; ties go by
// alphagram, then the word, which gives exactly Zyzzyva's order
const BAG = { A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9, J: 1, K: 1, L: 4, M: 2, N: 6, O: 8, P: 2, Q: 1, R: 6, S: 4, T: 6, U: 4, V: 2, W: 2, X: 1, Y: 2, Z: 1 };
const CHOOSE = [...Array(13)].map((_, n) => [...Array(n + 1)].map((_, k) => { let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return r; }));
// a = an alphagram. ways[b] counts draws with b blanks standing in for letters so far; each run of k of the same
// letter is drawn k - u times from the bag and covered by u blanks. The two blanks can be picked 1, 2 or 1 ways
function draws(a) {
  let ways = [1, 0, 0];
  for (let i = 0; i < a.length;) {
    let j = i; while (a[j] === a[i]) j++;
    const k = j - i, row = CHOOSE[BAG[a[i]]], next = [0, 0, 0];
    for (let b = 0; b < 3; b++) if (ways[b]) for (let u = 0; u <= Math.min(k, 2 - b); u++) next[b + u] += ways[b] * (row[k - u] || 0);
    ways = next; i = j;
  }
  return ways[0] + 2 * ways[1] + ways[2];
}
{
  // anagrams share their tiles, so it's worked out once per rack; racks are ranked, then each rack's words in A–Z order
  const racks = {};
  for (const [a, ws] of ANA) (racks[a.length] ||= []).push({ a, ws, n: draws(a) });
  for (const rs of Object.values(racks)) {
    let i = 0;
    rs.sort((x, y) => y.n - x.n || (x.a < y.a ? -1 : 1));
    for (const r of rs) for (const w of [...r.ws].sort()) DICT.get(w).p = ++i;
  }
}
const ALL = [...DICT.keys()];

const anagrams = w => ANA.get(alpha(w)) || [];
// sound-alikes: 7s and 8s that differ by one letter, in the same spot, for one that sounds like it (URANITE, URANIDE)
const SOUND_PAIRS = ["DT", "BP", "CGK", "SZ", "FV", "MN", "GJ"];
const saCache = new Map();
function soundAlikes(w) {
  if (w.length < 7 || w.length > 8) return [];
  if (saCache.has(w)) return saCache.get(w);
  const out = new Set();
  [...w].forEach((c, i) => SOUND_PAIRS.forEach(g => { if (g.includes(c)) for (const L of g) { const x = w.slice(0, i) + L + w.slice(i + 1); if (L !== c && DICT.has(x)) out.add(x); } }));
  saCache.set(w, [...out]);
  return saCache.get(w);
}
const saLinks = ws => ws.map(x => `<a href="#w/${x}" data-go="${x}">${x}</a>`).join(", ");
function plusOne(w) {
  const out = [];
  for (const L of AZ) { const g = ANA.get(alpha(w + L)); if (g) out.push([L, g]); }
  return out;
}
function minusOne(w) {
  const seen = new Set(), out = [];
  for (let i = 0; i < w.length; i++) {
    if (seen.has(w[i])) continue; seen.add(w[i]);
    const g = ANA.get(alpha(w.slice(0, i) + w.slice(i + 1)));
    if (g) out.push([w[i], g]);
  }
  return out;
}
function counts(s) { const c = {}; for (const ch of s) c[ch] = (c[ch] || 0) + 1; return c; }
function blanksNeeded(w, rc) {
  const need = {}; let b = 0;
  for (const ch of w) { need[ch] = (need[ch] || 0) + 1; if (need[ch] > (rc[ch] || 0)) b++; }
  return b;
}
function blankMask(w, rc) {
  const left = { ...rc };
  return [...w].map(ch => { if (left[ch] > 0) { left[ch]--; return false; } return true; });
}

// ---------- groups: shared by Search (group picker), Word lists and Quiz ----------
// len = which length the list view opens on; special groups are list-only
// a word is a length from a to b (or just a)
const lenIn = (w, a, b) => w.length >= a && w.length <= (b ?? a);
const GROUPS = [
  { sect: "Vowel dumps" },
  { id: "vowel", name: "Vowel dumps", len: 4, blurb: "4-letter words with three or more vowels, like AEON, EUOI and OBIA.", test: w => w.length === 4 && vowels(w) >= 3 },
  { id: "vowel5", name: "5-letter vowel dumps", blurb: "Five letters with four or more vowels, like ADIEU, AUDIO and OUIJA.", test: w => w.length === 5 && vowels(w) >= 4 },
  { id: "vowel67", name: "Five-vowel 6s and 7s", len: 6, blurb: "6 and 7-letter words with five or more vowels, like EULOGIA and AUREOLE.", test: w => lenIn(w, 6, 7) && vowels(w) >= 5 },
  { id: "vowelonly", name: "Vowels only", blurb: "No consonants at all, like AA, EAU, AUE and EUOI.", test: w => /^[AEIOU]+$/.test(w) },
  { id: "vheavy", name: "Vowel-heavy words", len: 5, blurb: "3 to 8 letters where at least 60% of tiles are vowels.", test: w => lenIn(w, 3, 8) && vowels(w) / w.length >= 0.6 },
  { id: "iu", name: "Double I and double U", len: 5, blurb: "Up to 7 letters with two or more Is or Us, the hardest vowels to clear.", test: w => w.length <= 7 && (nOf(w, "I") >= 2 || nOf(w, "U") >= 2) },
  { id: "triple", name: "Triple-vowel words", len: 5, blurb: "5 to 8 letters with three of the same vowel, like ABACA and BIKINI.", test: w => lenIn(w, 5, 8) && /([AEIOU]).*\1.*\1/.test(w) },
  { id: "allfive", name: "All five vowels", blurb: "Words with A, E, I, O and U, 9 letters or fewer.", test: w => w.length <= 9 && [..."AEIOU"].every(v => w.includes(v)) },
  { sect: "Consonant dumps" },
  { id: "novowel", name: "No-vowel words", len: 3, blurb: "No A, E, I, O or U, like BRR, CWM, PFFT and CRWTH.", test: w => !/[AEIOU]/.test(w) },
  { id: "noy", name: "No vowels, not even Y", blurb: "Words with no A, E, I, O, U or Y.", test: w => !/[AEIOUY]/.test(w) },
  { id: "onev", name: "One-vowel 5s and 6s", len: 5, blurb: "5 and 6-letter words with a single vowel, like SCHMO and STRICT.", test: w => lenIn(w, 5, 6) && vowels(w) === 1 },
  { sect: "Power tiles" },
  { id: "jqxz", name: "JQXZ words", len: 4, blurb: "Any word with J, Q, X or Z. Opens on the 4s.", test: w => /[JQXZ]/.test(w) },
  { id: "jqxzshort", name: "JQXZ 2s to 5s", len: 4, blurb: "Short power-tile words only, 2 to 5 letters.", test: w => w.length <= 5 && /[JQXZ]/.test(w) },
  { id: "j", name: "J words", len: 3, blurb: "Every word with a J.", test: w => w.includes("J") },
  { id: "q", name: "Q words", len: 3, blurb: "Every word with a Q.", test: w => w.includes("Q") },
  { id: "x", name: "X words", len: 3, blurb: "Every word with an X.", test: w => w.includes("X") },
  { id: "z", name: "Z words", len: 3, blurb: "Every word with a Z.", test: w => w.includes("Z") },
  { id: "qnou", name: "Q without U", blurb: "Every word with a Q and no U, like QI, QAT, QOPH and WAQF.", test: w => w.includes("Q") && !w.includes("U") },
  { id: "twopower", name: "Two power tiles", blurb: "Words with two or more of J, Q, X and Z, like ZAX and JUKEBOX.", test: w => (w.match(/[JQXZ]/g) || []).length >= 2 },
  { id: "heavy", name: "Short heavy hitters", len: 3, blurb: "2 to 4-letter words worth 10 or more points on face value.", test: w => w.length <= 4 && score(w) >= 10 },
  { id: "shortv", name: "Short V words", len: 3, blurb: "3 and 4-letter words with V. There are no 2-letter V words.", test: w => lenIn(w, 3, 4) && w.includes("V") },
  { id: "kwyfh", name: "Short K, W, Y, F, H words", len: 3, blurb: "3-letter words using the 4 and 5-point tiles.", test: w => w.length === 3 && /[KWYFH]/.test(w) },
  { sect: "Short words and hooks" },
  { id: "twos", name: "Two-letter words", blurb: "All 127 twos. Learn these first.", test: w => w.length === 2 },
  { id: "threes", name: "Three-letter words", blurb: "Every three, with hooks.", test: w => w.length === 3 },
  { id: "fours", name: "Four-letter words", blurb: "Every four, with hooks.", test: w => w.length === 4 },
  { id: "nohook", name: "Unhookable words", len: 3, blurb: "2 to 5-letter words with no front or back hooks. Safe to play, hard to extend.", test: (w, e) => w.length <= 5 && !e.fh && !e.bh },
  { id: "manyhook", name: "Hook-heavy words", len: 2, blurb: "Words that take 8 or more hooks. Risky to open the board with.", test: (w, e) => e.fh.length + e.bh.length >= 8 },
  { id: "nos", name: "No S hook", len: 3, blurb: "2 to 5-letter words that can't take an S on the end.", test: (w, e) => w.length <= 5 && !e.bh.includes("s") },
  { id: "frontonly", name: "Front hooks only", len: 3, blurb: "2 to 5-letter words that take a front hook but no back hook.", test: (w, e) => w.length <= 5 && !!e.fh && !e.bh },
  { sect: "Bingos" },
  { id: "stems6", name: "Best 6-letter stems", special: "stems", n: 6, blurb: "6-tile leaves that make the most 7-letter bingos, with the letters that complete them." },
  { id: "stems7", name: "Best 7-letter stems", special: "stems", n: 7, blurb: "7 tiles plus 1 on the board makes an 8. The most productive racks." },
  { id: "p7", name: "Most likely 7s", blurb: "The 1,000 most probable 7-letter words (probability rank 1 to 1,000).", test: (w, e) => w.length === 7 && e.p <= 1000 },
  { id: "p8", name: "Most likely 8s", blurb: "The 1,000 most probable 8-letter words (probability rank 1 to 1,000).", test: (w, e) => w.length === 8 && e.p <= 1000 },
  { id: "rich", name: "Anagram-rich racks", len: 7, blurb: "7s and 8s whose letters make 5 or more words.", test: w => lenIn(w, 7, 8) && anagrams(w).length >= 5 },
  { id: "suffix", name: "-ING, -IER, -IEST bingos", len: 7, blurb: "Every 7 and 8-letter word ending in ING, IER or IEST.", test: w => lenIn(w, 7, 8) && /(ING|IER|IEST)$/.test(w) },
  { id: "prefix", name: "RE-, UN-, OUT-, OVER-, DIS- bingos", len: 7, blurb: "Every 7 and 8-letter word starting with RE, UN, OUT, OVER or DIS.", test: w => lenIn(w, 7, 8) && /^(RE|UN|OUT|OVER|DIS)/.test(w) },
  { sect: "Other" },
  { id: "new", name: "New in CSW24", blurb: "The 1,816 words added in this edition.", test: (w, e) => e.n },
  { id: "palin", name: "Palindromes", blurb: "Words that read the same backwards, like TAT and REDDER.", test: w => w.length >= 3 && w === [...w].reverse().join("") },
];
const groupOf = id => id ? GROUPS.find(g => g.id === id) : undefined;
const cache = {};
const groupWords = g => cache[g.id] ||= (g.special === "stems" ? stems(g.n).map(s => s.stem) : ALL.filter(w => g.test(w, DICT.get(w))));
function stems(n) {
  if (cache["stemdata" + n]) return cache["stemdata" + n];
  const m = new Map();
  for (const w of BYLEN[n + 1]) {
    const a = alpha(w), seen = new Set();
    for (let i = 0; i < a.length; i++) {
      if (seen.has(a[i])) continue; seen.add(a[i]);
      const s = a.slice(0, i) + a.slice(i + 1);
      (m.get(s) || m.set(s, new Set()).get(s)).add(w);
    }
  }
  return cache["stemdata" + n] = [...m].map(([stem, set]) => ({ stem, n: set.size, words: [...set] })).sort((a, b) => b.n - a.n).slice(0, 150);
}
function groupOptions(selected, withSpecial) {
  let html = "", open = false;
  for (const g of GROUPS) {
    if (g.sect) { html += `${open ? "</optgroup>" : ""}<optgroup label="${g.sect}">`; open = true; }
    else if (withSpecial || !g.special) html += `<option value="${g.id}" ${g.id === selected ? "selected" : ""}>${esc(g.name)}</option>`;
  }
  return html + "</optgroup>";
}

// ---------- shared rendering ----------
function defHTML(d) {
  return d.split(" / ").map(part => {
    const m = part.match(/^(.*?)(\s*\[[^\]]+\])?$/);
    const body = esc(m[1]).replace(/\b[A-Z]{2,15}\b/g, x => DICT.has(x) ? `<a href="#w/${x}">${x}</a>` : x);
    return `<span>${body}${m[2] ? ` <span class="pos">${esc(m[2].trim())}</span>` : ""}</span>`;
  }).join("<br>");
}
const hookText = (letters, nw) => [...letters].map(h => nw.includes(h) ? `${h}<sup title="new hook in CSW24">+</sup>` : h).join("");
const chip = w => `<a class="w" href="#w/${w}" title="${esc(DICT.get(w)?.d)}">${w}${DICT.get(w)?.n ? "<sup>+</sup>" : ""}</a>`;
function tilesHTML(w, mini) {
  return `<div class="tiles${mini ? " mini" : ""}" style="--n:${w.length}">${[...w].map((c, i) => `<div class="tile" style="animation-delay:${i * 25}ms">${c}<sub>${VALUES[c]}</sub></div>`).join("")}</div>`;
}

const SORTS = { prob: "Probability", alpha: "A–Z", len: "Length", score: "Points", play: "Playability" };
const sorters = {
  prob: (a, b) => a.length - b.length || DICT.get(a).p - DICT.get(b).p,
  alpha: (a, b) => a < b ? -1 : 1,
  len: (a, b) => a.length - b.length || (a < b ? -1 : 1),
  score: (a, b) => score(b) - score(a) || (a < b ? -1 : 1),
  play: (a, b) => DICT.get(a).pl - DICT.get(b).pl,
};
// the order Quiz and Practice go through their words. Racks (alphagrams) go by their most likely or most played
// word; probability and playability ranks count within each length, so shorter words come first
// Anagrams puts racks with the most words first (then by probability); rev turns any order but Random round
const ORDERS = { rand: "Random", prob: "Probability", alpha: "A–Z", play: "Playability", ana: "Anagrams" };
function ordered(xs, order, racks, rev) {
  if (!ORDERS[order] || order === "rand") return shuffle(xs);
  let out;
  if (order === "alpha") out = [...xs].sort((a, b) => a < b ? -1 : 1);
  else {
    const best = (x, f) => Math.min(...(racks ? ANA.get(x) : [x]).map(w => DICT.get(w)[f]));
    const k = new Map(xs.map(x => [x, order === "ana" ? best(x, "p") - (racks ? ANA.get(x) : anagrams(x)).length * 1e7 : best(x, order === "prob" ? "p" : "pl")]));
    out = [...xs].sort((a, b) => (order === "ana" ? 0 : a.length - b.length) || k.get(a) - k.get(b));
  }
  return rev ? out.reverse() : out;
}
const orderText = (order, rev) => `${ORDERS[order] || ORDERS.rand} order${rev && order !== "rand" ? ", reversed" : ""}`;
const orderPick = (id, v, rev) => `<div class="seg" id="${id}">${Object.entries(ORDERS).map(([k, t]) => `<button type="button" class="btn sm ${k === (v || "rand") ? "on" : ""}" data-order="${k}">${t}</button>`).join("")}<button type="button" class="btn sm ${rev && v !== "rand" ? "on" : ""}" data-rev aria-pressed="${!!rev}" ${!v || v === "rand" ? "disabled" : ""}>⇅ Reverse</button></div>`;
let lastResults = [];
// going back to a list, search or My words puts you where you were: the scroll position, plus each results
// list's length chips and "Show more" count (kept per page and word count, for this visit to the site)
const scrollMem = {}, resMem = {};
let curHash = location.hash, pendingScroll = 0;
function restoreScroll() {
  if (pendingScroll && document.documentElement.scrollHeight - innerHeight >= pendingScroll - 4) { window.scrollTo(0, pendingScroll); pendingScroll = 0; }
}
// Results component: toolbar (count, length chips, sort, toggles, actions) + rows + paging
function results(el, words, opts = {}) {
  // range = which ranks to show, counted in the current sort order (e.g. 1–100 or 30–50)
  const mem = resMem[location.hash + ":" + words.length] ||= {};
  const lens = [...new Set(words.map(w => w.length))].sort((a, b) => a - b);
  const st = { sel: null, lens: new Set((mem.lens || (opts.len ? [opts.len] : [])).filter(n => lens.includes(n) && lens.length > 1)), shown: mem.shown || +SET.pageSize, from: +opts.range?.from || 0, to: +opts.range?.to || 0 };
  let first = true, shownList = [];
  function draw() {
    const full = (st.lens.size ? words.filter(w => st.lens.has(w.length)) : [...words]).sort(sorters[SET.sort] || sorters.prob);
    // grouped results (one-letter swaps): each group together under its heading, in the sort order within it
    const G = opts.groups, gw = {};
    if (G) { full.sort((a, b) => G.by(a) - G.by(b)); for (const w of full) (gw[G.by(w)] ||= []).push(w); }
    const ranged = st.from > 1 || st.to > 0;
    const lo = Math.max(1, st.from || 1), hi = st.to ? Math.max(st.to, lo) : full.length;
    const list = ranged ? full.slice(lo - 1, hi) : full;
    const offset = ranged ? lo - 1 : 0;
    lastResults = shownList = list;
    const starSet = new Set(getStars()), knownSet = new Set(getKnown()), allStarred = list.length > 0 && list.every(w => starSet.has(w));
    const total = st.lens.size ? `${full.length.toLocaleString()} ${[...st.lens].sort((a, b) => a - b).join(", ")}-letter words <span class="small">(${words.length.toLocaleString()} in all)</span>` : `${full.length.toLocaleString()} word${full.length === 1 ? "" : "s"}`;
    el.innerHTML = `
      <div class="toolbar">
        <span class="count">${ranged ? `Words ${lo.toLocaleString()}–${Math.min(hi, full.length).toLocaleString()} <span class="small">of ${total}</span>` : total}</span>
        <select id="sortSel" aria-label="Sort by">${Object.entries(SORTS).map(([k, v]) => `<option value="${k}" ${k === SET.sort ? "selected" : ""}>Sort: ${v}</option>`).join("")}</select>
        <label class="check small"><input type="checkbox" id="defChk" ${SET.defs ? "checked" : ""}> Definitions</label>
        <label class="check small"><input type="checkbox" id="agChk" ${SET.ags ? "checked" : ""}> Alphagrams</label>
        <label class="check small"><input type="checkbox" id="saChk" ${SET.sas ? "checked" : ""}> Sound-alikes</label>
        <div class="tacts"><button class="btn sm" id="quizThese">Quiz these</button>
        <button class="btn sm" id="practiceThese">Practice these</button>
        <button class="btn sm" id="starAll">${allStarred ? "Unstar all" : "Star all"}</button>
        <button class="btn sm" id="toFolder">Add to folder</button>
        <button class="btn sm ${st.sel ? "on" : ""}" id="selBtn">Select</button></div>
      </div>
      <div class="row rangebar">
        <span class="small">Show</span>
        <button class="btn sm ${ranged ? "" : "on"}" data-top="0">All</button>
        ${[30, 50, 100].map(n => `<button class="btn sm ${st.from <= 1 && st.to === n ? "on" : ""}" data-top="${n}">${n}</button>`).join("")}
        <span class="small">or</span>
        <input id="rFrom" inputmode="numeric" placeholder="1" value="${st.from || ""}" aria-label="From rank">
        <span class="small">to</span>
        <input id="rTo" inputmode="numeric" placeholder="all" value="${st.to || ""}" aria-label="To rank">
        <span class="small">in ${SORTS[SET.sort] || "Probability"} order</span>
      </div>
      ${lens.length > 1 ? `<div class="chips" style="margin:10px 0 6px"><button class="btn sm ${st.lens.size ? "" : "on"}" data-len="0">All lengths</button>${lens.map(n => `<button class="btn sm ${st.lens.has(n) ? "on" : ""}" data-len="${n}">${n}</button>`).join("")}</div>` : ""}
      ${list.length ? `<div class="rows ${st.sel ? "selecting" : ""} ${ranged ? "ranked" : ""} ${SET.defs ? "" : "nodefs"} ${SET.ags ? "" : "noags"} ${SET.sas ? "sashow" : ""} ${SET.prob ? "" : "noprob"} ${SET.hooks ? "" : "nohooks"}">${list.slice(0, st.shown).map((w, i) => (G && (!i || G.by(w) !== G.by(list[i - 1])) ? `<h3 class="rhead">${G.name(G.by(w), gw[G.by(w)])}<span class="small">${gw[G.by(w)].length}</span></h3>` : "") + rowHTML(w, opts.masks?.get(w), ranged ? offset + i + 1 : 0, starSet, knownSet, st.sel?.has(w))).join("")}</div>` : `<p class="empty" style="margin-top:10px">${ranged && full.length ? `There are only ${full.length.toLocaleString()} words, so rank ${lo.toLocaleString()} is past the end.` : "No words match."}</p>`}
      ${list.length > st.shown ? `<button class="btn more" id="moreBtn">Show ${Math.min(+SET.pageSize, list.length - st.shown).toLocaleString()} more</button>` : ""}
      ${st.sel ? `<div class="selbar"><span class="count" id="selN"></span><button class="btn sm" id="selAll"></button><button class="btn sm primary" id="selFolder">Add to folder</button><button class="btn sm" id="selStar">☆ Star</button><button class="btn sm" id="selKnown">✓ Cross off</button><button class="btn sm" id="selDone">Done</button></div>` : ""}`;
    // length chips: tap several to see them together; All lengths clears them
    el.querySelectorAll("[data-len]").forEach(b => b.onclick = () => {
      const n = +b.dataset.len; if (!n) st.lens.clear(); else st.lens.has(n) ? st.lens.delete(n) : st.lens.add(n);
      st.shown = +SET.pageSize; mem.lens = [...st.lens]; mem.shown = 0; draw();
    });
    const setRange = (from, to) => {
      from = Math.max(0, parseInt(from) || 0); to = Math.max(0, parseInt(to) || 0);
      if (from && to && to < from) [from, to] = [to, from];
      st.from = from; st.to = to; st.shown = +SET.pageSize; opts.range?.save?.(from || "", to || ""); draw();
    };
    el.querySelectorAll("[data-top]").forEach(b => b.onclick = () => setRange(0, +b.dataset.top));
    for (const id of ["#rFrom", "#rTo"]) {
      el.querySelector(id).onchange = () => setRange(el.querySelector("#rFrom").value, el.querySelector("#rTo").value);
      el.querySelector(id).onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); e.target.dispatchEvent(new Event("change")); } };
    }
    el.querySelector("#sortSel").onchange = e => { saveSettings({ sort: e.target.value }); draw(); };
    el.querySelector("#defChk").onchange = e => { saveSettings({ defs: e.target.checked }); el.querySelector(".rows")?.classList.toggle("nodefs", !SET.defs); };
    el.querySelector("#agChk").onchange = e => { saveSettings({ ags: e.target.checked }); el.querySelector(".rows")?.classList.toggle("noags", !SET.ags); };
    el.querySelector("#saChk")?.addEventListener("change", e => { saveSettings({ sas: e.target.checked }); el.querySelector(".rows")?.classList.toggle("sashow", SET.sas); });
    el.querySelector("#moreBtn")?.addEventListener("click", () => { st.shown += +SET.pageSize; mem.shown = st.shown; draw(); });
    el.querySelector("#quizThese").onclick = () => { quizSetup.source = "last"; quizSetup.lens = []; quizSetup.starOnly = false; location.hash = "quiz"; };
    el.querySelector("#practiceThese").onclick = () => { store.set("pLast", [...lastResults]); saveSettings({ practice: { ...PO_DEFAULT, mode: SET.practice?.mode || "anagram", order: SET.practice?.order || "rand", rev: !!SET.practice?.rev, src: "my:last", lens: [] } }); location.hash = "practice"; };
    el.querySelector("#toFolder").onclick = () => folderSheet(list, () => { st.sel = new Set(); draw(); });
    el.querySelector("#selBtn").onclick = () => { st.sel = st.sel ? null : new Set(); draw(); };
    if (st.sel) {
      const picked = () => list.filter(w => st.sel.has(w));
      el.querySelector("#selAll").onclick = () => { const all = picked().length === list.length; st.sel = new Set(all ? [] : list); el.querySelectorAll(".rows .r").forEach(r => r.classList.toggle("sel", !all)); selBar(); };
      el.querySelector("#selFolder").onclick = () => picked().length && folderSheet(picked());
      // star or cross off the picked words; if they all already are, undo it for them
      const mark = (key, get) => { const p = picked(); if (!p.length) return; const had = new Set(get()), all = p.every(w => had.has(w)); store.set(key, all ? get().filter(w => !st.sel.has(w)) : [...p.filter(w => !had.has(w)), ...get()]); draw(); };
      el.querySelector("#selStar").onclick = () => mark("stars", getStars);
      el.querySelector("#selKnown").onclick = () => mark("known", getKnown);
      el.querySelector("#selDone").onclick = () => { st.sel = null; draw(); };
      selBar();
    }
    // Star all / Unstar all for exactly the rows in view (after the length and rank filters)
    el.querySelector("#starAll").onclick = () => { const s = getStars(), inList = new Set(list); store.set("stars", allStarred ? s.filter(w => !inList.has(w)) : [...list.filter(w => !starSet.has(w)), ...s]); draw(); };
    if (first) { first = false; restoreScroll(); pendingScroll = 0; }
  }
  function selBar() {
    const n = shownList.filter(w => st.sel.has(w)).length;
    el.querySelector("#selN").textContent = `${n.toLocaleString()} picked`;
    el.querySelector("#selAll").textContent = n && n === shownList.length ? "Clear" : `All ${shownList.length.toLocaleString()}`;
    for (const id of ["#selFolder", "#selStar", "#selKnown"]) el.querySelector(id).disabled = !n;
  }
  // while picking, tapping a row picks it instead of opening the word
  el.addEventListener("click", ev => {
    const r = st.sel && ev.target.closest(".rows .r[data-go]");
    if (!r) return;
    ev.preventDefault(); ev.stopPropagation();
    const w = r.dataset.go, on = !st.sel.has(w);
    on ? st.sel.add(w) : st.sel.delete(w);
    r.classList.toggle("sel", on); selBar();
  }, true);
  draw();
}
const knownBtn = (w, on) => `<button type="button" class="kn ${on ? "on" : ""}" data-known="${w}" title="${on ? "Not known yet" : "Cross off: I know it"}" aria-label="${on ? "Uncross" : "Cross off"} ${w}" aria-pressed="${on}">✓</button>`;
const starBtn = (w, on) => `<button type="button" class="st ${on ? "on" : ""}" data-star="${w}" title="${on ? "Unstar" : "Star"}" aria-label="Star ${w}">${on ? "★" : "☆"}</button>`;
function rowHTML(w, mask, rank, stars = new Set(getStars()), known = new Set(getKnown()), sel = false) {
  const e = DICT.get(w);
  const sa = soundAlikes(w);
  const label = mask ? [...w].map((c, i) => mask[i] ? `<mark>${mask[i] === "up" ? c : c.toLowerCase()}</mark>` : c).join("") : w;
  return `<div class="r${known.has(w) ? " known" : ""}${sel ? " sel" : ""}" data-go="${w}">${rank ? `<span class="rk">${rank}.</span>` : ""}<span class="meta">#${e.p.toLocaleString()}</span><span class="fh">${hookText(e.fh, e.fhNew)}</span><span class="wl">${label}${e.n ? "<sup>+</sup>" : ""}<span class="ag">${alpha(w)}</span>${sa.length ? `<span class="sa" data-swap="${w}" role="link" title="All one-letter swaps of ${w}">sounds like <b>${sa.join(", ")}</b> ›</span>` : ""}</span><span class="bh">${hookText(e.bh, e.bhNew)}</span><span class="d">${esc(e.d)}</span><span class="ra">${knownBtn(w, known.has(w))}${starBtn(w, stars.has(w))}</span></div>`;
}

