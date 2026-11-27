// ---------- Neat letters (Scratch pad): a capital letter written by hand is read and put back as a neat typed one.
// It's the $P point-cloud recogniser (Vatavu, Anthony and Wobbrock, 2012): the letter's strokes become 32 points,
// matched against a drawing of every letter, in any stroke order or direction ----------
const NEAT_N = 32;
// an arc of points round (cx, cy), from angle a to b in degrees (0 is right, 90 is down)
const neatArc = (cx, cy, rx, ry, a, b, n = 14) => Array.from({ length: n + 1 }, (_, i) => { const t = (a + (b - a) * i / n) * Math.PI / 180; return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)]; });
// every letter as strokes on a box 1 high; some have a second way of writing it
const NEAT_SHAPES = {
  A: [[[[0, 1], [.4, 0], [.8, 1]], [[.15, .62], [.65, .62]]]],
  B: [[[[0, 0], [0, 1]], [[0, 0], [.4, 0], ...neatArc(.4, .24, .28, .24, -90, 90), [0, .48]], [[0, .48], [.45, .48], ...neatArc(.45, .74, .3, .26, -90, 90), [0, 1]]]],
  C: [[neatArc(.45, .5, .45, .5, -40, -320, 24)]],
  D: [[[[0, 0], [0, 1]], [[0, 0], [.3, 0], ...neatArc(.3, .5, .42, .5, -90, 90, 18), [0, 1]]]],
  E: [[[[.7, 0], [0, 0], [0, 1], [.7, 1]], [[0, .5], [.55, .5]]], [[[.7, 0], [0, 0], [0, .5], [.55, .5], [0, .5], [0, 1], [.7, 1]]]],
  F: [[[[.7, 0], [0, 0], [0, 1]], [[0, .5], [.55, .5]]]],
  G: [[neatArc(.45, .5, .45, .5, -40, -360, 24), [[.5, .52], [.9, .52], [.9, .95]]], [[...neatArc(.45, .5, .45, .5, -40, -360, 24), [.5, .5]]]],
  H: [[[[0, 0], [0, 1]], [[.7, 0], [.7, 1]], [[0, .5], [.7, .5]]]],
  I: [[[[0, 0], [0, 1]]], [[[-.25, 0], [.25, 0]], [[0, 0], [0, 1]], [[-.25, 1], [.25, 1]]]],
  J: [[[[.6, 0], [.6, .72], ...neatArc(.33, .72, .27, .28, 0, 180)]], [[[.25, 0], [.85, 0]], [[.6, 0], [.6, .72], ...neatArc(.33, .72, .27, .28, 0, 180)]]],
  K: [[[[0, 0], [0, 1]], [[.65, 0], [0, .55]], [[.2, .4], [.7, 1]]], [[[0, 0], [0, 1]], [[.65, 0], [0, .55], [.7, 1]]]],
  L: [[[[0, 0], [0, 1], [.6, 1]]]],
  M: [[[[0, 1], [0, 0], [.4, .65], [.8, 0], [.8, 1]]]],
  N: [[[[0, 1], [0, 0], [.7, 1], [.7, 0]]]],
  O: [[neatArc(.4, .5, .4, .5, -90, 270, 28)]],
  P: [[[[0, 0], [0, 1]], [[0, 0], [.35, 0], ...neatArc(.35, .26, .3, .26, -90, 90), [0, .52]]]],
  Q: [[neatArc(.4, .5, .4, .5, -90, 270, 28), [[.5, .7], [.85, 1.05]]]],
  R: [[[[0, 0], [0, 1]], [[0, 0], [.35, 0], ...neatArc(.35, .26, .3, .26, -90, 90), [0, .52]], [[.3, .52], [.7, 1]]]],
  S: [[[...neatArc(.36, .25, .34, .25, -20, -270), ...neatArc(.36, .75, .36, .25, -90, 160)]]],
  T: [[[[0, 0], [.8, 0]], [[.4, 0], [.4, 1]]]],
  U: [[[[0, 0], [0, .62], ...neatArc(.35, .62, .35, .38, 180, 0), [.7, 0]]]],
  V: [[[[0, 0], [.4, 1], [.8, 0]]]],
  W: [[[[0, 0], [.22, 1], [.45, .35], [.68, 1], [.9, 0]]]],
  X: [[[[0, 0], [.7, 1]], [[.7, 0], [0, 1]]]],
  Y: [[[[0, 0], [.35, .5]], [[.7, 0], [.35, .5], [.35, 1]]], [[[0, 0], [.35, .5]], [[.7, 0], [0, 1]]]],
  Z: [[[[0, 0], [.7, 0], [0, 1], [.7, 1]]]],
};
// strokes ([[x, y], ...] each) → 32 points spaced evenly along them, scaled to a box 1 across and centred
function neatCloud(strokes) {
  const pts = strokes.flatMap((s, id) => s.map(([x, y]) => ({ x, y, id })));
  let len = 0; for (let i = 1; i < pts.length; i++) if (pts[i].id === pts[i - 1].id) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  const step = len / (NEAT_N - 1); if (!step) return null;
  const out = [{ ...pts[0] }]; let d = 0;
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].id !== pts[i - 1].id) continue;
    const a = pts[i - 1], b = pts[i], seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (d + seg >= step && seg) {
      const t = (step - d) / seg, q = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y), id: b.id };
      out.push(q); pts.splice(i, 0, q); d = 0;
    } else d += seg;
  }
  while (out.length < NEAT_N) out.push({ ...pts[pts.length - 1] });
  out.length = NEAT_N;
  // stretched to a square, so a wide or narrow hand matches the same letter; a thin one (an I) isn't stretched far
  const xs = out.map(p => p.x), ys = out.map(p => p.y), w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys), size = Math.max(w, h) || 1;
  const sx = Math.max(w, size * .45), sy = Math.max(h, size * .45);
  const cx = xs.reduce((a, b) => a + b) / NEAT_N, cy = ys.reduce((a, b) => a + b) / NEAT_N;
  return out.map(p => ({ x: (p.x - cx) / sx, y: (p.y - cy) / sy }));
}
function neatDist(a, b, start) {
  const used = new Array(a.length).fill(false); let sum = 0, i = start;
  do {
    let best = -1, min = Infinity;
    for (let j = 0; j < b.length; j++) if (!used[j]) { const d = Math.hypot(a[i].x - b[j].x, a[i].y - b[j].y); if (d < min) { min = d; best = j; } }
    used[best] = true; sum += (1 - ((i - start + a.length) % a.length) / a.length) * min;
    i = (i + 1) % a.length;
  } while (i !== start);
  return sum;
}
// a rough picture of the letter too: which squares of a 5 × 5 grid its points fall in. It tells apart letters
// whose points sit close but whose shape differs (the straight back of a D against an O)
const NEAT_G = 5;
function neatGrid(c) {
  const xs = c.map(p => p.x), ys = c.map(p => p.y), x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0 || 1, h = Math.max(...ys) - y0 || 1;
  const g = new Array(NEAT_G * NEAT_G).fill(0);
  for (const p of c) g[Math.min(NEAT_G - 1, Math.floor((p.y - y0) / h * NEAT_G)) * NEAT_G + Math.min(NEAT_G - 1, Math.floor((p.x - x0) / w * NEAT_G))] = 1;
  return g;
}
let NEAT_T = null;
// the letter these strokes look most like, and how far off it is (lower is closer; over NEAT_MAX it isn't a letter)
function neatRead(strokes) {
  NEAT_T ||= Object.entries(NEAT_SHAPES).flatMap(([L, ways]) => ways.map(w => { const c = neatCloud(w); return { L, c, g: neatGrid(c) }; }));
  const c = neatCloud(strokes); if (!c) return null;
  const g = neatGrid(c), step = Math.floor(Math.sqrt(NEAT_N));
  let best = null;
  for (const t of NEAT_T) {
    let d = Infinity; for (let i = 0; i < NEAT_N; i += step) d = Math.min(d, neatDist(c, t.c, i), neatDist(t.c, c, i));
    d += NEAT_GW * g.reduce((a, v, i) => a + (v !== t.g[i]), 0);
    if (!best || d < best.d) best = { L: t.L, d };
  }
  return best;
}
let NEAT_GW = .15;
const NEAT_MAX = 2.4;
if (typeof module !== "undefined") module.exports = { neatRead, NEAT_SHAPES, NEAT_MAX, setGW: v => NEAT_GW = v };
