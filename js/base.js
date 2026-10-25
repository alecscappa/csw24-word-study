const VALUES = {A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10};
const AZ = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const alpha = w => w.split("").sort().join("");
const vowels = w => (w.match(/[AEIOU]/g) || []).length;
const nOf = (w, ch) => w.split(ch).length - 1;
const score = w => [...w].reduce((s, c) => s + (VALUES[c] || 0), 0);
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
// word lengths picked with the length chips, kept as text like "7,8" ("" = any length)
const lensOf = v => (Array.isArray(v) ? v : String(v || "").split(",")).map(Number).filter(Boolean).sort((a, b) => a - b);
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem("csw24:" + k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem("csw24:" + k, JSON.stringify(v)); } catch {} window.syncChanged?.(k); }
};

// ---------- settings & themes ----------
const THEMES = {
  board: { name: "Board green (original)",
    light: { bg:"#edf1ee", panel:"#ffffff", ink:"#1b2420", muted:"#5b6a62", line:"#d3dcd6", chip:"#f2f5f3", head:"#1f5c4a", "head-ink":"#e9f3ee", field:"#e9f3ee", "field-ink":"#15211c", tile:"#f1dcaa", "tile-edge":"#c4a566", "tile-ink":"#2b2213", accent:"#b8364a", "on-accent":"#ffffff", link:"#2b74a8", good:"#22804e", bad:"#b8364a", new:"#7d50c4" },
    dark:  { bg:"#141c18", panel:"#1b2621", ink:"#e2ebe5", muted:"#93a69b", line:"#2c3b33", chip:"#22302a", head:"#1a4a3c", "head-ink":"#e2f1e8", field:"#e2f1e8", "field-ink":"#15211c", tile:"#e6cf97", "tile-edge":"#a88d52", "tile-ink":"#2b2213", accent:"#e8707f", "on-accent":"#1b0f12", link:"#84bfe3", good:"#56c487", bad:"#e8707f", new:"#b592ef" } },
  // from the wooden Deluxe board: mahogany header, crimson and gold, the plaques' blue for links, light wooden tiles
  deluxe: { name: "Deluxe board",
    light: { bg:"#efe3cf", panel:"#fbf5ea", ink:"#2a1410", muted:"#74503f", line:"#e0cfb4", chip:"#f3e8d6", head:"#4a1c18", "head-ink":"#f4e2c4", field:"#fbf5ea", "field-ink":"#2a1410", tile:"#ecd6ac", "tile-edge":"#b89363", "tile-ink":"#17110c", accent:"#9b2230", "on-accent":"#fff4ea", link:"#1c6fae", good:"#2a7a46", bad:"#b3232f", new:"#7d50c4" },
    dark:  { bg:"#5a1520", panel:"#2c1012", ink:"#f3e6d3", muted:"#d0aa98", line:"#5e3a26", chip:"#3b1619", head:"#33130f", "head-ink":"#f0dcbc", field:"#f3e6d3", "field-ink":"#2a1410", tile:"#e2cba0", "tile-edge":"#a8845a", "tile-ink":"#17110c", accent:"#d8b064", "on-accent":"#2a1410", link:"#93cdea", good:"#78d39b", bad:"#ff9a9a", new:"#c5a6ff" } },
  cocoa: { name: "Cream and cocoa",
    light: { bg:"#f6f0e4", panel:"#fffaf0", ink:"#2a2118", muted:"#74685a", line:"#e3d8c4", chip:"#f3ead9", head:"#4a3426", "head-ink":"#f8efe0", field:"#fffaf0", "field-ink":"#2a2118", tile:"#efd7a0", "tile-edge":"#c19d5a", "tile-ink":"#2a1f0e", accent:"#b5532e", "on-accent":"#ffffff", link:"#2f6f8f", good:"#3d7d3a", bad:"#b5532e", new:"#8a4fa8", warn:"#a66300" },
    dark:  { bg:"#1c1712", panel:"#251e17", ink:"#f1e7d6", muted:"#a99a85", line:"#3a2f24", chip:"#2c241c", head:"#2c2119", "head-ink":"#f1e7d6", field:"#f1e7d6", "field-ink":"#2a2118", tile:"#e8cf96", "tile-edge":"#a7854a", "tile-ink":"#2a1f0e", accent:"#e58a5e", "on-accent":"#1c0f08", link:"#8cc3dc", good:"#7cc576", bad:"#ec8a6a", new:"#c9a0e8", warn:"#f0b45a" } },
  vanilla: { name: "Vanilla and sage",
    light: { bg:"#f5f2e8", panel:"#fffdf6", ink:"#22271f", muted:"#687060", line:"#e0dccb", chip:"#f0ede0", head:"#5f7a5b", "head-ink":"#fbfaf2", field:"#fffdf6", "field-ink":"#22271f", tile:"#f0dcaa", "tile-edge":"#c4a463", "tile-ink":"#2a1f0e", accent:"#8f4a62", "on-accent":"#ffffff", link:"#3b6e8a", good:"#3f7d45", bad:"#b3483d", new:"#7a55b0", warn:"#a66300" },
    dark:  { bg:"#171a15", panel:"#1f231c", ink:"#e9ebe0", muted:"#9ba395", line:"#313828", chip:"#262b22", head:"#2f3d2c", "head-ink":"#e9ebe0", field:"#e9ebe0", "field-ink":"#22271f", tile:"#e6d19c", "tile-edge":"#a68a4f", "tile-ink":"#2a1f0e", accent:"#d98aa6", "on-accent":"#20101a", link:"#8fbfd8", good:"#86c98b", bad:"#e8877b", new:"#bfa3ec", warn:"#f0b45a" } },
  parchment: { name: "Parchment and ink",
    light: { bg:"#f3ecdc", panel:"#fbf6ea", ink:"#1f2433", muted:"#6b6555", line:"#dfd4bd", chip:"#efe6d3", head:"#1f2a44", "head-ink":"#f3ecdc", field:"#fbf6ea", "field-ink":"#1f2433", tile:"#ecd39a", "tile-edge":"#bb9853", "tile-ink":"#2a1f0e", accent:"#9c2f2f", "on-accent":"#ffffff", link:"#2c5aa0", good:"#2f7a4b", bad:"#9c2f2f", new:"#6c4fb0", warn:"#a66300" },
    dark:  { bg:"#15171f", panel:"#1d2029", ink:"#ece5d4", muted:"#a39d8c", line:"#2f3340", chip:"#242833", head:"#10131c", "head-ink":"#ece5d4", field:"#ece5d4", "field-ink":"#1f2433", tile:"#e6cd92", "tile-edge":"#a4844a", "tile-ink":"#2a1f0e", accent:"#e07b70", "on-accent":"#1d0b0a", link:"#8db3f0", good:"#6fcb92", bad:"#e07b70", new:"#b9a0f0", warn:"#f0b45a" } },
  blush: { name: "Butter and blush",
    light: { bg:"#fbf3ea", panel:"#fffaf5", ink:"#2b2224", muted:"#7a6a6c", line:"#ecdcd3", chip:"#f7ebe3", head:"#a85d70", "head-ink":"#fff7f2", field:"#fffaf5", "field-ink":"#2b2224", tile:"#f3dca6", "tile-edge":"#c9a462", "tile-ink":"#2a1f0e", accent:"#a8445e", "on-accent":"#ffffff", link:"#3d6c9a", good:"#3a7f55", bad:"#b8424f", new:"#7d4fb8", warn:"#a66300" },
    dark:  { bg:"#1d1618", panel:"#261d20", ink:"#f3e6e4", muted:"#ad9a9c", line:"#3b2d31", chip:"#2d2226", head:"#3a2229", "head-ink":"#f3e6e4", field:"#f3e6e4", "field-ink":"#2b2224", tile:"#ead09a", "tile-edge":"#a8874f", "tile-ink":"#2a1f0e", accent:"#ec8fa6", "on-accent":"#2a0f17", link:"#95bfe8", good:"#7ccc9a", bad:"#f08a92", new:"#c7a6f0", warn:"#f0b45a" } },
  oat: { name: "Oat and olive",
    light: { bg:"#f2ede1", panel:"#fbf8ef", ink:"#26261c", muted:"#6e6b5a", line:"#ddd6c3", chip:"#eee8d9", head:"#4f5a2c", "head-ink":"#f6f3e6", field:"#fbf8ef", "field-ink":"#26261c", tile:"#eed69e", "tile-edge":"#bd9a57", "tile-ink":"#2a1f0e", accent:"#9a5b1f", "on-accent":"#ffffff", link:"#33658a", good:"#3e7a3c", bad:"#b1452f", new:"#7552a8", warn:"#a66300" },
    dark:  { bg:"#191912", panel:"#22221a", ink:"#ece8da", muted:"#a39f8b", line:"#34342a", chip:"#29291f", head:"#2c3318", "head-ink":"#ece8da", field:"#ece8da", "field-ink":"#26261c", tile:"#e6cd92", "tile-edge":"#a4844a", "tile-ink":"#2a1f0e", accent:"#e0a35e", "on-accent":"#1e1206", link:"#8cb9de", good:"#85c47e", bad:"#ea8a70", new:"#bc9fe8", warn:"#f0b45a" } },
  tournament: { name: "Tournament board",
    light: { bg:"#e9ece4", panel:"#fbfcf8", ink:"#18211f", muted:"#5d6863", line:"#cfd6cc", chip:"#eff2ea", head:"#0e6a62", "head-ink":"#f0faf7", field:"#ffffff", "field-ink":"#18211f", tile:"#f0d9a4", "tile-edge":"#bf9d5c", "tile-ink":"#2a1f0e", accent:"#cf3b45", "on-accent":"#ffffff", link:"#2f7fc1", good:"#2a8551", bad:"#cf3b45", new:"#c2507f" },
    dark:  { bg:"#121a19", panel:"#1a2423", ink:"#e4ecea", muted:"#93a39f", line:"#2b3a38", chip:"#202d2b", head:"#0b4d47", "head-ink":"#e4f6f2", field:"#e4f6f2", "field-ink":"#122020", tile:"#e8d09a", "tile-edge":"#a6874e", "tile-ink":"#2a1f0e", accent:"#f0727a", "on-accent":"#1e0d0f", link:"#7dbbf0", good:"#5ccb8c", bad:"#f0727a", new:"#ee8db5" } },
  ocean: { name: "Ocean",
    light: { bg:"#eaf1f4", panel:"#ffffff", ink:"#13232c", muted:"#5a6d77", line:"#cfdde3", chip:"#eff5f7", head:"#12485e", "head-ink":"#e9f4f8", field:"#e9f4f8", "field-ink":"#13232c", tile:"#f0d9a4", "tile-edge":"#c09d5b", "tile-ink":"#2a1f0e", accent:"#c4562f", "on-accent":"#ffffff", link:"#1f6fa8", good:"#23825a", bad:"#c2453a", new:"#7650c4", warn:"#a66300" },
    dark:  { bg:"#0e1a20", panel:"#15242c", ink:"#e1edf2", muted:"#8ea5b0", line:"#24363f", chip:"#1a2b34", head:"#0b3344", "head-ink":"#e1edf2", field:"#e1edf2", "field-ink":"#13232c", tile:"#e8cf96", "tile-edge":"#a7854a", "tile-ink":"#2a1f0e", accent:"#f08a63", "on-accent":"#24100a", link:"#86c3ee", good:"#5fd09a", bad:"#f08a7d", new:"#b49cf5", warn:"#f0b45a" } },
  plum: { name: "Plum",
    light: { bg:"#f2eef4", panel:"#ffffff", ink:"#211a26", muted:"#6b6072", line:"#ddd4e2", chip:"#f5f1f7", head:"#4b2c5e", "head-ink":"#f6eefa", field:"#f6eefa", "field-ink":"#211a26", tile:"#f0d8a2", "tile-edge":"#c19c58", "tile-ink":"#2a1f0e", accent:"#b8502b", "on-accent":"#ffffff", link:"#4561c2", good:"#2f8257", bad:"#be3d4f", new:"#8a4fc9", warn:"#a66300" },
    dark:  { bg:"#18131c", panel:"#211a27", ink:"#ece4f1", muted:"#a597ad", line:"#352a3d", chip:"#281f2f", head:"#2b1838", "head-ink":"#ece4f1", field:"#ece4f1", "field-ink":"#211a26", tile:"#e8cd94", "tile-edge":"#a6834a", "tile-ink":"#2a1f0e", accent:"#f09062", "on-accent":"#241008", link:"#9db0f5", good:"#6fcf9a", bad:"#f28597", new:"#c9a3f5", warn:"#f0b45a" } },
  midnight: { name: "Midnight gold",
    light: { bg:"#eceff6", panel:"#ffffff", ink:"#151b2b", muted:"#5d6680", line:"#d4d9e6", chip:"#f1f3f9", head:"#1c2541", "head-ink":"#eef1fb", field:"#eef1fb", "field-ink":"#151b2b", tile:"#f2cf72", "tile-edge":"#c19a36", "tile-ink":"#251c05", accent:"#c4621a", "on-accent":"#ffffff", link:"#2f5fd0", good:"#25865a", bad:"#c43b3b", new:"#7a52cc" },
    dark:  { bg:"#0e1422", panel:"#161e31", ink:"#e5e9f4", muted:"#8e99b6", line:"#26304a", chip:"#1c253b", head:"#0a0f1c", "head-ink":"#e5e9f4", field:"#1c253b", "field-ink":"#e5e9f4", tile:"#efc45a", "tile-edge":"#b48d2c", "tile-ink":"#231a03", accent:"#f2a050", "on-accent":"#1f1203", link:"#86aefc", good:"#5fcf96", bad:"#ff7d7d", new:"#b79bff" } },
  paper: { name: "Plain paper",
    light: { bg:"#f5f5f3", panel:"#ffffff", ink:"#161616", muted:"#676767", line:"#dededb", chip:"#f3f3f1", head:"#ffffff", "head-ink":"#161616", field:"#f0f0ee", "field-ink":"#161616", tile:"#ede6d6", "tile-edge":"#c9bfa6", "tile-ink":"#161616", accent:"#2d5bd3", "on-accent":"#ffffff", link:"#2d5bd3", good:"#22804e", bad:"#c2363f", new:"#7d50c4" },
    dark:  { bg:"#121212", panel:"#1b1b1b", ink:"#ececec", muted:"#9a9a9a", line:"#2e2e2e", chip:"#222222", head:"#1b1b1b", "head-ink":"#ececec", field:"#262626", "field-ink":"#ececec", tile:"#e0d8c4", "tile-edge":"#a59a7f", "tile-ink":"#161616", accent:"#7d9dff", "on-accent":"#0b1230", link:"#7d9dff", good:"#5ccb8c", bad:"#ff7a80", new:"#b79bff" } },
  contrast: { name: "High contrast",
    light: { bg:"#ffffff", panel:"#ffffff", ink:"#000000", muted:"#2b2b2b", line:"#000000", chip:"#ffffff", head:"#000000", "head-ink":"#ffffff", field:"#ffffff", "field-ink":"#000000", tile:"#ffe066", "tile-edge":"#000000", "tile-ink":"#000000", accent:"#b00020", "on-accent":"#ffffff", link:"#0039a6", good:"#006b2e", bad:"#b00020", new:"#5a1fb0" },
    dark:  { bg:"#000000", panel:"#000000", ink:"#ffffff", muted:"#dddddd", line:"#ffffff", chip:"#000000", head:"#000000", "head-ink":"#ffffff", field:"#ffffff", "field-ink":"#000000", tile:"#ffe066", "tile-edge":"#ffffff", "tile-ink":"#000000", accent:"#ff6b6b", "on-accent":"#000000", link:"#8cc8ff", good:"#5eea9a", bad:"#ff6b6b", new:"#d0b0ff" } },
};
// colour maths for the generated themes, tile colours and the custom colour pickers
const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const rgb2hex = c => "#" + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const x = hex2rgb(a), y = hex2rgb(b); return rgb2hex(x.map((v, i) => v + (y[i] - v) * t)); };
const lum = h => { const [r, g, b] = hex2rgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
const inkOn = h => lum(h) > .36 ? "#161410" : "#ffffff";
const ratioOf = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
function hsl(h, s, l) {
  s /= 100; l /= 100;
  const f = n => { const k = (n + h / 30) % 12; return 255 * (l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1))); };
  return rgb2hex([f(0), f(8), f(4)]);
}
const tileTok = c => ({ tile: c, "tile-edge": mix(c, "#000000", .26), "tile-ink": inkOn(c) === "#ffffff" ? "#fbf6ea" : "#2a1f0e" });
// a full light + dark theme from a neutral hue/saturation, a header colour, an accent and a link colour
function mkTheme(name, h, s, head, accent, link, tile = "#f1dcaa") {
  const tt = tileTok(tile);
  const headD = mix(head, "#000000", .38), accentD = mix(accent, "#ffffff", .3), linkD = mix(link, "#ffffff", .4);
  return { name,
    light: { bg: hsl(h, s, 94), panel: hsl(h, s * .6, 99), ink: hsl(h, s * .5, 11), muted: hsl(h, s * .3, 40), line: hsl(h, s * .6, 85), chip: hsl(h, s, 96),
      head, "head-ink": inkOn(head) === "#ffffff" ? hsl(h, s, 97) : hsl(h, s * .5, 11), field: hsl(h, s * .6, 99), "field-ink": hsl(h, s * .5, 11), ...tt,
      accent, "on-accent": inkOn(accent), link, good: "#2a8050", bad: "#bf3b45", new: "#7d50c4" },
    dark: { bg: hsl(h, s * .7, 8), panel: hsl(h, s * .6, 11.5), ink: hsl(h, s * .4, 91), muted: hsl(h, s * .25, 63), line: hsl(h, s * .5, 21), chip: hsl(h, s * .5, 14.5),
      head: headD, "head-ink": inkOn(headD) === "#ffffff" ? hsl(h, s * .4, 92) : hsl(h, s * .5, 10), field: hsl(h, s * .4, 91), "field-ink": hsl(h, s * .5, 11), ...tt,
      accent: accentD, "on-accent": inkOn(accentD), link: linkD, good: "#5ccb8c", bad: "#f0808a", new: "#b79bff" } };
}
Object.assign(THEMES, {
  forest: mkTheme("Forest", 110, 14, "#2d5a27", "#c0612b", "#2f6fa0"),
  emerald: mkTheme("Emerald and gold", 150, 18, "#046c4e", "#b8860b", "#2f6fa0", "#f2cf72"),
  mint: mkTheme("Mint", 155, 28, "#2f8f6f", "#c64f6f", "#2c6fa8"),
  teal: mkTheme("Teal and coral", 180, 18, "#0f766e", "#d4543a", "#2c6fa8"),
  sky: mkTheme("Sky blue", 205, 35, "#2b7bbd", "#e2693b", "#1f62a8"),
  royal: mkTheme("Royal blue", 230, 25, "#233a8f", "#d4931a", "#2f5fd0", "#f2cf72"),
  nord: mkTheme("Nordic frost", 220, 16, "#3b4252", "#bf616a", "#5e81ac", "#e5e9f0"),
  slate: mkTheme("Slate and orange", 215, 12, "#334155", "#e0623a", "#2f6fb8"),
  solar: mkTheme("Solarized", 45, 40, "#073642", "#cb4b16", "#268bd2"),
  lavender: mkTheme("Lavender", 265, 25, "#6b5b9a", "#c2547a", "#4a63c2"),
  grape: mkTheme("Grape soda", 280, 22, "#5b2a86", "#e0a526", "#5865d8", "#f2cf72"),
  dusk: mkTheme("Dusk", 250, 15, "#44475a", "#c2307f", "#4b6cd0"),
  bubblegum: mkTheme("Bubblegum", 320, 40, "#d6589f", "#4a7fd6", "#3a6cc0", "#ffd6e8"),
  rose: mkTheme("Rose", 345, 30, "#9b2f4f", "#2f7f78", "#3b68a8"),
  cherry: mkTheme("Cherry", 0, 20, "#8f1d2c", "#c47d12", "#2f68a8"),
  terracotta: mkTheme("Terracotta", 22, 30, "#a24b2a", "#2d6a6a", "#2f6a96"),
  autumn: mkTheme("Autumn", 28, 35, "#8a3b12", "#b8860b", "#3a6890", "#e3b87a"),
  coffee: mkTheme("Coffee", 30, 20, "#5b3a29", "#c27a2c", "#3a6a8a", "#e3b87a"),
  desert: mkTheme("Desert sand", 38, 35, "#b07a3a", "#3d6e8a", "#2f6a96"),
  lemon: mkTheme("Lemon", 55, 45, "#b39a12", "#2f6fa0", "#2f6fa0", "#fff3b0"),
  charcoal: mkTheme("Charcoal and orange", 0, 0, "#2a2a2a", "#e8611a", "#2f6fb8"),
  neon: mkTheme("Neon night", 260, 30, "#1a0b2e", "#00a896", "#7b5cff", "#c6f6ff"),
});
// the coffee family: hand-made light and dark colours
const LG = { good: "#2a8050", bad: "#bf3b45", new: "#7d50c4" }, DK = { good: "#5ccb8c", bad: "#f0808a", new: "#b79bff" };
const brew = (name, light, dark) => ({ name, light: { ...LG, ...light }, dark: { ...DK, ...dark } });
Object.assign(THEMES, {
  espresso: brew("Espresso",
    { bg:"#f3ebe1", panel:"#fffaf3", ink:"#22160f", muted:"#6f5d4d", line:"#e2d4c3", chip:"#f5ede3", head:"#2a1a11", "head-ink":"#f3e3cc", field:"#fffaf3", "field-ink":"#22160f", tile:"#efdcbd", "tile-edge":"#b89a6e", "tile-ink":"#2a1a0e", accent:"#a8702c", "on-accent":"#ffffff", link:"#2f6a8f" },
    { bg:"#140d09", panel:"#1f1510", ink:"#f0e4d4", muted:"#b09a84", line:"#3a2a1f", chip:"#271b14", head:"#2a1a11", "head-ink":"#f3e3cc", field:"#f0e2cc", "field-ink":"#2a1a11", tile:"#efdcbd", "tile-edge":"#b89a6e", "tile-ink":"#2a1a0e", accent:"#d9a35f", "on-accent":"#1a0f06", link:"#9fc0d6" }),
  mocha: brew("Mocha",
    { bg:"#efe3d6", panel:"#fbf5ee", ink:"#2a1f18", muted:"#74604f", line:"#dfcdbb", chip:"#f3e9de", head:"#6b4a36", "head-ink":"#fbf1e4", field:"#fbf5ee", "field-ink":"#2a1f18", tile:"#d9b99b", "tile-edge":"#a3825f", "tile-ink":"#2a1a0e", accent:"#c06a22", "on-accent":"#ffffff", link:"#2f6a8f" },
    { bg:"#2a1f18", panel:"#35281f", ink:"#f3e8da", muted:"#bba58f", line:"#4d3b2e", chip:"#3d2f25", head:"#1f1611", "head-ink":"#f3e3cc", field:"#f3e8da", "field-ink":"#2a1f18", tile:"#d9b99b", "tile-edge":"#a3825f", "tile-ink":"#2a1a0e", accent:"#e8a15a", "on-accent":"#22140a", link:"#a8c8dc" }),
  latenight: brew("Latte at night",
    { bg:"#f4ece1", panel:"#fffaf3", ink:"#2a1a11", muted:"#75604d", line:"#e4d5c2", chip:"#f6eee4", head:"#d9c2a3", "head-ink":"#2a1a11", field:"#fffaf3", "field-ink":"#2a1a11", tile:"#f1e2c8", "tile-edge":"#b89e78", "tile-ink":"#2a1a0e", accent:"#b5652a", "on-accent":"#ffffff", link:"#2f6a8f" },
    { bg:"#1c140f", panel:"#271c15", ink:"#efe3d3", muted:"#ad9883", line:"#3f2f24", chip:"#2e2219", head:"#d9c2a3", "head-ink":"#2a1a11", field:"#fbf3e6", "field-ink":"#2a1a11", tile:"#f1e2c8", "tile-edge":"#b89e78", "tile-ink":"#2a1a0e", accent:"#c9783a", "on-accent":"#fff6ec", link:"#9fc0d6" }),
  coldbrew: brew("Cold brew",
    { bg:"#eeebe7", panel:"#fbfaf8", ink:"#1f1c19", muted:"#66605a", line:"#dbd5ce", chip:"#f3f0ec", head:"#2f3a46", "head-ink":"#e9eef3", field:"#fbfaf8", "field-ink":"#1f1c19", tile:"#d8bf9c", "tile-edge":"#a08965", "tile-ink":"#24190d", accent:"#a87536", "on-accent":"#ffffff", link:"#2f64a0" },
    { bg:"#141210", panel:"#1d1a17", ink:"#e8e2da", muted:"#9f978d", line:"#34302b", chip:"#24201c", head:"#232a33", "head-ink":"#e3e8ee", field:"#e3e8ee", "field-ink":"#1d2228", tile:"#d8bf9c", "tile-edge":"#a08965", "tile-ink":"#24190d", accent:"#c99a63", "on-accent":"#1a1108", link:"#8fb3d9" }),
  velvet: brew("Cocoa velvet",
    { bg:"#f5e9e6", panel:"#fff8f6", ink:"#2c1715", muted:"#7a5f5d", line:"#e7d2ce", chip:"#f8eeeb", head:"#5a2a26", "head-ink":"#fbeae5", field:"#fff8f6", "field-ink":"#2c1715", tile:"#e9c9a9", "tile-edge":"#b08b68", "tile-ink":"#2a1610", accent:"#b8553a", "on-accent":"#ffffff", link:"#4e5fb0" },
    { bg:"#1d1211", panel:"#29191a", ink:"#f2e3df", muted:"#b8999a", line:"#432a2a", chip:"#321f1f", head:"#3a1d1b", "head-ink":"#f6e2dc", field:"#f4e3dc", "field-ink":"#2c1715", tile:"#e9c9a9", "tile-edge":"#b08b68", "tile-ink":"#2a1610", accent:"#e08a6d", "on-accent":"#22100b", link:"#b0b8e6" }),
  cafe: brew("Coffee shop",
    { bg:"#efe8de", panel:"#fcf8f1", ink:"#221a14", muted:"#6c5f50", line:"#dfd3c3", chip:"#f3ece2", head:"#24352d", "head-ink":"#e9f1ec", field:"#fcf8f1", "field-ink":"#221a14", tile:"#e8d2ad", "tile-edge":"#ad9168", "tile-ink":"#2a1a0e", accent:"#9c7a24", "on-accent":"#ffffff", link:"#2f7a5f" },
    { bg:"#1a1410", panel:"#251c16", ink:"#efe6d8", muted:"#ab9c88", line:"#3d3026", chip:"#2c221b", head:"#1f2b25", "head-ink":"#e6efe9", field:"#e6efe9", "field-ink":"#1f2b25", tile:"#e8d2ad", "tile-edge":"#ad9168", "tile-ink":"#2a1a0e", accent:"#c9a24d", "on-accent":"#1a1306", link:"#9fcbb6" }),
});
// how the theme picker groups the themes under "More themes"; anything not listed lands in Other
const THEME_GROUPS = [
  ["Classic", ["board", "tournament", "deluxe", "paper", "contrast", "midnight"]],
  ["Coffee and cocoa", ["coffee", "espresso", "mocha", "latenight", "coldbrew", "velvet", "cafe", "cocoa"]],
  ["Greens", ["forest", "emerald", "mint", "oat", "vanilla"]],
  ["Blues", ["ocean", "sky", "royal", "nord", "slate", "teal"]],
  ["Purples and pinks", ["plum", "lavender", "grape", "dusk", "bubblegum", "rose", "blush"]],
  ["Warm", ["cherry", "terracotta", "autumn", "desert", "lemon", "parchment", "solar"]],
  ["Dark and bold", ["charcoal", "neon"]],
];
// every theme in its group, with any not listed above under Other (the board's theme picker)
const bThemeGroups = () => { const grouped = new Set(THEME_GROUPS.flatMap(g => g[1]));
  return [...THEME_GROUPS, ["Other", Object.keys(THEMES).filter(id => !grouped.has(id))]].map(([g, ids]) => [g, ids.filter(id => THEMES[id])]).filter(([, ids]) => ids.length); };
