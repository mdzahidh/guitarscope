// R4 gate suite — harmonic ancestry between adjacent strings.
//
// Same shape as tests/r3.test.js, and for the same reason: this file is RED until
// the R4.1–R4.4 wiring lands, and turning it green is the definition of "done".
// Three halves:
//   · block 0 — stringAncestry()/JUST_INTERVALS math, already green (landed with
//     the spec, so the builder inherits a reviewed detector rather than writing one);
//   · the copy — the frozen ancestry block is EXECUTED here against real block-0
//     math with only `esc`/`state` stubbed, so the assertions are about rendered
//     HTML, not about text that also appears in comments. Plus a SHA freeze;
//   · the wiring — source contracts for R4.1/R4.2/R4.3/R4.4, every one of them
//     scoped to the handler or the function body that must change, and every one
//     mutation-checked when written. Comments are stripped before matching: a
//     contract a comment can satisfy is not a contract (reviewer lesson, gate 3).
//
// Run: node tests/r4.test.js        (all of it via ./tests/verify.sh)

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const HTML_PATH = path.join(__dirname, "..", "index.html");
const html = fs.readFileSync(HTML_PATH, "utf8");

let passed = 0, failed = 0;
function ok(cond, name, detail) {
  if (cond) { passed++; console.log("  ok   " + name); }
  else { failed++; console.log("  FAIL " + name + (detail ? "  [" + detail + "]" : "")); }
}
function section(t) { console.log("\n" + t); }

// Drop // line comments (never inside a string literal in this codebase's style —
// every URL-ish literal here is a query hook, not a scheme) so a contract cannot be
// satisfied by prose about the contract.
function decomment(src) {
  return src.split("\n").map(l => l.replace(/(^|[\s;{}()])\/\/.*$/, "$1")).join("\n");
}

const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (!/function\s+stringAncestry/.test(blocks[0])) {
  console.error("script block 0 is not the DSP block — extraction pattern broke");
  process.exit(1);
}
const b4 = blocks[4] || "";

const tmp = path.join(os.tmpdir(), "rameau_r4_under_test.js");
fs.writeFileSync(tmp, blocks[0] + "\nmodule.exports={TUNINGS,tuningMidi,midiToFreq," +
  "stringAncestry,JUST_INTERVALS,isPow2,noteInfo};\n");
const D = require(tmp);

const TUNING_KEYS = ["estd", "eb", "dstd", "dropd", "dadgad"];

// --------------------------------------------------------------- block 0 ----
section("JUST_INTERVALS — only the classes docs/THEORY.md actually fixes");
{
  const have = Object.keys(D.JUST_INTERVALS).map(Number).sort((a, b) => a - b);
  ok(JSON.stringify(have) === JSON.stringify([0, 2, 3, 4, 5, 7, 8, 9, 10, 11]),
    "ten named classes; the minor second and the tritone are absent", have.join(","));
  ok(D.JUST_INTERVALS[1] === undefined && D.JUST_INTERVALS[6] === undefined,
    "no ratio is invented for the two classes THEORY declines to name");
  const named = { 0: "1/1", 2: "9/8", 3: "6/5", 4: "5/4", 5: "4/3",
                  7: "3/2", 8: "8/5", 9: "5/3", 10: "9/5", 11: "15/8" };
  ok(Object.entries(named).every(([pc, r]) =>
      D.JUST_INTERVALS[pc].n + "/" + D.JUST_INTERVALS[pc].d === r),
    "each ratio is THEORY's, not a nearby rational");
  ok([1, 2, 4, 8, 16, 1024].every(D.isPow2) &&
     ![0, 3, 6, 12, 5, -2, 1.5].some(D.isPow2),
    "isPow2 accepts only positive powers of two (6 is even, and not one)");
}

