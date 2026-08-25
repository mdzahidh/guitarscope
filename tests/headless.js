// R3 headless gate — the half of "done" that node cannot reach.
//
// findCoincidences() is pure and tests/r3.test.js pins it exactly. But the ✦ is a
// canvas draw and its popover is a DOM handler, so the only honest check is to run
// the real app in a real renderer and look at the result. Chrome's headless output
// is deterministic here (this file proves that first, before trusting any pixel).
//
// The assertions are all *differential*: two builds of the same page that differ in
// exactly one query parameter. That isolates the ✦ from every other pixel on the
// page without needing a golden image to keep up to date.
//
// Run: node tests/headless.js       (or via ./tests/verify.sh)

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { decodePNG, diffPixels, clusters } = require("./png.js");

const APP = "file://" + path.join(__dirname, "..", "index.html");
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), "rameau-headless-"));

const CHROME_CANDIDATES = [
  process.env.CHROME,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
].filter(Boolean);
const CHROME = CHROME_CANDIDATES.find(p => { try { return fs.statSync(p).isFile(); } catch { return false; } });
if (!CHROME) {
  console.error("no Chrome found — set $CHROME to a Chrome/Chromium binary.");
  console.error("tried:\n  " + CHROME_CANDIDATES.join("\n  "));
  process.exit(1);
}

let passed = 0, failed = 0;
function ok(cond, name, detail) {
  if (cond) { passed++; console.log("  ok   " + name); }
  else { failed++; console.log("  FAIL " + name + (detail ? "  [" + detail + "]" : "")); }
}
function section(t) { console.log("\n" + t); }

// Deliberately no --user-data-dir. A throwaway profile would be the tidy way to
// keep localStorage out of the comparisons, but it makes Chrome sit in first-run
// setup and never exit — minutes per shot instead of three seconds. It costs
// nothing here: ?demo writes no localStorage (settings save on explicit clicks
// only), and the determinism check below would catch it if that ever changed.
function chrome(args, query, extra) {
  try {
    return execFileSync(CHROME, [
      "--headless=new", "--disable-gpu", "--hide-scrollbars",
      "--window-size=1440,2600", "--virtual-time-budget=30000",
      ...args, APP + "?" + query,
    ], { maxBuffer: 1 << 28, timeout: 120000, stdio: ["ignore", "pipe", "ignore"], ...(extra || {}) });
  } catch (e) {
    if (e && (e.signal === "SIGABRT" || e.status === 134)) sandboxDiagnosis();
    throw e;
  }
}

// Chrome dies with SIGABRT inside HIServices _RegisterApplication when it cannot reach
// launchservicesd — which is exactly what a seatbelt sandbox does to it. Agent runners
// (Muse among them) sandbox shell commands by default, so every launch aborts and macOS
// pops a crash dialog for each one: a whole suite run buries the operator in "Ignore"
// clicks and looks like a mysteriously broken gate. Say what it is on the FIRST abort
// and stop there, so it costs one dialog rather than twenty.
//
// This step is not optional and must never be stubbed. A gate step that cannot run is
// red: re-run outside the sandbox, do not hand the suite a fake Chrome.
function sandboxDiagnosis() {
  console.error("\nChrome aborted at startup (SIGABRT in _RegisterApplication).");
  console.error("It is not a flaky renderer: something is denying it launchservicesd,");
  console.error("and a seatbelt sandbox around the shell is the usual something.");
  console.error("  • Muse:  muse --disable-sandbox …   (or: muse exec --disable-sandbox …)");
  console.error("  • check: sandbox-exec around this process, or $CHROME pointing elsewhere");
  console.error("Stopping after one launch — each abort raises a macOS crash dialog.");
  console.error("Do not stub Chrome to get past this. A step that cannot run is red.\n");
  process.exit(1);
}
const shotCache = new Map();
function shot(query) {
  if (shotCache.has(query)) return shotCache.get(query);
  const file = path.join(OUT, "shot-" + shotCache.size + ".png");
  chrome(["--screenshot=" + file], query);
  const img = decodePNG(fs.readFileSync(file));
  img.file = file; img.query = query;
  shotCache.set(query, img);
  return img;
}
function dom(query) { return chrome(["--dump-dom"], query).toString("utf8"); }

// index.html carries its own source inline, so every frozen sentence appears in the
// <script> text whether or not anything rendered. Pull out the #popover element
// alone — by counting <div> depth, since its content is full of nested divs and a
// lazy regex would stop at the first inner </div>.
function popoverOf(page) {
  const open = page.match(/<div class="([^"]*)" id="popover"[^>]*>/);
  if (!open) return { cls: null, html: "" };
  let i = open.index + open[0].length, depth = 1;
  const tag = /<(\/?)div\b/g;
  tag.lastIndex = i;
  for (let m; (m = tag.exec(page));) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return { cls: open[1], html: page.slice(i, m.index) };
  }
  return { cls: open[1], html: page.slice(i) };
}

// The demo pair, strings axis on, harmonics 2–4 on every string.
const BASE = "demo&strings=1&harmonics=1";

// ------------------------------------------------------------ determinism ----
section("the renderer is deterministic (or nothing below means anything)");
{
  const a = path.join(OUT, "det-a.png"), b = path.join(OUT, "det-b.png");
  chrome(["--screenshot=" + a], BASE);
  chrome(["--screenshot=" + b], BASE);
  const A = decodePNG(fs.readFileSync(a)), B = decodePNG(fs.readFileSync(b));
  const d = diffPixels(A, B, 1);
  ok(d.length === 0, "two runs of the same page are pixel-identical", d.length + " px differ");
  if (d.length) { console.error("  → pixel assertions below are unreliable; stopping."); process.exit(1); }
}

