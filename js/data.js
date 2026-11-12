// ---------- lexicon ----------
const DICT = new Map(), ANA = new Map(), BYLEN = {};
for (const line of window.CSW_TSV.split("\n")) {
  const [w, d, fh, bh, sym, p, pl] = line.split("\t");
  // Zyzzyva marks a hook that is new in CSW24 with a "+" after the letter, e.g. "d+s"
  const newOf = h => (h.match(/[a-z](?=\+)/g) || []).join("");
  DICT.set(w, { d, fh: fh.replace(/\+/g, ""), bh: bh.replace(/\+/g, ""), fhNew: newOf(fh), bhNew: newOf(bh), n: sym === "+", p: +p, pl: +pl });
  const a = alpha(w);
  (ANA.get(a) || ANA.set(a, []).get(a)).push(w);
  (BYLEN[w.length] ||= []).push(w);
}
window.CSW_TSV = null;
// probability ranks are worked out here from the tiles, whatever the file says: the number of ways to draw the word
// from a full bag, counting the two blanks (as Zyzzyva does by default). Most ways is #1 in each length; ties go by
// alphagram, then the word, which gives exactly Zyzzyva's order
const BAG = { A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9, J: 1, K: 1, L: 4, M: 2, N: 6, O: 8, P: 2, Q: 1, R: 6, S: 4, T: 6, U: 4, V: 2, W: 2, X: 1, Y: 2, Z: 1 };
const CHOOSE = [...Array(13)].map((_, n) => [...Array(n + 1)].map((_, k) => { let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return r; }));
// a = an alphagram. ways[b] counts draws with b blanks standing in for letters so far; each run of k of the same
// letter is drawn k - u times from the bag and covered by u blanks. The two blanks can be picked 1, 2 or 1 ways
function draws(a) {
  let ways = [1, 0, 0];
  for (let i = 0; i < a.length;) {
    let j = i; while (a[j] === a[i]) j++;
    const k = j - i, row = CHOOSE[BAG[a[i]]], next = [0, 0, 0];
    for (let b = 0; b < 3; b++) if (ways[b]) for (let u = 0; u <= Math.min(k, 2 - b); u++) next[b + u] += ways[b] * (row[k - u] || 0);
    ways = next; i = j;
  }
  return ways[0] + 2 * ways[1] + ways[2];
}
{
  // anagrams share their tiles, so it's worked out once per rack; racks are ranked, then each rack's words in A–Z order
  const racks = {};
  for (const [a, ws] of ANA) (racks[a.length] ||= []).push({ a, ws, n: draws(a) });
  for (const rs of Object.values(racks)) {
    let i = 0;
    rs.sort((x, y) => y.n - x.n || (x.a < y.a ? -1 : 1));
    for (const r of rs) for (const w of [...r.ws].sort()) DICT.get(w).p = ++i;
  }
}
const ALL = [...DICT.keys()];

const anagrams = w => ANA.get(alpha(w)) || [];
// sound-alikes: 2s to 8s that differ by one letter, in the same spot, for one that sounds like it (URANITE, URANIDE)
const SOUND_PAIRS = ["DT", "BP", "CGK", "SZ", "FV", "MN", "GJ"];
const saCache = new Map();
function soundAlikes(w) {
  if (w.length < 2 || w.length > 8) return [];
  if (saCache.has(w)) return saCache.get(w);
  const out = new Set();
  [...w].forEach((c, i) => SOUND_PAIRS.forEach(g => { if (g.includes(c)) for (const L of g) { const x = w.slice(0, i) + L + w.slice(i + 1); if (L !== c && DICT.has(x)) out.add(x); } }));
  saCache.set(w, [...out]);
  return saCache.get(w);
}
const saLinks = ws => ws.map(x => `<a href="#w/${x}" data-go="${x}">${x}</a>`).join(", ");
function plusOne(w) {
  const out = [];
  for (const L of AZ) { const g = ANA.get(alpha(w + L)); if (g) out.push([L, g]); }
  return out;
}
function minusOne(w) {
  const seen = new Set(), out = [];
  for (let i = 0; i < w.length; i++) {
    if (seen.has(w[i])) continue; seen.add(w[i]);
    const g = ANA.get(alpha(w.slice(0, i) + w.slice(i + 1)));
    if (g) out.push([w[i], g]);
  }
  return out;
}
function counts(s) { const c = {}; for (const ch of s) c[ch] = (c[ch] || 0) + 1; return c; }
function blanksNeeded(w, rc) {
  const need = {}; let b = 0;
  for (const ch of w) { need[ch] = (need[ch] || 0) + 1; if (need[ch] > (rc[ch] || 0)) b++; }
  return b;
}
function blankMask(w, rc) {
  const left = { ...rc };
  return [...w].map(ch => { if (left[ch] > 0) { left[ch]--; return false; } return true; });
}