section("stringAncestry — a fourth read both ways (E2 → A2)");
{
  const up = D.stringAncestry(40, 45, 440);     // E2 up to A2
  ok(up && up.ratio.n === 4 && up.ratio.d === 3, "upward it is 4/3",
    up && up.ratio.n + "/" + up.ratio.d);
  ok(up.family === "common-ancestor",
    "the 3 in the denominator makes them cousins, not parent and child", up.family);
  ok(up.noteIsAncestor === true && up.lift === 2,
    "the numerator is a power of two: A2 IS the shared note, two octaves up");
  ok(Math.abs(up.ancestorHz - D.midiToFreq(40, 440) / 3) < 1e-9,
    "the shared fundamental is E2/3 = 27.47 Hz — an A, two octaves under the A string",
    up.ancestorHz.toFixed(4));
  ok(Math.abs(up.ancestorHz * 4 - D.midiToFreq(45, 440)) < 0.13,
    "and four of it is the A string, to within equal temperament's 2 ¢");

  const down = D.stringAncestry(45, 40, 440);   // A2 down to E2
  ok(down && down.ratio.n === 3 && down.ratio.d === 4, "downward it is 3/4",
    down && down.ratio.n + "/" + down.ratio.d);
  ok(down.family === "overtone" && down.drop === 2,
    "so the low E is harmonic 3 of the A, dropped two octaves");
  const just = D.midiToFreq(45, 440) * 3 / 4;
  ok(just > D.midiToFreq(40, 440) && just - D.midiToFreq(40, 440) < 0.1,
    "the just answer, 82.50 Hz, sits a whisker above the tempered 82.41",
    just.toFixed(2));
}

section("stringAncestry — the major third G3 → B3, and temperament");
{
  const t = D.stringAncestry(55, 59, 440);
  ok(t.ratio.n === 5 && t.ratio.d === 4 && t.family === "overtone" && t.drop === 2,
    "5/4: B is harmonic 5 of G, dropped two octaves");
  ok(Math.abs(t.centsFromJust - 13.686) < 0.01,
    "equal temperament renders it +13.7 ¢ sharp", t.centsFromJust.toFixed(3));
  ok(Math.abs(D.stringAncestry(50, 45, 440).centsFromJust + 1.955) < 0.01,
    "the fifth comes out −2 ¢, the fourth +2 ¢",
    D.stringAncestry(50, 45, 440).centsFromJust.toFixed(3));
  ok(Math.abs(D.stringAncestry(40, 45, 440).centsFromJust - 1.955) < 0.01,
    "and the fourth's sign is the fifth's, mirrored");
  ok(Math.abs(D.stringAncestry(55, 57, 440).centsFromJust + 3.910) < 0.01,
    "the whole tone is −4 ¢ against 9/8 (arithmetic from THEORY's ratio)",
    D.stringAncestry(55, 57, 440).centsFromJust.toFixed(3));
}

section("stringAncestry — octave and offset invariance");
{
  for (let oct = -2; oct <= 2; oct++) {
    const a = D.stringAncestry(40, 45 + 12 * oct, 440);
    if (oct === 0) continue;
    ok(a && a.pc === 5 && a.family === D.stringAncestry(40, 45, 440).family,
      "adding " + oct + " octave(s) keeps the interval class and the family");
  }
  let stable = true;
  for (let off = -4; off <= 4; off++) {
    const m = D.tuningMidi("estd", off);
    for (let i = 1; i < 6; i++) {
      const a = D.stringAncestry(m[i - 1], m[i], 440);
      const b = D.stringAncestry(D.tuningMidi("estd", 0)[i - 1],
                                 D.tuningMidi("estd", 0)[i], 440);
      if (!a || a.ratio.n !== b.ratio.n || a.ratio.d !== b.ratio.d) stable = false;
    }
  }
  ok(stable, "a capo/offset moves the pitches, never the relations");
}

section("stringAncestry — every adjacent pair in every stocked tuning is named");
{
  let unnamed = [], seen = {};
  TUNING_KEYS.forEach(k => {
    const m = D.tuningMidi(k, 0);
    for (let i = 1; i < 6; i++) {
      const a = D.stringAncestry(m[i - 1], m[i], 440);
      if (!a) { unnamed.push(k + ":" + i); continue; }
      seen[a.interval] = (seen[a.interval] || 0) + 1;
    }
  });
  ok(unnamed.length === 0,
    "no adjacent gap falls outside JUST_INTERVALS", unnamed.join(" "));
  ok(Object.keys(seen).sort().join(",") === "major second,major third,perfect fifth,perfect fourth",
    "and only four interval classes ever occur", Object.keys(seen).sort().join(","));
  const dad = D.tuningMidi("dadgad", 0);
  const w = D.stringAncestry(dad[3], dad[4], 440);
  ok(w.ratio.n === 9 && w.ratio.d === 8 && w.family === "overtone" && w.drop === 3,
    "DADGAD's G→A whole tone is 9/8 — harmonic 9, dropped three octaves");
  const dd = D.tuningMidi("dropd", 0);
  ok(D.stringAncestry(dd[0], dd[1], 440).ratio.n === 3 &&
     D.stringAncestry(dd[1], dd[0], 440).family === "common-ancestor",
    "drop D's opening fifth is 3/2 upward and a cousin downward");
}

