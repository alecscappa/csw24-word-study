// The computer player: finds every play on a board for a rack, and weighs them. It runs in a worker (see engineWorker
// in the app) so the page stays smooth while it thinks. Boards come in as 225 characters, row by row: "." for an
// empty square, a capital for a tile and a small letter for a blank. Racks are capitals with "?" for a blank.
// ENGINE() makes a fresh engine; the app keeps one for small helpers and builds its worker from ENGINE's own text.
function ENGINE() {
  const VAL = [1, 3, 3, 2, 1, 4, 2, 4, 1, 8, 5, 1, 3, 1, 1, 3, 10, 1, 1, 1, 1, 4, 4, 8, 4, 10];
  const BAGN = [9, 2, 2, 4, 12, 2, 3, 2, 9, 1, 1, 4, 2, 6, 8, 2, 1, 6, 4, 6, 4, 2, 2, 1, 2, 1], BLANKS = 2;
  // bonus squares: letter and word multipliers, the same both ways round as the board is symmetric
  const LM = new Uint8Array(225).fill(1), WM = new Uint8Array(225).fill(1);
  {
    const q = { tw: [[0, 0], [0, 7]], dw: [[1, 1], [2, 2], [3, 3], [4, 4], [7, 7]], tl: [[1, 5], [5, 5]], dl: [[0, 3], [2, 6], [3, 7], [6, 6]] };
    for (const [k, l] of Object.entries(q)) for (const [r, c] of l) for (const [a, b] of [[r, c], [c, r]]) for (const R of [a, 14 - a]) for (const C of [b, 14 - b]) {
      const i = R * 15 + C;
      if (k === "tw") WM[i] = 3; else if (k === "dw") WM[i] = 2; else if (k === "tl") LM[i] = 3; else LM[i] = 2;
    }
  }
  // ---- the words, as a tree: each node keeps a bit for each letter it goes on to, where its children start, and
  // whether a word ends there. Children sit side by side in letter order, so a child is found by counting bits
  let MASK, BASE, END;
  const pop = x => { x -= (x >>> 1) & 0x55555555; x = (x & 0x33333333) + ((x >>> 2) & 0x33333333); return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24; };
  const kid = (n, c) => { const m = MASK[n]; return m >>> c & 1 ? BASE[n] + pop(m & ((1 << c) - 1)) : -1; };
  function load(words) {
    words = words.filter(w => /^[A-Z]{2,15}$/.test(w)).sort();
    let n = 1;
    for (let i = 0; i < words.length; i++) { const w = words[i], p = words[i - 1] || ""; let k = 0; while (k < w.length && w[k] === p[k]) k++; n += w.length - k; }
    MASK = new Uint32Array(n); BASE = new Int32Array(n); END = new Uint8Array(n);
    let next = 1;
    const build = (node, lo, hi, d) => {
      let i = lo;
      while (i < hi && words[i].length === d) { END[node] = 1; i++; }
      const gs = [];
      let m = 0;
      for (let j = i; j < hi;) { const c = words[j].charCodeAt(d) - 65; let k = j; while (k < hi && words[k].charCodeAt(d) - 65 === c) k++; gs.push(c, j, k); m |= 1 << c; j = k; }
      MASK[node] = m; const b = BASE[node] = next; next += gs.length / 3;
      for (let g = 0; g < gs.length; g += 3) build(b + g / 3, gs[g + 1], gs[g + 2], d + 1);
    };
    build(0, 0, words.length, 0);
    return words.length;
  }
  const isWord = w => { let n = 0; for (let i = 0; i < w.length && n >= 0; i++) n = kid(n, w.charCodeAt(i) - 65); return n >= 0 && END[n] === 1; };

  // ---- leaves: what the tiles you keep are worth for next turn, in points. Rough single-tile values (the blank and
  // S are gold, Q and V are lumps), less for doubles and for too many vowels or consonants, a little for good pairs
  const LV = { "?": 25, A: 1, B: -2, C: .5, D: .5, E: 3.5, F: -2, G: -2, H: .5, I: -.5, J: -2.5, K: -2, L: -.5, M: 0, N: .5, O: -1.5, P: -.5, Q: -7.5, R: 1.5,
    S: 8, T: 0, U: -3, V: -5.5, W: -3.5, X: 3, Y: -.5, Z: 3 };
  const PAIRS = { ER: 1.5, ES: 1.5, ST: 1, IN: .5, RS: 1, DE: .5, ING: 4, EST: 2, ERS: 1.5, QU: 3, AE: -.5 };
  const leaveMemo = new Map();
  function leave(t) {
    if (!t) return 0;
    const k = [...t].sort().join("");
    let v = leaveMemo.get(k);
    if (v !== undefined) return v;
    v = 0;
    const cnt = {};
    let vow = 0, con = 0;
    for (const ch of k) { v += LV[ch]; cnt[ch] = (cnt[ch] || 0) + 1; if (ch === "?") continue; "AEIOU".includes(ch) ? vow++ : con++; }
    for (const [ch, n] of Object.entries(cnt)) if (n > 1 && ch !== "?") v -= (n - 1) * ("AEIOU".includes(ch) ? 4 : ch === "S" ? 2.5 : 3) * (n > 2 ? 1.5 : 1);
    const d = Math.abs(vow - con);
    if (d > 1) v -= (d - 1) * 2.5;
    if (k.length >= 2 && !vow && !cnt["?"]) v -= 2;
    if (k.length >= 3 && !con && !cnt["?"]) v -= 2;
    if (cnt.Q && !cnt.U && !cnt["?"]) v -= 4;
    for (const [p, b] of Object.entries(PAIRS)) if ([...p].every(ch => cnt[ch] >= (p.split(ch).length - 1))) v += b;
    leaveMemo.set(k, v);
    return v;
  }

  // ---- finding plays (Appel and Jacobson's way): along every row, from each anchor (an empty square next to a
  // tile), build a left part from the rack, then run right through the board's tiles, only ever along real words.
  // Down plays are the same with the board turned over its diagonal.
  const ALLC = (1 << 26) - 1;
  function parse(board) {
    const L = new Int8Array(225).fill(-1), B = new Uint8Array(225);
    for (let i = 0; i < 225; i++) { const ch = board[i]; if (ch && ch !== ".") { const u = ch.toUpperCase(); L[i] = u.charCodeAt(0) - 65; B[i] = ch !== u ? 1 : 0; } }
    return { L, B };
  }
  function genAll(board, rack) {
    const { L, B } = parse(board);
    const empty = !L.some(x => x >= 0);
    const rc = new Int8Array(27);
    for (const ch of rack) ch === "?" ? rc[26]++ : rc[ch.charCodeAt(0) - 65]++;
    const out = [], seen = new Set();
    // on an empty board a down play is just an across one turned round
    for (let dir = 0; dir < (empty ? 1 : 2); dir++) {
      // the board seen along the play: across as it is, down turned over
      const at = dir ? i => (i % 15) * 15 + (i / 15 | 0) : i => i;
      const bl = new Int8Array(225), bb = new Uint8Array(225);
      for (let i = 0; i < 225; i++) { bl[i] = L[at(i)]; bb[i] = B[at(i)]; }
      // cross-checks: the letters that make a word with the tiles above and below, and those tiles' points
      const cross = new Int32Array(225), cscore = new Int16Array(225).fill(-1), anchor = new Uint8Array(225);
      for (let i = 0; i < 225; i++) {
        if (bl[i] >= 0) continue;
        const r = i / 15 | 0, c = i % 15;
        const up = r > 0 && bl[i - 15] >= 0, dn = r < 14 && bl[i + 15] >= 0;
        if ((c > 0 && bl[i - 1] >= 0) || (c < 14 && bl[i + 1] >= 0) || up || dn) anchor[i] = 1;
        if (!up && !dn) { cross[i] = ALLC; continue; }
        let s = i, sum = 0; while (s >= 15 && bl[s - 15] >= 0) s -= 15;
        let n = 0;
        for (let j = s; j < i; j += 15) { sum += bb[j] ? 0 : VAL[bl[j]]; n = n >= 0 ? kid(n, bl[j]) : -1; }
        let m = 0;
        if (n >= 0) for (let ch = 0; ch < 26; ch++) {
          let k = kid(n, ch); if (k < 0) continue;
          for (let j = i + 15; j < 225 && bl[j] >= 0 && k >= 0; j += 15) k = kid(k, bl[j]);
          if (k >= 0 && END[k]) m |= 1 << ch;
        }
        for (let j = i + 15; j < 225 && bl[j] >= 0; j += 15) sum += bb[j] ? 0 : VAL[bl[j]];
        cross[i] = m; cscore[i] = sum;
      }
      if (empty) anchor[112] = 1;
      // the play being built: squares (in this view), letters, blanks
      const pS = new Int16Array(15), pL = new Int8Array(15), pB = new Uint8Array(15);
      let np = 0;
      // single tiles turn up both ways round, so each play is kept once
      const record = (start, end, main, wm, crossSum) => {
        const score = main * wm + crossSum + (np === 7 ? 50 : 0);
        const tiles = [];
        for (let k = 0; k < np; k++) tiles.push([at(pS[k]), pL[k], pB[k]]);
        tiles.sort((a, b) => a[0] - b[0]);
        const key = tiles.map(t => t[0] + ":" + t[1] + t[2]).join(",");
        if (seen.has(key)) return;
        seen.add(key);
        // the word, with blanks in small letters
        let shown = "";
        for (let j = start; j <= end; j++) {
          const t = tiles.find(t => t[0] === at(j));
          shown += t ? (t[2] ? String.fromCharCode(97 + t[1]) : String.fromCharCode(65 + t[1])) : (bb[j] ? String.fromCharCode(97 + bl[j]) : String.fromCharCode(65 + bl[j]));
        }
        out.push({ dir, start: at(start), word: shown, tiles, score, n: np });
      };
      // run right from square i (in this view) with the tree at node n; a word is kept when the square after it is
      // empty or off the board, it uses a rack tile and it reaches the anchor
      const extend = (row, i, n, anchorI, start, main, wm, crossSum) => {
        if (i > row * 15 + 14) { if (END[n] && np && i > anchorI) record(start, i - 1, main, wm, crossSum); return; }
        if (bl[i] >= 0) {
          const k = kid(n, bl[i]);
          if (k >= 0) extend(row, i + 1, k, anchorI, start, main + (bb[i] ? 0 : VAL[bl[i]]), wm, crossSum);
          return;
        }
        if (END[n] && np && i > anchorI) record(start, i - 1, main, wm, crossSum);
        const m = MASK[n] & cross[i];
        if (!m) return;
        const lm = LM[at(i)], w = WM[at(i)];
        for (let ch = 0; ch < 26; ch++) {
          if (!(m >>> ch & 1)) continue;
          const k = kid(n, ch);
          for (let blank = 0; blank < 2; blank++) {
            if (blank ? !rc[26] : !rc[ch]) continue;
            blank ? rc[26]-- : rc[ch]--;
            const v = blank ? 0 : VAL[ch] * lm;
            pS[np] = i; pL[np] = ch; pB[np] = blank; np++;
            extend(row, i + 1, k, anchorI, start, main + v, wm * w, cscore[i] >= 0 ? crossSum + (cscore[i] + v) * w : crossSum);
            np--;
            blank ? rc[26]++ : rc[ch]++;
          }
        }
      };
      // left parts: up to `limit` tiles from the rack on the empty squares before the anchor
      const left = (row, anchorI, n, len, limit) => {
        // place the left part's tiles (in pS from 0..len-1, letters known) and score them, then run right
        let main = 0;
        for (let k = 0; k < len; k++) { pS[k] = anchorI - len + k; main += pB[k] ? 0 : VAL[pL[k]] * LM[at(pS[k])]; }
        let wm = 1; for (let k = 0; k < len; k++) wm *= WM[at(pS[k])];
        extend(row, anchorI, n, anchorI, anchorI - len, main, wm, 0);
        if (len >= limit) return;
        const m = MASK[n];
        for (let ch = 0; ch < 26; ch++) {
          if (!(m >>> ch & 1)) continue;
          const k = kid(n, ch);
          for (let blank = 0; blank < 2; blank++) {
            if (blank ? !rc[26] : !rc[ch]) continue;
            blank ? rc[26]-- : rc[ch]--;
            pL[len] = ch; pB[len] = blank; np = len + 1;
            left(row, anchorI, k, len + 1, limit);
            np = len;
            blank ? rc[26]++ : rc[ch]++;
          }
        }
      };
      for (let row = 0; row < 15; row++) for (let c = 0; c < 15; c++) {
        const i = row * 15 + c;
        if (!anchor[i]) continue;
        if (c > 0 && bl[i - 1] >= 0) {
          // tiles already on the left: they are the left part
          let s = i - 1; while (s % 15 > 0 && bl[s - 1] >= 0) s--;
          let n = 0, main = 0;
          for (let j = s; j < i && n >= 0; j++) { n = kid(n, bl[j]); main += bb[j] ? 0 : VAL[bl[j]]; }
          np = 0;
          if (n >= 0) extend(row, i, n, i, s, main, 1, 0);
        } else {
          let limit = 0; while (c - limit - 1 >= 0 && bl[i - limit - 1] < 0 && !anchor[i - limit - 1]) limit++;
          if (empty) limit = Math.min(limit, 6);
          np = 0;
          left(row, i, 0, 0, limit);
        }
      }
    }
    return out;
  }

  // ---- weighing plays. Equity = points now + what the kept tiles are worth. Near the end the leave matters less;
  // once the bag is empty, going out earns twice the other rack, and tiles stuck on your rack cost you
  const rackLeft = (rack, tiles) => {
    const a = [...rack];
    for (const [, l, b] of tiles) { const ch = b ? "?" : String.fromCharCode(65 + l); const k = a.indexOf(ch); if (k >= 0) a.splice(k, 1); }
    return a.join("");
  };
  const pts = s => [...s].reduce((t, ch) => t + (ch === "?" ? 0 : VAL[ch.charCodeAt(0) - 65]), 0);
  function equityOf(m, bag, oppRack) {
    if (bag > 0) return m.score + leave(m.leave) * (bag < 7 ? .6 : 1);
    if (!m.leave) return m.score + 2 * pts(oppRack || "");
    return m.score - 2 * pts(m.leave) - 6;
  }
  // every play, the exchanges and a pass, best first. unseen = tiles you can't see (the bag and the other rack)
  function moves(board, rack, bag, unseen = "") {
    const ms = genAll(board, rack);
    for (const m of ms) { m.leave = rackLeft(rack, m.tiles); m.eq = equityOf(m, bag, bag ? "" : unseen); }
    if (bag >= 7) {
      // each different set of tiles to keep, once
      const r = [...rack].sort(), seenX = new Set();
      for (let mask = 0; mask < (1 << r.length) - 1; mask++) {
        let keep = "", out = "";
        for (let k = 0; k < r.length; k++) mask >>> k & 1 ? keep += r[k] : out += r[k];
        if (seenX.has(keep)) continue; seenX.add(keep);
        ms.push({ exch: out, leave: keep, score: 0, eq: leave(keep) - 1.5, n: 0, tiles: [] });
      }
    }
    ms.push({ pass: true, leave: rack, score: 0, eq: bag > 0 ? leave(rack) - 30 : -2 * pts(rack) - 12, n: 0, tiles: [] });
    ms.sort((a, b) => b.eq - a.eq || b.score - a.score);
    return ms;
  }
  // tiles nobody has seen: a full bag less the board and the rack
  function unseenOf(board, rack) {
    const n = [...BAGN, BLANKS];
    for (const ch of board) if (ch !== ".") ch === ch.toUpperCase() ? n[ch.charCodeAt(0) - 65]-- : n[26]--;
    for (const ch of rack) ch === "?" ? n[26]-- : n[ch.charCodeAt(0) - 65]--;
    let s = ""; n.forEach((k, i) => { for (let j = 0; j < k; j++) s += i === 26 ? "?" : String.fromCharCode(65 + i); });
    return s;
  }
  const put = (board, m) => { const a = board.split(""); for (const [i, l, b] of m.tiles) a[i] = String.fromCharCode((b ? 97 : 65) + l); return a.join(""); };
  const shuffleStr = s => { const a = s.split(""); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a.join(""); };
  // a look ahead: for the best few plays, deal the other player random racks from the unseen tiles and take their
  // best reply. Each play is tried against the same racks, so the comparison is fair. value = equity - their reply
  function* simulate(board, rack, bag, cands, iters) {
    const unseen = unseenOf(board, rack), tally = cands.map(() => ({ sum: 0, n: 0 }));
    for (let it = 0; it < iters; it++) {
      const deal = shuffleStr(unseen);
      cands.forEach((m, ci) => {
        if (m.pass || m.exch) {
          // after an exchange or a pass the board doesn't change, so the reply is the same
          const opp = deal.slice(0, 7), best = moves(board, opp, Math.max(0, bag - 7), "")[0];
          tally[ci].sum += m.eq - (best ? best.score + (bag > 7 ? leave(best.leave) * .3 : 0) : 0); tally[ci].n++;
          return;
        }
        // the other rack comes from what's left after you draw
        const draw = Math.min(m.n, bag), opp = deal.slice(draw, draw + 7);
        if (!opp) { tally[ci].sum += m.eq; tally[ci].n++; return; }
        const nb = put(board, m), left = Math.max(0, bag - draw - opp.length);
        const best = moves(nb, opp, left, m.leave + deal.slice(0, draw))[0];
        tally[ci].sum += m.eq - (best ? best.score + (left > 0 ? leave(best.leave) * .3 : 0) : 0); tally[ci].n++;
      });
      yield { it: it + 1, vals: tally.map(t => t.n ? t.sum / t.n : 0) };
    }
  }
  // a made-up position for the Lab: a few turns of the computer playing itself, then a fresh rack from what's left
  // (with a bingo somewhere on the board, if asked)
  const FULL = BAGN.map((n, i) => String.fromCharCode(65 + i).repeat(n)).join("") + "??";
  function puzzle(turns, needBingo) {
    for (let tries = 0; tries < 40; tries++) {
      let board = ".".repeat(225), bag = shuffleStr(FULL), p = 0;
      const racks = [bag.slice(0, 7), bag.slice(7, 14)]; bag = bag.slice(14);
      for (let t = 0; t < turns; t++) {
        const m = moves(board, racks[p], bag.length, "").find(m => m.n);
        if (!m) break;
        board = put(board, m);
        const need = 7 - m.leave.length; racks[p] = m.leave + bag.slice(0, need); bag = bag.slice(need); p = 1 - p;
      }
      const pool = unseenOf(board, "");
      for (let d = 0; d < (needBingo ? 80 : 1); d++) {
        const rack = shuffleStr(pool).slice(0, 7), ms = genAll(board, rack);
        if (!ms.length || (needBingo && !ms.some(m => m.n === 7))) continue;
        for (const m of ms) m.leave = rackLeft(rack, m.tiles);
        ms.sort((a, b) => b.score - a.score);
        return { board, rack, top: ms.slice(0, 40), scores: ms.map(m => m.score), bingos: ms.filter(m => m.n === 7).slice(0, 60) };
      }
    }
    return null;
  }
  // one request from the app; post sends the answer (more: true for progress), stopped says the app gave up on it
  const tkey = m => m.pass ? "pass" : m.exch ? "x" + [...m.exch].sort().join("") : m.tiles.map(t => t.join(":")).sort().join(",");
  function serve(q, post, stopped) {
    const reply = (r, more) => post({ ...r, id: q.id, more: !!more });
    try {
      if (q.type === "load") return reply({ n: load(q.words.split("\n")) });
      if (q.type === "puzzle") return reply({ puzzle: puzzle(q.turns, q.bingo) });
      const unseen = q.unseen ?? unseenOf(q.board, q.rack), bag = q.bag ?? Math.max(0, unseen.length - 7);
      if (q.type === "moves") {
        const all = moves(q.board, q.rack, bag, unseen);
        let found = null;
        if (q.find) {
          // on an empty board only across plays are made, so a play down is turned round to its across twin
          let f = q.find;
          if (f.tiles && !/[^.]/.test(q.board) && f.tiles.length > 1 && f.tiles[0][0] % 15 === f.tiles[1][0] % 15) f = { tiles: f.tiles.map(([i, l, b]) => [(i % 15) * 15 + (i / 15 | 0), l, b]) };
          const k = tkey(f), i = all.findIndex(m => tkey(m) === k); if (i >= 0) found = { rank: i + 1, move: all[i] };
        }
        return reply({ moves: q.limit ? all.slice(0, q.limit) : all, total: all.length, bag, unseen, found });
      }
      if (q.type === "sim") {
        const it = simulate(q.board, q.rack, bag, q.cands, q.iters);
        let last = { it: 0, vals: q.cands.map(m => m.eq) };
        const step = () => {
          if (stopped(q.id)) return reply(last);
          const t = Date.now(); let r;
          while (!(r = it.next()).done) { last = r.value; if (Date.now() - t > 90) break; }
          if (r.done) return reply(last);
          reply(last, true); setTimeout(step, 0);
        };
        return step();
      }
      reply({ error: "unknown request" });
    } catch (e) { reply({ error: String(e && e.stack || e) }); }
  }
  return { load, isWord, moves, simulate, leave, unseenOf, put, rackLeft, genAll, puzzle, serve, VAL };
}
if (typeof module !== "undefined") module.exports = ENGINE();
