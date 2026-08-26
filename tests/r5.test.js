// R5 gate suite — harmonic tracks on the spectrogram.
//
// Same shape as tests/r3.test.js and tests/r4.test.js, and for the same reason:
// this file is RED until R5.0 and R5.1 land, and turning it green is the
// definition of "done". Two halves:
//   · block 0 — notePartials()/partialClusters() math (R5.0). Pure, node-safe,
//     no FMIN/FMAX/LOGSPAN: those live in block 3 and are unreachable here, which
//     is why the spec carries no frequency clipping;
//   · the wiring — source contracts for R5.1, every one scoped to the handler or
//     the function body that must change, and every one mutation-checked when
//     written. Comments are stripped before matching: a contract a comment can
//     satisfy is not a contract (reviewer lesson, gate 3).
//
// The numbers below were measured against a reference implementation before the
// spec was frozen; they are facts about equal temperament and the stocked tunings,
// not about any particular implementation.
//
// Run: node tests/r5.test.js        (all of it via ./tests/verify.sh)

const fs = require("fs");
const os = require("os");
const path = require("path");

const HTML_PATH = path.join(__dirname, "..", "index.html");
const html = fs.readFileSync(HTML_PATH, "utf8");

let passed = 0, failed = 0;
function ok(cond, name, detail) {
  if (cond) { passed++; console.log("  ok   " + name); }
  else { failed++; console.log("  FAIL " + name + (detail ? "  [" + detail + "]" : "")); }
}
// R5.0 is absent until the builder lands it, so every math assertion has to
// survive calling a function that does not exist yet — a throw is a FAIL, not a
// crash that hides the 30 assertions after it.
function okf(name, fn, detail) {
  let v = false, d = detail;
  try { v = !!fn(); } catch (e) { v = false; d = e.message; }
  ok(v, name, d);
}
function section(t) { console.log("\n" + t); }

function decomment(src) {
  return src.split("\n").map(l => l.replace(/(^|[\s;{}()])\/\/.*$/, "$1")).join("\n");
}

const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
// Detect block 0 by a symbol that already ships — gating on an R5 symbol would
// make this file exit 1 instead of reporting which contracts are unmet.
if (!/function\s+findCoincidences/.test(blocks[0])) {
  console.error("script block 0 is not the DSP block — extraction pattern broke");
  process.exit(1);
}
const b3 = blocks[3] || "";
const b4 = blocks[4] || "";

const tmp = path.join(os.tmpdir(), "rameau_r5_under_test.js");
fs.writeFileSync(tmp, blocks[0] +
  "\nmodule.exports={TUNINGS,tuningMidi,midiToFreq,noteInfo,centsBetween," +
  "findCoincidences,COINCIDENCE_CENTS," +
  "TEMPERED_CENTS:(typeof TEMPERED_CENTS==='undefined'?null:TEMPERED_CENTS)," +
  "notePartials:(typeof notePartials==='undefined'?null:notePartials)," +
  "partialClusters:(typeof partialClusters==='undefined'?null:partialClusters)};\n");
const D = require(tmp);

const TUNING_KEYS = ["estd", "eb", "dstd", "dropd", "dadgad"];
const ESTD = D.tuningMidi("estd", 0);
const NP = (m, n, a4) => D.notePartials(m, n, a4 === undefined ? 440 : a4);
const PC = (p, t) => (t === undefined ? D.partialClusters(p) : D.partialClusters(p, t));
// A hand-built partial, for the assertions that must not depend on any tuning.
const P = (key, f) => ({ key, midi: 40 + key, harm: 1, f });

// ------------------------------------------------------------ R5.0 math ----
section("R5.0 — the second tolerance tier");
{
  ok(D.TEMPERED_CENTS === 20, "TEMPERED_CENTS is 20 ¢", String(D.TEMPERED_CENTS));
  ok(D.COINCIDENCE_CENTS === 6, "COINCIDENCE_CENTS still 6 ¢ — R3's tier is untouched",
    String(D.COINCIDENCE_CENTS));
}