// ---------- groups: shared by Search (group picker), Word lists and Quiz ----------
// len = which length the list view opens on; special groups are list-only
// a word is a length from a to b (or just a)
const lenIn = (w, a, b) => w.length >= a && w.length <= (b ?? a);
// list helpers: a word's vowel/consonant shape ("cvcv"), whether it holds every letter of a stem, whether swapping
// one letter for another of the group g makes a word, and the word backwards
const shape = w => [...w].map(c => "AEIOU".includes(c) ? "v" : "c").join("");
const hasAll = (w, letters) => { const c = counts(w); return Object.entries(counts(letters)).every(([k, n]) => (c[k] || 0) >= n); };
const swapIn = (w, g) => lenIn(w, 2, 8) && [...w].some((c, i) => g.includes(c) && [...g].some(L => L !== c && DICT.has(w.slice(0, i) + L + w.slice(i + 1))));
const rev = w => [...w].reverse().join("");
const GROUPS = [
  { sect: "Vowel dumps" },
  { id: "vowel", name: "Vowel dumps", len: 4, blurb: "4-letter words with three or more vowels, like AEON, EUOI and OBIA.", test: w => w.length === 4 && vowels(w) >= 3 },
  { id: "vowel5", name: "5-letter vowel dumps", blurb: "Five letters with four or more vowels, like ADIEU, AUDIO and OUIJA.", test: w => w.length === 5 && vowels(w) >= 4 },
  { id: "vowel67", name: "Five-vowel 6s and 7s", len: 6, blurb: "6 and 7-letter words with five or more vowels, like EULOGIA and AUREOLE.", test: w => lenIn(w, 6, 7) && vowels(w) >= 5 },
  { id: "vowelonly", name: "Vowels only", blurb: "No consonants at all, like AA, EAU, AUE and EUOI.", test: w => /^[AEIOU]+$/.test(w) },
  { id: "vheavy", name: "Vowel-heavy words", len: 5, blurb: "3 to 8 letters where at least 60% of tiles are vowels.", test: w => lenIn(w, 3, 8) && vowels(w) / w.length >= 0.6 },
  { id: "iu", name: "Double I and double U", len: 5, blurb: "Up to 7 letters with two or more Is or Us, the hardest vowels to clear.", test: w => w.length <= 7 && (nOf(w, "I") >= 2 || nOf(w, "U") >= 2) },
  { id: "triple", name: "Triple-vowel words", len: 5, blurb: "5 to 8 letters with three of the same vowel, like ABACA and BIKINI.", test: w => lenIn(w, 5, 8) && /([AEIOU]).*\1.*\1/.test(w) },
  { id: "allfive", name: "All five vowels", blurb: "Words with A, E, I, O and U, 9 letters or fewer.", test: w => w.length <= 9 && [..."AEIOU"].every(v => w.includes(v)) },
  { sect: "Consonant dumps" },
  { id: "novowel", name: "No-vowel words", len: 3, blurb: "No A, E, I, O or U, like BRR, CWM, PFFT and CRWTH.", test: w => !/[AEIOU]/.test(w) },
  { id: "noy", name: "No vowels, not even Y", blurb: "Words with no A, E, I, O, U or Y.", test: w => !/[AEIOUY]/.test(w) },
  { id: "onev", name: "One-vowel 5s and 6s", len: 5, blurb: "5 and 6-letter words with a single vowel, like SCHMO and STRICT.", test: w => lenIn(w, 5, 6) && vowels(w) === 1 },
  { id: "onev78", name: "One-vowel 7s and 8s", len: 7, blurb: "7 and 8-letter words with a single vowel, the bingos for a consonant-heavy rack, like SCHNAPS and STRENGTH.", test: w => lenIn(w, 7, 8) && vowels(w) <= 1 },
  { sect: "Double letters" },
  { id: "dbl2", name: "Two double letters", len: 7, blurb: "Up to 9 letters with two side-by-side pairs, like BALLOON, COFFEE and RACCOON.", test: w => w.length <= 9 && doubles(w) >= 2 },
  { id: "dbl3", name: "Three double letters", blurb: "Words with three or more side-by-side pairs, like BOOKKEEPER.", test: w => doubles(w) >= 3 },
  { id: "dblv", name: "Double vowels", len: 4, blurb: "3 to 5-letter words with AA, EE, II, OO or UU, handy for clearing a pair of vowels.", test: w => lenIn(w, 3, 5) && /(AA|EE|II|OO|UU)/.test(w) },
  { sect: "Power tiles" },
  { id: "jqxz", name: "JQXZ words", len: 4, blurb: "Any word with J, Q, X or Z. Opens on the 4s.", test: w => /[JQXZ]/.test(w) },
  { id: "jqxzshort", name: "JQXZ 2s to 5s", len: 4, blurb: "Short power-tile words only, 2 to 5 letters.", test: w => w.length <= 5 && /[JQXZ]/.test(w) },
  { id: "j", name: "J words", len: 3, blurb: "Every word with a J.", test: w => w.includes("J") },
  { id: "q", name: "Q words", len: 3, blurb: "Every word with a Q.", test: w => w.includes("Q") },
  { id: "x", name: "X words", len: 3, blurb: "Every word with an X.", test: w => w.includes("X") },
  { id: "z", name: "Z words", len: 3, blurb: "Every word with a Z.", test: w => w.includes("Z") },
  { id: "qnou", name: "Q without U", blurb: "Every word with a Q and no U, like QI, QAT, QOPH and WAQF.", test: w => w.includes("Q") && !w.includes("U") },
  { id: "twopower", name: "Two power tiles", blurb: "Words with two or more of J, Q, X and Z, like ZAX and JUKEBOX.", test: w => (w.match(/[JQXZ]/g) || []).length >= 2 },
  { id: "heavy", name: "Short heavy hitters", len: 3, blurb: "2 to 4-letter words worth 10 or more points on face value.", test: w => w.length <= 4 && score(w) >= 10 },
  { id: "shortv", name: "Short V words", len: 3, blurb: "3 and 4-letter words with V. There are no 2-letter V words.", test: w => lenIn(w, 3, 4) && w.includes("V") },
  { id: "kwyfh", name: "Short K, W, Y, F, H words", len: 3, blurb: "3-letter words using the 4 and 5-point tiles.", test: w => w.length === 3 && /[KWYFH]/.test(w) },
  { sect: "Short words and hooks" },
  { id: "twos", name: "Two-letter words", blurb: "All 127 twos. Learn these first.", test: w => w.length === 2 },
  { id: "threes", name: "Three-letter words", blurb: "Every three, with hooks.", test: w => w.length === 3 },
  { id: "fours", name: "Four-letter words", blurb: "Every four, with hooks.", test: w => w.length === 4 },
  { id: "nohook", name: "Unhookable words", len: 3, blurb: "2 to 5-letter words with no front or back hooks. Safe to play, hard to extend.", test: (w, e) => w.length <= 5 && !e.fh && !e.bh },
  { id: "manyhook", name: "Hook-heavy words", len: 2, blurb: "Words that take 8 or more hooks. Risky to open the board with.", test: (w, e) => e.fh.length + e.bh.length >= 8 },
  { id: "nos", name: "No S hook", len: 3, blurb: "2 to 5-letter words that can't take an S on the end.", test: (w, e) => w.length <= 5 && !e.bh.includes("s") },
  { id: "frontonly", name: "Front hooks only", len: 3, blurb: "2 to 5-letter words that take a front hook but no back hook.", test: (w, e) => w.length <= 5 && !!e.fh && !e.bh },
  // a word with its first or last letter taken off is still a word: it's that shorter word plus a hook
  { sect: "Hooks, step by step" },
  { id: "f2", name: "3s from a 2, hook in front", len: 3, blurb: "Every 3 that is a two with a letter on the front, like CHI from HI and SAX from AX.", test: w => w.length === 3 && DICT.has(w.slice(1)) },
  { id: "b2", name: "3s from a 2, hook on the end", len: 3, blurb: "Every 3 that is a two with a letter on the end, like AXE from AX and HIT from HI.", test: w => w.length === 3 && DICT.has(w.slice(0, 2)) },
  { id: "f3", name: "4s from a 3, hook in front", len: 4, blurb: "Every 4 that is a three with a letter on the front, like SCAT from CAT and AEON from EON.", test: w => w.length === 4 && DICT.has(w.slice(1)) },
  { id: "b3", name: "4s from a 3, hook on the end", len: 4, blurb: "Every 4 that is a three with a letter on the end, like CATE from CAT and ZEDS from ZED.", test: w => w.length === 4 && DICT.has(w.slice(0, 3)) },
  { id: "b3nos", name: "4s from a 3, end hook not S", len: 4, blurb: "Back hooks of the 3s with the plurals left out, like JOTA from JOT and CATE from CAT.", test: w => w.length === 4 && w[3] !== "S" && DICT.has(w.slice(0, 3)) },
  { id: "fb3", name: "4s from a 3 at either end", len: 4, blurb: "4s that are a 3 with a front hook and also a 3 with a back hook, like TONE (from ONE and TON).", test: w => w.length === 4 && DICT.has(w.slice(1)) && DICT.has(w.slice(0, 3)) },
  { id: "no3", name: "4s not built on a 3", len: 4, blurb: "4s you can't make by hooking a 3 at either end. like IOTA and ETNA. The ones hooks won't teach you.", test: w => w.length === 4 && !DICT.has(w.slice(1)) && !DICT.has(w.slice(0, 3)) },
  { id: "f4", name: "5s from a 4, hook in front", len: 5, blurb: "Every 5 that is a four with a letter on the front, like ABLED from BLED.", test: w => w.length === 5 && DICT.has(w.slice(1)) },
  { id: "b4nos", name: "5s from a 4, end hook not S", len: 5, blurb: "Every 5 that is a four with a letter other than S on the end, like FAKED from FAKE.", test: w => w.length === 5 && w[4] !== "S" && DICT.has(w.slice(0, 4)) },
  { id: "fs3", name: "4s from a 3, S in front", len: 4, blurb: "Like SADO, SEGO and STED.", test: w => w.length === 4 && w[0] === "S" && DICT.has(w.slice(1)) },
  { id: "fns3", name: "4s from a 3, front hook not S", len: 4, blurb: "Like AGIO, OGEE and ETUI.", test: w => w.length === 4 && w[0] !== "S" && DICT.has(w.slice(1)) },
  { id: "b4", name: "5s from a 4, hook on the end", len: 5, blurb: "Every 5 that is a four with a letter on the end, like ZOEAE, AINEE and WAITE.", test: w => w.length === 5 && DICT.has(w.slice(0, 4)) },
  { id: "both2", name: "2s with hooks at both ends", len: 2, blurb: "Like RE, IN and ER.", test: (w, e) => w.length === 2 && !!e.fh && !!e.bh },
  { id: "both3", name: "3s with hooks at both ends", len: 3, blurb: "Like IDE, ODE and ITA.", test: (w, e) => w.length === 3 && !!e.fh && !!e.bh },
  { id: "back3", name: "3s with back hooks only", len: 3, blurb: "Like OYE, ZEA and AHI.", test: (w, e) => w.length === 3 && !e.fh && !!e.bh },
  { id: "nohook4", name: "4s with no hooks", len: 4, blurb: "Like EUOI, EVOE and ODEA.", test: (w, e) => w.length === 4 && !e.fh && !e.bh },
  { id: "newhook", name: "Words with a hook new in CSW24", len: 3, blurb: "A hook that only became good in this edition, like IN, AR and EW.", test: (w, e) => !!(e.fhNew || e.bhNew) },
  { id: "f5", name: "6s from a 5, hook in front", len: 6, blurb: "Like TOUTIE, ETOILE and TOORIE.", test: w => w.length === 6 && DICT.has(w.slice(1)) },
  { sect: "S hooks" },
  { id: "s2", name: "2s that take an S", len: 2, blurb: "Like RE, IN and ER.", test: (w, e) => w.length === 2 && e.bh.includes("s") },
  { id: "s3", name: "3s that take an S", len: 3, blurb: "Like IDE, AWE and ODE.", test: (w, e) => w.length === 3 && e.bh.includes("s") },
  { id: "s3no", name: "3s that can't take an S", len: 3, blurb: "Like AGO, YAE and ORA.", test: (w, e) => w.length === 3 && !e.bh.includes("s") },
  { id: "s3only", name: "3s whose only hook is S", len: 3, blurb: "S on the end and nothing else, front or back, like AHI, WOE and NEF.", test: (w, e) => w.length === 3 && !e.fh && e.bh === "s" },
  { id: "s4", name: "4s that take an S", len: 4, blurb: "Like OWIE, AGIO and OHIA.", test: (w, e) => w.length === 4 && e.bh.includes("s") },
  { id: "s4no", name: "4s that can't take an S", len: 4, blurb: "Like EUOI, AWEE and EVOE.", test: (w, e) => w.length === 4 && !e.bh.includes("s") },
  { id: "s4only", name: "4s whose only hook is S", len: 4, blurb: "S on the end and nothing else, front or back, like AGIO, OHIA and ANOA.", test: (w, e) => w.length === 4 && !e.fh && e.bh === "s" },
  { id: "sf3", name: "3s that take an S in front", len: 3, blurb: "Like IDE, ENE and ATE.", test: (w, e) => w.length === 3 && e.fh.includes("s") },
  { id: "sf4", name: "4s that take an S in front", len: 4, blurb: "Like EINE, AINE and EASE.", test: (w, e) => w.length === 4 && e.fh.includes("s") },
  { id: "ss3", name: "3s that take an S at both ends", len: 3, blurb: "Like IDE, ENE and ATE.", test: (w, e) => w.length === 3 && e.fh.includes("s") && e.bh.includes("s") },
  { id: "ss4", name: "4s that take an S at both ends", len: 4, blurb: "Like EASE, AMEN and AGER.", test: (w, e) => w.length === 4 && e.fh.includes("s") && e.bh.includes("s") },
  { sect: "Four-letter patterns" },
  { id: "s4cvcv", name: "4s shaped CVCV", len: 4, blurb: "Consonant, vowel, consonant, vowel, like GITE, TIDE and GONE. C is a consonant, V a vowel (Y counts as a consonant).", test: w => w.length === 4 && shape(w) === "cvcv" },
  { id: "s4cvvc", name: "4s shaped CVVC", len: 4, blurb: "Two vowels in the middle, like GEIT, GIEN and TOED. C is a consonant, V a vowel (Y counts as a consonant).", test: w => w.length === 4 && shape(w) === "cvvc" },
  { id: "s4cvcc", name: "4s shaped CVCC", len: 4, blurb: "One vowel, then two consonants, like VINT, VEND and VENT. C is a consonant, V a vowel (Y counts as a consonant).", test: w => w.length === 4 && shape(w) === "cvcc" },
  { id: "s4ccvc", name: "4s shaped CCVC", len: 4, blurb: "Two consonants, then the vowel, like WRIT, TWIN and WREN. C is a consonant, V a vowel (Y counts as a consonant).", test: w => w.length === 4 && shape(w) === "ccvc" },
  { id: "s4vcvc", name: "4s shaped VCVC", len: 4, blurb: "Starting on a vowel, then taking turns, like ONER, ORAD and ADIT. C is a consonant, V a vowel (Y counts as a consonant).", test: w => w.length === 4 && shape(w) === "vcvc" },
  { id: "s4vccv", name: "4s shaped VCCV", len: 4, blurb: "A vowel at each end, like ORFE, INTO and INGO. C is a consonant, V a vowel (Y counts as a consonant).", test: w => w.length === 4 && shape(w) === "vccv" },
  { id: "s4vccc", name: "4s shaped VCCC", len: 4, blurb: "One vowel, at the front, like EFTS, EWTS and INNS. C is a consonant, V a vowel (Y counts as a consonant).", test: w => w.length === 4 && shape(w) === "vccc" },
  { id: "s4cccv", name: "4s shaped CCCV", len: 4, blurb: "One vowel, at the end, like WYTE, GYRI and GYTE. C is a consonant, V a vowel (Y counts as a consonant).", test: w => w.length === 4 && shape(w) === "cccv" },
  { id: "s4ccvv", name: "4s shaped CCVV", len: 4, blurb: "Two consonants then two vowels, like TWAE, FROE and THAE. C is a consonant, V a vowel (Y counts as a consonant).", test: w => w.length === 4 && shape(w) === "ccvv" },
  { id: "s4vvcv", name: "4s shaped VVCV", len: 4, blurb: "Three vowels with a consonant third, like IOTA, OUZO and OUPA. C is a consonant, V a vowel (Y counts as a consonant).", test: w => w.length === 4 && shape(w) === "vvcv" },
  { id: "s4cvvv", name: "4s shaped CVVV", len: 4, blurb: "A consonant then three vowels, like JIAO, HIOI and QUAI. C is a consonant, V a vowel (Y counts as a consonant).", test: w => w.length === 4 && shape(w) === "cvvv" },
  { id: "f4dbl", name: "4s with a double letter", len: 4, blurb: "Two of the same letter side by side, like AJEE, AWEE and OGEE.", test: w => w.length === 4 && doubles(w) > 0 },
  { id: "f4pair", name: "4s with a split pair", len: 4, blurb: "Two of the same letter apart, like EVOE, ANOA and INIA.", test: w => w.length === 4 && !doubles(w) && new Set(w).size < 4 },
  { id: "f4ends", name: "4s that start and end alike", len: 4, blurb: "The same letter at each end, like EVOE, ANOA and AIGA.", test: w => w.length === 4 && w[0] === w[3] },
  { id: "f4y", name: "4s with Y as the only vowel", len: 4, blurb: "No A, E, I, O or U, just a Y, like TYND, FYRD and WYND.", test: w => w.length === 4 && !/[AEIOU]/.test(w) && w.includes("Y") },
  { id: "f4endy", name: "4s ending in Y", len: 4, blurb: "Like OBEY, OATY and GOEY.", test: w => w.length === 4 && w.endsWith("Y") },
  { id: "f4k", name: "4s with a K", len: 4, blurb: "Like KAIE, AKEE and KITE.", test: w => w.length === 4 && w.includes("K") },
  { id: "f4w", name: "4s with a W", len: 4, blurb: "Like OWIE, AWEE and EWER.", test: w => w.length === 4 && w.includes("W") },
  { id: "f4f", name: "4s with an F", len: 4, blurb: "Like FOEN, FONE and TIFO.", test: w => w.length === 4 && w.includes("F") },
  { id: "f4h", name: "4s with an H", len: 4, blurb: "Like OHIA, HUIA and HIDE.", test: w => w.length === 4 && w.includes("H") },
  { id: "f4v", name: "4s with a V", len: 4, blurb: "Like EVOE, VIAE and EAVE.", test: w => w.length === 4 && w.includes("V") },
  { id: "f4big", name: "4s worth 12 or more", len: 4, blurb: "Face value 12 points or more, like QADI, QAID and QATS.", test: w => w.length === 4 && score(w) >= 12 },
  { id: "f4ana", name: "4s with three or more anagrams", len: 4, blurb: "Racks of four that make three words or more, like GITE, ONER and TIDE.", test: w => w.length === 4 && anagrams(w).length >= 3 },
  { id: "f4lone", name: "4s with no anagram", len: 4, blurb: "The only word from their letters, like EUOI, OWIE and JIAO.", test: w => w.length === 4 && anagrams(w).length === 1 },
  { id: "f4onept", name: "4s from one-point tiles", len: 4, blurb: "Only A, E, I, L, N, O, R, S, T and U, like EUOI, IOTA and TOEA.", test: w => w.length === 4 && /^[AEILNORSTU]+$/.test(w) },
  { sect: "Bingos" },
  { id: "stems6", name: "Best 6-letter stems", special: "stems", n: 6, blurb: "6-tile leaves that make the most 7-letter bingos, with the letters that complete them." },
  { id: "stems7", name: "Best 7-letter stems", special: "stems", n: 7, blurb: "7 tiles plus 1 on the board makes an 8. The most productive racks." },
  { id: "p7", name: "Most likely 7s", blurb: "The 1,000 most probable 7-letter words (probability rank 1 to 1,000).", test: (w, e) => w.length === 7 && e.p <= 1000 },
  { id: "p8", name: "Most likely 8s", blurb: "The 1,000 most probable 8-letter words (probability rank 1 to 1,000).", test: (w, e) => w.length === 8 && e.p <= 1000 },
  { id: "rich", name: "Anagram-rich racks", len: 7, blurb: "7s and 8s whose letters make 5 or more words.", test: w => lenIn(w, 7, 8) && anagrams(w).length >= 5 },
  { id: "suffix", name: "-ING, -IER, -IEST bingos", len: 7, blurb: "Every 7 and 8-letter word ending in ING, IER or IEST.", test: w => lenIn(w, 7, 8) && /(ING|IER|IEST)$/.test(w) },
  { id: "prefix", name: "RE-, UN-, OUT-, OVER-, DIS- bingos", len: 7, blurb: "Every 7 and 8-letter word starting with RE, UN, OUT, OVER or DIS.", test: w => lenIn(w, 7, 8) && /^(RE|UN|OUT|OVER|DIS)/.test(w) },
  { id: "benders", name: "-ERS bingos", len: 7, blurb: "7s and 8s ending in -ERS, like ELOINERS, ALIENERS and TANNERS.", test: w => lenIn(w, 7, 8) && /(ERS)$/.test(w) },
  { id: "bendies", name: "-IES bingos", len: 7, blurb: "7s and 8s ending in -IES, like ATONIES, AIERIES and EATERIES.", test: w => lenIn(w, 7, 8) && /(IES)$/.test(w) },
  { id: "bendate", name: "-ATE bingos", len: 7, blurb: "7s and 8s ending in -ATE, like ERADIATE, AREOLATE and ROSEATE.", test: w => lenIn(w, 7, 8) && /(ATE)$/.test(w) },
  { id: "bendion", name: "-ION bingos", len: 7, blurb: "7s and 8s ending in -ION, like AERATION, ERASION and DELATION.", test: w => lenIn(w, 7, 8) && /(IONS?)$/.test(w) },
  { id: "bendiseandize", name: "-ISE and -IZE bingos", len: 7, blurb: "7s and 8s ending in -ISE and -IZE, like EROTISE, RIOTISE and OUTRAISE.", test: w => lenIn(w, 7, 8) && /(I[SZ]E[SD]?)$/.test(w) },
  { id: "bendness", name: "-NESS bingos", len: 7, blurb: "7s and 8s ending in -NESS, like AIRINESS, DIRENESS and WARINESS.", test: w => lenIn(w, 7, 8) && /(NESS)$/.test(w) },
  { id: "bendableandible", name: "-ABLE and -IBLE bingos", len: 7, blurb: "7s and 8s ending in -ABLE and -IBLE, like RENTABLE, INARABLE and ATONABLE.", test: w => lenIn(w, 7, 8) && /([AI]BLE)$/.test(w) },
  { id: "bended", name: "-ED bingos", len: 7, blurb: "7s and 8s ending in -ED, like ORIENTED, RENAILED and ANISEED.", test: w => lenIn(w, 7, 8) && /(ED)$/.test(w) },
  { id: "bendest", name: "-EST bingos", len: 7, blurb: "7s and 8s ending in -EST, like AERIEST, AIRIEST and OARIEST.", test: w => lenIn(w, 7, 8) && /(EST)$/.test(w) },
  { id: "bendly", name: "-LY bingos", len: 7, blurb: "7s and 8s ending in -LY, like ORNATELY, ENTIRELY and INNATELY.", test: w => lenIn(w, 7, 8) && /(LY)$/.test(w) },
  { id: "bendment", name: "-MENT bingos", len: 7, blurb: "7s and 8s ending in -MENT, like DIRIMENT, WARIMENT and VIREMENT.", test: w => lenIn(w, 7, 8) && /(MENTS?)$/.test(w) },
  { id: "bendist", name: "-IST bingos", len: 7, blurb: "7s and 8s ending in -IST, like ENTRIST, IRONIST and NARCIST.", test: w => lenIn(w, 7, 8) && /(ISTS?)$/.test(w) },
  { id: "bendity", name: "-ITY bingos", len: 7, blurb: "7s and 8s ending in -ITY, like AUREITY, IDONEITY and SERENITY.", test: w => lenIn(w, 7, 8) && /(ITY)$/.test(w) },
  { id: "bendous", name: "-OUS bingos", len: 7, blurb: "7s and 8s ending in -OUS, like AENEOUS, ARENOUS and ARANEOUS.", test: w => lenIn(w, 7, 8) && /(OUS)$/.test(w) },
  { id: "bendish", name: "-ISH bingos", len: 7, blurb: "7s and 8s ending in -ISH, like TARNISH, OGREISH and EVANISH.", test: w => lenIn(w, 7, 8) && /(ISH)$/.test(w) },
  { id: "bendage", name: "-AGE bingos", len: 7, blurb: "7s and 8s ending in -AGE, like LITREAGE, ALIENAGE and LINEAGE.", test: w => lenIn(w, 7, 8) && /(AGES?)$/.test(w) },
  { id: "bpremis", name: "MIS- bingos", len: 7, blurb: "7s and 8s starting with MIS, like MISENTER, MISENROL and MISTEND.", test: w => lenIn(w, 7, 8) && /^MIS/.test(w) },
  { id: "bprepre", name: "PRE- bingos", len: 7, blurb: "7s and 8s starting with PRE, like PREUNITE, PRETRAIN and PRESTING.", test: w => lenIn(w, 7, 8) && /^PRE/.test(w) },
  { id: "bprenon", name: "NON- bingos", len: 7, blurb: "7s and 8s starting with NON, like NONELITE, NONIDEAL and NONRATED.", test: w => lenIn(w, 7, 8) && /^NON/.test(w) },
  { id: "bprede", name: "DE- bingos", len: 7, blurb: "7s and 8s starting with DE, like DETAINEE, DENTARIA and DELATION.", test: w => lenIn(w, 7, 8) && /^DE/.test(w) },
  { id: "bprein", name: "IN- bingos", len: 7, blurb: "7s and 8s starting with IN, like INERTIAE, INERTIA and INERTIAL.", test: w => lenIn(w, 7, 8) && /^IN/.test(w) },
  { id: "bpreen", name: "EN- bingos", len: 7, blurb: "7s and 8s starting with EN, like ENATION, ENTAILER and ENARGITE.", test: w => lenIn(w, 7, 8) && /^EN/.test(w) },
  { id: "bpreco", name: "CO- bingos", len: 7, blurb: "7s and 8s starting with CO, like CORNEAE, COTERIE and CORONAE.", test: w => lenIn(w, 7, 8) && /^CO/.test(w) },
  { id: "bpreunder", name: "UNDER- bingos", len: 7, blurb: "7s and 8s starting with UNDER, like UNDERLIT, UNDERLIE and UNDERWIT.", test: w => lenIn(w, 7, 8) && /^UNDER/.test(w) },
  { id: "bpreinter", name: "INTER- bingos", len: 7, blurb: "7s and 8s starting with INTER, like INTERNAL, INTERIOR and INTERVAL.", test: w => lenIn(w, 7, 8) && /^INTER/.test(w) },
  { id: "bpreanti", name: "ANTI- bingos", len: 7, blurb: "7s and 8s starting with ANTI, like ANTIHERO, ANTIGENE and ANTIDORA.", test: w => lenIn(w, 7, 8) && /^ANTI/.test(w) },
  { id: "bstaeirst", name: "AEIRST + one", len: 7, blurb: "Every 7 with the letters AEIRST and one more, like SERIATE, AERIEST and OTARIES.", test: w => w.length === 7 && hasAll(w, "AEIRST") },
  { id: "bstaeinrt", name: "AEINRT + one", len: 7, blurb: "Every 7 with the letters AEINRT and one more, like INERTIA, OTARINE and NOTAIRE.", test: w => w.length === 7 && hasAll(w, "AEINRT") },
  { id: "bstaeinst", name: "AEINST + one", len: 7, blurb: "Every 7 with the letters AEINST and one more, like ETESIAN, ATONIES and AUNTIES.", test: w => w.length === 7 && hasAll(w, "AEINST") },
  { id: "bstaeinrs", name: "AEINRS + one", len: 7, blurb: "Every 7 with the letters AEINRS and one more, like ERASION, SENARII and ALINERS.", test: w => w.length === 7 && hasAll(w, "AEINRS") },
  { id: "bsteinors", name: "EINORS + one", len: 7, blurb: "Every 7 with the letters EINORS and one more, like ERASION, URINOSE and EROSION.", test: w => w.length === 7 && hasAll(w, "EINORS") },
  { id: "bstaeilrt", name: "AEILRT + one", len: 7, blurb: "Every 7 with the letters AEILRT and one more, like ATELIER, URALITE and REALTIE.", test: w => w.length === 7 && hasAll(w, "AEILRT") },
  { id: "bstaeilnt", name: "AEILNT + one", len: 7, blurb: "Every 7 with the letters AEILNT and one more, like LINEATE, TOENAIL and ELATION.", test: w => w.length === 7 && hasAll(w, "AEILNT") },
  { id: "bsteinort", name: "EINORT + one", len: 7, blurb: "Every 7 with the letters EINORT and one more, like OTARINE, NOTAIRE and RETINOL.", test: w => w.length === 7 && hasAll(w, "EINORT") },
  { id: "bstaeirss", name: "AEIRSS + one", len: 7, blurb: "Every 7 with the letters AEIRSS and one more, like SARNIES, SAURIES and ARAISES.", test: w => w.length === 7 && hasAll(w, "AEIRSS") },
  { id: "bstaeinss", name: "AEINSS + one", len: 7, blurb: "Every 7 with the letters AEINSS and one more, like ANOESIS, SARNIES and SDAINES.", test: w => w.length === 7 && hasAll(w, "AEINSS") },
  { id: "b7v4", name: "Vowel-heavy 7s", len: 7, blurb: "Four or more vowels, like ETAERIO, ETESIAN and ATONIES.", test: w => w.length === 7 && vowels(w) >= 4 },
  { id: "b7jqxz", name: "7s with J, Q, X or Z", len: 7, blurb: "Like QINTARS, AQUIVER and SEQUOIA.", test: w => w.length === 7 && /[JQXZ]/.test(w) },
  { id: "b8jqxz", name: "8s with J, Q, X or Z", len: 8, blurb: "Like AEQUORIN, EQUATION and JAUNTIER.", test: w => w.length === 8 && /[JQXZ]/.test(w) },
  { id: "b7ss", name: "7s with two Ss", len: 7, blurb: "Like ANOESIS, SOSATIE and EASIEST.", test: w => w.length === 7 && nOf(w, "S") >= 2 },
  { id: "b7one", name: "7s from one-point tiles", len: 7, blurb: "Only A, E, I, L, N, O, R, S, T and U, like ETAERIO, ETESIAN and ATONIES.", test: w => w.length === 7 && /^[AEILNORSTU]+$/.test(w) },
  { id: "p7b", name: "Next most likely 7s", len: 7, blurb: "Probability rank 1,001 to 2,000, like SIENITE, AERATES and AUREATE.", test: (w, e) => w.length === 7 && e.p > 1000 && e.p <= 2000 },
  { id: "p8b", name: "Next most likely 8s", len: 8, blurb: "Probability rank 1,001 to 2,000, like TREELINE, ALIENAGE and GAIETIES.", test: (w, e) => w.length === 8 && e.p > 1000 && e.p <= 2000 },
  { id: "p6", name: "Most likely 6s", len: 6, blurb: "Probability rank 1 to 1,000, like IODATE, TENIAE and TOEIER.", test: (w, e) => w.length === 6 && e.p <= 1000 },
  { id: "p5", name: "Most likely 5s", len: 5, blurb: "Probability rank 1 to 1,000, like OORIE, OUTIE and ADIEU.", test: (w, e) => w.length === 5 && e.p <= 1000 },
  { sect: "Sound-alikes" },
  { id: "sa3", name: "3s with a sound-alike", len: 3, blurb: "One letter swapped for one that sounds like it makes another word, like ENE, OBE and OPE.", test: w => w.length === 3 && soundAlikes(w).length > 0 },
  { id: "sa4", name: "4s with a sound-alike", len: 4, blurb: "One letter swapped for one that sounds like it makes another word, like AGEE, WITE and FATE.", test: w => w.length === 4 && soundAlikes(w).length > 0 },
  { id: "sa5", name: "5s with a sound-alike", len: 5, blurb: "One letter swapped for one that sounds like it makes another word, like VOGIE, FOGIE and WAITE.", test: w => w.length === 5 && soundAlikes(w).length > 0 },
  { id: "sa6", name: "6s with a sound-alike", len: 6, blurb: "One letter swapped for one that sounds like it makes another word, like GOATEE, FOOTIE and COATEE.", test: w => w.length === 6 && soundAlikes(w).length > 0 },
  { id: "sa7", name: "7s with a sound-alike", len: 7, blurb: "One letter swapped for one that sounds like it makes another word, like ATONIES, EROTISE and RIOTISE.", test: w => w.length === 7 && soundAlikes(w).length > 0 },
  { id: "sa8", name: "8s with a sound-alike", len: 8, blurb: "One letter swapped for one that sounds like it makes another word, like RENAILED, ABOITEAU and EROTISED.", test: w => w.length === 8 && soundAlikes(w).length > 0 },
  { id: "swdt", name: "Swap D and T", len: 4, blurb: "Words that make another word when D and T trade places, like IT, ID and ET.", test: w => swapIn(w, "DT") },
  { id: "swbp", name: "Swap B and P", len: 4, blurb: "Words that make another word when B and P trade places, like OBE, OPE and BE.", test: w => swapIn(w, "BP") },
  { id: "swcgk", name: "Swap C, G and K", len: 4, blurb: "Words that make another word when C, G and K trade places, like GOATEE, GI and GO.", test: w => swapIn(w, "CGK") },
  { id: "swsz", name: "Swap S and Z", len: 4, blurb: "Words that make another word when S and Z trade places, like ZEE, EROTISE and ZEA.", test: w => swapIn(w, "SZ") },
  { id: "swfv", name: "Swap F and V", len: 4, blurb: "Words that make another word when F and V trade places, like FAV, VAW and VAX.", test: w => swapIn(w, "FV") },
  { id: "swmn", name: "Swap M and N", len: 4, blurb: "Words that make another word when M and N trade places, like ATONIES, EN and NE.", test: w => swapIn(w, "MN") },
  { id: "swgj", name: "Swap G and J", len: 4, blurb: "Words that make another word when G and J trade places, like AJEE, JOE and JO.", test: w => swapIn(w, "GJ") },
  { id: "isize", name: "-ISE and -IZE pairs", len: 7, blurb: "Both spellings are good, like EROTISE, RIOTISE and EROTISED.", test: w => w.length <= 9 && /IS(E|ED|ES|ING)$/.test(w) && DICT.has(w.replace(/IS(E|ED|ES|ING)$/, "IZ$1")) },
  { id: "ouror", name: "-OUR and -OR pairs", len: 6, blurb: "Both spellings are good, like FAITOUR, ODOUR and VALOUR.", test: w => lenIn(w, 5, 9) && /OURS?$/.test(w) && DICT.has(w.replace(/OUR(S?)$/, "OR$1")) },
  { id: "reer", name: "-RE and -ER pairs", len: 6, blurb: "Both spellings are good, like ONEYRE, GOITRES and TENDRES.", test: w => lenIn(w, 5, 9) && /[^AEIOU]RES?$/.test(w) && DICT.has(w.replace(/RE(S?)$/, "ER$1")) },
  { sect: "Word types and origins" },
  { id: "interj", name: "Interjections", len: 3, blurb: "Words you say out loud, 6 letters or fewer, like AIYEE, ER and JAI.", test: (w, e) => w.length <= 6 && e.d.includes("[interj]") },
  { id: "scots", name: "Scots words", len: 4, blurb: "6 letters or fewer, like JOE, AWEE and OORIE.", test: (w, e) => w.length <= 6 && /\bScots\b/.test(e.d) },
  { id: "aus", name: "Australian words", len: 4, blurb: "7 letters or fewer, like YOWIE, HOVEA and NOVATED.", test: (w, e) => w.length <= 7 && e.d.includes("Australian") },
  { id: "jap", name: "Japanese words", len: 4, blurb: "7 letters or fewer, like AYU, UME and ROJI.", test: (w, e) => w.length <= 7 && e.d.includes("Japanese") },
  { id: "safr", name: "South African words", len: 4, blurb: "Like ZOL, VROT and TOEBIE.", test: (w, e) => e.d.includes("South African") },
  { id: "arch", name: "Archaic short words", len: 3, blurb: "4 letters or fewer, marked archaic, like OD, EFT and HIE.", test: (w, e) => w.length <= 4 && /archaic/.test(e.d) },
  { id: "slang", name: "Slang short words", len: 3, blurb: "5 letters or fewer, like WOF, ZOL and PEE.", test: (w, e) => w.length <= 5 && /slang/.test(e.d) },
  { id: "new4", name: "New in CSW24, 2 to 5 letters", len: 4, blurb: "The short words added in this edition, like OWO, OUTIE and AENEI.", test: (w, e) => e.n && w.length <= 5 },
  { sect: "Other" },
  { id: "new", name: "New in CSW24", blurb: "The 1,816 words added in this edition.", test: (w, e) => e.n },
  { id: "palin", name: "Palindromes", blurb: "Words that read the same backwards, like TAT and REDDER.", test: w => w.length >= 3 && w === [...w].reverse().join("") },
  { id: "rev", name: "Words that reverse to a word", len: 4, blurb: "Read backwards it's another word, like ODA, ADO and ATE.", test: w => w.length >= 3 && w !== rev(w) && DICT.has(rev(w)) },
  { id: "abc", name: "Letters in ABC order", len: 4, blurb: "Every letter in alphabetical order, like AGIO, ALOO and AITU.", test: w => w.length >= 4 && w === alpha(w) },
  { id: "cba", name: "Letters in reverse ABC order", len: 4, blurb: "Like OGEE, TOONIE and TOEA.", test: w => w.length >= 4 && w === [...alpha(w)].reverse().join("") },
  { id: "shortk", name: "Short K words", len: 3, blurb: "3 and 4 letters, like OKA, OKE and KAIE.", test: w => lenIn(w, 3, 4) && w.includes("K") },
  { id: "shortw", name: "Short W words", len: 3, blurb: "3 and 4 letters, like EWE, OWIE and OWE.", test: w => lenIn(w, 3, 4) && w.includes("W") },
  { id: "shorty", name: "Short Y words", len: 3, blurb: "3 and 4 letters, like OYE, AYU and AYE.", test: w => lenIn(w, 3, 4) && w.includes("Y") },
  { id: "shortf", name: "Short F words", len: 3, blurb: "3 and 4 letters, like FEE, EFT and OFT.", test: w => lenIn(w, 3, 4) && w.includes("F") },
  { id: "shorth", name: "Short H words", len: 3, blurb: "3 and 4 letters, like OHIA, AHI and AHA.", test: w => lenIn(w, 3, 4) && w.includes("H") },
];
const groupOf = id => id ? GROUPS.find(g => g.id === id) : undefined;
const cache = {};
const groupWords = g => cache[g.id] ||= (g.special === "stems" ? stems(g.n).map(s => s.stem) : ALL.filter(w => g.test(w, DICT.get(w))));
function stems(n) {
  if (cache["stemdata" + n]) return cache["stemdata" + n];
  const m = new Map();
  for (const w of BYLEN[n + 1]) {
    const a = alpha(w), seen = new Set();
    for (let i = 0; i < a.length; i++) {
      if (seen.has(a[i])) continue; seen.add(a[i]);
      const s = a.slice(0, i) + a.slice(i + 1);
      (m.get(s) || m.set(s, new Set()).get(s)).add(w);
    }
  }
  return cache["stemdata" + n] = [...m].map(([stem, set]) => ({ stem, n: set.size, words: [...set] })).sort((a, b) => b.n - a.n).slice(0, 150);
}
function groupOptions(selected, withSpecial) {
  let html = "", open = false;
  for (const g of GROUPS) {
    if (g.sect) { html += `${open ? "</optgroup>" : ""}<optgroup label="${g.sect}">`; open = true; }
    else if (withSpecial || !g.special) html += `<option value="${g.id}" ${g.id === selected ? "selected" : ""}>${esc(g.name)}</option>`;
  }
  return html + "</optgroup>";
}

