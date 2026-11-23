// ---------- Today: the page the app opens to ----------
// racks to go over first, then today's count against a small goal and the days in a row, the list you were on,
// racks from it you've almost learnt, the next list in its folder once it's nearly done, missed words and a word of the day
const GOALS = [10, 20, 30, 50, 100];
// the racks you got wrong in Practice, waiting in its review queue (hook, pattern and other cards have a "x:" key)
const rackQueue = () => getPQ().items.filter(x => !x.a.includes(":"));
// the same word all day, the same for everyone: a likely 4 to 7 letter word with a definition
let wotdMemo = ["", ""];
function wordOfDay() {
  const k = dayKey(); if (wotdMemo[0] === k) return wotdMemo[1];
  let h = 0; for (const c of k) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const pool = range(4, 7).flatMap(n => (BYLEN[n] || []).filter(w => { const e = DICT.get(w); return e.p <= 1500 && e.d && !e.d.startsWith("<"); }));
  return (wotdMemo = [k, pool.length ? pool[h % pool.length] : ""])[1];
}
// the list after the last one in its folder (a family counts as one), or null when it's the folder's last
function nextInFolder(g) {
  for (const [name, items] of listSections()) {
    const i = items.findIndex(x => x.id === g.id || (x.rows && (famIds(x).includes(g.id) || g.id.startsWith("b:" + x.id + ":"))));
    if (i >= 0) return items[i + 1] ? { name, x: items[i + 1] } : null;
  }
  return null;
}
// Practise a list with some of its racks first
function finishRacks(g, racks) {
  playList(g, "anagram");
  newSession(JSON.stringify(practiceOpts()), racks.length, racks);
}
VIEWS.today = () => {
  const days = studyDays(), today = days[dayKey()] || {}, done = today.c || 0, goal = SET.dayGoal || 30;
  const last = groupOf(store.get("lastList")), q = rackQueue(), missed = store.get("missed", []).filter(w => DICT.has(w));
  const date = (o) => new Date().toLocaleDateString("en-GB", o);
  // the week: the last seven days, today last
  const week = range(0, 6).map(i => { const d = new Date(); d.setDate(d.getDate() - 6 + i); const v = days[dayKey(d)];
    return `<i class="${v?.c || v?.l ? "on" : i === 6 ? "now" : ""}">${"SMTWTFS"[d.getDay()]}</i>`; }).join("");
  const streak = dayStreak(days);
  const hero = q.length ? `<div class="lhero"><div class="lh-main"><small>Racks to go over</small>
      <span class="td-big">${q.length.toLocaleString()}<small>rack${q.length === 1 ? "" : "s"}</small></span>
      <span class="lh-sub">Racks you got wrong in Practice. Each one goes once you get it right three times.</span>
      <div class="lh-acts"><button type="button" class="btn" id="tdReview">▶ Go over them</button></div></div></div>` : "";
  const goalCard = `<div class="card"><div class="goal"><span class="lring ${done >= goal ? "full" : ""}" style="--p:${Math.min(100, Math.round(done / goal * 100))}"><b>${done >= goal ? "✓" : `${done}/${goal}`}</b></span>
      <div class="goal-t"><b>${done.toLocaleString()} of ${goal} answers today</b><span>${done >= goal ? "Today's goal is done" : `${goal - done} more for today's goal`} · <button type="button" class="lnk" id="tdGoal">Goal ${goal}</button></span></div></div>
    <div class="wk">${week}</div><p class="small" style="margin:8px 0 0">${streak ? `${streak} day${streak === 1 ? "" : "s"} in a row` : "Study today to start a run of days"}</p></div>`;
  const sw = last && listSample(last);
  const keep = last ? `<div class="card"><p class="lbl">Keep going</p>
      <div class="row2"><div><span class="nm">${esc(last.name)}</span><span class="sm2" id="tdKeepSub">&nbsp;</span></div>${sw ? tilesHTML(sw.slice(0, 6), true) : ""}</div>
      ${last.special ? "" : `<div class="pbar" style="margin:10px 0 12px"><div id="tdKeepBar" style="width:0"></div></div>`}
      <div class="acts">${last.special ? "" : `<button type="button" class="btn sm primary" id="tdPlay">▶ Practise</button><button type="button" class="btn sm" id="tdQuiz">Quiz</button>`}<a class="btn sm" href="#lists/${last.id}">Open</a></div></div>`
    : `<div class="card"><p class="lbl">Start here</p><div class="row2"><div><span class="nm">Two-letter words</span><span class="sm2">All 127 twos: the words every game uses</span></div>${tilesHTML("QI", true)}</div>
      <div class="acts" style="margin-top:12px"><a class="btn sm primary" href="#lists/twos">Open the twos</a></div></div>`;
  // racks from the list you were on that are right once or twice since they were missed
  const inList = last && !last.special ? new Set(groupWords(last).map(alpha)) : new Set();
  const almost = q.filter(x => x.lvl >= 1 && inList.has(x.a)).sort((a, b) => b.lvl - a.lvl);
  const almostCard = almost.length ? `<div class="card"><p class="lbl">Almost learnt <em>${almost.length}</em></p>
      <div class="almost">${almost.slice(0, 3).map(x => `<div>${tilesHTML(x.a, true)}<span class="dots3" title="Right ${x.lvl} of ${GAPS.length}">${range(1, GAPS.length).map(i => `<i class="${i <= x.lvl ? "on" : ""}"></i>`).join("")}</span></div>`).join("")}</div>
      <p class="small" style="margin:0 0 10px">Right once or twice since you missed ${almost.length === 1 ? "it" : "them"}: three times right and ${almost.length === 1 ? "it's" : "they're"} learnt.</p>
      <button type="button" class="btn sm primary" id="tdAlmost">▶ Finish ${almost.length === 1 ? "it" : "these"}</button></div>` : "";
  const missedCard = missed.length ? `<div class="card"><p class="lbl">Missed words <em>${missed.length.toLocaleString()}</em></p>
      <div class="mwords">${missed.slice(0, 5).map(w => `<a href="#w/${w}">${w}</a>`).join(" ")}${missed.length > 5 ? ` <span>and ${(missed.length - 5).toLocaleString()} more</span>` : ""}</div>
      <button type="button" class="btn sm" id="tdMissed">Retry missed</button></div>` : "";
  const wd = wordOfDay(), we = wd && DICT.get(wd);
  const wotd = wd ? `<div class="card wotd"><p class="lbl">Word of the day</p><a href="#w/${wd}" class="tdw">${tilesHTML(wd)}</a>
      <p class="def">${esc(we.d)}</p>
      <div class="hooks">Hooks ${we.fh ? `<span class="hk">${we.fh.toUpperCase()}</span>` : `<span class="none">–</span>`} ${wd} ${we.bh ? `<span class="hk">${we.bh.toUpperCase()}</span>` : `<span class="none">–</span>`}</div></div>` : "";
  const head = `<div class="td-head"><h2 class="title">Today</h2><span class="small">${date(phone() ? { weekday: "short", day: "numeric", month: "short" } : { weekday: "long", day: "numeric", month: "long" })}</span></div>`;
  // Next in your folder fills in with the list's numbers, below Almost learnt
  const left = hero + keep + almostCard + `<div id="tdNext" hidden></div>`, right = goalCard + wotd + missedCard;
  $("#view").innerHTML = `<div class="today">${head}${phone() ? `<div class="col">${hero}${goalCard}${keep}${almostCard}<div id="tdNext" hidden></div>${missedCard}${wotd}</div>`
    : `<div class="tdgrid"><div class="col">${left}</div><div class="col">${right}</div></div>`}</div>`;
  $("#tdReview")?.addEventListener("click", () => {
    saveSettings({ practice: { ...PO_DEFAULT, mode: "anagram", order: SET.practice?.order || "rand", rev: !!SET.practice?.rev, lens: [], sMiss: true } });
    location.hash = "practice";
  });
  $("#tdGoal").onclick = () => { saveSettings({ dayGoal: GOALS[(GOALS.indexOf(goal) + 1) % GOALS.length] }); VIEWS.today(); };
  $("#tdPlay")?.addEventListener("click", () => playList(last));
  $("#tdQuiz")?.addEventListener("click", () => quizList(last));
  $("#tdAlmost")?.addEventListener("click", () => finishRacks(last, almost.map(x => x.a)));
  $("#tdMissed")?.addEventListener("click", () => { quizSetup = { ...quizSetup, source: "missed", lens: [], starOnly: false }; store.set("quizSetup", quizSetup); location.hash = "quiz"; });
  // the list's numbers after the first paint, as on the Lists page
  if (last && !last.special) setTimeout(() => {
    if (!$("#tdKeepBar")) return;
    const [n, all] = listPct(last), p = pctOf([n, all]), m = new Set(missed), nm = listWords(last).filter(w => m.has(w)).length;
    $("#tdKeepBar").style.width = p + "%";
    $("#tdKeepSub").textContent = `${n.toLocaleString()} of ${all.toLocaleString()} learnt${nm ? ` · ${nm.toLocaleString()} missed` : ""}`;
    // the next list in the folder shows once this one is nearly done
    const nx = p >= 90 && nextInFolder(last), box = $("#tdNext");
    if (!nx || !box) return;
    const x = nx.x, s = listSample(x);
    box.outerHTML = `<div class="card"><p class="lbl">Next in your folder <em>${esc(nx.name)}</em></p>
      <div class="row2"><div><span class="nm">${esc(x.name)}</span><span class="sm2">${x.rows ? `${famIds(x).length} lists` : x.special ? "stems" : `${listWords(x).length.toLocaleString()} words`} · after ${esc(last.name)}</span></div>${s ? tilesHTML(s.slice(0, 6), true) : ""}</div>
      <div class="acts" style="margin-top:12px">${x.rows || x.special ? "" : `<button type="button" class="btn sm" id="tdNextGo">▶ Start it</button>`}<a class="btn sm" href="#lists/${x.id}">Open</a></div></div>`;
    $("#tdNextGo")?.addEventListener("click", () => playList(x));
  }, 30);
};
