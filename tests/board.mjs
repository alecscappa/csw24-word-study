// Usage: node tests/board.mjs   (needs words.js and Chrome)
// Click through the Board tab (Free board, Analyse, Play), Scoring and the Lab in headless Chrome; collect errors
import { spawn } from "node:child_process";
import os from "node:os"; import path from "node:path"; import { fileURLToPath, pathToFileURL } from "node:url";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
// opened from disk, like browser.mjs; the engine's worker is built from js/engine.js's own text, so it starts here too
const URL0 = pathToFileURL(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "index.html")).href;
const prof = path.join(os.tmpdir(), "csw24-bt-" + Date.now());
const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=9334", "--user-data-dir=" + prof, "--no-first-run", "--allow-file-access-from-files", "about:blank"], { stdio: "ignore" });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let targets; for (let i = 0; i < 50; i++) { try { targets = await (await fetch("http://127.0.0.1:9334/json")).json(); break; } catch { await sleep(200); } }
const ws = new WebSocket(targets.find(t => t.type === "page").webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pending = {}; const errors = [];
ws.onmessage = m => { const d = JSON.parse(m.data);
  if (d.id && pending[d.id]) { pending[d.id](d); delete pending[d.id]; }
  if (d.method === "Runtime.exceptionThrown") errors.push("EXCEPTION " + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).split("\n").slice(0, 2).join(" "));
  if (d.method === "Runtime.consoleAPICalled" && d.params.type === "error") errors.push("console.error " + d.params.args.map(a => a.value ?? a.description).join(" "));
  if (d.method === "Log.entryAdded" && d.params.entry.level === "error" && !/dictionaryapi|wiktionary|favicon|404/.test((d.params.entry.url || "") + d.params.entry.text)) errors.push("log " + d.params.entry.text);
};
const cmd = (method, params = {}) => new Promise(r => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await cmd("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 80) + " -> " + r.result.exceptionDetails.exception?.description); return r.result.result.value; };
await cmd("Runtime.enable"); await cmd("Log.enable"); await cmd("Page.enable");
const results = []; const check = (name, cond, detail = "") => { results.push([cond ? "PASS" : "FAIL", name, detail]); if (!cond) console.log("FAIL", name, detail); };
const go = async hash => { await ev(`location.hash = ${JSON.stringify(hash)}`); await sleep(300); };
const until = async (expr, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(expr)) return true; await sleep(150); } return false; };
const click = sel => ev(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b) return false; b.click(); return true; })()`);
const key = k => ev(`document.dispatchEvent(new KeyboardEvent("keydown", { key: ${JSON.stringify(k)}, bubbles: true }))`);
const noErr = (name, before) => check(name + ": no errors", errors.length === before, errors.slice(before).join(" | "));
const sideways = async name => { const ow = await ev("document.documentElement.scrollWidth - innerWidth"); check(name + ": no sideways scroll", ow <= 0, ow + "px"); };
await cmd("Page.navigate", { url: URL0 + "#w/QI" }); await sleep(3000);
check("loads the words", await ev("DICT.size") === 280887);
await ev(`localStorage.clear()`); await cmd("Page.reload"); await sleep(3000);

for (const [w, h] of [[1280, 900], [390, 844]]) {
  await cmd("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 500 });
  const W = w + "px";
  // ---- Free board, Scoring, Board look
  let e0 = errors.length;
  await go("board"); check(`${W} Free board draws`, await ev(`!!document.querySelector("#view .bd") && document.querySelectorAll("#view .bgrid .bd .sq").length === 225`));
  check(`${W} board switch has three parts`, await ev(`document.querySelectorAll("#view nav.studyseg a").length`) === 3);
  await click("#bLookOpen"); await sleep(200);
  check(`${W} Board look: Theme for the board list`, await ev(`document.querySelectorAll('#bsheet [data-bset="bTheme"]').length`) > 5, await ev(`document.querySelectorAll('#bsheet [data-bset="bTheme"]').length`) + " buttons");
  await click('#bsheet [data-bset="bStyle"][data-val="wood"]'); await sleep(150);
  check(`${W} Board look: picking a style keeps the sheet open`, await ev(`!document.querySelector("#bsheet").hidden && SET.bStyle === "wood"`));
  await click("#bLookDone");
  await ev(`saveSettings({ bStyle: "gaps" })`);
  // place a word on the free board and analyse it
  await ev(`document.querySelector('#view .bd .sq[data-i="112"]').click()`);
  for (const k of "QUIRE") await key(k);
  check(`${W} Free board: typed play scores`, /QUIRE/.test(await ev(`document.querySelector(".bside").textContent`)));
  await click("#bPlay"); await sleep(150);
  await sideways(W + " Free board");
  noErr(W + " Free board", e0);
  e0 = errors.length; await go("scoring"); await sleep(300);
  check(`${W} Scoring draws`, await ev(`!!document.querySelector("#view .bd")`)); noErr(W + " Scoring", e0);
  await go("lists"); await go("scoring");
  // ---- Analyse
  e0 = errors.length;
  await go("board"); await click("#bAna"); await sleep(400);
  check(`${W} Analyse opens from Free board with the tiles`, await ev(`location.hash === "#board/analyse" && /QUIRE/.test(cellsStr(AZY.cells).replace(/\\./g, ""))`));
  await ev(`(() => { const r = document.querySelector("#anaRack"); r.value = "AEINST?"; r.dispatchEvent(new Event("input")); })()`);
  check(`${W} Analyse lists plays`, await until(`document.querySelectorAll("#anaPlays [data-am]").length >= 10`), await ev(`document.querySelector("#anaPlays")?.textContent.slice(0, 120)`));
  const topWord = await ev(`AZY.res?.moves[0]?.word`);
  check(`${W} Analyse top play is a bingo with a blank`, (await ev(`AZY.res.moves[0].n`)) === 7, topWord);
  await click("#anaPlays [data-am]"); await sleep(200);
  check(`${W} Analyse: tapping a play shows it with the working`, await ev(`!!document.querySelector(".alwork .bk") && document.querySelectorAll("#anaBoard .tile.new").length > 0`));
  await click('[data-asort="score"]'); await sleep(100);
  check(`${W} Analyse: sort by points`, await ev(`(() => { const s = [...document.querySelectorAll("#anaPlays .alr > span:nth-child(3)")].map(x => +x.textContent); return s.every((v, i) => !i || s[i - 1] >= v); })()`));
  await click("#anaSim"); await sleep(1500);
  check(`${W} Look ahead runs and shows progress`, await ev(`!!AZY.sim && AZY.sim.it > 0`), await ev(`AZY.sim && AZY.sim.it`));
  await click("#anaStop");
  check(`${W} Look ahead stops`, await until(`AZY.sim && !AZY.sim.running`, 5000));
  check(`${W} Look ahead column shows`, await ev(`!!document.querySelector(".alist.withsim")`));
  await ev(`AZY.sel = -1`); await click('[data-am="0"]'); await sleep(150);
  const before = await ev(`AZY.cells.filter(Boolean).length`);
  await click("#anaPut"); await sleep(300);
  check(`${W} Put it on the board adds the tiles`, await ev(`AZY.cells.filter(Boolean).length`) > before);
  // set-up typing
  await click("#anaEdit"); await ev(`document.querySelector('#anaBoard .sq[data-i="0"]').click()`);
  await key("?"); await key("Z"); await key("A");
  check(`${W} set-up typing puts tiles (and a blank)`, await ev(`AZY.cells[0]?.ch === "Z" && AZY.cells[0].b && AZY.cells[1]?.ch === "A"`));
  await key("Backspace");
  check(`${W} set-up backspace takes a tile off`, await ev(`!AZY.cells[1] || AZY.cells[1].ch !== "A"`));
  await sideways(W + " Analyse"); noErr(W + " Analyse", e0);
  // ---- Play v computer: whole game by hints, then review
  e0 = errors.length;
  await ev(`GAME = null; store.set("game", null); store.set("gameOpts", { mode: "cpu", level: "expert", rule: "reject", first: "me" })`);
  await go("board/play");
  check(`${W} Play shows the new game form`, await ev(`!!document.querySelector("#gStart")`));
  await click('[data-gk="level"][data-gv="club"]'); await sleep(100);
  check(`${W} Play form: picking a level`, await ev(`store.get("gameOpts").level === "club"`));
  await click("#gStart"); await sleep(300);
  check(`${W} game starts with 7 tiles each and 86 in the bag`, await ev(`GAME.racks[0].length === 7 && GAME.racks[1].length === 7 && GAME.bag.length === 86`));
  // place by tapping: a rack tile then the centre
  await click('.prack [data-ri="0"]'); await ev(`document.querySelector('#gBoard .sq[data-i="112"]').click()`);
  check(`${W} tap tile then square places it`, await ev(`GUI.pend.length === 1 && GUI.pend[0].i === 112`));
  await ev(`document.querySelector('#gBoard .sq[data-i="112"]').click()`);
  check(`${W} tapping a placed tile takes it back`, await ev(`GUI.pend.length === 0`));
  await click("#gSwap"); await click('.prack [data-ri="0"]'); await click('.prack [data-ri="1"]');
  check(`${W} swap mode selects tiles`, await ev(`GUI.swap?.size === 2`));
  await click("#gSwapGo");
  check(`${W} swap is logged and the computer replies`, await until(`GAME.log.length >= 2 && GAME.turn === 0 && !GUI.think`), await ev(`JSON.stringify(GAME.log.map(e => e.k))`));
  let turns = 0, stuck = false;
  while (!(await ev("GAME.over")) && turns < 40) {
    turns++;
    if (!(await until(`GAME.over || (GAME.turn === 0 && !GUI.think && !!document.querySelector("#gHint") && !document.querySelector("#gHint").disabled)`, 20000))) { stuck = true; break; }
    if (await ev("GAME.over")) break;
    await click("#gHint"); await until(`GUI.pend.length > 0 || /would/.test(document.querySelector(".bside").textContent)`, 8000);
    if (await ev("GUI.pend.length > 0")) { await click("#gPlay"); }
    else if (await ev("!document.querySelector('#gSwap').disabled")) { await click("#gSwap"); await click('.prack [data-ri="0"]'); await click("#gSwapGo"); }
    else { await click("#gPass"); await click("#gPass"); }
    await sleep(100);
  }
  check(`${W} a whole game plays out to the end`, await ev("GAME.over") && !stuck, `turns ${turns} stuck ${stuck} log ${await ev("GAME.log.length")}`);
  check(`${W} end scores are counted`, await ev(`GAME.log.some(e => e.k === "out" || e.k === "left")`));
  check(`${W} the board tiles + racks + bag = 100`, await ev(`GAME.board.replace(/\\./g, "").length + GAME.racks[0].length + GAME.racks[1].length + GAME.bag.length === 100`));
  await click("#gReview");
  check(`${W} review runs for every turn`, await until(`GUI.review && GUI.review.done === GUI.review.of && GUI.review.of > 0`, 30000), await ev(`GUI.review && GUI.review.done + "/" + GUI.review.of`));
  check(`${W} hinted plays count as the top play`, await ev(`GUI.review.rows.filter(r => r.e.k === "play").every(r => r.rank === 1)`), await ev(`JSON.stringify(GUI.review.rows.filter(r => r.rank !== 1 && r.e.k === "play").map(r => [r.e.w, r.rank]).slice(0, 4))`));
  await click("#gRev [data-rv]"); await sleep(400);
  check(`${W} a review turn opens in Analyse`, await ev(`location.hash === "#board/analyse" && AZY.rack.length > 0`));
  await go("board/play"); await sideways(W + " Play"); noErr(W + " Play v computer", e0);
  // ---- Play with a friend: hidden rack, phony, challenge
  e0 = errors.length;
  await click("#gNew"); await sleep(200);
  await ev(`store.set("gameOpts", { mode: "friend", level: "expert", rule: "chal", first: "me", n1: "Ann", n2: "Bo" })`); await go("board"); await go("board/play");
  await click("#gStart"); await sleep(200);
  check(`${W} friends: rack hidden until shown`, await ev(`document.querySelectorAll(".prack .tile.back").length === 7 && !!document.querySelector("#gShow")`));
  await click("#gShow"); await sleep(100);
  check(`${W} friends: Ann's rack shows`, await ev(`document.querySelectorAll(".prack button.tile").length === 7`));
  // a phony: the rack's tiles in order through the centre (almost never a word)
  await ev(`document.querySelector('#gBoard .sq[data-i="112"]').click()`);
  await ev(`GAME.racks[0] = "QXZJKVW".slice(0, 2) + GAME.racks[0].slice(2); GUI.key = ""; viewPlay()`);
  await ev(`document.querySelector('#gBoard .sq[data-i="112"]').click()`);
  await click('.prack [data-ri="0"]'); await click('.prack [data-ri="1"]');
  check(`${W} friends: phony allowed when challenges are on`, await ev(`!document.querySelector("#gPlay").disabled`), await ev(`document.querySelector(".bside .card").textContent.slice(0, 120)`));
  await click("#gPlay"); await sleep(200);
  check(`${W} friends: Bo sees a Challenge button`, await ev(`!!document.querySelector("#gChal") && document.querySelectorAll(".prack .tile.back").length === 7`));
  await click("#gChal"); await sleep(200);
  check(`${W} friends: challenged phony comes off`, await ev(`GAME.log.at(-1).k === "off" && GAME.scores[0] === 0 && GAME.board === ".".repeat(225) && GAME.turn === 1`));
  await click("#gShow"); await click("#gHint"); await until(`GUI.pend.length > 0`, 8000); await click("#gPlay"); await sleep(200);
  await click("#gChal"); await sleep(200);
  check(`${W} friends: challenging a good word costs 5`, await ev(`GAME.log.at(-1).k === "chal" && GAME.scores[0] === -5`), await ev(`JSON.stringify(GAME.scores)`));
  await sideways(W + " Play friends"); noErr(W + " Play friends", e0);
  await ev(`GAME = null; store.set("game", null)`);
  // ---- Lab
  e0 = errors.length;
  await go("lab/top");
  check(`${W} Top play puzzle loads`, await until(`PZ && !PZ.loading && document.querySelectorAll(".prack button.tile").length === 7`, 10000));
  await click("#pzGive"); await sleep(150);
  check(`${W} Top play: Show me lists the top plays`, await ev(`document.querySelectorAll("[data-pz]").length > 0`));
  await click("[data-pz]"); await click("#pzNext");
  check(`${W} Top play: next board`, await until(`PZ && !PZ.loading && !PZ.done`, 10000));
  // play the real top play by placing it, and it says yes
  await ev(`(() => { const m = PZ.top[0], used = new Set(); for (const [i, l, b] of m.tiles) { const ch = b ? "?" : AZ[l], ri = [...PZ.S.rack].findIndex((x, k) => x === ch && !used.has(k)); used.add(ri); PZ.S.pend.push({ i, ri, ch: AZ[l], b: !!b }); } labPuzzle("top"); })()`);
  await click("#pzGo"); await sleep(150);
  check(`${W} Top play: the top play is marked right`, await ev(`PZ.done?.good === true`), await ev(`PZ.done?.text`));
  await go("lab/bingo");
  check(`${W} Bingo hunt loads with a bingo`, await until(`PZ && PZ.mode === "bingo" && !PZ.loading && PZ.bingos.length > 0`, 15000));
  await go("lab/cvc"); await click('[data-cs="0"]'); await click("#cvGo");
  check(`${W} Watch: a computer game finishes`, await until(`CV.g && CV.g.over`, 60000), await ev(`CV.g && CV.g.log.length`));
  check(`${W} Watch: the tiles add up to 100`, await ev(`CV.g.board.replace(/\\./g, "").length + CV.g.racks[0].length + CV.g.racks[1].length + CV.g.bag.length === 100`));
  await go("lab/track"); await click('[data-tt="E"]'); await click('[data-tt="E"]');
  check(`${W} Tile tracker counts down`, await ev(`/10/.test(document.querySelector('[data-tt="E"]').textContent)`));
  await click("#ttUndo");
  check(`${W} Tile tracker undo`, await ev(`/11/.test(document.querySelector('[data-tt="E"]').textContent)`));
  await sideways(W + " Lab"); noErr(W + " Lab", e0);
  await ev(`localStorage.clear()`); await cmd("Page.reload"); await sleep(3000);
}
// speed: how long the engine takes to get ready and to answer
const t = await ev(`(async () => { const t0 = performance.now(); await ENG.call({ type: "moves", board: ".".repeat(225), rack: "AEINRST" }); const t1 = performance.now(); await ENG.call({ type: "moves", board: GAME ? GAME.board : ".".repeat(225), rack: "RETAINS" }); return [Math.round(t1 - t0), Math.round(performance.now() - t1)]; })()`);
console.log("engine first call (includes loading words) ms:", t[0], " next call ms:", t[1]);
const fails = results.filter(r => r[0] === "FAIL");
console.log(`${results.length} checks, ${fails.length} failed`);
ws.close(); chrome.kill(); process.exit(fails.length ? 1 : 0);