// each theme's own tiles, matched to its colours (Board green and High contrast keep theirs); a touch darker in dark mode
const THEME_TILES = { cocoa: "#e8c48a", vanilla: "#dfe5c4", parchment: "#f3e7c6", blush: "#f6c9cf", oat: "#d9d3a0", tournament: "#f7efd8", ocean: "#bfe0ef",
  plum: "#dcc6e8", midnight: "#f2cf72", paper: "#ffffff", forest: "#c9dbb2", emerald: "#f2cf72", mint: "#c4f0dc", teal: "#ffc2b0", sky: "#cfe8fb",
  royal: "#f2cf72", nord: "#e5e9f0", slate: "#ffb48a", solar: "#fdf6e3", lavender: "#e3d7f7", grape: "#f2cf72", dusk: "#ffb6d9", bubblegum: "#ffd6e8",
  rose: "#f7c6d0", cherry: "#ffc9c9", terracotta: "#e9b08f", autumn: "#e3b87a", coffee: "#d9b99b", desert: "#ecd2a6", lemon: "#fff3b0",
  charcoal: "#3a3a3a", neon: "#c6f6ff" };
for (const [id, c] of Object.entries(THEME_TILES)) { Object.assign(THEMES[id].light, tileTok(c)); Object.assign(THEMES[id].dark, tileTok(mix(c, "#000000", .08))); }
// Each theme's light mode comes in two tones, picked on its swatch: Bright (the near-white original) and Mellow
// (t.mellow): a mid-tone page in the theme's own hue, slightly lighter cards, and pale tiles lifted lighter than the page.
// High contrast has only one. Coffee's Mellow is a hand-made latte.
function hslOf(hex) {
  const [r, g, b] = hex2rgb(hex).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l * 100];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s * 100, l * 100];
}
for (const [id, t] of Object.entries(THEMES)) {
  if (id === "contrast") continue;
  const [h, s0] = hslOf(t.light.bg), s = s0 < 2 ? 0 : Math.min(38, Math.max(10, s0 * 1.4 + 8));
  const M = t.mellow = { ...t.light, bg: hsl(h, s, 84), panel: hsl(h, s + 5, 90), chip: hsl(h, s + 3, 87), line: hsl(h, s * .8, 73), field: hsl(h, s + 5, 94), muted: hsl(h, s * .6, 34) };
  if (lum(M.tile) > .55) Object.assign(M, tileTok(mix(M.tile, "#ffffff", .4)));
}
Object.assign(THEMES.coffee.mellow, { bg: "#e4d6c5", panel: "#efe5d8", chip: "#e9dccb", line: "#cdb9a2", ink: "#2e2118", muted: "#6e5a48",
  field: "#f3ebe0", "field-ink": "#2e2118", accent: "#a85d1c", link: "#355f7c" }, tileTok("#f4e6cf"));