// ---------- shared rendering ----------
function defHTML(d) {
  return d.split(" / ").map(part => {
    const m = part.match(/^(.*?)(\s*\[[^\]]+\])?$/);
    const body = esc(m[1]).replace(/\b[A-Z]{2,15}\b/g, x => DICT.has(x) ? `<a href="#w/${x}">${x}</a>` : x);
    return `<span>${body}${m[2] ? ` <span class="pos">${esc(m[2].trim())}</span>` : ""}</span>`;
  }).join("<br>");
}
const hookText = (letters, nw) => [...letters].map(h => nw.includes(h) ? `${h}<sup title="new hook in CSW24">+</sup>` : h).join("");
const chip = w => `<a class="w" href="#w/${w}" title="${esc(DICT.get(w)?.d)}">${w}${DICT.get(w)?.n ? "<sup>+</sup>" : ""}</a>`;
function tilesHTML(w, mini) {
  return `<div class="tiles${mini ? " mini" : ""}" style="--n:${w.length}">${[...w].map((c, i) => `<div class="tile" style="animation-delay:${i * 25}ms">${c}<sub>${VALUES[c]}</sub></div>`).join("")}</div>`;
}

// the letters a word has at the marked spots: the ? letters of a pattern or rack, or the one changed by a swap
const qLetters = (w, m) => m ? [...w].filter((c, i) => m[i]).join("") : "";
const SORTS = { prob: "Probability", alpha: "A–Z", len: "Length", score: "Points", play: "Playability" };
const sorters = {
  prob: (a, b) => a.length - b.length || DICT.get(a).p - DICT.get(b).p,
  alpha: (a, b) => a < b ? -1 : 1,
  len: (a, b) => a.length - b.length || (a < b ? -1 : 1),
  score: (a, b) => score(b) - score(a) || (a < b ? -1 : 1),
  play: (a, b) => DICT.get(a).pl - DICT.get(b).pl,
};
// the order Quiz and Practice go through their words. Racks (alphagrams) go by their most likely or most played
// word; probability and playability ranks count within each length, so shorter words come first
// Anagrams puts racks with the most words first (then by probability); rev turns any order but Random round
const ORDERS = { rand: "Random", prob: "Probability", alpha: "A–Z", play: "Playability", ana: "Anagrams" };
function ordered(xs, order, racks, rev) {
  if (!ORDERS[order] || order === "rand") return shuffle(xs);
  let out;
  if (order === "alpha") out = [...xs].sort((a, b) => a < b ? -1 : 1);
  else {
    const best = (x, f) => Math.min(...(racks ? ANA.get(x) : [x]).map(w => DICT.get(w)[f]));
    const k = new Map(xs.map(x => [x, order === "ana" ? best(x, "p") - (racks ? ANA.get(x) : anagrams(x)).length * 1e7 : best(x, order === "prob" ? "p" : "pl")]));
    out = [...xs].sort((a, b) => (order === "ana" ? 0 : a.length - b.length) || k.get(a) - k.get(b));
  }
  return rev ? out.reverse() : out;
}
const orderText = (order, rev) => `${ORDERS[order] || ORDERS.rand} order${rev && order !== "rand" ? ", reversed" : ""}`;
const orderPick = (id, v, rev) => `<div class="seg" id="${id}">${Object.entries(ORDERS).map(([k, t]) => `<button type="button" class="btn sm ${k === (v || "rand") ? "on" : ""}" data-order="${k}">${t}</button>`).join("")}<button type="button" class="btn sm ${rev && v !== "rand" ? "on" : ""}" data-rev aria-pressed="${!!rev}" ${!v || v === "rand" ? "disabled" : ""}>⇅ Reverse</button></div>`;
let lastResults = [];
// going back to a list, search or My words puts you where you were: the scroll position, plus each results
// list's length chips and page (kept per page and word count, for this visit to the site)
const scrollMem = store.get("scrollMem", {}), resMem = {};
let curHash = location.hash, pendingScroll = 0;
function restoreScroll() {
  if (pendingScroll && document.documentElement.scrollHeight - innerHeight >= pendingScroll - 4) { window.scrollTo(0, pendingScroll); pendingScroll = 0; }
}
// words come a page at a time: 10, 25, 50 or 100 to a page, picked under the words or in Settings
const PER_PAGE = [10, 25, 50, 100];
const perPage = () => PER_PAGE.includes(+SET.pageSize) ? +SET.pageSize : 50;
const pagerHTML = (page, pages, n) => `<div class="pager" role="navigation" aria-label="Pages">
    <button type="button" class="pg-ar" data-page="${page - 1}" ${page ? "" : "disabled"} aria-label="Previous page"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
    <span class="pg-n">Page <b>${page + 1}</b> of ${pages.toLocaleString()}</span>
    <button type="button" class="pg-ar" data-page="${page + 1}" ${page + 1 < pages ? "" : "disabled"} aria-label="Next page"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>
    <span class="pg-per" role="group" aria-label="Words per page">${PER_PAGE.map(k => `<button type="button" class="${k === n ? "on" : ""}" data-per="${k}">${k}</button>`).join("")}</span></div>`;