section("R5.0 — notePartials(): the user's note set, expanded");
{
  okf("a muted string contributes nothing", () =>
    NP([null, 45, null, null, null, null], 3).length === 3);
  okf("A2 (midi 45) gives 110 / 220 / 330 Hz", () => {
    const p = NP([null, 45, null, null, null, null], 3);
    return p.every(x => x.key === 1) &&
      Math.abs(p[0].f - 110) < 1e-9 && Math.abs(p[1].f - 220) < 1e-9 &&
      Math.abs(p[2].f - 330) < 1e-9;
  });
  okf("harmonics number from 1 (the fundamental is a partial)", () =>
    NP([40, null, null, null, null, null], 3).map(p => p.harm).join(",") === "1,2,3");
  okf("the key is the string index it came from, kept through the expansion", () =>
    NP([null, null, null, null, null, 64], 2).every(p => p.key === 5));
  okf("exactly {key, midi, harm, f} — nothing else to disagree with later", () => {
    const k = Object.keys(NP([40, null, null, null, null, null], 1)[0]).sort();
    return k.join(",") === "f,harm,key,midi";
  });
  okf("six strings at N=6 is 36 partials", () => NP(ESTD, 6).length === 36);
  okf("no frequency clipping — block 3 owns FMIN/FMAX, block 0 must not", () => {
    const p = NP([40, null, null, null, null, null], 300);
    return p.length === 300 && p[299].f > 24000;
  });
  okf("A4 is honoured, not assumed", () =>
    Math.abs(NP([null, 45, null, null, null, null], 1, 432)[0].f - 108) < 1e-9);
}

section("R5.0 — partialClusters(): where two different notes land together");
{
  okf("one note alone clusters with nothing", () =>
    PC(NP([40, null, null, null, null, null], 6)).length === 0);
  okf("E standard, six open strings, N=6 → 8 clusters", () =>
    PC(NP(ESTD, 6)).length === 8);
  okf("…6 of them locked, 2 tempered", () => {
    const c = PC(NP(ESTD, 6));
    return c.filter(x => x.tier === "locked").length === 6 &&
      c.filter(x => x.tier === "tempered").length === 2;
  });
  okf("returned in ascending frequency", () => {
    const c = PC(NP(ESTD, 6));
    return c.every((x, i) => i === 0 || x.f > c[i - 1].f);
  });
  okf("the lowest is B3 ≈ 247.081 Hz — open B against the low E's 3rd", () => {
    const c = PC(NP(ESTD, 6))[0];
    return Math.abs(c.f - 247.0811) < 1e-3 && c.notes === 2 &&
      c.members.length === 2 &&
      c.members.some(m => m.key === 4 && m.harm === 1) &&
      c.members.some(m => m.key === 0 && m.harm === 3);
  });
  okf("…and it is a fifth, so it is locked at 1.955 ¢", () => {
    const c = PC(NP(ESTD, 6))[0];
    return c.tier === "locked" && Math.abs(c.spreadCents - 1.9550) < 1e-3;
  });
  okf("the major third at ≈737.486 Hz is tempered, 15.641 ¢ wide", () => {
    const c = PC(NP(ESTD, 6)).find(x => Math.abs(x.f - 737.4859) < 1e-3);
    return !!c && c.tier === "tempered" && Math.abs(c.spreadCents - 15.6413) < 1e-3;
  });
  okf("a cluster can hold three notes (≈329.752 Hz: open E4, and E2×4, A2×3)", () => {
    const c = PC(NP(ESTD, 6)).find(x => Math.abs(x.f - 329.7517) < 1e-3);
    return !!c && c.notes === 3 && c.members.length === 3;
  });
  okf("two strings tuned to the same pitch still cluster — distinct keys is the test", () => {
    const c = PC(NP([40, 40, null, null, null, null], 3));
    return c.length === 3 && c.every(x => x.notes === 2 && x.members.length === 2);
  });
  okf("an exact unison reports 0, never -0", () => {
    const c = PC(NP([40, 40, null, null, null, null], 1));
    return c.length === 1 && Object.is(c[0].spreadCents, 0);
  });
  okf("the reported frequency is the geometric mean of the members", () => {
    // 100 and 200 Hz are 1200 ¢ apart; the arithmetic mean would say 150.
    const c = PC([P(0, 100), P(1, 200)], 1200);
    return c.length === 1 && Math.abs(c[0].f - 141.4214) < 1e-3;
  });
  okf("tolCents is honoured — the same pair at 1199 ¢ is not a cluster", () =>
    PC([P(0, 100), P(1, 200)], 1199).length === 0);
  okf("spread is measured against the group's first member, never chained", () => {
    // 0 / 15 / 30 ¢ apart. Chaining would swallow all three at tol 20.
    const f0 = 100, f1 = 100 * Math.pow(2, 15 / 1200), f2 = 100 * Math.pow(2, 30 / 1200);
    const c = PC([P(0, f0), P(1, f1), P(2, f2)], 20);
    return c.length === 1 && c[0].members.length === 2;
  });
  okf("the tier boundary is COINCIDENCE_CENTS: 5.99 ¢ locked…", () =>
    PC([P(0, 100), P(1, 100 * Math.pow(2, 5.99 / 1200))], 20)[0].tier === "locked");
  okf("…6.01 ¢ tempered", () =>
    PC([P(0, 100), P(1, 100 * Math.pow(2, 6.01 / 1200))], 20)[0].tier === "tempered");
  okf("the default tolerance is the tempered tier, not R3's", () => {
    const p = NP(ESTD, 6);
    return PC(p).length === 8 && PC(p, D.TEMPERED_CENTS).length === 8 &&
      PC(p, D.COINCIDENCE_CENTS).length === 7;
  });
}

