// Drive real Chrome over the DevTools protocol: render every page, click through flows, collect errors.
import { spawn } from "node:child_process";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
import { fileURLToPath, pathToFileURL } from "node:url"; import os from "node:os"; import path from "node:path";
const URL0 = pathToFileURL(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "index.html")).href;
const prof = path.join(os.tmpdir(), "csw24-test-" + Date.now());
const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=9333", "--user-data-dir=" + prof, "--no-first-run", "--allow-file-access-from-files", "about:blank"], { stdio: "ignore" });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let targets; for (let i = 0; i < 50; i++) { try { targets = await (await fetch("http://127.0.0.1:9333/json")).json(); break; } catch { await sleep(200); } }
const ws = new WebSocket(targets.find(t => t.type === "page").webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pending = {}; const errors = [];
ws.onmessage = m => { const d = JSON.parse(m.data);
  if (d.id && pending[d.id]) { pending[d.id](d); delete pending[d.id]; }
  if (d.method === "Runtime.exceptionThrown") errors.push("EXCEPTION " + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).split("\n")[0]);
  if (d.method === "Runtime.consoleAPICalled" && d.params.type === "error") errors.push("console.error " + d.params.args.map(a => a.value ?? a.description).join(" "));
  if (d.method === "Log.entryAdded" && d.params.entry.level === "error" && !/dictionaryapi|wiktionary|favicon|404/.test((d.params.entry.url || "") + d.params.entry.text)) errors.push("log " + d.params.entry.text + " " + (d.params.entry.url || ""));
};
const cmd = (method, params = {}) => new Promise(r => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await cmd("Runtime.evaluate", { expression: expr.trim().startsWith("const") ? "{" + expr + "}" : expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 80) + " -> " + r.result.exceptionDetails.exception?.description); return r.result.result.value; };
await cmd("Runtime.enable"); await cmd("Log.enable"); await cmd("Page.enable");
const CONTRAST = `(() => { const lum = c => { const m = c.match(/[\\d.]+/g).map(Number); const f = v => (v/=255) <= .03928 ? v/12.92 : ((v+.055)/1.055)**2.4; return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2]); };
      const bgOf = el => { while (el) { const b = getComputedStyle(el).backgroundColor; if (b && !(b.startsWith("rgba") && b.endsWith(", 0)")) && b !== "transparent") return b; el = el.parentElement; } return getComputedStyle(document.body).backgroundColor; };
      const bad = []; for (const el of document.querySelectorAll("main *, header *")) { if (!el.childNodes.length || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue; const cs = getComputedStyle(el); if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity < .5) continue;
        const a = lum(cs.color), b = lum(bgOf(el)); const r = (Math.max(a,b)+.05)/(Math.min(a,b)+.05); if (r < 3) bad.push(el.tagName + "." + el.className + " '" + el.textContent.trim().slice(0,20) + "' " + r.toFixed(2)); } return bad.slice(0,4); })()`;
const results = []; const check = (name, cond, detail = "") => results.push([cond ? "PASS" : "FAIL", name, detail]);
const go = async hash => { await ev(`location.hash = ${JSON.stringify(hash)}`); await sleep(350); };
await cmd("Page.navigate", { url: URL0 + "#w/QI" }); await sleep(2500);
check("page loads 280,887 words", await ev("DICT.size") === 280887);