// a new page starts at the top of el
const pageTop = el => { const y = el.getBoundingClientRect().top + scrollY - (document.querySelector("header")?.offsetHeight || 0) - 8; if (scrollY > y) scrollTo(0, y); };
// any other list a page at a time, with the same pager: head (toolbar and so on) stays at the top, each item is
// drawn by draw(item, index) inside a div of class wrap (when given), and the page is kept for this visit like a results list's
function pagedList(el, items, draw, head = "", wrap = "") {
  const mem = resMem[location.hash + ":p" + items.length] ||= { page: 0 };
  const show = () => {
    const per = perPage(), pages = Math.max(1, Math.ceil(items.length / per)); mem.page = Math.min(mem.page, pages - 1);
    const at = mem.page * per;
    const rows = items.slice(at, at + per).map((x, i) => draw(x, at + i)).join("");
    el.innerHTML = head + (wrap ? `<div class="${wrap}">${rows}</div>` : rows) + (items.length > PER_PAGE[0] ? pagerHTML(mem.page, pages, per) : "");
    el.querySelectorAll("[data-page]").forEach(b => b.onclick = () => { mem.page = +b.dataset.page; show(); pageTop(el); });
    el.querySelectorAll("[data-per]").forEach(b => b.onclick = () => { const first = mem.page * per; saveSettings({ pageSize: +b.dataset.per }); mem.page = Math.floor(first / +b.dataset.per); show(); });
    el.dispatchEvent(new Event("paged"));
  };
  show();
}
// Results component: toolbar (count, length chips, sort, toggles, actions) + rows + pages
function results(el, words, opts = {}) {
  // range = which ranks to show, counted in the current sort order (e.g. 1–100 or 30–50); the rows shown are numbered from 1
  const mem = resMem[location.hash + ":" + words.length] ||= {};
  const lens = [...new Set(words.map(w => w.length))].sort((a, b) => a - b);
  const st = { sel: null, lens: new Set((mem.lens || (opts.len ? [opts.len] : [])).filter(n => lens.includes(n) && lens.length > 1)), page: mem.page || 0, from: +opts.range?.from || 0, to: +opts.range?.to || 0 };
  let first = true, shownList = [];
  function draw() {
    // "? letter" sorts by what the ? stands for (A to Z, then by probability); it's offered only when results have one
    const hasQ = !!opts.masks?.size, byQ = hasQ && SET.sort === "blank";
    const qOf = w => qLetters(w, opts.masks.get(w));
    // Hide crossed off leaves out the words ticked as known (they still count everywhere else)
    const hideK = SET.hideKnown ? new Set(getKnown()) : null, nHid = hideK ? words.filter(w => hideK.has(w) && (!st.lens.size || st.lens.has(w.length))).length : 0;
    const full = (st.lens.size ? words.filter(w => st.lens.has(w.length)) : [...words]).filter(w => !hideK?.has(w)).sort(byQ ? (a, b) => (qOf(a) < qOf(b) ? -1 : qOf(a) > qOf(b) ? 1 : 0) || sorters.prob(a, b) : sorters[SET.sort] || sorters.prob);
    // grouped results (one-letter swaps): each group together under its heading, in the sort order within it
    const G = opts.groups, gw = {};
    if (G) { full.sort((a, b) => G.by(a) - G.by(b)); for (const w of full) (gw[G.by(w)] ||= []).push(w); }
    const ranged = st.from > 1 || st.to > 0;
    const lo = Math.max(1, st.from || 1), hi = st.to ? Math.max(st.to, lo) : full.length;
    const list = ranged ? full.slice(lo - 1, hi) : full;
    lastResults = shownList = list;
    const per = perPage(), pages = Math.max(1, Math.ceil(list.length / per));
    st.page = Math.min(st.page, pages - 1);
    const at = st.page * per, view = list.slice(at, at + per);
    const starSet = new Set(getStars()), knownSet = new Set(getKnown()), allStarred = list.length > 0 && list.every(w => starSet.has(w));
    const total = st.lens.size ? `${full.length.toLocaleString()} ${[...st.lens].sort((a, b) => a - b).join(", ")}-letter words <span class="small">(${words.length.toLocaleString()} in all)</span>` : `${full.length.toLocaleString()} word${full.length === 1 ? "" : "s"}`;
    el.innerHTML = `
      <div class="toolbar">
        <span class="count">${ranged ? `Words ${lo.toLocaleString()}–${Math.min(hi, full.length).toLocaleString()} <span class="small">of ${total}</span>` : total}</span>
        <select id="sortSel" aria-label="Sort by">${Object.entries(hasQ ? { ...SORTS, blank: "? letter" } : SORTS).map(([k, v]) => `<option value="${k}" ${k === SET.sort ? "selected" : ""}>Sort: ${v}</option>`).join("")}</select>
        <label class="check small"><input type="checkbox" id="defChk" ${SET.defs ? "checked" : ""}> Definitions</label>
        <label class="check small"><input type="checkbox" id="agChk" ${SET.ags ? "checked" : ""}> Alphagrams</label>
        <label class="check small"><input type="checkbox" id="saChk" ${SET.sas ? "checked" : ""}> Sound-alikes</label>
        <label class="check small"><input type="checkbox" id="plChk" ${SET.plays ? "checked" : ""}> Playability</label>
        <label class="check small"><input type="checkbox" id="hkChk" ${SET.hideKnown ? "checked" : ""}> Hide crossed off${nHid ? ` (${nHid.toLocaleString()})` : ""}</label>
        <div class="tacts"><button class="btn sm" id="quizThese">Quiz these</button>
        <button class="btn sm" id="practiceThese">Practice these</button>
        <button class="btn sm" id="starAll">${allStarred ? "Unstar all" : "Star all"}</button>
        <button class="btn sm" id="toFolder">Add to folder</button>
        <button class="btn sm ${st.sel ? "on" : ""}" id="selBtn">Select</button></div>
      </div>
      <div class="row rangebar">
        <span class="small">Show</span>
        <button class="btn sm ${ranged ? "" : "on"}" data-top="0">All</button>
        ${[30, 50, 100].map(n => `<button class="btn sm ${st.from <= 1 && st.to === n ? "on" : ""}" data-top="${n}">${n}</button>`).join("")}
        <span class="small">or</span>
        <input id="rFrom" inputmode="numeric" placeholder="1" value="${st.from || ""}" aria-label="From rank">
        <span class="small">to</span>
        <input id="rTo" inputmode="numeric" placeholder="all" value="${st.to || ""}" aria-label="To rank">
        <span class="small">in ${SORTS[SET.sort] || "Probability"} order</span>
      </div>
      ${lens.length > 1 ? `<div class="chips" style="margin:10px 0 6px"><button class="btn sm ${st.lens.size ? "" : "on"}" data-len="0">All lengths</button>${lens.map(n => `<button class="btn sm ${st.lens.has(n) ? "on" : ""}" data-len="${n}">${n}</button>`).join("")}</div>` : ""}
      ${list.length ? `<div class="rows ${st.sel ? "selecting" : ""} ${ranged ? "ranked" : ""} ${SET.defs ? "" : "nodefs"} ${SET.ags ? "" : "noags"} ${SET.sas ? "sashow" : ""} ${SET.prob ? "" : "noprob"} ${SET.sort === "play" ? "byplay" : ""} ${SET.plays ? "plshow" : ""} ${SET.hooks ? "" : "nohooks"}">${view.map((w, i) => (G && (!i || G.by(w) !== G.by(view[i - 1])) ? `<h3 class="rhead">${G.name(G.by(w), gw[G.by(w)])}<span class="small">${gw[G.by(w)].length}</span></h3>` : "") + rowHTML(w, opts.masks?.get(w), ranged ? at + i + 1 : 0, starSet, knownSet, st.sel?.has(w))).join("")}</div>` : `<p class="empty" style="margin-top:10px">${ranged && full.length ? `There are only ${full.length.toLocaleString()} words, so rank ${lo.toLocaleString()} is past the end.` : "No words match."}</p>`}
      ${list.length > PER_PAGE[0] ? pagerHTML(st.page, pages, per) : ""}
      ${st.sel ? `<div class="selbar"><span class="count" id="selN"></span><button class="btn sm" id="selAll"></button><button class="btn sm primary" id="selFolder">Add to folder</button><button class="btn sm" id="selStar">☆ Star</button><button class="btn sm" id="selKnown">✓ Cross off</button><button class="btn sm" id="selDone">Done</button></div>` : ""}`;
    // length chips: tap several to see them together; All lengths clears them
    el.querySelectorAll("[data-len]").forEach(b => b.onclick = () => {
      const n = +b.dataset.len; if (!n) st.lens.clear(); else st.lens.has(n) ? st.lens.delete(n) : st.lens.add(n);
      st.page = mem.page = 0; mem.lens = [...st.lens]; draw();
    });
    const setRange = (from, to) => {
      from = Math.max(0, parseInt(from) || 0); to = Math.max(0, parseInt(to) || 0);
      if (from && to && to < from) [from, to] = [to, from];
      st.from = from; st.to = to; st.page = mem.page = 0; opts.range?.save?.(from || "", to || ""); draw();
    };
    el.querySelectorAll("[data-top]").forEach(b => b.onclick = () => setRange(0, +b.dataset.top));
    for (const id of ["#rFrom", "#rTo"]) {
      el.querySelector(id).onchange = () => setRange(el.querySelector("#rFrom").value, el.querySelector("#rTo").value);
      el.querySelector(id).onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); e.target.dispatchEvent(new Event("change")); } };
    }
    el.querySelector("#sortSel").onchange = e => { saveSettings({ sort: e.target.value }); st.page = mem.page = 0; draw(); };
    el.querySelector("#hkChk").onchange = e => { saveSettings({ hideKnown: e.target.checked }); st.page = mem.page = 0; draw(); };
    el.querySelector("#defChk").onchange = e => { saveSettings({ defs: e.target.checked }); el.querySelector(".rows")?.classList.toggle("nodefs", !SET.defs); };
    el.querySelector("#agChk").onchange = e => { saveSettings({ ags: e.target.checked }); el.querySelector(".rows")?.classList.toggle("noags", !SET.ags); };
    el.querySelector("#plChk").onchange = e => { saveSettings({ plays: e.target.checked }); el.querySelector(".rows")?.classList.toggle("plshow", SET.plays); };
    el.querySelector("#saChk")?.addEventListener("change", e => { saveSettings({ sas: e.target.checked }); el.querySelector(".rows")?.classList.toggle("sashow", SET.sas); });
    // a new page starts at the top of the words; a new page size keeps the first word that was showing
    el.querySelectorAll("[data-page]").forEach(b => b.onclick = () => { st.page = mem.page = +b.dataset.page; draw(); pageTop(el); });
    el.querySelectorAll("[data-per]").forEach(b => b.onclick = () => { const first = st.page * per; saveSettings({ pageSize: +b.dataset.per }); st.page = mem.page = Math.floor(first / +b.dataset.per); draw(); });
    el.querySelector("#quizThese").onclick = () => { quizSetup.source = "last"; quizSetup.lens = []; quizSetup.starOnly = false; location.hash = "quiz"; };
    el.querySelector("#practiceThese").onclick = () => { store.set("pLast", [...lastResults]); saveSettings({ practice: { ...PO_DEFAULT, mode: SET.practice?.mode || "anagram", order: SET.practice?.order || "rand", rev: !!SET.practice?.rev, src: "my:last", lens: [] } }); location.hash = "practice"; };
    el.querySelector("#toFolder").onclick = () => folderSheet(list, () => { st.sel = new Set(); draw(); });
    el.querySelector("#selBtn").onclick = () => { st.sel = st.sel ? null : new Set(); draw(); };
    if (st.sel) {
      const picked = () => list.filter(w => st.sel.has(w));
      el.querySelector("#selAll").onclick = () => { const all = picked().length === list.length; st.sel = new Set(all ? [] : list); el.querySelectorAll(".rows .r").forEach(r => r.classList.toggle("sel", !all)); selBar(); };
      el.querySelector("#selFolder").onclick = () => picked().length && folderSheet(picked());
      // star or cross off the picked words; if they all already are, undo it for them
      const mark = (key, get) => { const p = picked(); if (!p.length) return; const had = new Set(get()), all = p.every(w => had.has(w)); store.set(key, all ? get().filter(w => !st.sel.has(w)) : [...p.filter(w => !had.has(w)), ...get()]); draw(); };
      el.querySelector("#selStar").onclick = () => mark("stars", getStars);
      el.querySelector("#selKnown").onclick = () => mark("known", getKnown);
      el.querySelector("#selDone").onclick = () => { st.sel = null; draw(); };
      selBar();
    }
    // Star all / Unstar all for exactly the rows in view (after the length and rank filters)
    el.querySelector("#starAll").onclick = () => { const s = getStars(), inList = new Set(list); store.set("stars", allStarred ? s.filter(w => !inList.has(w)) : [...list.filter(w => !starSet.has(w)), ...s]); draw(); };
    if (first) { first = false; restoreScroll(); pendingScroll = 0; }
  }
  function selBar() {
    const n = shownList.filter(w => st.sel.has(w)).length;
    el.querySelector("#selN").textContent = `${n.toLocaleString()} picked`;
    el.querySelector("#selAll").textContent = n && n === shownList.length ? "Clear" : `All ${shownList.length.toLocaleString()}`;
    for (const id of ["#selFolder", "#selStar", "#selKnown"]) el.querySelector(id).disabled = !n;
  }
  // while picking, tapping a row picks it instead of opening the word
  el.addEventListener("click", ev => {
    const r = st.sel && ev.target.closest(".rows .r[data-go]");
    if (!r) return;
    ev.preventDefault(); ev.stopPropagation();
    const w = r.dataset.go, on = !st.sel.has(w);
    on ? st.sel.add(w) : st.sel.delete(w);
    r.classList.toggle("sel", on); selBar();
  }, true);
  draw();
}
const knownBtn = (w, on) => `<button type="button" class="kn ${on ? "on" : ""}" data-known="${w}" title="${on ? "Not known yet" : "Cross off: I know it"}" aria-label="${on ? "Uncross" : "Cross off"} ${w}" aria-pressed="${on}">✓</button>`;
const starBtn = (w, on) => `<button type="button" class="st ${on ? "on" : ""}" data-star="${w}" title="${on ? "Unstar" : "Star"}" aria-label="Star ${w}">${on ? "★" : "☆"}</button>`;
function rowHTML(w, mask, rank, stars = new Set(getStars()), known = new Set(getKnown()), sel = false) {
  const e = DICT.get(w);
  const sa = soundAlikes(w);
  const label = mask ? [...w].map((c, i) => mask[i] ? `<mark>${mask[i] === "up" ? c : c.toLowerCase()}</mark>` : c).join("") : w;
  const q = qLetters(w, mask);
  const saL = sa.length ? `<span class="sa" data-swap="${w}" role="link" title="All one-letter swaps of ${w}">sounds like <b>${sa.join(", ")}</b> ›</span>` : "";
  return `<div class="r${known.has(w) ? " known" : ""}${sel ? " sel" : ""}" data-go="${w}">${rank ? `<span class="rk">${rank}.</span>` : ""}<span class="meta"><span class="mp">#${e.p.toLocaleString()}</span><span class="mpl" title="Playability rank">pl ${e.pl.toLocaleString()}</span></span><span class="fh">${hookText(e.fh, e.fhNew)}</span><span class="wb"><span class="wl">${label}${e.n ? "<sup>+</sup>" : ""}${q ? `<span class="ql" title="The ? letter${q.length > 1 ? "s" : ""}">?=${[...q].join(" ")}</span>` : ""}<span class="ag">${alpha(w)}</span></span><span class="bh">${hookText(e.bh, e.bhNew)}</span></span><span class="d">${esc(e.d)}</span><span class="ra">${knownBtn(w, known.has(w))}${starBtn(w, stars.has(w))}</span>${saL}</div>`;
}

