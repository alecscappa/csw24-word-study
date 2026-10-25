// Offline copy of the app for the phone. Network first so updates show straight away.
// The word list isn't cached here: it lives in IndexedDB, loaded from Settings → Lexicon.
const CACHE = "csw24-v4";
const SHELL = ["./", "index.html", "manifest.json", "icons/icon-32.png", "icons/icon-64.png", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png",
  "css/app.css", "js/paint.js", "js/start.js", "js/engine.js", "js/base.js", "js/data.js", "js/study.js", "js/board.js", "js/review.js", "js/firebase-config.js", "js/sync.js", "js/routing.js"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); self.skipWaiting(); });
// drop older copies (csw24-v1 was the single-file page)
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request)
    .then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || Response.error())));
});
