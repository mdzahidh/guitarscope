// M2.7 gate suite — "resolution follows attention": zoom recomputes the
// spectrogram instead of cropping the bitmap it already drew.
//
// This file is RED until M2.7.1–M2.7.3 land, and turning it green is the
// definition of "done". Unlike R3 and R4 there is **no frozen copy block** and
// nothing pre-landed: M2.7 is an instrument change with no educational prose, so
// the builder writes all of it. That means the math section below cannot import a
// function that exists yet — it detects the absence and fails loudly instead of
// throwing, so a red run still prints a usable report.
//
// Four parts:
//   · block 0 — sgramWindowFor() as a pure function, exercised for real;
//   · spectrogramLog's new opts.minHopDiv, asserted BEHAVIOURALLY (column counts
//     from real runs) rather than by grepping for the option name. The shipped
//     default must come out byte-identical, which is the regression half;
//   · the wiring — source contracts for M2.7.2/M2.7.3, each scoped to the
//     function that must change and each mutation-checked when written.
//     Comments are stripped first: a contract a comment can satisfy is not a
//     contract (reviewer lesson, gate 3);
//   · the docs — M2.7 reverses a decision recorded in two places, and the two are
//     corrected differently because SPEC.md is append-only.
//
// Run: node tests/m27.test.js        (all of it via ./tests/verify.sh)

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
function section(t) { console.log("\n" + t); }

function decomment(src) {
  return src.split("\n").map(l => l.replace(/(^|[\s;{}()])\/\/.*$/, "$1")).join("\n");
}

const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (!/function\s+spectrogramLog/.test(blocks[0])) {
  console.error("script block 0 is not the DSP block — extraction pattern broke");
  process.exit(1);
}
const b0 = blocks[0], b3 = blocks[3] || "", b4 = blocks[4] || "";