section("R5.0 — one detector, never two: every ✦ landing is inside a cluster");
{
  let landings = 0, missing = 0;
  try {
    for (const tk of TUNING_KEYS) {
      const midis = D.tuningMidi(tk, 0);
      for (let N = 1; N <= 8; N++) {
        const parts = NP(midis, N);
        const marks = parts.map(p => ({ si: p.key, midi: p.midi, harm: p.harm, f: p.f }));
        const co = D.findCoincidences(marks, D.COINCIDENCE_CENTS);
        const cls = PC(parts);
        for (const c of co) {
          landings++;
          const hit = cls.some(g =>
            g.members.some(m => m.key === c.from.si && m.harm === c.harm) &&
            g.members.some(m => m.key === c.onto.si && m.harm === 1));
          if (!hit) missing++;
        }
      }
    }
  } catch (e) { missing = -1; }
  ok(landings === 96, "5 stocked tunings × N=1…8 produce 96 R3 landings", String(landings));
  ok(missing === 0, "every one of them is a member of a cluster — no second opinion",
    String(missing));
}

section("R5.0 — the chords R5.2 will stock, measured now so R5.2 cannot drift");
{
  const CHORDS = { E: [0, 2, 2, 1, 0, 0], Em: [0, 2, 2, 0, 0, 0],
    A: [null, 0, 2, 2, 2, 0], Am: [null, 0, 2, 2, 1, 0],
    C: [null, 3, 2, 0, 1, 0], D: [null, null, 0, 2, 3, 2],
    Dm: [null, null, 0, 2, 3, 1], G: [3, 2, 0, 0, 0, 3] };
  const EXPECT = { E: 11, Em: 7, A: 10, Am: 6, C: 8, D: 7, Dm: 5, G: 10 };
  const midisOf = fr => fr.map((f, i) => f == null ? null : ESTD[i] + f);
  for (const k of Object.keys(CHORDS)) {
    okf(k + " → " + EXPECT[k] + " clusters at N=6", () =>
      PC(NP(midisOf(CHORDS[k]), 6)).length === EXPECT[k]);
  }
  okf("E major: 8 of its 11 clusters contain no fundamental at all", () =>
    PC(NP(midisOf(CHORDS.E), 6)).filter(c => !c.members.some(m => m.harm === 1)).length === 8);
  okf("E major's lowest is an exact octave (E2×2 = E3×1, 0 ¢)", () => {
    const c = PC(NP(midisOf(CHORDS.E), 6))[0];
    return Math.abs(c.f - 164.8138) < 1e-3 && Object.is(c.spreadCents, 0);
  });
  okf("C major stacks three notes at ≈657.520 Hz, tempered", () => {
    const c = PC(NP(midisOf(CHORDS.C), 6)).find(x => Math.abs(x.f - 657.5202) < 1e-3);
    return !!c && c.notes === 3 && c.tier === "tempered";
  });
}