// --- every page, two widths, light + dark: errors, horizontal overflow, invisible text ---
const pages0 = ["w/QI", "w/AATMAN", "w/ZZZZQ", "w/EUOUAE", "w/ABYE", "search", "lists", "lists/vowel", "lists/stems6", "lists/prefix", "quiz", "mine", "mine/missed", "settings"];
const pages = pages0;
for (const [w, h] of [[1280, 900], [390, 844]]) for (const scheme of ["light", "dark"]) {
  await cmd("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 500 });
  await cmd("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme }] });
  await ev("applySettings()");
  for (const p of pages) {
    const before = errors.length; await go(p); await sleep(p.startsWith("lists") ? 600 : 50);
    const ow = await ev("document.documentElement.scrollWidth - innerWidth");
    check(`${w}px ${scheme} #${p} no sideways scroll`, ow <= 0, "overflow " + ow + "px");
    // text whose colour is (nearly) the same as its background
    const low = await ev(CONTRAST);
    check(`${w}px ${scheme} #${p} text contrast >= 3:1`, low.length === 0, low.join(" | "));
    check(`${w}px ${scheme} #${p} no errors`, errors.length === before, errors.slice(before).join(" | "));
  }
}
await cmd("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });

// --- every theme, light and dark: contrast on the busiest pages ---
for (const theme of await ev("Object.keys(THEMES)")) for (const mode of ["light", "dark"]) {
  await ev(`saveSettings({ theme: "${theme}", mode: "${mode}" })`);
  for (const p of ["w/AATMAN", "lists", "search", "settings"]) { await go(p); await sleep(150);
    const low = await ev(CONTRAST); check(`theme ${theme} ${mode} #${p} contrast`, low.length === 0, low.join(" | ")); }
  await go("quiz"); await ev(`document.querySelector("#qsrc").value="list:twos"; document.querySelector("#qstart").click()`); await sleep(150);
  const low = await ev(CONTRAST); check(`theme ${theme} ${mode} quiz question contrast`, low.length === 0, low.join(" | ")); await ev(`Q = null`);
}
await ev(`saveSettings({ theme: "board", mode: "auto" })`);
await go("lists"); await sleep(1500);
check("list cards show title + count only", (await ev(`document.querySelectorAll(".lcard span").length`)) === 0 && /\d+ words/.test(await ev(`document.querySelector("#cnt_vowel").textContent`)), await ev(`document.querySelector(".lcard").textContent`));
// --- flows ---
const txt = sel => ev(`document.querySelector(${JSON.stringify(sel)})?.textContent.trim()`);
const submitHeader = async q => { await ev(`document.querySelector("#q").value = ${JSON.stringify(q)}; document.querySelector("#form").requestSubmit()`); await sleep(700); };
await submitHeader("aeinst?");
check("header rack → search", (await ev("location.hash")) === "#search" && /97 words/.test(await txt("#sres .count")), await txt("#sres .count"));
check("blank shown in red lowercase", await ev(`!!document.querySelector("#sres .wl mark")`));
await submitHeader("q[^u]*");
check("header pattern → search", /\d+ words/.test(await txt("#sres .count") || ""), await txt("#sres .count"));
await submitHeader("retains");
check("header word → word page", (await ev("location.hash")) === "#w/RETAINS" && /Valid/.test(await txt(".badge")));
await go("w/AATMAN");
check("AATMAN back hook shows s with + mark", (await ev(`[...document.querySelectorAll(".hook button")].map(b=>b.textContent).join(",")`)) === "s+");
await ev(`document.querySelector(".hook button").click()`); await sleep(300);
check("clicking hook opens AATMANS (valid)", (await ev("location.hash")) === "#w/AATMANS" && /Valid/.test(await txt(".badge")), await ev("location.hash"));
await ev(`history.back()`); await sleep(400);
check("browser Back returns to AATMAN", (await ev("location.hash")) === "#w/AATMAN");
// search group + filter
await go("search"); await ev(`document.querySelector("#sClear").click()`); await sleep(300);
await ev(`const s=document.querySelector("#s_group"); s.value="vowel"; s.dispatchEvent(new Event("change"))`); await sleep(600);
check("group picker: Vowel dumps = 101", /^101 words$/.test(await txt("#sres .count")), await txt("#sres .count"));
await ev(`document.querySelector("#s_group").value="prefix"; document.querySelector("#s_starts").value="out"; document.querySelector("#sform").requestSubmit()`); await sleep(700);
const c1 = await txt("#sres .count");
await ev(`document.querySelector("[data-len='0']")?.click()`); await sleep(300);
check("prefix+OUT all lengths = 579", /^579 words/.test(await txt("#sres .count")), c1 + " → " + await txt("#sres .count"));
await ev(`document.querySelector("[data-len='7']")?.click()`); await sleep(300);
check("prefix+OUT 7s = 218 of 579", /218 7-letter words.*579 in all/.test(await txt("#sres .count")), await txt("#sres .count"));
await ev(`document.querySelector("#s_top").value="1000"; document.querySelector("#sform").requestSubmit()`); await sleep(600);
check("probability filter narrows it", (await ev(`parseInt(document.querySelector("#sres .count").textContent.replace(/,/g,""))`)) < 218);
await ev(`document.querySelector("#sClear").click()`); await sleep(300);
check("Clear all resets fields", (await ev(`document.querySelector("#s_group").value + document.querySelector("#s_starts").value + document.querySelector("#s_top").value`)) === "");
// --- rank range ("show top 30", "30 to 50") ---
await ev(`document.querySelector("#s_group").value="prefix"; document.querySelector("#s_starts").value="out"; document.querySelector("#s_top").value=""; document.querySelector("#sform").requestSubmit()`); await sleep(700);
await ev(`document.querySelector("[data-len='0']")?.click()`); await sleep(250);
const expected = await ev(`runSearch(searchState).words.sort(sorters[SET.sort]).map(w => w)`);
const rowsNow = () => ev(`[...document.querySelectorAll("#sres .r")].map(r => r.dataset.go)`);
const ranksNow = () => ev(`[...document.querySelectorAll("#sres .rk")].map(r => r.textContent)`);
await ev(`document.querySelector("[data-top='30']").click()`); await sleep(250);
let rws = await rowsNow();
check("Top 30 shows exactly the first 30 in sort order", rws.length === 30 && rws.join() === expected.slice(0, 30).join(), rws.length + " rows");
check("Top 30 count text", /^Ranks 1–30 of 579 words/.test(await txt("#sres .count")), await txt("#sres .count"));
check("rank numbers 1..30 shown", (await ranksNow()).join("") === Array.from({ length: 30 }, (_, i) => (i + 1) + ".").join(""));
await ev(`document.querySelector("#rFrom").value="30"; document.querySelector("#rTo").value="50"; document.querySelector("#rTo").dispatchEvent(new Event("change"))`); await sleep(250);
rws = await rowsNow();
check("30 to 50 shows ranks 30–50 (21 words)", rws.length === 21 && rws.join() === expected.slice(29, 50).join(), rws.length + " rows");
check("30 to 50 rank labels", (await ranksNow())[0] === "30." && (await ranksNow()).at(-1) === "50.");
check("Quiz these uses only the shown range", (await ev("lastResults.length")) === 21);
await ev(`document.querySelector("#rFrom").value="50"; document.querySelector("#rTo").value="30"; document.querySelector("#rTo").dispatchEvent(new Event("change"))`); await sleep(250);
check("reversed range 50 to 30 is swapped", /^Ranks 30–50/.test(await txt("#sres .count")), await txt("#sres .count"));
await ev(`document.querySelector("#rFrom").value="5000"; document.querySelector("#rTo").value=""; document.querySelector("#rTo").dispatchEvent(new Event("change"))`); await sleep(250);
check("range past the end explains why it's empty", /only 579 words/.test(await txt("#sres .empty") || ""), await txt("#sres .empty"));
await ev(`document.querySelector("#rFrom").value="30"; document.querySelector("#rTo").value="50"; document.querySelector("#rTo").dispatchEvent(new Event("change"))`); await sleep(250);
await ev(`document.querySelector("[data-len='7']").click()`); await sleep(250);
const exp7 = expected.filter(w => w.length === 7);
rws = await rowsNow();
check("range applies within the chosen length", rws.join() === exp7.slice(29, 50).join() && /Ranks 30–50 of 218 7-letter words/.test(await txt("#sres .count")), await txt("#sres .count"));
await go("lists"); await go("search"); await sleep(700);
check("range is remembered with the search", (await ev(`document.querySelector("#rFrom").value + "-" + document.querySelector("#rTo").value`)) === "30-50");
await ev(`const s=document.querySelector("#sortSel"); s.value="score"; s.dispatchEvent(new Event("change"))`); await sleep(250);
const byScore = await ev(`runSearch(searchState).words.sort(sorters.score).slice(29, 50)`);
check("changing sort re-ranks the range", (await rowsNow()).join() === byScore.join());
await ev(`const s=document.querySelector("#sortSel"); s.value="prob"; s.dispatchEvent(new Event("change"))`); await sleep(200);
await ev(`document.querySelector("#sClear").click()`); await sleep(300);
check("Clear all also clears the range", (await ev("searchState.from + searchState.to")) === "");
await go("lists/p7"); await sleep(700); await ev(`document.querySelector("[data-top='100']").click()`); await sleep(250);
check("range works on Word lists too", (await ev(`document.querySelectorAll("#lres .r").length`)) === 100);
// sort + defs toggle persist
await go("lists/twos"); await sleep(500);
await ev(`const s=document.querySelector("#sortSel"); s.value="score"; s.dispatchEvent(new Event("change"))`); await sleep(200);
check("sort by points puts ZA/QI/XI-type words first", /^(ZA|QI|ZO|XI|XU|JA|JO|OX|AX|EX)/.test(await txt(".r .wl")), await txt(".r .wl"));
await ev(`const s=document.querySelector("#sortSel"); s.value="prob"; s.dispatchEvent(new Event("change"))`);
// star + my words
await go("w/QAT"); await ev(`if (!getStars().includes("QAT")) document.querySelector("#starBtn").click()`); await sleep(100);
await go("mine/stars"); await sleep(300);
check("starred word appears in My words", (await ev(`[...document.querySelectorAll("#mres .wl")].map(x=>x.textContent)`)).includes("QAT"));
// quiz flows
await go("quiz"); await ev(`document.querySelector("#qsrc").value="list:twos"; document.querySelector("#qsrc").dispatchEvent(new Event("change")); document.querySelector("[data-mode=anagram]").click()`); await sleep(200);
await ev(`document.querySelector("#qsrc").value="list:twos"; document.querySelector("#qsrc").dispatchEvent(new Event("change")); document.querySelector("#qstart").click()`); await sleep(300);
const w1 = await ev("Q.qs[0].w");
const typeWord = async w => { await ev(`document.querySelector("#qa").focus()`); await cmd("Input.insertText", { text: w.toLowerCase() }); await sleep(120); };
await ev(`Q.qs[0] = { w: "ZAX", show: "ZAX" }; drawQuestion()`); await sleep(150);
await typeWord("zax");
check("single answer is taken as you type (no Enter)", /Correct/.test(await txt("#qfb .fb") || ""), w1 + " " + await txt("#qfb .fb"));
await ev(`document.querySelector("#qnext").click()`); await sleep(200);
// multi-anagram rack: force a question with several answers
await ev(`Q.qs[Q.i] = { w: "RETAINS", show: "RETAINS" }; Q.answered = false; drawQuestion()`); await sleep(200);
await typeWord("retains");
check("multi: correct word clears the box", (await ev(`document.querySelector("#qa").value`)) === "" && (await txt("#found")).includes("RETAINS") && !(await txt("#qfb")), await txt("#found"));
await typeWord("stainer");
check("multi: second word added, not finished yet", (await ev("Q.found.length")) === 2 && !(await ev("Q.answered")));
await typeWord("zzz");
check("multi: wrong text stays in the box", (await ev(`document.querySelector("#qa").value`)) === "zzz");
await ev(`document.querySelector("#qform").requestSubmit()`); await sleep(200);
check("multi: Enter gives up and shows found/missed", /Not quite/.test(await txt("#qfb .fb")) && /found 2 of 11/.test(await txt("#qfb")), await txt("#qfb"));
check("missed word saved", (await ev(`store.get("missed",[])`)).includes("RETAINS"));
await ev(`document.querySelector("#qnext").click()`); await sleep(200);
await ev(`Q.qs[Q.i] = { w: "AEON", show: "AEON" }; Q.answered = false; drawQuestion()`); await sleep(150);
for (const w of ["aeon", "eoan"]) await typeWord(w);
check("multi: finding every word marks it correct", /Correct/.test(await txt("#qfb .fb") || ""), await txt("#qfb"));
const qbtn = await ev(`[getComputedStyle(document.querySelector("#qnext")).backgroundColor, getComputedStyle(document.documentElement).getPropertyValue("--accent").trim()]`);
check("quiz buttons are not the red accent", !qbtn[0].includes("184, 54, 74"), qbtn.join(" "));
check("wrong-answer text is not red", !(await ev(`(() => { const p = document.createElement("p"); p.className = "fb no"; document.querySelector("#qfb").append(p); const c = getComputedStyle(p).color; p.remove(); return c; })()`)).includes("184, 54, 74"));
await ev(`document.querySelector("#qquit").click()`);
await ev(`quizSetup.mode="def"; VIEWS.quiz(); document.querySelector("#qsrc").value="list:twos"; document.querySelector("#qsrc").dispatchEvent(new Event("change")); document.querySelector("#qstart").click()`); await sleep(300);
await typeWord(await ev("Q.qs[0].w"));
check("definition quiz takes the word as you type", /Correct/.test(await txt("#qfb .fb") || ""), await ev("Q.qs[0].w"));
await ev(`document.querySelector("#qquit").click()`); await sleep(200);
check("ending quiz shows summary", /Last quiz/.test(await ev("document.querySelector('#view').textContent")));
await ev(`quizSetup.mode="phony"; VIEWS.quiz(); document.querySelector("#qsrc").value="list:threes"; document.querySelector("#qsrc").dispatchEvent(new Event("change")); document.querySelector("#qstart").click()`); await sleep(300);
const isPh = await ev("!!Q.qs[0].phony");
await cmd("Input.dispatchKeyEvent", { type: "keyDown", key: isPh ? "p" : "v", text: isPh ? "p" : "v" }); await sleep(200);
check("phony quiz keyboard answer works", /Correct/.test(await txt("#qfb .fb") || ""), await txt("#qfb .fb"));
await ev(`document.querySelector("#qquit").click()`);
await ev(`quizSetup.mode="hooks"; VIEWS.quiz(); document.querySelector("#qsrc").value="list:twos"; document.querySelector("#qsrc").dispatchEvent(new Event("change")); document.querySelector("#qstart").click()`); await sleep(300);
await ev(`const e=DICT.get(Q.qs[0].w); document.querySelector("#qf").value=[...e.fh].reverse().join(" ").toUpperCase(); document.querySelector("#qb").value=e.bh; document.querySelector("#qform").requestSubmit()`); await sleep(200);
check("hooks quiz grades any order / case", /Correct/.test(await txt("#qfb .fb")), await ev("Q.qs[0].w"));
await ev(`document.querySelector("#qquit").click()`);
// Quiz these from a list preselects last results
await go("lists/qnou"); await sleep(500); await ev(`document.querySelector("#quizThese").click()`); await sleep(400);
check("'Quiz these' preselects Last results", (await ev(`document.querySelector("#qsrc").value`)) === "last" && /\(89\)/.test(await ev(`document.querySelector("#qsrc option[value=last]").textContent`)), await ev(`document.querySelector("#qsrc option[value=last]").textContent`));
await go("lists/stems6"); await sleep(700); await go("quiz");
check("after stems page, last results are real words", await ev(`lastResults.every(w => DICT.has(w)) && lastResults.length > 0`));
// settings
await go("settings"); await ev(`document.querySelector("[data-theme=midnight]").click()`); await sleep(200);
const bg = await ev(`getComputedStyle(document.documentElement).getPropertyValue("--head").trim()`);
await cmd("Page.reload"); await sleep(2500);
check("theme change applies and survives reload", bg !== "" && (await ev(`getComputedStyle(document.documentElement).getPropertyValue("--head").trim()`)) === bg && (await ev("SET.theme")) === "midnight");
await go("settings"); await ev(`document.querySelector("[data-set=size][data-val=lg]").click()`); await sleep(150);
check("large text applies", (await ev(`getComputedStyle(document.documentElement).fontSize`)) === "18px");
await ev(`[...document.querySelectorAll("[data-chk=values]")].forEach(c=>{c.checked=false;c.dispatchEvent(new Event("change"))})`); await go("w/QI");
check("hide tile values works", (await ev(`getComputedStyle(document.querySelector(".tile sub")).display`)) === "none");
await go("settings"); const rb = await ev(`[...document.querySelectorAll("#resetSet")].length`);
await ev(`document.querySelector("#resetSet").click(); document.querySelector("#resetSet").click()`); await sleep(200);
check("reset settings (two presses) restores defaults", (await ev("SET.theme + SET.size + SET.values")) === "boardmdtrue");
// random respects length range
await ev(`saveSettings({randMin: 5, randMax: 5})`); let lens = new Set();
for (let i = 0; i < 8; i++) { await ev(`document.querySelector("#randBtn").click()`); await sleep(120); lens.add((await ev("location.hash")).length - 3); }
check("random word honours length 5–5", lens.size === 1 && lens.has(5), [...lens].join(","));
await ev(`saveSettings({randMin: 2, randMax: 8})`);
check("no errors during flows", errors.length === 0, errors.join(" | "));

const fails = results.filter(r => r[0] === "FAIL");
console.log(`${results.length} UI checks, ${fails.length} failed`);
for (const f of fails) console.log(" - " + f[1] + (f[2] ? " :: " + f[2] : ""));
ws.close(); chrome.kill(); process.exitCode = fails.length ? 1 : 0;
