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
  ok(/rgba\(0,\s*0,\s*0,\s*0?\.75\)/.test(pass),
    "a black halo carries the line over the magma — the colormap never themes");
  ok(/_trackColor\s*\(/.test(pass), "the hue is the string's own data color, lifted for this surface");
  ok(/setLineDash\(\s*\[\s*6\s*,\s*4\s*\]\s*\)/.test(pass),
    "harmonics are dashed — long enough to read as a dash at the track's width");
  // The first legibility complaint (user, 2026-08-25) was that the tracks vanished
  // into the image: at DPR 2 a 3 px halo under a 1.5 px line leaves 0.75 CSS px of
  // black per side. Both widths are asserted, and their order with them.
  const widths = [...pass.matchAll(/lineWidth\s*=\s*([\d.]+)/g)].map(m => Number(m[1]));
  ok(widths.length >= 2 && widths[0] > widths[1],
    "the halo is stroked wider than the track it carries");
  ok(widths.length >= 2 && widths[1] >= 2 && widths[0] - widths[1] >= 2,
    "…and both survive a device-pixel-ratio 2 downscale");
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

section("R5.1 — the track color is the data palette, lifted for the magma image");
{
  const s4 = decomment(b4);
  const i = s4.indexOf("function _trackColor");
  const body = i < 0 ? "" : s4.slice(i, s4.indexOf("\nfunction ", i + 10));
  ok(body !== "", "_trackColor() exists in block 4, beside _stringColor()");
  ok(/STRING_COLORS/.test(body), "…the hue still comes from the six data colors");
  ok(/liftForDark\s*\(/.test(body), "…lifted by the app's own liftForDark(), the diverging-endpoint precedent");
  ok(body !== "" && !/cssColor|cssRGBA/.test(body),
    "…and never from a theme variable — a data color is identical in Bright and Dark");
  // The lift target is a number in the source; check that whatever it says really
  // clears the palette. Relative luminance, same weights the app uses. What a track
  // is read against is its own black halo (measured: 94.8 % of track pixels have
  // both vertical neighbours under 0.18 L), so the target has to beat the palette's
  // own 0.36–0.56, not the image's.
  const mT = /liftForDark\s*\([^,]*,\s*([\d.]+)\s*\)/.exec(body);
  const target = mT ? Number(mT[1]) : NaN;
  ok(target >= 0.6, "the target clears the palette itself (>= 0.60), not just the 0.55 the panes use");
  const mP = /STRING_COLORS\s*=\s*\[([^\]]+)\]/.exec(html);
  const pal = mP ? (mP[1].match(/#[0-9a-f]{6}/gi) || []) : [];
  const rgb = h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16));
  const lum = c => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
  // Run the app's own liftForDark(), not a copy of it — a reimplementation here
  // would keep passing after the shipped one changed.
  const iL = s4.indexOf("function liftForDark");
  const src = iL < 0 ? "" : s4.slice(iL, s4.indexOf("\nfunction ", iL + 10));
  let lift = null;
  try { lift = new Function(src + "\nreturn liftForDark;")(); } catch (e) {}
  ok(typeof lift === "function", "…and liftForDark() itself is a pure function this suite can run");
  const lifted = typeof lift === "function" ? pal.map(h => lift(rgb(h), target)) : [];
  ok(pal.length === 6 && lifted.every(c => lum(c) >= target - 0.005),
    "…so all six strings land at the target, not five of six below it");
  ok(new Set(lifted.map(c => c.join(","))).size === 6,
    "…and the six stay six — the lift must not collapse two strings onto one color");
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
  ok(opts.length >= 2 && opts.every(o => /Harmonics\s*1[–-]\d/.test(o)),
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

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
