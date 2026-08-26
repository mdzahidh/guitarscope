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
  "partialClusters:(typeof partialClusters==='undefined'?null:partialClusters)," +
  "partialLabel:(typeof partialLabel==='undefined'?null:partialLabel)," +
  "clusterRatio:(typeof clusterRatio==='undefined'?null:clusterRatio)," +
  "CMAP_NAMES:(typeof CMAP_NAMES==='undefined'?null:CMAP_NAMES)," +
  "cmapTable:(typeof cmapTable==='undefined'?null:cmapTable),"+
  "triadDegrees:(typeof triadDegrees==='undefined'?null:triadDegrees)};\n");
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
  ok(/>\s*None\s*</i.test(noteSel), "…and its first choice is None: nothing is overlaid until asked (R5.7)");
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
  ok(filler.some(fn => /value="all"[\s\S]{0,80}All open strings/i.test(fn)),
    "…and all six open strings are one choice away, not six clicks (R5.7)");
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

section("R5.1/R5.7 — the tracks are drawn in the plot, their labels outside it");
{
  const s = decomment(b3);
  const i = s.indexOf("function drawSpectrogramScene");
  const body = s.slice(i, s.indexOf("\nfunction ", i + 10));
  ok(/SGPLOT\.mR\s*=\s*\(\s*model\.comb/.test(body),
    "the right margin widens for the labels, and only when there is a comb to label");
  const a = body.indexOf("if(model.comb && model.comb.length)");
  const b = body.indexOf("model.clusters", a);
  const pass = a > 0 && b > a ? body.slice(a, b) : "";
  ok(pass !== "", "there is a comb pass, before the collision marks");
  ok(/yOfF\s*\(/.test(pass), "each partial is placed by the pane's own frequency mapping");
  ok(/_trackPaint\s*\(/.test(pass), "its colour comes from _trackPaint(): one place decides every look");
  ok(/model\.dash/.test(pass) && /setLineDash\(\s*\[\s*\]\s*\)/.test(pass) && /harm\s*===\s*1/.test(pass),
    "the pattern comes from the model, and the fundamental is solid whatever it says");
  // R5.7 inverted the halo rule. Every stocked base colour now sits outside the
  // colormaps, so nothing needs black under it — except the String-hues modifier,
  // which mixes a track back INTO the map's own gamut.
  ok(/halo\s*=\s*!!\s*model\.hue/.test(pass) && /if\s*\(\s*halo\s*\)/.test(pass),
    "a halo is stroked only under the String-hues modifier");
  // A label ON the image hides the measurement it exists to be checked against, so
  // R5.7 moved them into the right margin, on the frequency axis, in panel ink.
  const lab = pass.slice(pass.indexOf("ctx.clip()"));
  ok(/partialLabel\s*\(/.test(lab) && /SGPLOT\.mL\s*\+\s*pW/.test(lab),
    "…and each label is drawn past the plot's right edge, not over the image");
  ok(/cssRGBA\s*\(\s*"ink-rgb"/.test(lab),
    "…in panel ink, legible in both themes whatever colour its track is");
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

section("R5.7 — three base colours, and string hues as a modifier on top");
{
  const s4 = decomment(b4);
  const tks = /const SG_TRACKS\s*=\s*\{[\s\S]*?\n\};/.exec(s4);
  const tbl = tks ? tks[0] : "";
  ok(/white\s*:/.test(tbl) && /black\s*:/.test(tbl) && /triad\s*:/.test(tbl) &&
     /yellow\s*:/.test(tbl) && /red\s*:/.test(tbl),
    "White, Black, Bright yellow, Bright red and Triad are the stocked track colours");
  ok(tbl !== "" && !/cyan|magenta|\bstring\s*:/.test(tbl),
    "…and cyan, magenta and the old String-hues entry are gone (R5.7)");
  ok(/\[\s*0\s*,\s*0\s*,\s*0\s*\]/.test(tbl) && /\[\s*255\s*,\s*255\s*,\s*255\s*\]/.test(tbl),
    "black and white are the exact extremes no perceptual colormap reaches");

  const fn = name => {
    const i = s4.indexOf("function " + name);
    return i < 0 ? "" : s4.slice(i, s4.indexOf("\nfunction ", i + 10));
  };
  const paint = fn("_trackPaint");
  ok(paint !== "", "_trackPaint() is the one place a track's colour is decided");
  ok(/model\.hue/.test(paint) && /_trackHueRgb\s*\(/.test(paint),
    "…and the string hue is mixed in only when the modifier is on: it is not a colour of its own");
  ok(paint !== "" && !/cssColor|cssRGBA/.test(paint),
    "…never from a theme variable: a data colour is identical in Bright and Dark");
  ok(/STRING_COLORS/.test(fn("_trackHueRgb")) && /liftForDark\s*\(/.test(fn("_trackHueRgb")),
    "the hue is still the six data colours, lifted by the app's own liftForDark()");
  ok(/model\.triadIdx/.test(fn("_trackBaseRgb")),
    "a Triad track is picked by the string's degree in the chord, so harmonics share their note's colour");

  // The Triad defaults are measured, not asserted: three colours a user reads over
  // parula (the case the user named) have to stand off every entry of that colormap
  // and off each other. CIE Lab, same arithmetic as the Look section below.
  const rgb = h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16));
  const lab = c => {
    const f = v => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
    const [r, g, bl] = c.map(f);
    const t = [(0.4124 * r + 0.3576 * g + 0.1805 * bl) / 0.95047,
               0.2126 * r + 0.7152 * g + 0.0722 * bl,
               (0.0193 * r + 0.1192 * g + 0.9505 * bl) / 1.08883]
      .map(v => v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
    return [116 * t[1] - 16, 500 * (t[0] - t[1]), 200 * (t[1] - t[2])];
  };
  const dE = (a, b) => { const x = lab(a), y = lab(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
  const mP = /const SG_TRIAD_DEFAULT\s*=\s*\[([^\]]*)\]/.exec(s4);
  const hex = (mP ? (mP[1].match(/#[0-9a-f]{6}/gi) || []) : []).map(h => h.toLowerCase());
  const cols = hex.map(rgb);
  ok(cols.length === 3, "the Triad palette ships three colours: root, third, fifth");
  let minPair = Infinity;
  for (let i = 0; i < cols.length; i++) for (let j = i + 1; j < cols.length; j++)
    minPair = Math.min(minPair, dE(cols[i], cols[j]));
  ok(minPair > 90, "…far enough apart to tell three voices of one chord apart", minPair.toFixed(1));
  // Until 2026-08-26 this line was a second measured floor: every Triad colour had to
  // stand ΔE > 40 off every entry of parula. The user then named the palette outright —
  // white, bright yellow, bright red — and parula *ends* in bright yellow (#f9fb0e), so
  // the third's track measures ΔE 2.8 from the hottest cells and will vanish inside them.
  // A stated choice outranks a measured one, so the gate pins the choice; the cost is
  // written down here rather than hidden behind a floor the palette no longer meets.
  ok(hex.join(",") === "#ffffff,#ffff00,#ff0000",
    "…and they are the three the user named, in order: root, third, fifth");

  okf("triadDegrees() reads root/third/fifth off the notes themselves", () => {
    const g = D.triadDegrees([40, 45, 52, null, null, null]);   // E2 A2 E3 — root, fourth, root
    const e = D.triadDegrees([40, 47, 52, 56, 59, 64]);          // E major, open
    return g[3] === null && e[0] === 0 && e[1] === 2 && e[2] === 0 && e[3] === 1 && e[4] === 2 && e[5] === 0;
  });
}

section("R5.1 — the pane says what it drew, and the PNG shows it");
{
  const s = decomment(b4);
  ok(/setAttribute\(\s*"data-sgcomb"/.test(s),
    "each pane reports its track count — the canvas is unreachable from node");
  const mSet = /setAttribute\(\s*"data-sgcomb"/.exec(s);
  ok(!!mSet && /removeAttribute\(\s*"data-sgcomb"/.test(s.slice(mSet.index, mSet.index + 400)),
    "…and the same site drops it again when the overlay is off");
  ok((s.match(/removeAttribute\(\s*"data-sgcomb"/g) || []).length >= 2,
    "…and the no-source pass clears it too, as it already clears data-sgwin");
  // A PNG is a picture of what the user is looking at (user request, 2026-08-25).
  // No exporter may blank the overlay, the strings axis or the shown harmonics
  // behind the user's back; CSV/JSON stay data-only, asserted above.
  for (const fn of ["exportSgramPNG", "_cardPng", "exportPNG"]) {
    const i = s.indexOf("function " + fn);
    const body = i < 0 ? "" : s.slice(i, s.indexOf("\nfunction ", i + 10));
    ok(body !== "", fn + "() is in block 4");
    ok(body !== "" && !/state\.(sgFrets|strings|stringHarmonics)\s*=/.test(body),
      "…and " + fn + "() renders the view as it stands, blanking nothing");
  }
}

// The user tested R5.1 and reported three things (2026-08-25): the tracks were hard
// to see, the pane was too short to read frequency in at all, and the harmonic-count
// select did not say what it was for. The colour half is asserted above; these are
// the other two, pinned so a later change has to argue with them.
section("R5.1 — the pane is tall enough to read, and the controls say what they do");
{
  const mH = /#sgramCanvasA,\s*#sgramCanvasB,\s*#sgramCanvasD\s*\{\s*height:\s*(\d+)px/.exec(html);
  const h = mH ? Number(mH[1]) : NaN;
  ok(h >= 340,
    "a spectrogram pane is at least 340 px tall — 60 Hz to 20 kHz on a log axis was " +
    "unreadable in the 230 px the panes shipped with");
  const nar = /@media\s*\(max-width:\s*900px\)[\s\S]{0,4000}?#sgramCanvasA[^}]*height:\s*(\d+)px/.exec(html);
  ok(!!nar && Number(nar[1]) >= 250 && Number(nar[1]) < h,
    "…and the narrow viewport gets its own height, shorter than the wide one but not the old one");

  const sel = /<select id="sgHarmSel"[\s\S]{0,600}?<\/select>/.exec(html);
  const selSrc = sel ? sel[0] : "";
  ok(selSrc !== "", "the overlay's harmonic select is in the markup");
  ok(/\bdisabled\b/.test(selSrc.slice(0, selSrc.indexOf(">"))),
    "…and ships disabled — the limit means nothing until a note is overlaid");
  const opts = selSrc.match(/<option\b[^>]*>([^<]*)<\/option>/g) || [];
  ok(opts.length >= 2 && opts.every(o => /Harmonics\s*1[–-]\d|1st harmonic only/.test(o)),
    "…and every one of its options names what it counts, not a bare number");
  const noteSel = /<select id="sgNoteSel"[\s\S]{0,600}?<\/select>/.exec(html);
  for (const [nm, src] of [["string", noteSel ? noteSel[0] : ""], ["harmonic", selSrc]]) {
    ok(/title="[^"]{20,}"/.test(src.slice(0, src.indexOf(">"))),
      "the " + nm + " select carries a plain-language tooltip");
  }

  const s4 = decomment(b4);
  const iS = s4.indexOf("function syncSgHarmSel");
  const body = iS < 0 ? "" : s4.slice(iS, s4.indexOf("\n}", iS) + 2);
  ok(body !== "", "syncSgHarmSel() is in block 4");
  ok(/sgHarmSel\.disabled\s*=/.test(body) && /state\.sgFrets/.test(body),
    "…and it drives the select's disabled state from whether any note is overlaid");
  // Every door into state.sgFrets has to re-sync, or the greying goes stale. Count
  // nothing — name the doors, and read each one's own body.
  const handler = /sgNoteSel\.addEventListener\s*\(\s*["']change["'][\s\S]*?\n  \}\);/.exec(s4);
  ok(!!handler && /syncSgHarmSel\s*\(\s*\)/.test(handler[0]),
    "…and the note select's own change handler re-syncs it");
  const hook = /sgnote=[\s\S]{0,400}?\n  \}/.exec(s4);
  ok(!!hook && /syncSgHarmSel\s*\(\s*\)/.test(hook[0]),
    "…and so does the ?sgnote= hook, which sets the note without a change event");
  const fill = /function fillSgNoteSel[\s\S]*?\n\}/.exec(s4);
  ok(!!fill && /syncSgHarmSel\s*\(\s*\)/.test(fill[0]),
    "…and the fill that reruns on a tuning change");
  // …and the disabled state has to be *visible*, or the affordance is a no-op.
  ok(/select:disabled\s*\{[^}]*opacity:\s*\.?\d/.test(html),
    "…and a select:disabled rule makes the greying show, the same idiom .seg button uses");
}

// ---------------------------------------------------------- R5.2 wiring ----
// The chord math is already pinned above ("the chords R5.2 will stock, measured
// now so R5.2 cannot drift"). What is left is the picker: the shipped table must
// BE that table, the select must offer it, and the overlay must project it
// through the current tuning rather than a hard-coded set of midi numbers.
section("R5.2 — the stocked chords are the ones the gate measured");
{
  const s = decomment(b4);
  const i = s.indexOf("const SG_CHORDS");
  const src = i < 0 ? "" : s.slice(i, s.indexOf("];", i) + 2);
  ok(src !== "", "SG_CHORDS is a table in block 4, not eight branches of an if");
  let T = null;
  try { T = new Function(src + "\nreturn SG_CHORDS;")(); } catch (e) {}
  ok(Array.isArray(T) && T.length === 8, "…of eight open chords",
    T ? String(T.length) : "unevaluable");
  // The same table this file measured at R5.0. Deep-compared, not name-compared:
  // a right name over a wrong shape would silently move every cluster count.
  const MEASURED = { E: [0, 2, 2, 1, 0, 0], Em: [0, 2, 2, 0, 0, 0],
    A: [null, 0, 2, 2, 2, 0], Am: [null, 0, 2, 2, 1, 0],
    C: [null, 3, 2, 0, 1, 0], D: [null, null, 0, 2, 3, 2],
    Dm: [null, null, 0, 2, 3, 1], G: [3, 2, 0, 0, 0, 3] };
  const shipped = {};
  if (Array.isArray(T)) for (const ch of T) shipped[ch.name] = ch.frets;
  ok(Object.keys(MEASURED).every(k => Array.isArray(shipped[k])),
    "…named E, Em, A, Am, C, D, Dm, G — the names the cluster counts were measured under",
    Object.keys(shipped).join(","));
  const mismatch = Object.keys(MEASURED).filter(k =>
    !Array.isArray(shipped[k]) ||
    shipped[k].length !== 6 ||
    shipped[k].some((f, j) => !Object.is(f, MEASURED[k][j])));
  ok(mismatch.length === 0,
    "…and every one of their fret shapes is the shape measured at R5.0",
    mismatch.join(","));
  ok(Array.isArray(T) && T.every(ch => ch.frets.every(f =>
    f === null || (Number.isInteger(f) && f >= 0 && f <= 24))),
    "…each slot a real fret or null for muted — a fret is an offset, never a midi number");
}

section("R5.2 — a chord is fret offsets from the current tuning");
{
  const s = decomment(b4);
  const i = s.indexOf("function sgramModelFor");
  const body = i < 0 ? "" : s.slice(i, s.indexOf("\nfunction ", i + 10));
  ok(body !== "", "sgramModelFor() is in block 4");
  // Name the tuning array the model actually built, then require the fret to be
  // added to THAT array at the string's own index — "+ fr" alone would be satisfied
  // by a hard-coded 40 + fr, which is E standard's low E and nothing else.
  const openVar = /const\s+(\w+)\s*=\s*tuningMidi\s*\(\s*state\.tuning/.exec(body);
  const mapExpr = /state\.sgFrets\.map\(([\s\S]{0,240}?)\)\s*;/.exec(body);
  ok(!!openVar && !!mapExpr &&
     new RegExp("\\b" + openVar[1] + "\\s*\\[\\s*si\\s*\\]\\s*\\+\\s*fr\\b").test(mapExpr[1]),
    "…and it adds each fret to that string's OPEN midi — Drop D moves the chord with it");
  ok(/_sgChordName\s*\(\s*state\.sgFrets\s*\)/.test(body),
    "…and the status chip asks the table for a name before falling back to a note name");
  ok(/statusText[\s\S]{0,400}combNote/.test(body),
    "…so the pane prints 'C' rather than 'A2 · 5 notes' when the shape is stocked");

  const iN = s.indexOf("function _sgChordName");
  const nm = iN < 0 ? "" : s.slice(iN, s.indexOf("\n}", iN) + 2);
  ok(nm !== "", "_sgChordName() is in block 4");
  ok(/every\s*\(/.test(nm) && /frets\.length\s*===\s*6/.test(nm),
    "…and it names a shape only when all six slots match — no partial-credit naming");
}

section("R5.2 — the picker offers them, and hands out copies");
{
  const s = decomment(b4);
  const fill = /function fillSgNoteSel[\s\S]*?\n\}/.exec(s);
  const f = fill ? fill[0] : "";
  ok(f !== "", "fillSgNoteSel() builds the select");
  ok(/optgroup label="Open chord"/.test(f) && /optgroup label="Single string"/.test(f),
    "…in two labelled groups — one string, or one chord");
  ok(/for\s*\(\s*const\s+ch\s+of\s+SG_CHORDS\s*\)[\s\S]{0,200}?value="chord:/.test(f),
    "…and the chord options are built FROM the table, so a ninth chord needs no second edit");
  ok(/<option value="off">/.test(f),
    "…with Off still first — the overlay is opt-in");

  const handler = /sgNoteSel\.addEventListener\s*\(\s*["']change["'][\s\S]*?\n  \}\);/.exec(s);
  const h = handler ? handler[0] : "";
  ok(h !== "", "the note select has a change handler");
  ok(/startsWith\s*\(\s*["']chord:["']\s*\)/.test(h),
    "…which reads the chord: prefix rather than guessing from the label");
  ok(/\.frets\.slice\s*\(\s*\)/.test(h),
    "…and copies the frets — aliasing SG_CHORDS would let ?sgnote= write into the table");
  ok(/state\.sgFrets\s*=\s*\[\s*(null\s*,\s*){5}null\s*\]/.test(h),
    "…after muting all six, so switching chords never leaves a string ringing from the last one");
}

section("R5.2 — the chord hook, for a gate that cannot see a canvas");
{
  const s = decomment(b4);
  const hook = /sgchord=[\s\S]{0,500}?\n  \}/.exec(s);
  const k = hook ? hook[0] : "";
  ok(k !== "", "?sgchord=<name> exists — the picker is unreachable from node otherwise");
  ok(/SG_CHORDS\.find\s*\(/.test(k),
    "…resolving the name against the same table the select is built from");
  ok(/state\.sgFrets\s*=\s*\[\s*(null\s*,\s*){5}null\s*\]/.test(k),
    "…muting first, so an unstocked name selects nothing instead of half a chord");
  ok(/\.frets\.slice\s*\(\s*\)/.test(k), "…handing out a copy, as the change handler does");
  ok(/syncSgHarmSel\s*\(\s*\)/.test(k) && /requestDraw\s*\(\s*\)/.test(k),
    "…and re-syncing the harmonic select and redrawing, like every other door into sgFrets");
  ok(/sgNoteSel\.value\s*=\s*["']chord:["']\s*\+/.test(k),
    "…and it moves the visible select too — the hook must not lie about what is overlaid");
  // Like ?sgnote=/?sgharm=, this is a gate hook: no UI, nothing persisted.
  ok(!/gsChord|["']sgchord["']\s*:/.test(s),
    "…and nothing about it is remembered — no localStorage key, no settings field");
}


// ------------------------------------------------------------- R5.6 -------
// Legibility of the overlay itself: what each track is called, a sheet between
// the measurement and the tracks, and press-and-hold to follow one comb.
section("R5.6 — partialLabel(): which harmonic, and where it lands");
{
  const L = (midi, harm, f) => D.partialLabel({ key: 0, midi, harm, f }, 440);
  const F = (midi, harm) => D.midiToFreq(midi, 440) * harm;
  okf("the fundamental is named, not multiplied — 'E2', never 'E2 ×1 = E2'",
    () => L(40, 1, F(40, 1)) === "E2", () => L(40, 1, F(40, 1)));
  okf("the octave reads E2 ×2 = E3 — a doubling is one octave, not two",
    () => L(40, 2, F(40, 2)) === "E2 ×2 = E3", () => L(40, 2, F(40, 2)));
  okf("…×3 lands a twelfth up: E2 ×3 = B3 (+2 ¢, inside the locked tier)",
    () => L(40, 3, F(40, 3)) === "E2 ×3 = B3", () => L(40, 3, F(40, 3)));
  okf("…×4 = E4", () => L(40, 4, F(40, 4)) === "E2 ×4 = E4", () => L(40, 4, F(40, 4)));
  okf("…but ×5 is 14 ¢ flat of G♯4, so the label says ≈ and does not lie",
    () => L(40, 5, F(40, 5)) === "E2 ×5 ≈ G♯4", () => L(40, 5, F(40, 5)));
  okf("…and ×7 is 31 ¢ flat of D5 — ≈ again",
    () => L(40, 7, F(40, 7)) === "E2 ×7 ≈ D5", () => L(40, 7, F(40, 7)));
  // The = / ≈ boundary is R3's locked tier, not a number invented for a label.
  okf("exactly COINCIDENCE_CENTS off still reads = ",
    () => / = /.test(L(40, 2, D.midiToFreq(52, 440) * Math.pow(2, D.COINCIDENCE_CENTS / 1200))),
    () => L(40, 2, D.midiToFreq(52, 440) * Math.pow(2, D.COINCIDENCE_CENTS / 1200)));
  okf("one cent past it reads ≈",
    () => / ≈ /.test(L(40, 2, D.midiToFreq(52, 440) * Math.pow(2, (D.COINCIDENCE_CENTS + 1) / 1200))),
    () => L(40, 2, D.midiToFreq(52, 440) * Math.pow(2, (D.COINCIDENCE_CENTS + 1) / 1200)));
}

section("R5.6a — the sheet, between the measurement and the tracks");
{
  const s = decomment(b3);
  const m = /function drawSpectrogramScene[\s\S]*?\n\}/.exec(s);
  const sc = m ? m[0] : "";
  ok(sc !== "", "drawSpectrogramScene() is in block 3");
  const iImg = sc.indexOf("drawImage");
  const iScrim = sc.search(/if\s*\(\s*model\.scrim\s*>\s*0/);
  const iComb = sc.search(/if\s*\(\s*model\.comb\s*&&\s*model\.comb\.length\s*\)/);
  ok(iScrim > 0, "there is a scrim pass gated on model.scrim");
  ok(iImg > 0 && iScrim > iImg, "…drawn after the spectrogram image, not under it");
  ok(iComb > 0 && iScrim < iComb, "…and before the tracks, which have to read against it");
  const blk = iScrim > 0 ? sc.slice(iScrim, iScrim + 400) : "";
  ok(/model\.comb/.test(blk),
    "…and only when there IS an overlay — a sheet over a bare spectrogram costs contrast and buys nothing");
  ok(/rgba\(0,\s*0,\s*0,\s*"\s*\+\s*model\.scrim/.test(blk.replace(/\s+/g, m => m.includes("\n") ? "\n" : " ")),
    "…black at the model's own opacity — the sheet is a data-side dimmer, not a themed surface");
  ok(/fillRect\s*\(\s*SGPLOT\.mL\s*,\s*SGPLOT\.mT\s*,\s*pW\s*,\s*pH\s*\)/.test(blk),
    "…covering the plot rect exactly, so the axes and margins stay bright");
  const mf = /function sgramModelFor[\s\S]*?\n\}/.exec(decomment(b4));
  const mb = mf ? mf[0] : "";
  ok(/scrim\s*:\s*state\.sgScrim/.test(mb), "sgramModelFor() publishes state.sgScrim as model.scrim");
}

section("R5.6b — every track says which harmonic it is");
{
  const s = decomment(b3);
  const m = /function drawSpectrogramScene[\s\S]*?\n\}/.exec(s);
  const sc = m ? m[0] : "";
  const cm = /if\s*\(\s*model\.comb\s*&&\s*model\.comb\.length\s*\)\s*\{[\s\S]*?\n  \}/.exec(sc);
  const cp = cm ? cm[0] : "";
  ok(cp !== "", "the comb pass is one block — tracks and their labels together");
  ok(/partialLabel\s*\(/.test(cp),
    "…and the text comes from block 0's partialLabel(), not a second spelling of the same arithmetic");
  ok(/fillText\s*\(/.test(cp) && /cssRGBA\s*\(\s*"ink-rgb"/.test(cp),
    "…drawn in panel ink outside the plot (R5.7), where it hides no measurement and needs no halo");
  ok(/_trackPaint\s*\(\s*model\s*,\s*p\.key/.test(cp),
    "…tied to its line by a leader tick in the track's own colour");
  ok(/sort\s*\(/.test(cp),
    "…placed in a deterministic order, or the guard below would keep a different label each redraw");
  ok(/continue\s*;/.test(cp) && /Math\.abs\s*\([^)]*\)\s*<\s*\d/.test(cp),
    "…and a label that would touch its neighbour is SKIPPED, never smeared (M2.6c's rule)");
  ok(/return\s+nLabels\s*;/.test(sc),
    "…and the scene reports how many it drew — the canvas is unreachable from node");
}

section("R5.6c — press and hold to follow one comb");
{
  const s3 = decomment(b3);
  const m = /function drawSpectrogramScene[\s\S]*?\n\}/.exec(s3);
  const cm = /if\s*\(\s*model\.comb\s*&&\s*model\.comb\.length\s*\)\s*\{[\s\S]*?\n  \}/.exec(m ? m[0] : "");
  const cp = cm ? cm[0] : "";
  ok(/model\.focus/.test(cp), "the comb pass reads model.focus");
  ok(/model\.dim/.test(cp), "…and model.dim — the fade is tunable, not baked in");
  ok(/p\.key\s*===?\s*(foc|model\.focus)/.test(cp),
    "…dimming by key, so the whole comb of the held track stays lit, not just that one partial");
  ok(/_trackPaint\s*\(\s*model\s*,\s*p\.key\s*,\s*[a-z]/i.test(cp),
    "…and the fade goes through the track colour's alpha, not a second overlay");

  const s4 = decomment(b4);
  const fm = /function attachSgFocus[\s\S]*?\n\}/.exec(s4);
  const fb = fm ? fm[0] : "";
  ok(fb !== "", "attachSgFocus() exists");
  ok(/mousedown/.test(fb) && /mouseup/.test(fb) && /mouseleave/.test(fb),
    "…it is a press and a release — hold, look, let go");
  ok(/mousemove/.test(fb),
    "…and a drag cancels it, handing the gesture back to the zoom box");
  ok(/state\.sgFocus\s*=\s*null/.test(fb), "…leaving no focus behind");
  const hm = /function _sgTrackAt[\s\S]*?\n\}/.exec(s4);
  const hb = hm ? hm[0] : "";
  ok(hb !== "" && /notePartials\s*\(/.test(hb),
    "the hit test asks notePartials() where the tracks are — one source for the pixels and the target");
  ok(hb !== "" && /sgramZoomWin\s*\(/.test(hb),
    "…through the pane's own zoom window, so a zoomed pane's targets follow its pixels");
  ok(/syncSgHarmSel[\s\S]{0,200}?state\.sgFocus\s*=\s*null/.test(s4),
    "…and changing what is overlaid drops a stale focus, at the same door every sgFrets write goes through");
}

section("R5.6 — the two tunables, and what they must not touch");
{
  const s = decomment(b4);
  // Both re-set by the user on 2026-08-26 after looking at the thing on real material:
  // a lighter sheet (the measurement stays readable under it) and a shallower fade (an
  // unheld comb is still legible). Pinned because they are a stated choice, not a guess.
  ok(/sgScrim\s*:\s*0\.10/.test(s), "state.sgScrim defaults to 0.10");
  ok(/sgDim\s*:\s*0\.80/.test(s), "state.sgDim defaults to 0.80");
  ok(/sgFocus\s*:\s*null/.test(s), "state.sgFocus starts empty — nothing is held");
  ok(/id="sgScrimRange"[^>]*type="range"|type="range"[^>]*id="sgScrimRange"/.test(html),
    "the sheet has a slider in the Overlay controls");
  ok(/id="sgDimRange"[^>]*type="range"|type="range"[^>]*id="sgDimRange"/.test(html),
    "…and so does the focus fade");
  const sy = /function syncSgHarmSel[\s\S]*?\n\}/.exec(s);
  const sb = sy ? sy[0] : "";
  ok(/sgScrimRange\.disabled/.test(sb) && /sgDimRange\.disabled/.test(sb),
    "…both greyed out until something is overlaid, at the same door the harmonic select uses");
  ok(/input\[type=range\]:disabled/.test(html),
    "…and the greying is visible — a disabled range that looks live is a lie");
  // Debug tunables and a transient gesture: none of the three is analysis state.
  const sv = /function saveSettings[\s\S]*?\n\}/.exec(s);
  ok(sv && !/sgScrim|sgDim|sgFocus/.test(sv[0]),
    "none of the three is remembered — they are a debugging aid, not a preference");
  for (const fn of ["exportSgramPNG", "_cardPng", "exportPNG"]) {
    const i = s.indexOf("function " + fn);
    const body = i < 0 ? "" : s.slice(i, s.indexOf("\nfunction ", i + 10));
    ok(body !== "" && !/state\.(sgScrim|sgDim|sgFocus)\s*=/.test(body),
      fn + "() still renders the view as it stands, blanking nothing");
  }
}

section("R5.6 — the hooks, and the pane attributes a node gate can read");
{
  const s = decomment(b4);
  ok(/sgscrim=/.test(s), "?sgscrim= exists");
  ok(/sgdim=/.test(s), "?sgdim= exists");
  ok(/sgfocus=\(\[0-5\]\)/.test(s),
    "?sgfocus= takes a string index only — out of range holds nothing");
  ok(!/gsScrim|gsDim|gsFocus|["'](sgscrim|sgdim|sgfocus)["']\s*:/.test(s),
    "…and nothing about them is remembered, like every other gate hook");
  const da = /function drawAll[\s\S]*?\n\}/.exec(s);
  const d = da ? da[0] : "";
  ok(/data-sglabels/.test(d), "each pane reports how many labels it drew");
  ok(/data-sgfocus/.test(d), "…and which comb it is holding, if any");
  ok(/removeAttribute\s*\(\s*"data-sglabels"\s*\)/.test(d) && /removeAttribute\s*\(\s*"data-sgfocus"\s*\)/.test(d),
    "…and clears both when there is nothing to report");
}
// ---------------------------------------------------------- R5.3 wiring ----
// A chord's tracks cross; R5.3 marks where they land on the same pitch and says
// what that landing is, as a ratio. The math half is clusterRatio(); the copy half
// is the third frozen block; the wiring half is one draw pass and one door.
const crypto = require("crypto");

section("R5.3 — clusterRatio(): a landing read back as whole numbers");
{
  // A hand-built member: key picks the string, harm the partial, midi its fundamental.
  const M = (key, midi, harm, f) => ({ key, midi, harm, f: f === undefined ? 100 : f });
  const CL = (members, tier) => ({ f: members[0].f, tier: tier || "locked",
    spreadCents: 0, members });

  okf("one string is not a collision — null, not a one-term ratio",
    () => D.clusterRatio(CL([M(0, 40, 2), M(0, 40, 4)])) === null);
  okf("a member with no harmonic number refuses to be named",
    () => D.clusterRatio(CL([M(0, 40, 2), M(1, 45, 0)])) === null);
  okf("an octave pair reads 1 : 2, and has a name",
    () => { const r = D.clusterRatio(CL([M(0, 40, 2), M(1, 52, 1)]));
            return r.text === "1 : 2" && r.name === "octave"; });
  okf("a string reaches the meeting by its LOWEST colliding harmonic",
    () => { const r = D.clusterRatio(CL([M(0, 40, 4), M(0, 40, 2), M(1, 47, 3)]));
            return r.terms.length === 2 && r.terms.some(t => t.key === 0 && t.harm === 2); });
  okf("the ratio comes out in lowest terms — harmonics 6 and 4 give 2 : 3, not 6 : 4",
    () => D.clusterRatio(CL([M(0, 40, 6), M(1, 47, 4)])).text === "2 : 3");
  okf("…and sorted ascending, so the lowest fundamental is written first",
    () => { const n = D.clusterRatio(CL([M(0, 40, 3), M(1, 47, 2), M(2, 52, 1)])).nums;
            return n.join(",") === "2,3,6"; });
  okf("a ratio the app has no name for stays unnamed rather than guessed at",
    () => { const r = D.clusterRatio(CL([M(0, 40, 5), M(1, 47, 2)]));
            return r.text === "2 : 5" && r.name === null; });

  // The fold: a string an octave above another contributes the same pitch class, so
  // its term is a power-of-two multiple. Setting those aside is what lets a four-string
  // landing still be recognised as the triad it is.
  okf("octave doublings fold away before naming — 4 : 5 : 6 : 10 is still a major triad",
    () => { const r = D.clusterRatio(CL([M(0, 40, 15), M(1, 45, 12), M(2, 50, 10), M(3, 57, 6)]));
            return r.text === "4 : 5 : 6 : 10" && r.foldText === "4 : 5 : 6" && r.name === "major triad"; });
  okf("…and only EXACT octaves fold: 5 : 8 keeps both terms and stays unnamed",
    () => { const r = D.clusterRatio(CL([M(0, 40, 8), M(1, 49, 5)]));
            return r.foldText === null && r.name === null; });
  okf("a ratio that needs no fold reports none",
    () => D.clusterRatio(CL([M(0, 40, 3), M(1, 47, 2)])).foldText === null);
}

section("R5.3 — measured against the stocked chords, so the copy cannot drift");
{
  const open = D.tuningMidi("estd", 0);
  const clustersOf = (frets, n) => {
    const midis = frets.map((fr, si) => fr == null ? null : open[si] + fr);
    return PC(NP(midis, n), D.TEMPERED_CENTS);
  };
  const E = clustersOf([0, 2, 2, 1, 0, 0], 8);
  const C16 = clustersOf([null, 3, 2, 0, 1, 0], 16);
  const near = (cs, f) => cs.find(c => Math.abs(c.f - f) < 1);

  okf("open E, harmonics 1–8: the landing at 247 Hz is three strings on 2 : 3 : 6",
    () => { const r = D.clusterRatio(near(E, 247.0));
            return r.text === "2 : 3 : 6" && r.foldText === "2 : 3" && r.name === "perfect fifth"; });
  okf("…and the one at 414 Hz is 2 : 5 — a real landing the app declines to name",
    () => { const r = D.clusterRatio(near(E, 413.7));
            return r.text === "2 : 5" && r.name === null; });
  okf("open C, harmonics 1–16: four strings meet at 1969 Hz as 4 : 5 : 6 : 10",
    () => { const r = D.clusterRatio(near(C16, 1969.4));
            return r.text === "4 : 5 : 6 : 10" && r.name === "major triad"; });
  okf("…and that landing is tempered, not locked — the third pays for even keys",
    () => near(C16, 1969.4).tier === "tempered");

  // Nothing improvised: every name the app ever prints comes from the fixed table.
  const NAMES = ["major triad", "minor triad", "octave", "perfect fifth",
    "perfect fourth", "major third", "minor third"];
  const CHORDS = { E: [0,2,2,1,0,0], Em: [0,2,2,0,0,0], A: [null,0,2,2,2,0],
    Am: [null,0,2,2,1,0], C: [null,3,2,0,1,0], D: [null,null,0,2,3,2],
    Dm: [null,null,0,2,3,1], G: [3,2,0,0,0,3] };
  let total = 0, named = 0, bad = 0, nulls = 0;
  for (const k of Object.keys(CHORDS)) for (const n of [8, 16]) {
    for (const c of clustersOf(CHORDS[k], n)) {
      total++;
      const r = D.clusterRatio(c);
      if (!r) { nulls++; continue; }
      if (r.terms.length !== new Set(c.members.map(m => m.key)).size) bad++;
      if (r.name) { named++; if (NAMES.indexOf(r.name) < 0) bad++; }
    }
  }
  ok(total > 100 && nulls === 0,
    "every cluster of every stocked chord names a ratio — a cluster is two keys by definition",
    total + " clusters, " + nulls + " unnamed");
  ok(named > 40 && bad === 0,
    "…one term per string, and every name drawn from the fixed vocabulary",
    named + " named, " + bad + " wrong");
}

// ------------------------------------------------------- the R5.3 copy ----
const C_START = "// ---------- collision clusters: the ✦ popover (R5.3) ----------";
const C_END = "// ---------- end collision copy ----------";

section("R5.3 copy — frozen, and it renders on real math");
{
  const i = html.indexOf(C_START), j = html.indexOf(C_END);
  ok(i > 0 && j > i, "both copy sentinels are present");
  if (i > 0 && j > i) {
    const block = html.slice(i, j + C_END.length) + "\n";
    const sha = crypto.createHash("sha256").update(block).digest("hex");
    ok(sha === process.env.R53_SHA_OVERRIDE ||
       sha === "1da64ae24f7201c825b0c3a7c5a4c8962e4996fb5c7af051bb31b539ba69cf7b",
      "the copy block is byte-identical to the reviewed text", sha.slice(0, 16));

    const copy = decomment(block);
    ok(!/§|\.md\b|THEORY|ROADMAP/.test(copy),
      "the copy states the physics without citing its homework");
    ok(/\+\s*TEMPERED_CENTS\s*\+/.test(copy) && /\+\s*COINCIDENCE_CENTS\s*\+/.test(copy),
      "the two tolerances are read from the constants, never retyped as prose");
    ok(!/["'][^"']*\b(20|6) ¢/.test(copy),
      "…so no sentence can go stale when a tier moves");

    // Execute it: block 0 supplies the math, block 4 the ordinals and formatters,
    // and only `esc` and `state` are stubs — the same shape as the R4 copy test.
    const need = b4.slice(b4.indexOf("const STRING_ORD="), j - html.indexOf(b4) + C_END.length);
    const shim = 'const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",' +
      '">":"&gt;","\\"":"&quot;"}[c]));\nconst state={a4:440,tuning:"estd",customOffset:0,' +
      "tolCents:6,stringHarmonics:[[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]]};\n" +
      "function fmtHz(f){return f.toFixed(2)+' Hz';}\n" +
      "function getComputedStyle(){return {getPropertyValue:()=>'#888'};}\n";
    let C = null, err = null;
    try {
      C = new Function(blocks[0] + "\n" + shim + "\n" + need +
        "\nreturn {clusterContentHtml,clusterTermLine,notePartials,partialClusters," +
        "tuningMidi,TEMPERED_CENTS};")();
    } catch (e) { err = e; }
    ok(!!C, "the copy block executes on top of real block-0 math", err && err.message);

    if (C) {
      const openM = C.tuningMidi("estd", 0);
      const chord = f => C.partialClusters(
        C.notePartials(f.map((fr, si) => fr == null ? null : openM[si] + fr), 16, 440),
        C.TEMPERED_CENTS);
      const E = chord([0, 2, 2, 1, 0, 0]);
      const C16 = chord([null, 3, 2, 0, 1, 0]);
      const at = (cs, f) => cs.find(c => Math.abs(c.f - f) < 1);
      const txt = h => h.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

      ok(C.clusterContentHtml(null) === "", "no cluster, no copy");

      const fifth = txt(C.clusterContentHtml(at(E, 247.0)));
      ok(/Three strings meet at B3/.test(fifth),
        "a three-string landing counts itself and names the pitch", fifth.slice(0, 60));
      ok(/whole-number ratio 2 : 3 : 6/.test(fifth) && /that is 2 : 3 — the perfect fifth/.test(fifth),
        "reads the ratio off the harmonics, then folds the octave to name it");
      ok(/sounding the same pitch here/.test(fifth) && !/near miss/.test(fifth),
        "a locked landing is described as one pitch, not as beating");

      const third = txt(C.clusterContentHtml(at(C16, 1969.4)));
      ok(/4 : 5 : 6 : 10/.test(third) && /4 : 5 : 6 — the major triad/.test(third),
        "the four-string landing is folded back to the triad it is");
      ok(/piece of one/.test(third),
        "and the triad carries the note about being a segment of one series");
      ok(/very nearly meet here/.test(third) && /major third sits about 14 ¢ sharp/.test(third),
        "a tempered landing says what temperament did to it");

      // Beating vs roughness: the copy switches on the measured Hz difference, and
      // both branches must be reachable from the stocked chords.
      const all = [].concat(E, C16, chord([3, 2, 0, 0, 0, 3])).map(c => txt(C.clusterContentHtml(c)));
      ok(all.some(t => /that slow wah is the sound of a near miss/.test(t)),
        "a slow near miss is called beating");
      ok(all.some(t => /too fast to count/.test(t)),
        "…and a fast one is called roughness");
      ok(all.every(t => t === "" || /How Claude Rameau places it/.test(t)),
        "every landing shows its own arithmetic, not just its verdict");

      const line = C.clusterTermLine({ midi: 40, harm: 3, f: 247.02 }, 440);
      ok(/E2 ×3 = /.test(line), "each term prints as note × harmonic = frequency", line);
    }
  }
}

section("R5.3 — the marks: the model finds them, one draw pass places them");
{
  const s = decomment(b3);
  const m = /function sgramModelFor[\s\S]*?\n\}/.exec(decomment(b4));
  const mm = m ? m[0] : "";
  ok(/partialClusters\s*\(\s*comb\s*,\s*TEMPERED_CENTS\s*\)/.test(mm),
    "the model clusters its own comb at the tempered tier — one detector, never two");
  const ret = /return\s*\{[\s\S]*?\n\}/.exec(mm);
  ok(ret && /[{,]\s*clusters\s*[,}]/.test(ret[0]),
    "…and publishes them on the model, so the draw pass reads the model and not the state");

  const d = /function drawSpectrogramScene[\s\S]*?\n\}/.exec(s);
  const body = d ? d[0] : "";
  const pass = /if\s*\(\s*model\.clusters[\s\S]*?\n  \}/.exec(body);
  const p = pass ? pass[0] : "";
  ok(p !== "", "there is a pass over model.clusters");
  // The pass places the marks, then draws the key that says what they mean. The two
  // answer to different rules — a mark is data (fixed cream, never themed), the key's
  // label is chrome (themed ink on the panel margin) — so read them apart.
  const kAt = p.indexOf("const ky");
  const pm = kAt < 0 ? p : p.slice(0, kAt), pk = kAt < 0 ? "" : p.slice(kAt);
  ok(/starPath\s*\(/.test(pm) && !/fillText\s*\(\s*["']✦/.test(body),
    "the mark is a drawn path, never the ✦ glyph — R3's lesson, kept");
  ok(!/_trackColor|_stringColor|cssColor|cssRGBA/.test(pm),
    "the landing belongs to neither string, so it takes no guitar accent and no themed ink");
  ok(/tier\s*===\s*["']locked["']/.test(pm) && /\.fill\(\)/.test(pm) && /\.stroke\(\)/.test(pm),
    "locked is filled, tempered is hollow — the tier is visible before the click");
  ok(/hits\.push\s*\(\s*\{[^}]*cluster/.test(pm),
    "each mark registers a click target carrying its own cluster");
  ok(/model\.focus/.test(pm) && /model\.dim/.test(pm),
    "…and a held comb dims the marks that are not in it, like the tracks");
  ok(/f\s*<\s*fw\.F0\s*\|\|[\s\S]{0,20}fw\.F1/.test(pm),
    "a landing outside the pane's frequency window is not drawn");
  ok(/stride/.test(pm) && !/18/.test(pm),
    "the thinning is by x spacing, the axis the marks actually spread along");

  // The key (user request, 2026-08-26). A star alone cannot say what filled and hollow
  // mean, so the pane says it — above the plot, in a row the top margin grows to make.
  ok(pk !== "", "the marks come with a key");
  ok(/starPath\s*\(/.test(pk) && /\.fill\(\)/.test(pk) && /\.stroke\(\)/.test(pk),
    "…which shows both marks as the pane draws them, filled and hollow, not described in words");
  ok(/COINCIDENCE_CENTS/.test(pk),
    "…and prints the tolerance from the tier constant, never a number typed into a caption");
  ok(/cmapColor\s*\(/.test(pk),
    "…each on a chip of the colormap's own floor: a cream star on a cream panel is nothing");
  ok(/SG_MT_BASE/.test(pk) && /SG_MT_KEY/.test(s), "…in a row of its own, never over the image");
  const mt = /SGPLOT\.mT\s*=[^\n]*/.exec(body);
  ok(mt && /model\.clusters/.test(mt[0]) && /SG_MT_KEY/.test(mt[0]),
    "the top margin grows for the key and shrinks again when there is no mark");
  ok(mt && !/fWin|zoom/.test(mt[0]),
    "…off the whole cluster set, not this pane's window: SGPLOT is shared, and the crosshair reads it live");
  ok(mt && body.indexOf(mt[0]) < body.search(/pH\s*=\s*h\s*-/),
    "…and it is set before pH is derived from it, like the label margin above");
  ok(/SG_MT_BASE\s*=\s*30\b/.test(s),
    "a pane with no marks keeps the margin it always had — nothing moves until something is found");
}

section("R5.3 — the door, and what a node gate can count");
{
  const s = decomment(b4);
  const ocp = /function openClusterPopover[\s\S]*?\n\}/.exec(s);
  ok(ocp && /clusterContentHtml\s*\(/.test(ocp[0]),
    "a cluster opens the frozen copy through its own door");
  const ah = /function attachHitClicks[\s\S]*?\n\}/.exec(s);
  ok(ah && /hh\.cluster/.test(ah[0]) && /openClusterPopover\s*\(/.test(ah[0]),
    "the shared hit dispatcher recognises a cluster hit");
  ok(/attachHitClicks\s*\(\s*sgramCanvases\s*\[\s*0\s*\]/.test(s) &&
     /attachHitClicks\s*\(\s*sgramCanvases\s*\[\s*1\s*\]/.test(s),
    "…and both spectrogram panes are wired to it");
  const cross = /function attachSgramCrosshair[\s\S]*?\n\}/.exec(s);
  ok(cross && /["']help["']/.test(cross[0]),
    "a mark hovers the help cursor, like every other canvas doc target");

  const tryOpen = /const tryOpen[\s\S]*?\n    \};/.exec(s);
  ok(tryOpen && /\^clu/.test(tryOpen[0]) && /openClusterPopover\s*\(/.test(tryOpen[0]),
    "?pop=clu<N> pins the Nth cluster's popover — the canvas is unreachable from node");
  ok(!/gsClusters|["']sgclusters["']\s*:/.test(s),
    "nothing about the marks is remembered — they are a reading of the overlay");
  const da = /function drawAll[\s\S]*?\n\}/.exec(s);
  const d = da ? da[0] : "";
  ok(/setAttribute\s*\(\s*"data-sgclusters"/.test(d), "each pane reports how many marks it drew");
  // Twice: once when a pane drew no marks, once when the card is folded and neither pane
  // drew at all. A stale count is worse than none — it would read as marks a reader can click.
  ok((d.match(/removeAttribute\s*\(\s*"data-sgclusters"\s*\)/g) || []).length === 2,
    "…and clears the count both when a pane finds nothing and when the card is folded");
  ok(/sgHits\s*\[\s*i\s*\]\.filter\([\s\S]{0,40}cluster/.test(d),
    "the count is the marks actually drawn, not the clusters found");
}

// The look pass (user request, 2026-08-26): the picture gets a choice of perceptual
// colormap, and the lines drawn on it get a color that can sit outside every one of
// them — which is what lets the halo go away. Kept deliberately light: this was asked
// for as an experiment, so the gate holds the contracts that would silently rot
// (a colormap that isn't perceptual, a halo that comes back, a dash that isn't finer).
section("Look — five perceptual colormaps, parula the default");
{
  const s = decomment(blocks[0]);
  const names = /const CMAP_NAMES\s*=\s*\[([^\]]*)\]/.exec(s);
  ok(names, "the colormaps are a named list, so the selector cannot drift from the tables");
  const list = names ? names[1].split(",").map(x => x.trim().replace(/["']/g, "")) : [];
  // The list is the selector's order and its head is the default; both were set by the
  // user on 2026-08-26 after seeing all five on real material. magma stays stocked (and
  // stays byte-identical to MAGMA, asserted below) — it is no longer what you open on.
  ok(list.join(",") === "parula,viridis,cividis,magma,inferno",
    "parula first, then viridis, cividis, magma, inferno — the order the user asked for");
  for (const n of list) {
    const tab = D.cmapTable(n);
    ok(tab.length === 768, n + ": 256 entries, packed flat");
    // Perceptual means lightness rises with level. Sampled, not eyeballed: the CIE L*
    // of the last entry must clear the first by a wide margin and never turn back far.
    const L = i => {
      const [r, g, b] = [tab[i * 3], tab[i * 3 + 1], tab[i * 3 + 2]].map(v => {
        const c = v / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      return y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y;
    };
    ok(L(255) - L(0) > 55, n + ": lightness rises from floor to ceiling");
    let back = 0;
    for (let i = 1; i < 256; i++) back = Math.min(back, L(i) - L(i - 1));
    ok(back > -2.5, n + ": and never doubles back — no rainbow");
  }
  ok(/MAGMA_HEX/.test(s) && /function magmaColor/.test(s),
    "magmaColor survives by name — tests/dsp.test.js and every old caller still read it");
}

section("Look — the line style is a table, and it never reaches the FFT");
{
  const s = decomment(b4);
  const dsh = /const SG_DASHES\s*=\s*\{[\s\S]*?\n\};/.exec(s);
  ok(dsh, "the dash patterns are a table");
  const fine = dsh && /fine\s*:\s*\{[^}]*pat\s*:\s*\[\s*(\d+)\s*,\s*(\d+)\s*\]/.exec(dsh[0]);
  ok(fine && Number(fine[1]) + Number(fine[2]) < 10,
    "…including a pattern finer than the default, for a crowded chord");
  // R5.7 put [6,4] back as the default: fine dots read as a solid line once six combs
  // are on the pane, which is the case the overlay exists for.
  ok(/sgDash\s*:\s*["']dash["']/.test(s), "and dashes are what the app starts with");

  ok(!/gsSgCmap|gsSgTrack|gsSgDash|gsSgHue|gsSgTriad/.test(s) &&
     !/["'](sgCmap|sgTrack|sgDash|sgHue|sgTriad)["']\s*:/.test(
      (/function _cardStateFor[\s\S]*?\n\}/.exec(s) || [""])[0]),
    "none of the look state is persisted or exported — view state, like the rest of R5.6");
  const mf = /function sgramModelFor[\s\S]*?\n\}/.exec(s);
  const keyLines = mf ? mf[0].split("\n").filter(l => /key\s*=/.test(l)) : [];
  ok(keyLines.length >= 2 && !/sgTrack|sgDash|sgHue|sgTriad/.test(keyLines.join("\n")),
    "…and no line style reaches the refine cache key: restyling must not re-run an FFT");
}

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
