// Lexicon loader. The word list comes from words.js beside this page (local build), or from a copy the
// user loaded in Settings, which is kept in this browser's IndexedDB. The app's files (APP_FILES) start once it's ready.
const LEX = {
  source: window.CSW_TSV ? "file" : null,
  db: () => new Promise((ok, no) => { const r = indexedDB.open("csw24", 1); r.onupgradeneeded = () => r.result.createObjectStore("lex"); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); }),
  async get() { const db = await LEX.db(); return new Promise((ok, no) => { const r = db.transaction("lex").objectStore("lex").get("tsv"); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); }); },
  async put(v) { const db = await LEX.db(); return new Promise((ok, no) => { const t = db.transaction("lex", "readwrite"), st = t.objectStore("lex"); v == null ? st.delete("tsv") : st.put(v, "tsv"); t.oncomplete = ok; t.onerror = () => no(t.error); }); },
  // accepts words.js from build.py, or the plain tab-separated text inside it
  parse(text) {
    const m = text.match(/^\s*window\.CSW_TSV\s*=\s*/);
    const tsv = m ? JSON.parse(text.slice(m[0].length).trim().replace(/;$/, "")) : text.trim();
    if (!/^[A-Z]+\t[^\n]*\t[^\n]*\t[^\n]*\t[^\n]*\t\d+/.test(tsv)) throw new Error("it isn't a words.js file from build.py");
    return tsv;
  },
  async load(file) { await LEX.put(LEX.parse(await file.text())); await navigator.storage?.persist?.().catch(() => {}); location.reload(); },
  html: () => `<p class="small" style="margin:0 0 10px">${{ file: "Using <code>words.js</code> from this folder.", saved: "Using the lexicon loaded on this device." }[LEX.source] || "No lexicon loaded yet."}
    Load <code>words.js</code> (made by <code>python3 build.py</code> from your Zyzzyva CSW24 lexicon). It stays on this device and is never uploaded.</p>
    <div class="row"><label class="btn sm">Load lexicon file<input type="file" id="lexFile" accept=".js,.tsv,.txt,text/plain,text/javascript" hidden></label>${LEX.source === "saved" ? `<button class="btn sm" id="lexDel">Remove from this device</button>` : ""}<span class="small" id="lexMsg"></span></div>`,
  wire() {
    const msg = document.getElementById("lexMsg");
    document.getElementById("lexFile").onchange = e => { const f = e.target.files[0]; if (!f) return; msg.textContent = "Loading…"; LEX.load(f).catch(err => msg.textContent = "Couldn't load that file: " + err.message); };
  },
};
const APP_FILES = ["js/base.js", "js/data.js", "js/study.js", "js/board.js", "js/routing.js"];
if (location.protocol === "https:" && "serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
(async () => {
  if (!window.CSW_TSV) { try { window.CSW_TSV = await LEX.get(); if (window.CSW_TSV) LEX.source = "saved"; } catch {} }
  if (document.readyState === "loading") await new Promise(r => document.addEventListener("DOMContentLoaded", r));
  // the app's files run one after another (async = false keeps their order). With no lexicon only the first runs,
  // for the saved theme, and the page asks for a word list instead
  for (const f of window.CSW_TSV ? APP_FILES : APP_FILES.slice(0, 1)) {
    const s = document.createElement("script"); s.src = f; s.async = false; document.body.append(s);
  }
  if (!window.CSW_TSV) {
    document.getElementById("view").innerHTML = `<div class="card"><h3 class="title">Load your lexicon</h3>${LEX.html()}</div>`;
    LEX.wire();
  }
})();