// --------------------------------------------------------- R5.1 wiring ----
section("R5.1 — the overlay's state is the spectrogram's own, and is not remembered");
{
  const s = decomment(b4);
  ok(/sgFrets\s*:\s*(\[\s*(null\s*,\s*){5}null\s*\]|(new\s+)?Array\(6\)\.fill\(null\))/.test(s),
    "state.sgFrets starts as six nulls — every string muted");
  ok(/sgHarm\s*:\s*6\b/.test(s), "state.sgHarm defaults to 6 harmonics");
  const payload = (() => {
    const i = s.indexOf("function _settingsPayload");
    return i < 0 ? "" : s.slice(i, i + 1200);
  })();
  ok(payload !== "" && !/sgFrets|sgHarm/.test(payload),
    "_settingsPayload() carries neither — the overlay is a gesture, not a preference");
  const save = (() => {
    const i = s.indexOf("function saveSettings");
    return i < 0 ? "" : s.slice(i, i + 700);
  })();
  ok(save !== "" && !/sgFrets|sgHarm/.test(save), "saveSettings() writes neither");
  const cardState = (() => {
    const i = s.indexOf("function _cardStateFor");
    return i < 0 ? "" : s.slice(i, i + 1600);
  })();
  ok(cardState !== "" && !/sgFrets|sgHarm/.test(cardState),
    "_cardStateFor() keeps it out of CSV/JSON — exports are data, not UI state");
}