// ------------------------------------------------------------- the copy ----
const START = "// ---------- harmonic ancestry copy (R4) ----------";
const END = "// ---------- end ancestry copy ----------";

section("R4 copy — frozen, and it renders");
{
  const i = html.indexOf(START), j = html.indexOf(END);
  ok(i > 0 && j > i, "both copy sentinels are present");
  if (i > 0 && j > i) {
    const block = html.slice(i, j + END.length) + "\n";
    const sha = crypto.createHash("sha256").update(block).digest("hex");
    ok(sha === process.env.R4_SHA_OVERRIDE || sha === "c0c6c57eba876fa23f3e600efb4f471d6d5c033fbf34b025632b64cda127d799",
      "the copy block is byte-identical to the reviewed text", sha.slice(0, 16));

    // Execute it for real: block 0 supplies the math, block 4 supplies the string
    // ordinals/colors/formatters, and only `esc` and `state` are stubs.
    const need = b4.slice(b4.indexOf("const STRING_ORD="), j - html.indexOf(b4));
    const shim = 'const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",' +
      '">":"&gt;","\\"":"&quot;"}[c]));\nconst state={a4:440,tuning:"estd",customOffset:0,' +
      "tolCents:6,stringHarmonics:[[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]]};\n" +
      "function fmtHz(f){return f.toFixed(2)+' Hz';}\n" +
      "function getComputedStyle(){return {getPropertyValue:()=>'#888'};}\n";
    let C = null, err = null;
    try {
      C = new Function(blocks[0] + "\n" + shim + "\n" + need +
        "\nreturn {ancestrySectionHtml,denominatorRuleHtml,harmonicRowNoteHtml," +
        "harmonicIntervalPhrase,landingFor,state};")();
    } catch (e) { err = e; }
    ok(!!C, "the copy block executes on top of real block-0 math", err && err.message);

    if (C) {
      ok(C.harmonicIntervalPhrase(2) === "an octave up" &&
         C.harmonicIntervalPhrase(3) === "an octave and a perfect fifth up" &&
         C.harmonicIntervalPhrase(4) === "two octaves up" &&
         C.harmonicIntervalPhrase(5) === "two octaves and a major third up",
        "harmonics 2–5 name themselves as intervals", C.harmonicIntervalPhrase(3));

      const low = C.ancestrySectionHtml(0);
      ok(/harmonic 3 of the open 5th string/.test(low) && /dropped two octaves/.test(low),
        "the low E's section leads with it living inside the A string's series");
      ok(/4\/3/.test(low) && /harmonic 4/.test(low) && /harmonic 3/.test(low),
        "and reads the denominator rule off the upward 4/3");
      ok(/27\.5 Hz/.test(low), "printing the shared fundamental at 27.5 Hz");
      ok(/2 ¢ wide of a true 4\/3/.test(low), "with equal temperament's verdict on it");

      const b = C.ancestrySectionHtml(4);
      ok(/major third/.test(b) && /5\/4/.test(b) && /14 ¢ sharp/.test(b),
        "the B string's section names the 14 ¢ third, the fret system's big compromise");
      ok(/harmonic 5 of the open 3rd string/.test(b),
        "and still places it inside the G string's series");

      ok(C.ancestrySectionHtml(1) === C.ancestrySectionHtml(0),
        "string 0 and string 1 share the same pair — the lowest has no lower neighbour");

      ok(C.harmonicRowNoteHtml(0, 1) === "", "the fundamental gets no interval note");
      const h4 = C.harmonicRowNoteHtml(0, 4);
      ok(/pop-sub/.test(h4) && /Two octaves up/.test(h4),
        "harmonic 4 of the low E names its interval", h4);
      ok(/Lands on the open 1st string/.test(h4) && /switch it on to mark it/.test(h4),
        "says where it lands, and how to see the mark while it is switched off");
      C.state.stringHarmonics[0][2] = 1;
      ok(!/switch it on/.test(C.harmonicRowNoteHtml(0, 4)),
        "and drops that hint once the harmonic is on");
      C.state.stringHarmonics[0][2] = 0;
      ok(!/Lands on/.test(C.harmonicRowNoteHtml(0, 5)),
        "a harmonic that lands nowhere claims nothing");
      ok(C.landingFor(0, 4) && C.landingFor(0, 4).onto.si === 5,
        "landings come from findCoincidences — never a second detector");

      const more = C.denominatorRuleHtml();
      ok(/^<details class="pop-more">/.test(more) && /<summary>/.test(more),
        "the general rule is a native <details>, no JS and no state");
      ok(/power of two, not merely an even number/.test(more) &&
         /denominator says whose family/.test(more),
        "and states the rule THEORY §3.4 states");
    }
  }
  // The two docs/THEORY.md §2.5 figures still under review must not surface anywhere.
  ok(!/30\s*[–-]\s*40\s*Hz/.test(html), "the unreviewed '~30–40 Hz' figure stays out");
}