// a theme's light colours in its chosen tone (Mellow unless set to Bright)
const lightOf = (id, t) => SET.tones?.[id] !== "bright" && t.mellow || t.light;
// tile colours: "theme" keeps the theme's own tiles, "custom" uses SET.tileCustom
const TILES = { theme: ["Theme", ""], classic: ["Classic", "#f1dcaa"], ivory: ["Ivory", "#f7f1e1"], white: ["White", "#ffffff"], maple: ["Maple", "#e3b87a"],
  walnut: ["Walnut", "#6b4a2f"], slate: ["Slate", "#2f3437"], gold: ["Gold", "#f2c94c"], orange: ["Orange", "#f39c45"], ruby: ["Ruby", "#c0392b"],
  pink: ["Pink", "#f4a6c1"], lilac: ["Lilac", "#b49be6"], ocean: ["Ocean", "#3b7dd8"], sky: ["Sky", "#9fd3f5"], jade: ["Jade", "#2e9e6e"], mint: ["Mint", "#a8e6cf"] };
// tile looks: [name, CSS for .tile]. --lip is the darker bottom edge (thinner on mini tiles).
const LIP = "inset 0 calc(-1 * var(--lip)) 0 var(--tile-edge)";
const TILE_STYLES = {
  flat: ["Flat", `box-shadow: ${LIP};`],
  soft: ["Soft shadow", `background-image: linear-gradient(180deg, rgb(255 255 255 / .16), rgb(0 0 0 / .04)); box-shadow: ${LIP}, inset 0 1px 0 rgb(255 255 255 / .45), 0 1px 1px rgb(0 0 0 / .2), 0 3px 6px -1px rgb(0 0 0 / .25);`],
  chunky: ["Chunky", `box-shadow: ${LIP}, 2px 3px 0 rgb(0 0 0 / .28);`],
  float: ["Floating", `box-shadow: ${LIP}, 0 2px 3px rgb(0 0 0 / .12), 0 8px 16px -4px rgb(0 0 0 / .35); transform: translateY(-1px);`],
  bevel: ["Bevelled", `border-radius: 6px; background-image: linear-gradient(145deg, rgb(255 255 255 / .35), rgb(255 255 255 / 0) 45%, rgb(0 0 0 / .08)); box-shadow: inset 2px 2px 0 rgb(255 255 255 / .45), inset -2px calc(-1 * var(--lip)) 0 var(--tile-edge), 0 2px 4px rgb(0 0 0 / .25);`],
  outline: ["Outlined", `box-shadow: ${LIP}, 0 0 0 1px color-mix(in srgb, var(--tile) 55%, #000), 0 2px 4px rgb(0 0 0 / .25);`],
  wood: ["Wood grain", `background-image: repeating-linear-gradient(100deg, rgb(0 0 0 / .035) 0 2px, transparent 2px 7px), linear-gradient(180deg, rgb(255 255 255 / .2), rgb(0 0 0 / .05)); box-shadow: ${LIP}, inset 0 1px 0 rgb(255 255 255 / .4), 0 2px 5px rgb(0 0 0 / .25);`],
  gloss: ["Glossy", `border-radius: 9px; background-image: linear-gradient(180deg, rgb(255 255 255 / .5), rgb(255 255 255 / 0) 50%); box-shadow: ${LIP}, 0 3px 8px rgb(0 0 0 / .22);`],
  block: ["Thick block", `box-shadow: inset 0 1px 0 rgb(255 255 255 / .4), 0 var(--lip) 0 color-mix(in srgb, var(--tile-edge) 80%, #000), 0 calc(var(--lip) + 3px) 6px rgb(0 0 0 / .25); margin-bottom: var(--lip);`],
  glow: ["Glow", `box-shadow: ${LIP}, 0 0 0 1px color-mix(in srgb, var(--tile) 70%, #fff), 0 0 14px color-mix(in srgb, var(--tile) 75%, transparent);`],
  sticker: ["Sticker", `border-radius: 7px; box-shadow: ${LIP}, 0 0 0 2.5px #fff, 0 3px 7px rgb(0 0 0 / .3);`],
  pressed: ["Pressed in", `box-shadow: inset 0 3px 5px rgb(0 0 0 / .28), inset 0 -1px 0 rgb(255 255 255 / .35);`],
  pebble: ["Pebble", `border-radius: 34%; transform: scale(1.1); margin: 0 2px; background-image: radial-gradient(circle at 35% 30%, rgb(255 255 255 / .45), rgb(255 255 255 / 0) 55%); box-shadow: ${LIP}, 0 3px 6px rgb(0 0 0 / .25);`, "right: 17%; bottom: 15%;"],
  linen: ["Linen", `background-image: repeating-linear-gradient(0deg, rgb(0 0 0 / .04) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgb(0 0 0 / .04) 0 1px, transparent 1px 3px), linear-gradient(180deg, rgb(255 255 255 / .15), rgb(0 0 0 / .04)); box-shadow: ${LIP}, 0 2px 5px rgb(0 0 0 / .22);`],
  speckle: ["Speckled", `background-image: radial-gradient(circle at 20% 30%, rgb(0 0 0 / .16) 0 1px, transparent 1.6px), radial-gradient(circle at 70% 65%, rgb(0 0 0 / .12) 0 1px, transparent 1.6px), radial-gradient(circle at 45% 80%, rgb(255 255 255 / .55) 0 1px, transparent 1.6px), radial-gradient(circle at 85% 20%, rgb(255 255 255 / .45) 0 1px, transparent 1.6px); background-size: 11px 11px, 13px 13px, 9px 9px, 15px 15px; box-shadow: ${LIP}, inset 0 1px 0 rgb(255 255 255 / .35), 0 2px 5px rgb(0 0 0 / .24);`],
  marble: ["Marble", `background-image: linear-gradient(115deg, transparent 38%, rgb(255 255 255 / .4) 44%, transparent 50%), linear-gradient(60deg, transparent 58%, rgb(0 0 0 / .07) 62%, transparent 66%), linear-gradient(150deg, transparent 15%, rgb(0 0 0 / .05) 20%, transparent 25%), radial-gradient(circle at 30% 20%, rgb(255 255 255 / .35), transparent 60%); box-shadow: ${LIP}, 0 2px 6px rgb(0 0 0 / .25);`],
  frosted: ["Frosted glass", `background-image: linear-gradient(160deg, rgb(255 255 255 / .6), rgb(255 255 255 / .12) 55%, rgb(255 255 255 / .05)); box-shadow: inset 0 0 0 1px rgb(255 255 255 / .55), inset 0 -2px 0 color-mix(in srgb, var(--tile-edge) 60%, transparent), 0 4px 12px rgb(0 0 0 / .2);`],
  brushed: ["Brushed metal", `background-image: repeating-linear-gradient(90deg, rgb(255 255 255 / .1) 0 1px, rgb(0 0 0 / .045) 1px 2px), linear-gradient(180deg, rgb(255 255 255 / .38), rgb(0 0 0 / .12)); box-shadow: ${LIP}, inset 0 1px 0 rgb(255 255 255 / .6), 0 2px 4px rgb(0 0 0 / .3);`],
};
// with the tile look on "Theme", each theme brings its own look
const THEME_TSTYLE = { deluxe: "wood", board: "soft", tournament: "bevel", paper: "flat", contrast: "outline", midnight: "brushed",
  coffee: "wood", espresso: "gloss", mocha: "soft", latenight: "float", coldbrew: "frosted", velvet: "pebble", cafe: "wood", cocoa: "wood",
  forest: "wood", emerald: "marble", mint: "frosted", oat: "linen", vanilla: "linen",
  ocean: "frosted", sky: "float", royal: "marble", nord: "float", slate: "outline", teal: "pebble",
  plum: "gloss", lavender: "frosted", grape: "brushed", dusk: "glow", bubblegum: "gloss", rose: "sticker", blush: "sticker",
  cherry: "gloss", terracotta: "speckle", autumn: "wood", desert: "speckle", lemon: "sticker", parchment: "linen", solar: "chunky",
  charcoal: "block", neon: "glow" };
