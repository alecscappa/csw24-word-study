// Usage: node tests/logic.js   (from the project folder; needs words.js and ~/Zyzzyva/lexicons/CSW24.db)
// Independent audit: every site function vs a brute-force reference, with the Zyzzyva DB as ground truth.
const fs=require('fs'); const {DatabaseSync}=require('node:sqlite');
const el=()=>new Proxy({},{get:(t,k)=>k in t?t[k]:(k==='querySelectorAll'?()=>[]:k==='classList'?{toggle(){}}:k==='style'?{setProperty(){}}:k==='dataset'?{}:typeof k==='string'&&/^(addEventListener|focus)$/.test(k)?()=>{}:k==='querySelector'?()=>el():undefined),set:(t,k,v)=>(t[k]=v,true)});
global.window=global; global.location={hash:''}; const LS={'csw24:search':JSON.stringify({newOnly:true,power:true,pattern:''})}; global.localStorage={getItem:k=>LS[k]??null,setItem:(k,v)=>LS[k]=v};
global.matchMedia=()=>({matches:false,addEventListener(){}});
global.document={documentElement:el(),querySelector:()=>el(),querySelectorAll:()=>[],addEventListener(){},createElement:()=>el()};
global.addEventListener=()=>{}; global.scrollTo=()=>{};
const path=require('path'), os=require('os'); const ROOT=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8'); const app=html.slice(html.lastIndexOf('<script>')+8, html.lastIndexOf('</script>'));
eval(fs.readFileSync(path.join(ROOT,'words.js'),'utf8')); eval(app+`
const db=new DatabaseSync(process.argv[2]||path.join(os.homedir(),'Zyzzyva/lexicons/CSW24.db'),{readOnly:true});
let fails=0, checks=0; const issues=[];
const ok=(name,cond,detail='')=>{checks++; if(!cond){fails++; issues.push(name+(detail?' :: '+detail:''));}};
const same=(name,a,b)=>{const A=[...a].sort(),B=[...b].sort(); const d1=A.filter(x=>!B.includes(x)).slice(0,5), d2=B.filter(x=>!A.includes(x)).slice(0,5); ok(name, A.length===B.length&&d1.length===0, 'site '+A.length+' vs ref '+B.length+' extra:'+d1+' missing:'+d2);};
let seed=7; const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647; const pick=a=>a[Math.floor(rnd()*a.length)];
const srt=w=>w.split('').sort().join('');
const S=o=>runSearch({...SEARCH_DEFAULT,...o});

// 1. data matches the database
const rows=db.prepare('select word,definition d,front_hooks fh,back_hooks bh,lexicon_symbols sym,probability_order0 p from words').all();
ok('word count', rows.length===DICT.size, rows.length+' vs '+DICT.size);
let bad=0; for(const r of rows){const e=DICT.get(r.word); if(!e||e.d!==(r.d||'')||e.fh!==(r.fh||'').replace(/[+]/g,'')||e.bh!==(r.bh||'').replace(/[+]/g,'')||e.fhNew+e.bhNew!==((r.fh||'')+'|'+(r.bh||'')).split('|').map(h=>(h.match(/[a-z](?=[+])/g)||[]).join('')).join('')||e.n!==(r.sym==='+')||e.p!==r.p) bad++;} ok('every row matches DB',bad===0,bad+' mismatched');
// 2. hooks recomputed from the word list itself
let hb=0; for(const [w,e] of DICT){const f=[...AZ].filter(L=>DICT.has(L+w)).join('').toLowerCase(), b=[...AZ].filter(L=>DICT.has(w+L)).join('').toLowerCase(); if(srt(f)!==srt(e.fh)||srt(b)!==srt(e.bh)){if(hb<3)issues.push('hook sample '+w+' db '+e.fh+'/'+e.bh+' computed '+f+'/'+b);hb++;}} ok('hooks consistent with word list',hb===0,hb+' words');
// 3. probability ranks: 1..N per length, used for top-N filter
for(const n in BYLEN){const ps=BYLEN[n].map(w=>DICT.get(w).p); ok('prob ranks length '+n+' within 1..'+ps.length, Math.max(...ps)<=ps.length*1.0+0 && Math.min(...ps)>=1, 'max '+Math.max(...ps));}
// 4. anagrams / add / drop letter vs brute force
const byAlpha={}; for(const w of ALL)(byAlpha[srt(w)]||=[]).push(w);
for(let i=0;i<300;i++){const w=pick(ALL); same('anagrams '+w, anagrams(w), ALL.filter(x=>x.length===w.length&&srt(x)===srt(w)));
  same('plusOne '+w, plusOne(w).flatMap(g=>g[1]), [...new Set([...AZ].flatMap(L=>byAlpha[srt(w+L)]||[]))]);
  same('minusOne '+w, minusOne(w).flatMap(g=>g[1]), [...new Set([...w].flatMap((_,j)=>byAlpha[srt(w.slice(0,j)+w.slice(j+1))]||[]))]);}
// 5. rack searches vs brute force
const canMake=(w,rack,blanks)=>{const c={};for(const ch of rack)c[ch]=(c[ch]||0)+1;let need=0;for(const ch of w){if(c[ch]>0)c[ch]--;else need++;}return need<=blanks;};
for(let i=0;i<40;i++){const base=pick(BYLEN[7]); for(const b of [0,1,2]){const letters=base.slice(0,7-b), rack=letters+'?'.repeat(b);
  same('exact '+rack, S({rack}).words, ALL.filter(w=>w.length===7&&canMake(w,letters,b)));}}
for(let i=0;i<15;i++){const r=pick(BYLEN[7]).slice(0,6)+'?'; same('build '+r, S({rack:r,mode:'build'}).words, ALL.filter(w=>w.length<=7&&canMake(w,r.slice(0,6),1)));}
for(let i=0;i<15;i++){const r=pick(BYLEN[4]).slice(0,3); same('super '+r, S({rack:r,mode:'super'}).words, ALL.filter(w=>{const c={};for(const ch of w)c[ch]=(c[ch]||0)+1;return [...r].every(ch=>c[ch]-->0)}));}
// blank highlight: mask marks exactly the letters not covered by the rack
{const r=S({rack:'QI?'}); for(const w of r.words){const m=r.masks.get(w); ok('mask '+w, m && m.filter(Boolean).length===1);}}
// 6. pattern vs hand-written matcher
const match=(w,p)=>{const go=(i,j)=>{if(j===p.length)return i===w.length; const c=p[j]; if(c==='*'){for(let k=i;k<=w.length;k++)if(go(k,j+1))return true;return false;} if(c==='['){const end=p.indexOf(']',j);const set=p.slice(j+1,end);const neg=set[0]==='^';const s=neg?set.slice(1):set; if(i>=w.length)return false; if(neg===s.includes(w[i]))return false; return go(i+1,end+1);} if(i>=w.length)return false; if(c==='.'||c==='?'||c===w[i])return go(i+1,j+1); return false;}; return go(0,0);};
for(const p of ['Q*','*Q','.A.E','?A?E','*ZZ*','[JQXZ]..','[^S]*S','A*[AEIOU]','*[^AEIOU][^AEIOU][^AEIOU][^AEIOU]*','..','QI*','*IUM','R.*.S','[.]A','[A.]B','[^.]A','A[?]*']) same('pattern '+p, (S({pattern:p}).words||[]), ALL.filter(w=>match(w,p)));
// 7. letter filters vs brute force
const cnt=(w,c)=>w.split(c).length-1;
const cases=[{starts:'UN',min:'7',max:'7'},{ends:'ZA'},{contains:'QI'},{incl:'VV'},{incl:'ZZ',max:'6'},{excl:'AEIOU',min:'5'},{starts:'OUT',ends:'S',min:'8',max:'8'},{min:'9',max:'3'},{def:'fish',min:'4',max:'4'},{def:'Hindu'},{top:'500',min:'7',max:'7'}];
for(const c of cases){ const ref=ALL.filter(w=>{const e=DICT.get(w); return (!c.starts||w.startsWith(c.starts))&&(!c.ends||w.endsWith(c.ends))&&(!c.contains||w.includes(c.contains))&&(!c.incl||[...new Set(c.incl)].every(ch=>cnt(w,ch)>=cnt(c.incl,ch)))&&(!c.excl||![...w].some(ch=>c.excl.includes(ch)))&&(!c.min||w.length>=+c.min)&&(!c.max||w.length<=+c.max)&&(!c.def||e.d.toLowerCase().includes(c.def.toLowerCase()))&&(!c.top||e.p<=+c.top)}); same('filters '+JSON.stringify(c), S(c).words, ref);}
// 8. every group: search == list == brute force, and stated counts/claims in blurbs
for(const g of GROUPS) if(g.test){ same('group '+g.id, S({group:g.id}).words, ALL.filter(w=>g.test(w,DICT.get(w)))); same('group+filter '+g.id, S({group:g.id,min:'4',max:'5',excl:'S'}).words, ALL.filter(w=>w.length>=4&&w.length<=5&&!w.includes('S')&&g.test(w,DICT.get(w)))); }
for(const g of GROUPS) if(g.blurb){ const nums=(g.blurb.match(/\\b\\d{1,3}(,\\d{3})+\\b|\\bAll (\\d+)/g)||[]); for(const n of nums){ const v=+n.replace(/\\D/g,''); if(g.test && !/most probable/.test(g.blurb)) ok('blurb count '+g.id+' says '+n, groupWords(g).length===v, 'actual '+groupWords(g).length);} 
  const ex=(g.blurb.match(/\\b[A-Z]{2,}\\b/g)||[]).filter(x=>!['AEIOU','RE','UN','OUT','OVER','DIS','ING','IER','IEST','III','OOO','JQXZ','AND'].includes(x)); for(const x of ex) if(g.test) ok('blurb example '+g.id+' '+x+' is in group', DICT.has(x)&&g.test(x,DICT.get(x)), DICT.has(x)?'valid but not in group':'NOT A VALID WORD'); }
// 9. stems: count == distinct bingos, top stem really is the max (brute force over all 6-letter alphagram leaves)
for(const n of [6,7]){ const st=stems(n); for(const s of st.slice(0,20)) ok('stem '+s.stem+' count', s.n===plusOne(s.stem).reduce((a,g)=>a+g[1].length,0)); 
  const m=new Map(); for(const w of BYLEN[n+1]){const a=srt(w); for(let i=0;i<a.length;i++){const k=a.slice(0,i)+a.slice(i+1); (m.get(k)||m.set(k,new Set()).get(k)).add(w);}} let best=0; for(const s of m.values()) if(s.size>best) best=s.size; ok('stems'+n+' top is max', st[0].n===best, st[0].n+' vs '+best); }
// 10. hook buttons on word pages always lead to valid words
let hk=0; for(const [w,e] of DICT){for(const h of e.fh) if(!DICT.has(h.toUpperCase()+w)) hk++; for(const h of e.bh) if(!DICT.has(w+h.toUpperCase())) hk++;} ok('hook links valid',hk===0,hk);
// 11. quiz: phonies are never valid; anagram dedupe; def mode skips "<" defs; hooks grading
for(let i=0;i<2000;i++){const w=pick(ALL); const p=makePhony(w); if(p) ok('phony '+p+' invalid', !DICT.has(p));}
{const q=buildQuestions(BYLEN[7],'anagram',200); ok('anagram quiz unique racks', new Set(q.map(x=>srt(x.w))).size===q.length);}
{const q=buildQuestions(ALL,'def',300); ok('def quiz no "<" defs', q.every(x=>!DICT.get(x.w).d.startsWith('<')));}
{SET.phony=50; const q=buildQuestions(BYLEN[5],'phony',400); const share=q.filter(x=>x.phony).length/q.length; ok('phony share ~50% ('+share.toFixed(2)+')', share>0.4&&share<0.6);}
// 12. random word lengths always exist
for(let n=2;n<=15;n++) ok('BYLEN '+n, BYLEN[n]?.length>0);
// 13. sorters are consistent (no NaN / non-transitive)
for(const k in sorters){ const s=[...BYLEN[5].slice(0,2000)].sort(sorters[k]); let o=true; for(let i=1;i<s.length;i++) if(sorters[k](s[i-1],s[i])>0) o=false; ok('sort '+k+' ordered', o);}
// 14. stale saved search keys from older versions
ok('old saved keys ignored', !('newOnly' in searchState) && !('power' in searchState), JSON.stringify(Object.keys(searchState)));
// 15. defHTML links
{const h=defHTML('< RETAIN, keep in one\\'s possession [v]'); ok('defHTML links RETAIN', h.includes('href="#w/RETAIN"'));}
{const nw=[...DICT.values()].filter(e=>e.fhNew||e.bhNew).length; ok('new hooks found ('+nw+')', nw>0); const ex=DICT.get('ABYE'); ok('ABYE back hooks d (new) and s', ex.bh==='ds'&&ex.bhNew==='d', ex.bh+'/'+ex.bhNew);}
console.log(checks+' checks, '+fails+' failed'); for(const i of issues.slice(0,40)) console.log(' - '+i); process.exitCode=fails?1:0;
`);