const HAS_WINDOW_FOR = /function\s+sgramWindowFor\s*\(/.test(b0);
const tmp = path.join(os.tmpdir(), "rameau_m27_under_test.js");
fs.writeFileSync(tmp, b0 + "\nmodule.exports={spectrogramLog" +
  (HAS_WINDOW_FOR ? ",sgramWindowFor" : "") + "};\n");
const D = require(tmp);

const RATE = 48000;
function tone(sec, rate) {
  const n = Math.round(rate * sec), x = new Float64Array(n);
  for (let i = 0; i < n; i++) x[i] = 0.3 * Math.sin(2 * Math.PI * 220 * i / rate);
  return x;
}

// ------------------------------------------------------------- M2.7.1 ------
section("M2.7.1 — sgramWindowFor(): the ladder, and the cap that bounds it");
{
  ok(HAS_WINDOW_FOR, "block 0 defines sgramWindowFor() (pure, node-safe)");
  const f = HAS_WINDOW_FOR ? D.sgramWindowFor : () => NaN;

  // The rungs. 4096 is not a taste call: it is the smallest power of two that
  // separates every open-string pair in every stocked tuning (E2-A2 is 27.6 Hz
  // apart and needs a two-tone limit under that; 2048 gives ~47 Hz).
  ok(f(10, RATE) === 4096, "a 10 s view refines to 4096", String(f(10, RATE)));
  ok(f(5, RATE) === 4096, "a 5 s view refines to 4096", String(f(5, RATE)));
  ok(f(2, RATE) === 4096, "2 s is the boundary and belongs to 4096", String(f(2, RATE)));
  ok(f(1.5, RATE) === 8192, "inside 2 s the user is inside one event: 8192",
    String(f(1.5, RATE)));

  // The cap: a window longer than a quarter of the view measures mostly what is
  // off-screen. It makes the function deliberately NON-MONOTONE in span, which is
  // the property most likely to be "fixed" by mistake, so it is asserted head-on.
  ok(f(0.3, RATE) === 2048, "a 0.3 s view is capped back to 2048, not 8192",
    String(f(0.3, RATE)));
  ok(f(0.5, RATE) === 4096, "0.5 s caps to 4096 (quarter-span = 6000 → 4096)",
    String(f(0.5, RATE)));
  ok(f(0.3, RATE) < f(1.5, RATE) && f(1.5, RATE) > f(10, RATE),
    "non-monotone by design: the cap wins at short spans, the ladder above it");

  // The floor and ceiling hold for every input, including absurd ones.
  const spans = [0.001, 0.01, 0.05, 0.2, 0.75, 1, 1.9, 2, 3, 8, 30, 180, 3600];
  const rates = [8000, 22050, 44100, 48000, 96000, 192000];
  let inRange = true, pow2 = true;
  for (const s of spans) for (const r of rates) {
    const w = f(s, r);
    if (!(w >= 2048 && w <= 8192)) inRange = false;
    if (!(w > 0 && (w & (w - 1)) === 0)) pow2 = false;
  }
  ok(inRange, "never below the shipped 2048 and never above 8192, at any rate");
  ok(pow2, "always a power of two (the FFT takes nothing else)");
  ok(f(0, RATE) === 2048 && f(-1, RATE) === 2048,
    "a zero or negative span degrades to the default rather than throwing");

  // Rate-relative, not sample-relative: the cap is a duration judgement.
  ok(f(1.5, 8000) === 2048, "at 8 kHz a 1.5 s view cannot afford 8192 (cap 4096→2048)",
    String(f(1.5, 8000)));
  ok(f(10, 192000) === 4096, "a high rate does not push the ladder past 8192",
    String(f(10, 192000)));
}

// ------------------------------------------------------------- M2.7.2 ------
section("M2.7.2 — opts.minHopDiv: the hop floor that made refining pointless");
(async () => {
  // The shipped floor is win>>3. For a full-file 2048 pass that is right. For a
  // 2 s view at 8192 it yields 86 columns — a refined image with less time
  // resolution than the coarse one it replaced. Refining passes 32.
  const two = tone(2, RATE), one = tone(1, RATE);

  const base = await D.spectrogramLog(tone(10, RATE), RATE, {});
  ok(base.win === 2048 && base.hop === 342 && base.nFrames === 1398 && base.gridN === 256,
    "REGRESSION: the default call is untouched (2048/342/1398/256)",
    [base.win, base.hop, base.nFrames, base.gridN].join("/"));

  const d8 = await D.spectrogramLog(two, RATE, { win: 8192, gridN: 512 });
  ok(d8.hop === 1024 && d8.nFrames === 86,
    "REGRESSION: omitting minHopDiv keeps the shipped win>>3 floor (86 columns)",
    d8.hop + "/" + d8.nFrames);

  const d8x = await D.spectrogramLog(two, RATE, { win: 8192, gridN: 512, minHopDiv: 8 });
  ok(d8x.hop === 1024 && d8x.nFrames === 86,
    "minHopDiv:8 is explicitly the default — same numbers, so the opt is additive",
    d8x.hop + "/" + d8x.nFrames);

  const r2 = await D.spectrogramLog(two, RATE, { win: 8192, gridN: 512, minHopDiv: 32 });
  ok(r2.hop === 256 && r2.nFrames === 344,
    "minHopDiv:32 lifts a 2 s @ 8192 view from 86 to 344 columns",
    r2.hop + "/" + r2.nFrames);

  const r1 = await D.spectrogramLog(one, RATE, { win: 8192, gridN: 512, minHopDiv: 32 });
  ok(r1.hop === 256 && r1.nFrames === 156,
    "and a 1 s @ 8192 view from 39 to 156", r1.hop + "/" + r1.nFrames);

  ok(r2.gridN === 512 && r2.grid.length === 512 && r2.frames.length === 344 * 512,
    "the finer grid really is 512 cells wide, and the frame buffer matches");

  // maxCols still wins when it is the tighter bound — minHopDiv is a FLOOR on the
  // hop, not an override of the column budget.
  const long = await D.spectrogramLog(tone(60, RATE), RATE,
    { win: 4096, gridN: 512, minHopDiv: 32 });
  ok(long.nFrames <= 1400, "maxCols still caps a long span (minHopDiv only floors the hop)",
    String(long.nFrames));

  // The refined result must stay a valid spectrogram, not just a bigger array.
  ok(r2.win === 8192 && r2.frameRate === RATE / r2.hop &&
     Math.abs(r2.duration - 2) < 1e-9,
    "it reports its own win/frameRate/duration, so the pane can print the truth");

  // ------------------------------------------------------------ the wiring --
  section("M2.7.2 — the zoomed pane asks for a recompute");
  {
    // Deliberately NOT scoped to sgramModelFor's body: putting the refine in a
    // helper beside it is a reasonable shape and the contract must not forbid
    // it. The three tokens below do not occur anywhere in the shipped file, so
    // block-4 scope is still specific. Comments are stripped, so the plan
    // written in a comment does not satisfy the plan.
    const w = decomment(b4);
    ok(/sgramWindowFor\s*\(/.test(w),
      "block 4 chooses the window with sgramWindowFor(), not a literal");
    const mh = w.match(/minHopDiv\s*:\s*(\d+)/);
    ok(mh && Number(mh[1]) > 8,
      "the refine request lifts the win>>3 hop floor (minHopDiv > 8)",
      mh ? mh[1] : "absent");
    ok(/gridN\s*:\s*512/.test(w), "and asks for the finer 512-cell grid");
    ok(/spectrogramLog\s*\(/.test(w),
      "and the recompute really goes through spectrogramLog");

    // drawAll() must stay synchronous: the refine is a background job that swaps
    // its result in on a later frame. This is the contract most likely to be
    // broken by the obvious implementation (await inside the draw path), and
    // breaking it stalls every other card behind an STFT.
    ok(/(^|\n)function drawAll\(\)\{/.test(b4),
      "drawAll() is still a plain synchronous function");
    const dS = w.indexOf("function drawAll(){");
    const dEnd = w.indexOf("\nfunction ", dS + 10);
    const dBody = w.slice(dS, dEnd > dS ? dEnd : dS + 6000);
    ok(dS > 0 && !/\bawait\b/.test(dBody), "and awaits nothing");
    ok(!/async\s+function\s+sgramModelFor/.test(w),
      "sgramModelFor did not become async either");
    ok(!/async\s+function\s+buildSgramDiffModel/.test(w),
      "nor did buildSgramDiffModel");

    // The gate owes itself one door. Every other M2.7 assertion can be met by a
    // build that sets the attribute and never redraws; only a pixel compare
    // between refine on and refine off can tell a recompute from a label, and
    // that compare needs two builds of the same page. Same shape as ?tol:
    // read at load, clamped, never persisted, no UI.
    // Assert on the HANDLER, never on text that says "?refine=": index.html
    // carries its own source, and a hook written as a regex literal has "]"
    // where a naive /[?&]refine=/ wants the separator, so that pattern can only
    // ever be satisfied by a decoy string. (Same trap as the R3 ?pop=coin
    // contract; see CLAUDE.md.) Each form below is a real parse of the URL.
    const hookForms = [
      /refine=[^\n]{0,80}\.test\(\s*location\.search/,   // regex literal tested against the query
      /location\.search[^\n]{0,100}refine=/,               // or the query scanned for it
      /URLSearchParams[\s\S]{0,300}get\(\s*["\x27]refine["\x27]/,
    ];
    ok(hookForms.some(re => re.test(w)),
      "a ?refine=0 hook is really parsed out of the URL, so tests/headless.js can compare on against off");
    ok(!/gsRefine|saveSettings\(\)[^\n]*refine/i.test(w),
      "…and nothing persists it — it is a gate hook, not a setting");
  }

  // ------------------------------------------------------------- M2.7.3 ----
  section("M2.7.3 — the pane says which window it actually used");
  {
    const w = decomment(b4);
    const s = w.indexOf("function sgramModelFor(");
    const end = w.indexOf("\nfunction ", s + 10);
    const body = w.slice(s, end > s ? end : s + 4000);
    const iStatus = body.indexOf("statusText");
    ok(iStatus > 0, "statusText is built in sgramModelFor");
    const stat = body.slice(iStatus, iStatus + 400);
    ok(/-pt Hann/.test(stat), "it still names the window on the plot");
    ok(!/tv\.sg\.win\s*\+\s*["\x27]-pt Hann/.test(stat),
      "but no longer hard-reads the BASE window — a refined pane prints its own",
      "still prints tv.sg.win");

    // The footer states the analysis parameters for the whole app. It keeps
    // naming the base window, and now also says that a zoom refines it —
    // otherwise the footer and the plot contradict each other on screen.
    const iP = w.indexOf('termHtml("spectrogram"');
    ok(iP > 0, "the footer params line still names the spectrogram");
    ok(iP > 0 && /refin/i.test(w.slice(iP, iP + 400)),
      "and says a zoom refines that window");

    // The headless door. The canvas is unreachable from node, so the rendered
    // window is published as an attribute for --dump-dom to read. An attribute,
    // not UI: it must not appear on screen or in an export.
    const wired = decomment(b3 + b4);
    // Q4a.4: written through one shared reporter now, so a pane and its expanded
    // view cannot report different windows for the same model.
    const sgw = (/function sgSyncData\([\s\S]*?\n\}/.exec(wired) || [""])[0];
    ok(/set\(\s*"data-sgwin"\s*,\s*model\.sg\.win/.test(sgw) && /setAttribute\(/.test(sgw),
      "the pane publishes data-sgwin for the gate to read");
    ok(!/data-sgwin/.test(html.slice(0, html.indexOf("</style>"))),
      "it is never styled — it is a probe, not a surface");
  }

  // ------------------------------------------------- M2.7.4 (reviewer) ----
  // Not in the delegated contract: found in review. The pane may now be drawn
  // from a refined pass, so the hover readout has to read THAT pass — a dB
  // number taken from the 2048-pt analysis under an 8192-pt picture is a
  // visible number nothing on screen supports. The refined pass also starts at
  // the zoom's left edge, so file time must be offset by its t0.
  section("M2.7.4 — the hover readout reads the analysis the pane drew");
  {
    const w = decomment(b4);
    const s = w.indexOf("function attachSgramCrosshair(");
    ok(s > 0, "attachSgramCrosshair is in block 4");
    const end = w.indexOf("\nfunction ", s + 10);
    const body = w.slice(s, end > s ? end : s + 4000);

    // It must not bind the base spectrogram as the thing it samples.
    ok(!/const\s+sg\s*=\s*tv\.sg\s*;/.test(body),
      "it no longer samples the BASE spectrogram unconditionally",
      "still binds sg = tv.sg");
    ok(/const\s+sg\s*=[^;]*\btv\.sg\b/.test(body),
      "…but still falls back to it when the pane was not refined");

    // Frame index and in-file test must both account for the slice origin.
    // Forward-only window: the offset is applied inside the clamp, and looking
    // backwards would find zw.T0 (the DISPLAY window) and pass vacuously.
    const iF = body.indexOf("nFrames");
    const frame = body.slice(iF, iF + 220);
    ok(/t0\b/i.test(frame),
      "the frame index offsets by the analysis start (sg.t0)",
      "no t0 in the frame-index expression");
    ok(!/inFile\s*=\s*t\s*>=\s*-1e-9/.test(body),
      "and the in-file test is relative to the analysed slice, not to 0",
      "in-file test still assumes the analysis starts at file time 0");
  }

  // --------------------------------------------------------------- docs ----
  section("M2.7 reverses a recorded decision, so the record must move too");
  {
    const arch = fs.readFileSync(path.join(__dirname, "..", "docs", "ARCHITECTURE.md"), "utf8");
    const spec = fs.readFileSync(path.join(__dirname, "..", "SPEC.md"), "utf8");

    // Both files hard-wrap, so a claim can straddle a newline. Normalise
    // whitespace before matching or the guard passes on a re-wrap alone.
    const archN = arch.replace(/\s+/g, " ");
    const specN = spec.replace(/\s+/g, " ");

    // ARCHITECTURE.md is a living description: the stale claim is rewritten.
    ok(!/Spectrogram zoom \(e\) is a crop, not a recompute/.test(archN),
      "ARCHITECTURE.md no longer heads that bullet 'a crop, not a recompute'");
    ok(!/Deep zooms therefore blur rather than resolve/.test(archN),
      "nor says deep zooms blur rather than resolve");
    ok(!/recomputing the STFT per window would change the analysis parameters mid-view and break/.test(archN),
      "nor states, unqualified, the objection M2.7 answers");
    ok(/sgramWindowFor|resolution follows attention/i.test(archN),
      "and it describes what replaced it");

    // SPEC.md is append-only: history stays, a new entry supersedes it.
    ok(/a crop of the already-rendered image, not an STFT recompute/.test(specN),
      "SPEC.md keeps its original (e) entry verbatim — the changelog is append-only");
    ok(/M2\.7/.test(specN), "and gains an M2.7 entry");
    ok(specN.indexOf("M2.7") > specN.indexOf("not an STFT recompute"),
      "which is appended after it, not spliced in above");
    ok(/supersede/i.test(specN.slice(specN.indexOf("M2.7"))),
      "and says out loud that it supersedes the older entry");
  }

  console.log("\n" + passed + " passed, " + failed + " failed");
  process.exit(failed ? 1 : 0);
})();
