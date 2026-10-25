// ---------- routing ----------
function route() {
  closePicker();
  if (AZY?.sim?.running && location.hash !== "#board/analyse") { ENG.stop(AZY.sim.job); AZY.sim.running = false; }
  scrollMem[curHash] = window.scrollY; curHash = location.hash;
  const [tab, arg] = decodeURIComponent(location.hash.slice(1)).split("/");
  const t = VIEWS[tab] ? tab : "w";
  // Lists, Practice and Quiz share the Study tab, which goes back to exactly where you were: the list that was
  // open, or the practice card
  if (STUDY.includes(t)) store.set("studyLast", location.hash.slice(1));
  // the search bar only keeps its text on the Word and Search pages
  if (t !== "w" && t !== "search") $("#q").value = "";
  const fresh = searchFromBar;
  $('#tabs [data-tab="study"]').href = "#" + store.get("studyLast", "lists");
  document.querySelectorAll("#tabs a").forEach(a => a.classList.toggle("on", a.dataset.tab === t || (a.dataset.tab === "study" && STUDY.includes(t))));
  // each page sets its own keys (Quiz again when a question is drawn), so none carry over from the last page
  document.onkeydown = null;
  $("#view").classList.toggle("quizv", t === "quiz" || t === "practice");
  // phone: Practice is full screen (no header) only once started; a sheet left open elsewhere is closed
  document.body.classList.toggle("full", t === "practice" && arg === "go");
  document.body.classList.remove("sheet-open");
  if (t !== "practice") pSheetOpen = false;
  VIEWS[t](arg);
  window.scrollTo({ top: 0 });
  // lists, search and My words go back to where they were scrolled (results that build a moment later restore it themselves)
  pendingScroll = ["lists", "search", "mine"].includes(t) && !fresh ? scrollMem[curHash] || 0 : 0;
  restoreScroll();
}
window.addEventListener("hashchange", route);
$("#form").addEventListener("submit", ev => {
  ev.preventDefault();
  const q = $("#q").value.toUpperCase().replace(/[^A-Z?.*\[\]^]/g, "");
  if (!q) return;
  const tab = location.hash.slice(1).split("/")[0], onSearch = tab === "search";
  // on the Word page a plain word opens that word; everything else is a search
  if (/^[A-Z]+$/.test(q) && (!VIEWS[tab] || tab === "w")) { location.hash = "w/" + q; return; }
  // on the Search page the bar replaces just the letters, keeping the group, length and other filters
  const keep = onSearch ? Object.fromEntries(Object.entries(searchState).filter(([k]) => !LETTER_KEYS.includes(k))) : {};
  searchFromBar = true; searchState = { ...SEARCH_DEFAULT, ...keep, ...barSearch(q) }; store.set("search", searchState);
  onSearch ? VIEWS.search() : location.hash = "search";
});
$("#qClear").addEventListener("click", () => { $("#q").value = ""; $("#q").focus(); });
// a shorter hint fits the phone's narrower search box
const qHint = () => $("#q").placeholder = phone() ? "Word or letters" : "Word, letters, ?AE or QU*";
phoneMQ.addEventListener?.("change", qHint); qHint();
// a random word in the lengths and probability ranks set in Settings (ranks count within each length)
$("#randBtn").addEventListener("click", () => {
  const lo = Math.min(SET.randMin, SET.randMax), hi = Math.max(SET.randMin, SET.randMax), from = +SET.randFrom || 1, to = +SET.randTo || Infinity;
  const pools = range(lo, hi).map(n => (BYLEN[n] || []).filter(w => { const p = DICT.get(w).p; return p >= from && p <= to; })).filter(p => p.length);
  if (!pools.length) { location.hash = "settings"; return; }
  const pool = pools[Math.floor(Math.random() * pools.length)];
  location.hash = "w/" + pool[Math.floor(Math.random() * pool.length)];
});
document.addEventListener("click", ev => {
  const sb = ev.target.closest("[data-star]");
  if (sb) {
    ev.preventDefault();
    const w = sb.dataset.star, on = toggleStar(w);
    document.querySelectorAll(`[data-star="${w}"]`).forEach(b => b.outerHTML = starBtn(w, on));
    return;
  }
  const t = ev.target.closest("[data-go]");
  if (t) { ev.preventDefault(); location.hash = "w/" + t.dataset.go; }
});
route();
