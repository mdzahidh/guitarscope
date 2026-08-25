// R3 gate suite — "discovery moments" (✦ harmonic/fundamental coincidences).
//
// Deliberately SEPARATE from tests/dsp.test.js so the two can disagree:
//   · tests/dsp.test.js is the standing suite and must be green at every commit;
//   · this file is RED until the R3.2–R3.4 wiring lands, and turning it green is
//     the definition of "done" for that work.
//
// It has two halves. The block-0 half exercises findCoincidences() directly and is
// already green (R3.1 landed). The wiring half greps index.html for the contracts
// docs/ROADMAP.md fixes for R3.2/R3.3/R3.4 — source-text assertions, because the
// things under test are canvas draws and DOM handlers that node cannot execute.
// The pixels themselves are covered by tests/headless.js.
//
// Run: node tests/r3.test.js        (all of it via ./tests/verify.sh)

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

// ---------------------------------------------------------------- block 0 ----
const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (!/function\s+findCoincidences/.test(blocks[0])) {
  console.error("script block 0 is not the DSP block — extraction pattern broke");
  process.exit(1);
}
const tmp = path.join(os.tmpdir(), "rameau_r3_under_test.js");
fs.writeFileSync(tmp, blocks[0] + "\nmodule.exports={TUNINGS,tuningMidi,midiToFreq," +
  "findCoincidences,centsBetween,octaveFold,COINCIDENCE_CENTS};\n");
const D = require(tmp);

// stringAxisMarkers() shape: every open fundamental, plus the harmonics switched on.
function marksFor(tuningKey, harmonics, a4) {
  const midi = D.tuningMidi(tuningKey, 0), out = [];
  midi.forEach((m, si) => {
    const f0 = D.midiToFreq(m, a4 || 440);
    out.push({ si, midi: m, f: f0, harm: 1 });
    harmonics.forEach(h => out.push({ si, midi: m, f: f0 * h, harm: h }));
  });
  return out;
}
const key = h => "s" + h.from.si + "h" + h.harm + "→s" + h.onto.si;

section("findCoincidences — E standard, harmonics 2–5");
{
  const all = marksFor("estd", [2, 3, 4, 5]);

  const exact = D.findCoincidences(all, 0);
  ok(exact.length === 1, "at 0 ¢ only the exact landing survives", exact.length + " hits");
  ok(exact.length === 1 && key(exact[0]) === "s0h4→s5",
    "…and it is E2 ×4 on the open high E", exact.map(key).join(" "));
  ok(exact.length === 1 && exact[0].cents === 0 && exact[0].reduced.n === 1 &&
     exact[0].reduced.d === 1 && exact[0].octaves === 2,
    "the exact landing reports 1/1, two octaves, 0 ¢ (not −0)");

  const std = D.findCoincidences(all, D.COINCIDENCE_CENTS);
  ok(std.length === 3, "at ±6 ¢ exactly three landings", std.length + " hits");
  ok(std.map(key).join(" ") === "s0h3→s4 s0h4→s5 s1h3→s5",
    "…the two tempered fifths and the octave, sorted by frequency", std.map(key).join(" "));
  const fifths = std.filter(h => h.reduced.n === 3 && h.reduced.d === 2);
  ok(fifths.length === 2 && fifths.every(h => Math.abs(h.cents + 1.955) < 0.01),
    "each fifth is 12-TET's −2 ¢, signed toward the open string",
    fifths.map(h => h.cents.toFixed(3)).join(" "));
  ok(fifths.every(h => h.interval === "perfect fifth"),
    "…and names itself a perfect fifth");

  // Robustness of the threshold. Open strings are sparse, so nothing else comes
  // anywhere near a harmonic: the window can be widened 8× and admit nothing new.
  // That is the argument for fixing it at ±6 ¢ instead of exposing a slider.
  const wide = D.findCoincidences(all, 50);
  ok(wide.length === 3 && wide.map(key).join(" ") === std.map(key).join(" "),
    "widening 6 ¢ → 50 ¢ admits nothing new — the landings are not threshold artefacts",
    wide.length + " hits");

  // The popover copy says the folded denominator is a power of two — "the signature
  // of one note living inside another's series". If a 5/4 or 7/4 ever landed, that
  // sentence would be wrong, so the prose and this assertion stand or fall together.
  ok(std.every(h => (h.reduced.d & (h.reduced.d - 1)) === 0),
    "every landing folds to a power-of-two denominator, as the copy claims",
    std.map(h => h.reduced.n + "/" + h.reduced.d).join(" "));
}

