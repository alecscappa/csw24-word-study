// ---------- routing ----------
// scroll spots are kept across reloads too: a page's spot is saved on leaving it, or when the app is put away
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
let routed = false;
function saveScroll() {
  delete scrollMem[curHash]; scrollMem[curHash] = getY();
  const ks = Object.keys(scrollMem); if (ks.length > 60) delete scrollMem[ks[0]];
  store.set("scrollMem", scrollMem);
}
addEventListener("pagehide", saveScroll);
document.addEventListener("visibilitychange", () => { if (document.hidden) saveScroll(); });
function route() {
  poSoft?.();
  closePicker();
  if (AZY?.sim?.running && location.hash !== "#board/analyse") { ENG.stop(AZY.sim.job); AZY.sim.running = false; }
  if (routed) saveScroll();
  routed = true;
  const from = curHash.slice(1).split("/")[0] || "w";
  curHash = location.hash;
  const [tab, arg] = decodeURIComponent(location.hash.slice(1)).split("/");
  const t = VIEWS[tab] ? tab : "w";
  // Lists, Practice and Quiz share the Study tab, which goes back to exactly where you were: the list that was
  // open, or the practice card
  if (STUDY.includes(t)) store.set("studyLast", location.hash.slice(1));
  // My words does the same: the folder or list that was open, at the same spot
  if (t === "mine") store.set("mineLast", location.hash.slice(1));
  // and Board: the game, review or tool that was open
  if (t === "board") store.set("boardLast", location.hash.slice(1));
  if (t === "settings") themesOpen = false;
  // Search's and Practice's folding sections start as new when you come from another tab; opening a word and coming back
  // leaves them as they were, so the page stays put
  if (t === "search" && from !== "search" && from !== "w") store.set("searchOpen", { group: true });
  if (t === "practice" && from !== "practice" && from !== "w") store.set("pOpen", false);
  // the search bar only keeps its text on the Word and Search pages
  if (t !== "w" && t !== "search") $("#q").value = "";
  const fresh = searchFromBar;
  $('#tabs [data-tab="study"]').href = "#" + store.get("studyLast", "lists");
  $('#tabs [data-tab="mine"]').href = "#" + store.get("mineLast", "mine");
  $('#tabs [data-tab="board"]').href = "#" + store.get("boardLast", "board");
  document.querySelectorAll("#tabs a").forEach(a => a.classList.toggle("on", a.dataset.tab === t || (a.dataset.tab === "study" && STUDY.includes(t))));
  // each page sets its own keys (Quiz again when a question is drawn), so none carry over from the last page
  document.onkeydown = null;
  $("#view").classList.toggle("quizv", t === "quiz" || t === "practice");
  // phone: Practice is full screen (no header) only once started; a sheet left open elsewhere is closed
  document.body.classList.toggle("full", t === "practice" && arg === "go");
  document.body.classList.remove("sheet-open");
  if (t !== "practice") pSheetOpen = false;
  // Search's scrolling page under the header (searchExpand) is undone for every other page
  $("#view").classList.remove("sx"); $("#view").onscroll = null; $("#view").scrollTop = 0;
  VIEWS[t](arg);
  fitPage();
  window.scrollTo({ top: 0 });
  // every page goes back to where it was scrolled; results that build a moment later restore it themselves
  const back = fresh ? 0 : scrollMem[curHash] || 0;
  pendingScroll = ["lists", "search", "mine"].includes(t) ? back : 0;
  if (pendingScroll) restoreScroll(); else setY(back);
}
window.addEventListener("hashchange", route);
// a page with a .fitscroll card fills the window under the header and only that card (and any side columns) scrolls;
// --hdr is the header's height, for anything that sits just under it
function fitPage() { document.body.classList.toggle("fit", !!document.querySelector("#view .fitscroll")); }
new MutationObserver(fitPage).observe($("#view"), { childList: true });
new ResizeObserver(() => document.documentElement.style.setProperty("--hdr", $("header").offsetHeight + "px")).observe($("header"));
$("#form").addEventListener("submit", ev => {
  ev.preventDefault();
  const q = $("#q").value.toUpperCase().replace(/[^A-Z?.*\[\]^]/g, "");
  if (!q) return;
  const tab = location.hash.slice(1).split("/")[0], onSearch = tab === "search";
  // on the Word page a plain word opens that word; everything else is a search
  if (/^[A-Z]+$/.test(q) && (!VIEWS[tab] || tab === "w")) { freshWord(q); location.hash = "w/" + q; return; }
  // on the Search page the bar replaces just the letters, keeping the group, length and other filters
  const keep = onSearch ? Object.fromEntries(Object.entries(searchState).filter(([k]) => !LETTER_KEYS.includes(k))) : {};
  searchFromBar = true;
  if (onSearch) { searchState = { ...SEARCH_DEFAULT, ...keep, ...barSearch(q) }; store.set("search", searchState); VIEWS.search(); }
  else { searchInNewTab(barSearch(q)); location.hash = "search"; }
});
// on the Search page, emptying the bar drops the letters (URA?ITE, *ING) from the search but keeps the other filters
function clearBarLetters() {
  if (location.hash.slice(1).split("/")[0] !== "search" || $("#q").value || !barText(searchState)) return;
  for (const k of LETTER_KEYS) searchState[k] = SEARCH_DEFAULT[k];
  store.set("search", searchState); VIEWS.search();
}
$("#qClear").addEventListener("click", () => { $("#q").value = ""; $("#q").focus(); clearBarLetters(); });
$("#q").addEventListener("input", clearBarLetters);
// on the Word page the box holds the word being shown; tapping it starts a fresh word when that word was a random one
// (see clearOnTap), and leaving it empty puts the word back
const onWordPage = () => { const tab = location.hash.slice(1).split("/")[0]; return !VIEWS[tab] || tab === "w"; };
$("#q").addEventListener("focus", () => { if (onWordPage() && clearOnTap && $("#q").value === wordShown) $("#q").value = ""; });
$("#q").addEventListener("blur", () => { if (onWordPage() && !$("#q").value) $("#q").value = wordShown; });
// recent searches drop down under the empty bar; picking one runs it again (in the open search tab when on Search,
// otherwise in a new one)
function recentDrop() {
  $("#recent")?.remove();
  const list = getRecent();
  if ($("#q").value || !list.length || document.activeElement !== $("#q")) return;
  $(".qwrap").insertAdjacentHTML("beforeend", `<div class="recent" id="recent" role="listbox"><div class="lbl">Recent searches</div>
    ${list.map((r, i) => `<button type="button" class="rc" data-recent="${i}"><b>${esc(searchName(r.s))}</b><em>${edited(r.t)}</em><span>${esc([accSummary("narrow", r.s), r.n != null && `${r.n.toLocaleString()} word${r.n === 1 ? "" : "s"}`].filter(Boolean).join(" · "))}</span></button>`).join("")}
    <div class="ft"><span>Last ${list.length} kept on this device</span><button type="button" id="recentClear">Clear</button></div></div>`);
  const box = $("#recent");
  // keep the bar focused while tapping in the list, so it doesn't close before the tap lands
  box.addEventListener("pointerdown", ev => ev.preventDefault());
  box.querySelectorAll("[data-recent]").forEach(b => b.onclick = () => {
    const s = list[+b.dataset.recent].s, onSearch = location.hash.slice(1).split("/")[0] === "search";
    searchFromBar = true; $("#q").blur(); box.remove();
    if (onSearch) { searchState = { ...SEARCH_DEFAULT, ...s }; store.set("search", searchState); VIEWS.search(); }
    else { searchInNewTab(s); location.hash = "search"; }
  });
  $("#recentClear").onclick = () => { store.set("searchRecent", []); box.remove(); };
}
$("#q").addEventListener("focus", recentDrop);
$("#q").addEventListener("input", recentDrop);
$("#q").addEventListener("blur", () => $("#recent")?.remove());
$("#q").addEventListener("keydown", ev => { if (ev.key === "Escape") $("#recent")?.remove(); });
// a shorter hint fits the phone's narrower search box
const qHint = () => $("#q").placeholder = phone() ? "Word or letters" : "Word, letters, ?AE or QU*";
phoneMQ.addEventListener?.("change", qHint); qHint();
// a random word in the lengths and probability ranks set in Settings (ranks count within each length)
$("#randBtn").addEventListener("click", () => {
  const lo = Math.min(SET.randMin, SET.randMax), hi = Math.max(SET.randMin, SET.randMax), from = +SET.randFrom || 1, to = +SET.randTo || Infinity;
  const pools = range(lo, hi).map(n => (BYLEN[n] || []).filter(w => { const p = DICT.get(w).p; return p >= from && p <= to; })).filter(p => p.length);
  if (!pools.length) { location.hash = "settings/study"; return; }
  const pool = pools[Math.floor(Math.random() * pools.length)];
  randomPick = pool[Math.floor(Math.random() * pool.length)]; freshWord(randomPick);
  location.hash = "w/" + randomPick;
});
// a word opened afresh starts at the top; only coming back to one (the Word tab, or Back) returns to its spot
const freshWord = w => { delete scrollMem["#w/" + w]; };
document.addEventListener("click", ev => { const a = ev.target.closest?.('a[href^="#w/"]'); if (a && !a.closest("#tabs")) delete scrollMem[a.getAttribute("href")]; }, true);
document.addEventListener("click", ev => {
  const kb = ev.target.closest("[data-known]");
  if (kb) {
    ev.preventDefault();
    const w = kb.dataset.known, on = toggleKnown(w);
    document.querySelectorAll(`[data-known="${w}"]`).forEach(b => { const row = b.closest(".r"); row?.classList.toggle("known", on); b.outerHTML = knownBtn(w, on);
      // with Hide crossed off on, a word ticked in a list leaves it
      if (on && SET.hideKnown && row?.closest("#view .rows")) row.remove(); });
    return;
  }
  const sb = ev.target.closest("[data-star]");
  if (sb) {
    ev.preventDefault();
    const w = sb.dataset.star, on = toggleStar(w);
    document.querySelectorAll(`[data-star="${w}"]`).forEach(b => b.outerHTML = starBtn(w, on));
    return;
  }
  const t = ev.target.closest("[data-go]");
  if (t) { ev.preventDefault(); freshWord(t.dataset.go); location.hash = "w/" + t.dataset.go; }
});
route();