const tileLookOf = () => SET.tileLook === "theme" ? THEME_TSTYLE[SET.theme] || "soft" : TILE_STYLES[SET.tileLook] ? SET.tileLook : "soft";
// the page's tiles follow the setting; the previews in Settings (.ts-<id>) come after so they win
document.head.insertAdjacentHTML("beforeend", `<style>${Object.entries(TILE_STYLES).map(([id, [, css, sub]]) => `:root[data-tstyle="${id}"] .tile { ${css} }${sub ? ` :root[data-tstyle="${id}"] .tile sub { ${sub} }` : ""}`).join("\n")}
${Object.entries(TILE_STYLES).map(([id, [, css, sub]]) => `.tstyles .tile.ts-${id} { ${css} }${sub ? ` .tstyles .tile.ts-${id} sub { ${sub} }` : ""}`).join("\n")}</style>`);
// text sizes; Normal was 16px until 2026-10-26, when every size moved one name down and Large and Extra large were added
const TEXT_SIZES = { xs: "14px", sm: "16px", md: "18px", lg: "20px", xl: "22px" };
const SET_DEFAULT = { theme: "coffee", mode: "light", size: "md", values: true, sort: "prob", defs: true, prob: true, hooks: true, pageSize: 300, online: true, phony: 50, randMin: 2, randMax: 8, qcount: 20,
  tiles: "maple", tileCustom: "#f1dcaa", headCustom: "", accentCustom: "", glare: "dim", tileLook: "soft", tileFont: "sans", rackLook: "cherry",
  bPal: "theme", bLabels: "letters", bCoords: true, bTile: "same", bStyle: "gaps", bMark: "bright", bTheme: "", bTileCol: "same", bArrows: false };