section("findCoincidences — other tunings");
{
  const hits = k => D.findCoincidences(marksFor(k, [2, 3, 4, 5]), D.COINCIDENCE_CENTS);

  // Eb and D standard are E standard shifted bodily: same intervals, same landings.
  ["eb", "dstd"].forEach(k => ok(
    hits(k).map(key).join(" ") === hits("estd").map(key).join(" "),
    "a whole-instrument transpose (" + k + ") leaves the landings unchanged"));

  // Drop D trades E standard's two fifths for one exact octave — fewer marks, and
  // a different set, which is the visible payoff of retuning.
  const dropD = hits("dropd");
  ok(dropD.length === 2, "drop D lands twice", dropD.map(key).join(" "));
  ok(dropD.some(h => h.from.si === 0 && h.harm === 2 && h.onto.si === 2 && h.cents === 0),
    "…including D2 ×2 exactly on the open D string");

  // DADGAD is the richest of the five — four exact unisons plus a fifth. This is
  // the whole reason the tuning rings, and the app should be able to show it.
  const dad = hits("dadgad");
  ok(dad.length === 5, "DADGAD lands five times — the most of any stocked tuning",
    dad.map(key).join(" "));
  ok(dad.filter(h => h.cents === 0).length === 4,
    "…four of them exact", dad.filter(h => h.cents === 0).length + " exact");

  // A4 is a scale factor on every frequency, so ratios — and therefore hits —
  // must not move with it.
  const a440 = D.findCoincidences(marksFor("estd", [2, 3, 4, 5], 440), 6).map(key).join(" ");
  const a432 = D.findCoincidences(marksFor("estd", [2, 3, 4, 5], 432), 6).map(key).join(" ");
  ok(a440 === a432 && a440.length > 0, "the reference pitch does not change what lands");
}

section("findCoincidences — only shown harmonics count");
{
  const none = D.findCoincidences(marksFor("estd", []), 6);
  ok(none.length === 0, "no harmonics shown ⇒ nothing to mark", none.length + " hits");
  const h3only = D.findCoincidences(marksFor("estd", [3]), 6);
  ok(h3only.length === 2 && h3only.every(h => h.harm === 3),
    "showing only harmonic 3 marks only harmonic-3 landings", h3only.map(key).join(" "));
  ok(D.findCoincidences(marksFor("estd", [4]), 6).length === 1,
    "showing only harmonic 4 leaves the octave landing alone");
  ok(D.findCoincidences(null, 6).length === 0 && D.findCoincidences([], 6).length === 0,
    "junk input yields no hits rather than throwing");
}

// ---------------------------------------------------------------- wiring -----
// Everything below is RED until R3.2–R3.4 land. Each assertion names the ROADMAP
// task that turns it green.

const b3 = blocks[3] || "";   // canvas rendering
const b4 = blocks[4] || "";   // app state / UI