// ---------------------------------------------------------------- the ✦ ------
// tests/r3.test.js pins the arithmetic: in E standard at 0 ¢ exactly one landing
// survives (E2 ×4 on the open high E), and at ±6 ¢ there are three — the octave
// plus two tempered fifths. Two of the three sit within a whisker of 330 Hz and
// collapse under the overlap guard, so widening 0 ¢ → 6 ¢ should add exactly one
// visible mark per frequency plot, at ~247 Hz, and change nothing else.
function marksAdded(theme) {
  const A = shot(BASE + "&tol=0&theme=" + theme);
  const B = shot(BASE + "&theme=" + theme);
  const pts = diffPixels(A, B, 8);
  return { A, B, pts, blobs: clusters(pts, 3) };
}

for (const theme of ["dark", "bright"]) {
  section("✦ marks appear as the window widens (" + theme + " theme)");
  const { pts, blobs } = marksAdded(theme);
  ok(pts.length > 0, "0 ¢ and 6 ¢ do not render the same page — the ✦ is on screen",
    pts.length + " px");
  ok(blobs.length >= 1 && blobs.length <= 4,
    "…as one new mark per frequency plot, not a repaint", blobs.length + " blobs");
  const big = blobs.filter(b => b.n > 900);
  ok(blobs.length > 0 && big.length === 0, "every new blob is glyph-sized",
    blobs.length ? big.map(b => b.n + "px @" + b.x0 + "," + b.y0).join(" ") : "nothing drawn");
  const xs = blobs.map(b => Math.round((b.x0 + b.x1) / 2));
  ok(blobs.length > 0 && (blobs.length < 2 || Math.max(...xs) - Math.min(...xs) <= 6),
    "…all at the same frequency, since both plots share the axis",
    blobs.length ? xs.join(" ") : "nothing drawn");

  // The ✦ belongs to neither guitar, so it must not be drawn in either accent.
  const ACCENTS = theme === "dark"
    ? [[0xf0, 0xa1, 0x3e], [0x44, 0xc2, 0xd4]]
    : [[0xc0, 0x5f, 0x04], [0x0c, 0x6e, 0x80]];
  const near = pts.filter(p => ACCENTS.some(a =>
    Math.abs(p.r - a[0]) < 24 && Math.abs(p.g - a[1]) < 24 && Math.abs(p.b - a[2]) < 24));
  ok(pts.length > 0 && near.length === 0, "the ✦ is drawn in neither guitar's accent",
    pts.length ? near.length + " px" : "nothing drawn");
}

section("✦ marks only what the user has asked to see");
{
  // Strings axis off: the ✦ annotates a line that isn't drawn, so it must not exist.
  const off0 = shot("demo&strings=0&harmonics=1&tol=0");
  const off6 = shot("demo&strings=0&harmonics=1");
  ok(diffPixels(off0, off6, 1).length === 0,
    "strings axis off ⇒ tolerance changes nothing",
    diffPixels(off0, off6, 1).length + " px");

  // No harmonics shown: a coincidence needs a harmonic to coincide.
  const noh0 = shot("demo&strings=1&harmonics=0&tol=0");
  const noh6 = shot("demo&strings=1&harmonics=0");
  ok(diffPixels(noh0, noh6, 1).length === 0,
    "no harmonics shown ⇒ tolerance changes nothing",
    diffPixels(noh0, noh6, 1).length + " px");
}

section("the threshold is not an artefact of its own value");
{
  // r3.test.js proves widening 6 ¢ → 50 ¢ admits nothing new in E standard. If the
  // drawing agrees, the page is pixel-identical — a visible proof that ±6 ¢ is a
  // safe fixed choice rather than a knob worth exposing.
  const t6 = shot(BASE), t50 = shot(BASE + "&tol=50");
  const d = diffPixels(t6, t50, 1);
  ok(d.length === 0, "6 ¢ and 50 ¢ draw the same marks", d.length + " px");
}

// --------------------------------------------------------- the ✦ popover -----
section("?pop=coin0 opens the discovery popover");
{
  const page = dom(BASE + "&pop=coin0");
  // index.html carries its own source inline, so the frozen sentences appear in the
  // <script> text whether or not anything rendered. Read the popover element alone.
  const { cls, html } = popoverOf(page);
  ok(cls != null && /\bopen\b/.test(cls), "a popover is pinned open",
    cls == null ? "no #popover in the dump" : 'class="' + cls + '"');
  const FROZEN = [
    "Two strings, one pitch.",
    "Musician’s ear",
    "The physics",
    "Equal temperament",
    "How Claude Rameau places it",
    "harmonic series",
  ];
  const missing = FROZEN.filter(s => !html.includes(s));
  ok(missing.length === 0, "…carrying the reviewed copy", missing.join(" | "));
  ok(/Touch the .{2,12} string at/.test(html),
    "…including where to touch the string (the fretboard node)");
  ok(/class="audition|data-aud|Audition/i.test(html),
    "…and an audition row, like every other popover");

  // The two docs/THEORY.md §2.5 figures still under review must never ship.
  // These two run over the whole page, not just the popover: the figures are under
  // review and must not reach the user through any surface.
  ok(!/critical bandwidth/i.test(page), "no unreviewed critical-bandwidth framing");
  ok(!/30\s*[–-]\s*40\s*Hz/.test(page), "no unreviewed 30–40 Hz figure");
}

console.log("\n" + passed + " passed, " + failed + " failed");
console.log("artifacts: " + OUT);
process.exit(failed ? 1 : 0);