const hadSettings = !!store.get("settings", null);
let SET = { ...SET_DEFAULT, ...store.get("settings", {}) };
// once, on every device: the look settings move to the new defaults (Coffee, light, Dim, Maple tiles, Soft shadow,
// Cherry rack). After that they're the person's own again
if (store.get("settingsV", 1) < 2) {
  SET = { ...SET, theme: "coffee", mode: "light", glare: "dim", tiles: "maple", tileLook: "soft", rackLook: "cherry" };
  store.set("settings", SET); store.set("settingsV", 2);
}
// once: a saved text size keeps its size under its new name (Small 14px is now Extra small, and so on)
if (store.get("settingsV", 1) < 3) {
  if (hadSettings) SET.size = { sm: "xs", md: "sm", lg: "md" }[SET.size] || SET.size;
  store.set("settings", SET); store.set("settingsV", 3);
}
const darkMQ = matchMedia("(prefers-color-scheme: dark)");
const isDark = () => SET.mode === "dark" || (SET.mode === "auto" && darkMQ.matches);
function tokensFor(dark) {
  const t = THEMES[SET.theme] || THEMES.board;
  const tok = { warn: dark ? "#f0b45a" : "#a66300", ...(dark ? t.dark : lightOf(THEMES[SET.theme] ? SET.theme : "board", t)) };
  // light mode: tone the near-white page and cards down a little (Soft) or more (Dim); High contrast stays as it is
  const g = !dark && SET.theme !== "contrast" && { soft: [.03, .45], dim: [.08, .45] }[SET.glare];
  if (g) {
    const [k, toBg] = g, d = c => mix(c, "#000000", k), bg = d(tok.bg);
    Object.assign(tok, { bg, panel: mix(d(tok.panel), bg, toBg), chip: mix(d(tok.chip), bg, .3), line: d(tok.line), field: d(tok.field) });
  }
  const tc = SET.tiles === "custom" ? SET.tileCustom : TILES[SET.tiles]?.[1];
  if (tc) Object.assign(tok, tileTok(tc));
  if (SET.headCustom) { const h = dark ? mix(SET.headCustom, "#000000", .3) : SET.headCustom; Object.assign(tok, { head: h, "head-ink": inkOn(h) }); }
  if (SET.accentCustom) { const a = dark ? mix(SET.accentCustom, "#ffffff", .2) : SET.accentCustom; Object.assign(tok, { accent: a, "on-accent": inkOn(a) }); }
  // text on the main buttons: if the theme's own colour is hard to read on its accent, near-black or white instead
  if (ratioOf(tok["on-accent"], tok.accent) < 4.5) tok["on-accent"] = ["#161410", "#ffffff"].reduce((b, c) => ratioOf(c, tok.accent) > ratioOf(b, tok.accent) ? c : b, tok["on-accent"]);
  return tok;
}
function applySettings() {
  const dark = isDark();
  const root = document.documentElement;
  const tok = tokensFor(dark);
  for (const [k, v] of Object.entries(tok)) root.style.setProperty("--" + k, v);
  root.style.colorScheme = dark ? "dark" : "light";
  root.style.fontSize = TEXT_SIZES[SET.size] || TEXT_SIZES.md;
  root.dataset.values = SET.values ? "on" : "off";
  root.dataset.tstyle = tileLookOf();
  root.dataset.tfont = SET.tileFont;
  root.dataset.theme = SET.theme; root.dataset.mode = dark ? "dark" : "light";
  // the phone's browser bar follows the header colour
  document.getElementById("themeColor").content = tok.head;
  store.set("paint", { mode: SET.mode, light: tokensFor(false), dark: tokensFor(true), size: root.style.fontSize, values: root.dataset.values, tstyle: tileLookOf(), tfont: SET.tileFont, theme: SET.theme });
}
function saveSettings(patch) { SET = { ...SET, ...patch }; store.set("settings", SET); applySettings(); }
darkMQ.addEventListener?.("change", applySettings);
applySettings();