// ------------------------------------------------------------ the wiring ----
section("R4.1 — the harmonic rows carry their interval note");
{
  const s = b4.indexOf("function stringContentHtml(si){");
  const e = b4.indexOf("// ---------- discovery moments");
  const body = decomment(b4.slice(s, e));
  const loop = body.slice(body.indexOf("for(let hh=1;hh<=5;hh++)"),
                          body.indexOf("return '<div class=\"pop-term\">"));
  ok(s > 0 && e > s && loop.length > 100, "stringContentHtml and its harmonic loop are findable");
  ok(/harmonicRowNoteHtml\s*\(\s*si\s*,\s*hh\s*\)/.test(loop),
    "the loop calls harmonicRowNoteHtml(si, hh)");
  ok(/rows\s*\+?=/.test(loop) && /harmonicRowNoteHtml/.test(loop.slice(loop.indexOf("rows+="))),
    "and the note joins the rows it annotates");
  const css = html.slice(0, html.indexOf("</style>"));
  ok(/\.pop-sub\s*\{[^}]*font-size[^}]*\}/.test(css), ".pop-sub is styled (small, dim, indented)");
  ok(/\.pop-sub\s*\{[^}]*var\(--dim\)[^}]*\}/.test(css), "and takes its color from the theme");
}

section("R4.2 — the ancestry section is in the string popover");
{
  const s = b4.indexOf("function stringContentHtml(si){");
  const e = b4.indexOf("// ---------- discovery moments");
  const body = decomment(b4.slice(s, e));
  ok(/ancestrySectionHtml\s*\(\s*si\s*\)/.test(body),
    "stringContentHtml calls ancestrySectionHtml(si)");
  const ret = body.slice(body.indexOf("return '<div class=\"pop-term\">"));
  const iAnc = ret.indexOf("ancestrySectionHtml");
  const iPlace = ret.indexOf("How Claude Rameau places it");
  const iVals = ret.indexOf("Current values");
  ok(iAnc > 0 && iPlace > 0 && iVals > iPlace && iAnc > iPlace && iAnc < iVals,
    "it sits between 'How Claude Rameau places it' and 'Current values'");
}

section("R4.3 — ?pop=str<N> opens one string popover headlessly");
{
  const w = decomment(b4.slice(b4.indexOf("const pp=location.search"),
                               b4.indexOf("const pp=location.search") + 1800));
  ok(w.length > 400, "the ?pop= handler is findable");
  const iOpen = w.indexOf("openStringPopover(");
  ok(iOpen > 0, "the handler opens the string popover itself (headless.js needs this door)");
  // Everything else is asserted on the code AROUND that call, so no assertion here can
  // be satisfied by an unrelated line that merely happens to be in the same window.
  const branch = iOpen > 0 ? w.slice(Math.max(0, iOpen - 400), iOpen + 200) : "";
  ok(/str/.test(branch) && /parseInt|\\d\+/.test(branch),
    "reached through a str<N> key, N parsed from the query");
  ok(/<\s*6|<=\s*5|\.length/.test(branch), "an out-of-range N opens nothing");
}

section("R4.4 — the denominator rule folds away by default");
{
  const s = b4.indexOf("function stringContentHtml(si){");
  const e = b4.indexOf("// ---------- discovery moments");
  const body = decomment(b4.slice(s, e));
  ok(/denominatorRuleHtml\s*\(\s*\)/.test(body), "stringContentHtml calls denominatorRuleHtml()");
  const css = html.slice(0, html.indexOf("</style>"));
  ok(/\.pop-more\s*[ ,>{]/.test(css), ".pop-more is styled");
  ok(!/popMore|state\.popMore|gsPopMore/.test(html),
    "with no JS toggle, no state key and nothing persisted — <details> already does it");
}

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