section("R5.1 — two controls on the spectrogram card, before the time axis");
{
  const head = html.slice(html.indexOf('id="sgramCard"'), html.indexOf('id="sgramCanvasA"'));
  const iNote = head.indexOf('id="sgNoteSel"');
  const iHarm = head.indexOf('id="sgHarmSel"');
  const iAxis = head.indexOf("Time axis");
  ok(iNote > 0, "#sgNoteSel is on the spectrogram card");
  ok(iHarm > 0, "#sgHarmSel is beside it");
  ok(iNote > 0 && iAxis > 0 && iNote < iAxis, "the overlay group comes before Time axis");
  ok(/>\s*Overlay\s*</.test(head), "the group is labelled Overlay");
  const noteSel = head.slice(iNote, head.indexOf("</select>", iNote));
  ok(/>\s*Off\s*</i.test(noteSel), "…and its first choice is Off");
  const harmSel = head.slice(iHarm, head.indexOf("</select>", iHarm));
  ok(/1–6[\s\S]{0,40}<\/option>/.test(harmSel) && /selected/.test(harmSel),
    "1–6 is the default harmonic count");
  const s4 = decomment(b4);
  // Scope to the function that fills the select — proximity alone would be satisfied by
  // any neighbouring function that happens to call noteInfo().
  const fns = [];
  for (const m of s4.matchAll(/\nfunction\s+\w+/g)) fns.push(m.index);
  const filler = fns.filter((st, k) => {
    const fn = s4.slice(st, k + 1 < fns.length ? fns[k + 1] : s4.length);
    return /sgNoteSel/.test(fn) && /option/i.test(fn);
  }).map(st => {
    const k = fns.indexOf(st);
    return s4.slice(st, k + 1 < fns.length ? fns[k + 1] : s4.length);
  });
  ok(filler.length > 0, "some function fills the overlay select with options");
  ok(filler.some(fn => /noteInfo\s*\(/.test(fn) && /tuningMidi\s*\(|midiToFreq\s*\(/.test(fn)),
    "its six string choices are named from the current tuning, not hard-coded");
}

section("R5.1 — the model carries the comb, and does not disturb M2.7's refine");
{
  const s = decomment(b4);
  const i = s.indexOf("function sgramModelFor");
  const body = i < 0 ? "" : s.slice(i, s.indexOf("\nfunction ", i + 10));
  ok(/return\s*\{[\s\S]{0,600}\bcomb\s*[,:]/.test(body), "sgramModelFor() hands the scene a comb");
  // Where the expansion lives is the builder's call; what it is fed is not.
  const fed = [...s.matchAll(/notePartials\s*\(/g)].some(m => {
    const w = s.slice(Math.max(0, m.index - 400), m.index + 400);
    return /state\.sgFrets/.test(w) && /state\.sgHarm/.test(w);
  });
  ok(fed, "the comb is notePartials() over state.sgFrets at state.sgHarm — the user's note set");
  // …and it is the whole six-slot set, not the one note that happens to be picked:
  // key is the index into the array notePartials() was handed, and key is what
  // chooses the track's hue, so a one-note array paints every string STRING_COLORS[0].
  const combArgs = [...s.matchAll(/notePartials\s*\(([\s\S]{0,300}?),\s*state\.sgHarm/g)]
    .map(m => m[1].trim());
  const topCommas = t => {
    let d = 0, n = 0;
    for (const ch of t) {
      if ("([{".includes(ch)) d++;
      else if (")]}".includes(ch)) d--;
      else if (ch === "," && d === 0) n++;
    }
    return n;
  };
  const oneNote = a => /^\[[\s\S]*\]$/.test(a) && topCommas(a.slice(1, -1)) === 0;
  ok(combArgs.length > 0 && !combArgs.some(oneNote),
    "the note set is string-indexed, not the one selected note — key picks the hue",
    combArgs.join(" | "));
  const keyLines = body.split("\n").filter(l => /(const\s+key\s*=|want\s*=\s*\{\s*key\s*:)/.test(l));
  ok(keyLines.length >= 2, "both cache keys are still built here", String(keyLines.length));
  ok(keyLines.length >= 2 && !/sgFrets|sgHarm/.test(keyLines.join("\n")),
    "neither cache key mentions the overlay — changing it must not re-run the STFT");
  ok(/harmonics 1–/.test(body), "the status chip names the overlay it drew");
}

section("R5.1 — the tracks are drawn, under the colorbar, with no text");
{
  const s = decomment(b3);
  const i = s.indexOf("function drawSpectrogramScene");
  const body = s.slice(i, s.indexOf("\nfunction ", i + 10));
  const a = body.indexOf("drawStringMarkers(");
  const b = body.indexOf("cbX", a);
  const pass = a > 0 && b > a ? body.slice(a, b) : "";
  ok(pass !== "", "there is a pass between the string markers and the colorbar");
  ok(/model\.comb/.test(pass), "…and it reads model.comb");
  ok(/yOfF\s*\(/.test(pass), "each partial is placed by the pane's own frequency mapping");
  ok(/rgba\(0,\s*0,\s*0,\s*0?\.55\)/.test(pass),
    "a black halo carries the line over the magma — the colormap never themes");
  ok(/_stringColor\s*\(/.test(pass), "the hue is the string's own data color");
  ok(/setLineDash\(\s*\[\s*3\s*,\s*3\s*\]\s*\)/.test(pass), "harmonics are dashed");
  ok(/harm\s*===\s*1/.test(pass), "…and the fundamental is not");
  ok(!/fillText/.test(pass), "no labels on the tracks — hue and order say it (R3 precedent)");
}

section("R5.1 — the hooks the gate needs, and nothing persisted through them");
{
  const s = decomment(b4);
  const iNote = s.search(/\[\?&\]sgnote=/);
  ok(iNote > 0, "?sgnote= is parsed from the query string");
  const branch = iNote > 0 ? s.slice(iNote, iNote + 500) : "";
  ok(/\[0-5\]|Math\.min\(\s*5|<\s*6\b/.test(branch), "an out-of-range string index selects nothing");
  ok(branch !== "" && !/saveSettings/.test(branch), "the hook persists nothing");
  ok(/\[\?&\]sgharm=/.test(s), "?sgharm= is parsed too");
}

section("R5.1 — the pane says what it drew, and the PNG carries none of it");
{
  const s = decomment(b4);
  ok(/setAttribute\(\s*"data-sgcomb"/.test(s),
    "each pane reports its track count — the canvas is unreachable from node");
  const mSet = /setAttribute\(\s*"data-sgcomb"/.exec(s);
  ok(!!mSet && /removeAttribute\(\s*"data-sgcomb"/.test(s.slice(mSet.index, mSet.index + 400)),
    "…and the same site drops it again when the overlay is off");
  ok((s.match(/removeAttribute\(\s*"data-sgcomb"/g) || []).length >= 2,
    "…and the no-source pass clears it too, as it already clears data-sgwin");
  const i = s.indexOf("function exportSgramPNG");
  const body = i < 0 ? "" : s.slice(i, s.indexOf("\nfunction ", i + 10));
  ok(/sgFrets/.test(body), "exportSgramPNG() knows about the overlay");
  ok(/state\.sgFrets\s*=\s*(\[\s*(null\s*,\s*){5}null\s*\]|(new\s+)?Array\(6\)\.fill\(null\))/.test(body),
    "…blanks it for the render, as _cardPng() does for state.strings");
  ok(/finally\s*\{[\s\S]{0,400}state\.sgFrets\s*=/.test(body),
    "…and restores it in a finally, so a failed export cannot eat the user's selection");
}

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