section("R3.2 — tolerance state, no user control");
{
  ok(/state\.tolCents/.test(b4), "block 4 reads a tolerance into state.tolCents");
  ok(/\/\[\?&\]tol=|[?&]tol=/.test(b4), "a ?tol= test hook exists");
  const hook = b4.match(/[^\n]*\[\?&\]tol=[\s\S]{0,400}/);
  ok(!!hook && /50/.test(hook[0]) && /(Math\.min|Math\.max|clamp)/.test(hook[0]),
    "…clamped to 0–50 rather than trusted");
  // "no control, no persistence" — the threshold is a physical claim, not a preference.
  ok(!/tolCents/.test(html.replace(b4, "").replace(blocks[0], "")) ||
     !/gsSettings[\s\S]{0,4000}tolCents/.test(b4),
    "tolerance never reaches gsSettings");
  ok(!/id="tol|tolRange|tolInput/.test(html), "no tolerance widget in the markup");
}

section("R3.3 — the ✦ pass in drawStringAxis");
{
  const fn = b3.match(/function\s+drawStringAxis[\s\S]*?\n\}/);
  ok(!!fn, "drawStringAxis still exists in block 3");
  const s = fn ? fn[0] : "";
  ok(/findCoincidences\s*\(/.test(s), "…and calls findCoincidences");
  // The mark is a drawn path, not the ✦ glyph: a glyph renders small inside its em
  // box, so font size cannot make it legible (the session-15 chevron trap, and the
  // user's "too small to see" report at gate 3). Assert the draw, not the character —
  // the character also survives in comments, and a contract a comment can satisfy is
  // not a contract.
  // Scoped to the mark loop itself, up to the hit it pushes — the key below it also
  // draws a star, and a whole-function grep would be satisfied by the key alone.
  const loop = (s.match(/for\s*\(\s*const\s+hit\s+of\s+coins\s*\)[\s\S]*?coincidence\s*:/) || [""])[0];
  ok(/starPath\s*\(/.test(loop) && /\.fill\s*\(/.test(loop),
    "…drawing each mark as a filled path, not as text");
  ok(!/fillText\s*\(\s*["'`]✦/.test(s),
    "…and never back to fillText('✦'), which cannot be sized");
  ok(/coincidence\s*:/.test(s), "…pushing a hit carrying a `coincidence` index");
  ok(/(ink-rgb|--ink\b|--mut)/.test(s) && !/--slot-[ab]/.test(s),
    "the ✦ is neutral ink, never a guitar accent — it belongs to neither string");
  // A mark nobody can read is a mystery, so the plot says what it means once.
  ok(/two strings, one pitch/.test(s),
    "…and the plot carries a one-line key naming what the mark shows");
  ok(/state\.strings/.test(s) || /\bstrings\b/.test(s),
    "…and only when the strings axis is on");
}

section("R3.4 — the ✦ popover");
{
  ok(/function\s+openCoincidencePopover/.test(b4),
    "openCoincidencePopover() exists");
  const fn = b4.match(/function\s+openCoincidencePopover[\s\S]*?\n\}/);
  const s = fn ? fn[0] : "";
  ok(/coincidenceContentHtml\s*\(/.test(s), "…rendering the frozen copy");
  ok(/auditionBlock\s*\(/.test(s), "…with an audition row, like every other popover");
  const dispatch = b4.match(/function\s+attachHitClicks[\s\S]*?\n\}/);
  ok(!!dispatch && /coincidence/.test(dispatch[0]) &&
     /openCoincidencePopover/.test(dispatch[0]),
    "attachHitClicks routes a coincidence hit to it");
  // Anchored to the hook itself, not to the text "?pop=": the source spells the hook
  // as a regex literal, /[?&]pop=.../, whose own text does not match a [?&]pop=
  // pattern -- so the only thing that ever could was a comment mentioning ?pop=coin,
  // and a contract a comment can satisfy is not a contract. (Reviewer fix, gate 3.)
  const popHook = b4.match(/const\s+pp\s*=\s*location\.search[\s\S]{0,1600}/);
  ok(!!popHook && /coin\\d|coin\(/.test(popHook[0]) &&
     /openCoincidencePopover/.test(popHook[0]),
    "?pop=coin<N> opens one headlessly (tests/headless.js needs this door)");
}

section("R3.4 — the copy stays frozen");
{
  const START = "// ---------- discovery moments: the ✦ popover (R3.4) ----------";
  const END = "// ---------- end ✦ popover copy ----------";
  const i = html.indexOf(START), j = html.indexOf(END);
  ok(i > 0 && j > i, "both copy sentinels are present");
  if (i > 0 && j > i) {
    const block = html.slice(i, j + END.length) + "\n";
    const sha = crypto.createHash("sha256").update(block).digest("hex");
    ok(sha === "e4b277b2918a25367723636701fadb93a9520ef377c6c48f949cfdc2c789addf",
      "the copy block is byte-identical to the reviewed text", sha.slice(0, 16));
  }
  // The two docs/THEORY.md §2.5 figures still under review must not surface anywhere.
  ok(!/critical bandwidth/i.test(html) || !/¼|quarter/.test(
        (html.match(/[^.]*critical bandwidth[^.]*\./gi) || []).join(" ")),
    "the unreviewed '¼ of the critical bandwidth' framing stays out of the app");
  ok(!/30\s*[–-]\s*40\s*Hz/.test(html),
    "the unreviewed '~30–40 Hz' figure stays out of the app");
}

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
