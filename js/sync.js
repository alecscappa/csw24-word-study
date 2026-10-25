// ---------- sync: one Google account keeps stars, notes, progress and games the same on every device, through
// Firebase. Each saved key is one Firestore document, users/{uid}/data/{key}, holding the value and when it last
// changed; the newer copy wins. The first time a device signs in, what it already has is added to the account's
// (stars, notes, games and so on are merged, not replaced). The look (theme, text size, tiles, the board's look)
// stays each device's own ----------
const SYNC_KEYS = ["stars", "missed", "notes", "hist", "stats", "plearnt", "pq", "pLast", "games", "boardStats", "labStats", "settings"];
const LOOK_KEYS = ["theme", "mode", "glare", "size", "tiles", "tileCustom", "headCustom", "accentCustom", "tileLook", "tileFont", "rackLook", "values", "tones",
  "bPal", "bLabels", "bCoords", "bTile", "bStyle", "bMark", "bTheme", "bTileCol", "bArrows"];
const FB_SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
const SYNC = { on: !!FIREBASE_CONFIG, user: null, state: "off", err: "", at: 0, fb: null, dirty: new Set(), timer: 0, unsub: null, seen: {} };
const syncTimes = () => { try { return JSON.parse(localStorage.getItem("csw24:syncT")) || {}; } catch { return {}; } };
const syncTimesSet = t => localStorage.setItem("csw24:syncT", JSON.stringify(t));
const raw = k => { try { return JSON.parse(localStorage.getItem("csw24:" + k)); } catch { return null; } };
const rawSet = k => v => localStorage.setItem("csw24:" + k, JSON.stringify(v));
// what goes up for a key: settings without the look
const syncOut = (k, v) => k === "settings" && v ? Object.fromEntries(Object.entries(v).filter(([f]) => !LOOK_KEYS.includes(f))) : v;
// the key as it would go up; a save that doesn't change it (the same history again, a look-only setting) isn't sent,
// so two devices never bounce the same value back and forth
const syncSig = k => JSON.stringify(syncOut(k, raw(k)));
// what a key becomes when the account's copy comes down
function syncIn(k, local, remote, first) {
  if (k === "settings") return { ...(local || {}), ...remote, ...Object.fromEntries(LOOK_KEYS.filter(f => local && f in local).map(f => [f, local[f]])) };
  if (!first || local == null) return remote;
  // first sign-in on this device: put the two together
  if (Array.isArray(local) && Array.isArray(remote) && k !== "games") return [...new Set([...local, ...remote])];
  if (k === "notes") return { ...remote, ...local };
  if (k === "games") { const by = new Map(remote.map(g => [g.id, g])); for (const g of local) { const r = by.get(g.id); if (!r || (g.review && !r.review)) by.set(g.id, g); } return [...by.values()].sort((a, b) => b.at - a.at); }
  return remote;
}
// the app keeps a few of these in memory: refresh them, and redraw the page unless you're typing
function syncRefresh() {
  SET = { ...SET_DEFAULT, ...store.get("settings", {}) };
  GAMES = store.get("games", []);
  if (document.activeElement?.matches?.("input, textarea")) return;
  const y = scrollY; route(); scrollTo(0, y);
}
function syncChanged(k) {
  if (!SYNC_KEYS.includes(k)) return;
  const sig = syncSig(k); if (SYNC.seen[k] === sig) return; SYNC.seen[k] = sig;
  const t = syncTimes(); t[k] = Date.now(); syncTimesSet(t);
  if (!SYNC.user) return;
  SYNC.dirty.add(k); clearTimeout(SYNC.timer); SYNC.timer = setTimeout(syncPush, 1500);
}
async function syncPush() {
  if (!SYNC.user || !SYNC.dirty.size) return;
  const { fs, db } = SYNC.fb, keys = [...SYNC.dirty]; SYNC.dirty.clear();
  const t = syncTimes();
  try {
    await Promise.all(keys.map(k => fs.setDoc(fs.doc(db, "users", SYNC.user.uid, "data", k), { v: JSON.stringify(syncOut(k, raw(k))), t: t[k] || Date.now() })));
    syncState("synced");
  } catch (e) { keys.forEach(k => SYNC.dirty.add(k)); syncState("error", e.message); }
}
const syncState = (s, err = "") => { SYNC.state = s; SYNC.err = err; if (s === "synced") SYNC.at = Date.now(); const el = $("#syncCard"); if (el) el.innerHTML = syncHTML(); syncWire(); };
async function syncLoad() {
  if (SYNC.fb) return SYNC.fb;
  const [app, auth, fs] = await Promise.all(["firebase-app", "firebase-auth", "firebase-firestore"].map(m => import(FB_SDK + m + ".js")));
  const a = app.initializeApp(FIREBASE_CONFIG);
  return SYNC.fb = { auth, fs, au: auth.getAuth(a), db: fs.getFirestore(a) };
}
// signed in (now, or from last time): bring the two copies together, then listen for changes from other devices
async function syncStart(user) {
  SYNC.user = user; syncState("syncing");
  const { fs, db } = SYNC.fb, first = localStorage.getItem("csw24:syncUser") !== user.uid;
  try {
    const snap = await fs.getDocs(fs.collection(db, "users", user.uid, "data")), remote = {};
    snap.forEach(d => remote[d.id] = d.data());
    const t = syncTimes(); let changed = false;
    for (const k of SYNC_KEYS) {
      const r = remote[k], local = raw(k), lt = t[k] || 0;
      if (r && (first || r.t > lt)) {
        const v = syncIn(k, local, JSON.parse(r.v), first);
        if (JSON.stringify(v) !== JSON.stringify(local)) { rawSet(k)(v); changed = true; }
        SYNC.seen[k] = syncSig(k);
        t[k] = first ? Date.now() : r.t;
        if (first && JSON.stringify(syncOut(k, v)) !== r.v) SYNC.dirty.add(k);
      } else if (local != null && (!r || lt > r.t)) { t[k] = t[k] || Date.now(); SYNC.dirty.add(k); }
    }
    syncTimesSet(t); localStorage.setItem("csw24:syncUser", user.uid);
    if (changed) syncRefresh();
    await syncPush(); syncState("synced");
    SYNC.unsub?.();
    SYNC.unsub = fs.onSnapshot(fs.collection(db, "users", user.uid, "data"), s => {
      const t = syncTimes(); let changed = false;
      s.docChanges().forEach(c => {
        const k = c.doc.id, r = c.doc.data();
        if (!SYNC_KEYS.includes(k) || !(r.t > (t[k] || 0))) return;
        const v = syncIn(k, raw(k), JSON.parse(r.v), false);
        t[k] = r.t;
        if (JSON.stringify(v) === JSON.stringify(raw(k))) return;
        rawSet(k)(v); SYNC.seen[k] = syncSig(k); changed = true;
      });
      syncTimesSet(t);
      if (changed) { syncRefresh(); syncState("synced"); }
    }, e => syncState("error", e.message));
  } catch (e) { syncState("error", e.message); }
}
async function syncSignIn() {
  try {
    const { auth, au } = await syncLoad(), p = new auth.GoogleAuthProvider();
    try { await auth.signInWithPopup(au, p); } catch (e) { if (/popup/.test(e.code || "")) await auth.signInWithRedirect(au, p); else throw e; }
  } catch (e) { syncState("error", e.code === "auth/unauthorized-domain" ? "This address isn't allowed to sign in yet (add it in Firebase → Authentication → Settings → Authorised domains)." : e.message); }
}
async function syncSignOut() {
  const { auth, au } = await syncLoad();
  SYNC.unsub?.(); SYNC.unsub = null; await auth.signOut(au); SYNC.user = null; syncState("off");
}
const ago = t => { const s = Math.round((Date.now() - t) / 1000); return s < 10 ? "just now" : s < 60 ? s + " seconds ago" : s < 3600 ? Math.round(s / 60) + " min ago" : new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); };
function syncHTML() {
  if (!SYNC.on) return `<h2 class="lbl">Account and sync</h2><p class="small" style="margin:0">Sync isn't set up on this copy of the app yet.</p>`;
  if (location.protocol === "file:") return `<h2 class="lbl">Account and sync</h2><p class="small" style="margin:0">Signing in works on the website and on Live Server, not on the page opened straight from the folder.</p>`;
  const u = SYNC.user;
  return `<h2 class="lbl">Account and sync</h2>
    ${u ? `<p style="margin:0 0 4px"><b>${esc(u.email || u.displayName || "Signed in")}</b></p>
      <p class="small" style="margin:0 0 10px">${SYNC.state === "syncing" ? "Syncing…" : SYNC.state === "error" ? `<span class="bad">Couldn't sync: ${esc(SYNC.err)}</span>` : `Synced ${ago(SYNC.at)}`}. Stars, notes, missed words, practice and quiz progress, and games are the same on every device signed in to this account. The look stays each device's own.</p>
      <button class="btn sm" id="syncOut">Sign out</button>`
    : `<p class="small" style="margin:0 0 10px">Sign in on each device with the same Google account, and your stars, notes, progress and games follow you. What's on this device is added to the account the first time.</p>
      ${SYNC.state === "error" ? `<p class="small bad" style="margin:0 0 10px">${esc(SYNC.err)}</p>` : ""}
      <button class="btn primary" id="syncIn">Sign in with Google</button>`}`;
}
function syncWire() {
  $("#syncIn")?.addEventListener("click", syncSignIn);
  $("#syncOut")?.addEventListener("click", syncSignOut);
}
// on every start: if this device signed in before, carry on syncing
if (SYNC.on && location.protocol !== "file:") syncLoad().then(({ auth, au }) => {
  auth.getRedirectResult(au).catch(e => syncState("error", e.message));
  auth.onAuthStateChanged(au, u => { if (u && SYNC.user?.uid !== u.uid) syncStart(u); else if (!u && SYNC.user) { SYNC.user = null; syncState("off"); } });
}).catch(e => syncState("error", "Couldn't reach Firebase: " + e.message));
