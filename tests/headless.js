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
// A launch very occasionally never returns: Chrome renders nothing and sits there until
// the 120 s timeout fires. Seen once in a full gate run (a shot-13 screenshot of the
// refine-off zoomed build) after eight clean standalone suites, so it is rare, and it is
// not the decode race below — that one exits promptly with a blank page. It is worth its
// own retry because execFileSync throws on timeout, and an uncaught throw here takes the
// whole suite down with a stack trace instead of failing one assertion: a 45-minute gate
// lost to a single stuck process. Retry the launch, not the assertion; after three tries
// re-throw and let it be red. The SIGABRT branch must stay ahead of this — a sandboxed
// Chrome aborts every time, and retrying it would just raise three crash dialogs.
function chrome(args, query, extra, size) {
  for (let attempt = 1; ; attempt++) {
    try {
      return execFileSync(CHROME, [
        "--headless=new", "--disable-gpu", "--hide-scrollbars",
        "--window-size=" + (size || "1440,2600"), "--virtual-time-budget=30000",
        ...args, APP + "?" + query,
      ], { maxBuffer: 1 << 28, timeout: 120000, stdio: ["ignore", "pipe", "ignore"], ...(extra || {}) });
    } catch (e) {
      if (e && (e.signal === "SIGABRT" || e.status === 134)) sandboxDiagnosis();
      if (e && e.code === "ETIMEDOUT" && attempt < 3) {
        console.log("  ..   chrome hung on " + query + " — retry " + attempt + "/2");
        continue;
      }
      throw e;
    }
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
function shot(query, size) {
  const ck = (size || "") + "|" + query;
  if (shotCache.has(ck)) return shotCache.get(ck);
  const file = path.join(OUT, "shot-" + shotCache.size + ".png");
  chrome(["--screenshot=" + file], query, null, size);
  const img = decodePNG(fs.readFileSync(file));
  img.file = file; img.query = query;
  shotCache.set(ck, img);
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

// ------------------------------------------------ the ancestry popover (R4) --
// The open G, because it is the clearest case in standard tuning: D3 -> G3 is a
// perfect fourth, 4/3, whose denominator hides an odd factor -- so the two are
// cousins rather than parent and child, both harmonics of a G1 two octaves below
// the 3rd string (146.83/3 = 48.94 Hz, and 48.94 x 4 = 195.8 ~ 196.00).
section("?pop=str3 opens one string popover, carrying its ancestry");
{
  const page = dom(BASE + "&pop=str3");
  const { cls, html } = popoverOf(page);
  ok(cls != null && /\bopen\b/.test(cls), "a string popover is pinned open",
    cls == null ? "no #popover in the dump" : 'class="' + cls + '"');
  ok(/open 3rd string/.test(html), "…for the string the key named");

  const FROZEN = [
    "Where this string sits",
    "harmonic 3 of the open 3rd string",
    "4/3",
    "48.9 Hz",
    "2 ¢ wide of a true 4/3",
    "Why the denominator decides",
  ];
  const missing = FROZEN.filter(s => !html.includes(s));
  ok(missing.length === 0, "…with the reviewed ancestry copy", missing.join(" | "));

  // R4.4 asks for a native <details>, not a scripted fold: nothing to persist,
  // nothing to restore, and it prints open when the browser prints the page.
  ok(/<details\b[^>]*class="[^"]*pop-more/.test(html),
    "…and the general rule folded into a native <details>");

  // R4.1 rides on the harmonic rows, which only exist while Strings is on. BASE
  // turns harmonics 2-4 on for every string, so the low E's 4th harmonic (329.6
  // Hz) is shown and lands on the open 1st string, E4 -- one of the two ✦ this
  // tuning draws, reached here through the row rather than through the mark.
  const page6 = dom(BASE + "&pop=str0");
  const h4 = popoverOf(page6).html;
  ok(/Lands on the open 1st string/.test(h4),
    "a shown harmonic that lands on an open string says so, in its own row");

  // Same two docs/THEORY.md §2.5 figures, same reason as above: still under
  // review, so they must not reach the user through this surface either.
  ok(!/critical bandwidth/i.test(page), "no unreviewed critical-bandwidth framing");
  ok(!/30\s*[–-]\s*40\s*Hz/.test(page), "no unreviewed 30–40 Hz figure");
}

// ------------------------------------------------- resolve on zoom (M2.7) ----
// The panes that start folded have to be unfolded for any of this: a folded card
// skips its model and its canvas, so it would report nothing and diff to zero.
// Tall window because the spectrogram sits well down the page at 1440 wide.
const SG = "demo&open=all";
const TALL = "1440,4600";

// Pull one attribute off one element. --dump-dom carries index.html's own source
// inline, so a bare /data-sgwin="(\d+)"/ over the whole page would happily match
// the string literal that writes it; anchor on the canvas id instead.
function sgwin(page, id) {
  const m = page.match(new RegExp('<canvas[^>]*id="' + id + '"[^>]*>'));
  if (!m) return null;
  const w = m[0].match(/data-sgwin="(\d+)"/);
  return w ? Number(w[1]) : null;
}

// The demo pair loads through a real audio decode, and a launch can exit before the
// app has drawn anything: --virtual-time-budget fast-forwards timers, not decodes,
// so the budget runs out in real-time terms while the decode is still pending.
// Measured identical at 30 s and 90 s of budget — the fix is a retry, not a bigger
// number. Rate is load-dependent: ~1 launch in 6 on an idle machine, 3 in 8 when a
// second Chrome is running alongside, and 7 in 8 with a runaway background process
// (measured against an unmodified checkout while spotlightknowledged held 99 % CPU at
// load average 5.7 — the same checkout missed 0 of 8 once it settled). At that rate no
// sane retry budget helps, so the harness names the condition rather than hiding it:
// see drawReport() below. Never answer a loaded machine by weakening a check.
// Both helpers below check that the page really
// drew and try again if it did not; after six tries they hand back what they have,
// so the assertion fails loudly rather than passing against a blank page. Six because
// 0.375^6 is ~0.3 %, where three tries left ~5 % per site and both `[null]` failure
// modes below were seen for real.
//
// Ask for the attribute the assertions actually read, not for the canvas width:
// drawAll() writes width and data-sgwin in the same branch, so an undrawn page has
// neither — but the overlay-off assertions check that data-sgcomb is *absent*, and a
// blank page supplies that for free. Anchoring readiness on data-sgwin closes that
// false pass.
//
// And ask it of *both* panes. The two files decode independently, so the race is not
// all-or-nothing: a gate run in which every pane-A assertion passed still failed twice
// on pane B, once for data-sgwin and once for data-sgcomb, because A had drawn and B
// had not when the launch ended. Every query below loads the demo pair, so both panes
// are always due; a one-pane predicate just moved the false pass one canvas to the right.
function drew(page) {
  return sgwin(page, "sgramCanvasA") !== null && sgwin(page, "sgramCanvasB") !== null;
}

// A second race sits on top of that one, and it is M2.7's own: refinement is an
// asynchronous pass — a settle timer, then an STFT that finishes whenever it
// finishes — so a page can be completely drawn and still be showing the base
// 2048-pt image at --dump-dom time. Measured at roughly 1 run in 4 across the two
// zoomed loads below, in either of them. `ready` lets a caller say what "drawn"
// means for its own assertion. It cannot launder a broken build: a build that
// never refines fails the predicate on every try, and the assertion then
// runs against the last page and reports the wrong number, exactly as before.
function domDrawn(query, ready) {
  const done = ready || drew;
  let page = dom(query), tries = 1;
  for (let i = 0; i < 5 && !done(page); i++) { page = dom(query); tries++; }
  drawReport(query, tries, done(page));
  return page;
}

// The retries used to be silent, which made a loaded machine look like a broken build:
// six launches that all landed blank produce the same `[null]` an unwired attribute
// would. Say when a site needed more than one launch, and say loudly when it used the
// whole budget without ever drawing — that run's failures are about the machine, not
// the code. Purely a diagnostic: it never changes what is asserted.
function drawReport(query, tries, drewOk) {
  if (!drewOk) {
    console.log("  !!   " + query + " never drew in " + tries + " launches — heavy CPU load?");
    console.log("       (assertions below run against an undrawn page and will read null)");
  } else if (tries > 1) console.log("  ..   " + query + " drew on launch " + tries + "/6");
}
// A screenshot cannot be asked whether a canvas has a width, so ask it against the
// app carrying no files at all: an undrawn ?demo page looks like that empty app,
// a drawn one differs across the whole page. The retry varies a parameter the app
// ignores, purely to miss the screenshot cache.
const BLANK = shot("open=all", TALL);
function notBlank(img) { return diffPixels(img, BLANK, 8).length >= 100000; }
// Same two races, same shape as domDrawn: `ready` is the caller's extra condition
// on top of "the app drew at all", for pixels that only appear once the refine has
// landed.
function shotDrawn(query, size, ready) {
  let img = shot(query, size), tries = 1;
  for (let i = 0; i < 5 && !(notBlank(img) && (!ready || ready(img))); i++) {
    img = shot(query + "&_r" + (i + 1), size); tries++;
  }
  drawReport(query, tries, notBlank(img) && (!ready || ready(img)));
  return img;
}

section("an unzoomed spectrogram is exactly what it always was");
{
  const page = domDrawn(SG);
  ok(sgwin(page, "sgramCanvasA") === 2048,
    "pane A publishes the shipped 2048-pt window", String(sgwin(page, "sgramCanvasA")));
  ok(sgwin(page, "sgramCanvasB") === 2048,
    "…and so does pane B", String(sgwin(page, "sgramCanvasB")));

  // The promise M2.7 has to keep to every existing screenshot and every reader of
  // the footer: with no zoom, the refine path must not exist as far as pixels are
  // concerned. Whole page, not just the pane -- a repaint that shifted anything
  // else would show up here too.
  const A = shotDrawn(SG, TALL), B = shotDrawn(SG + "&refine=0", TALL);
  const d = diffPixels(A, B, 1);
  ok(d.length === 0, "and renders pixel-identical with the refine disabled",
    d.length + " px differ");
}

section("zooming in asks for a finer window, and only where it was asked");
{
  // The demo pair is 5.52 s long, so every span here sits inside real audio.
  // 1-2.4 s is 1.4 s: inside one event, the ladder's 8192 rung, ~12 Hz two-tone
  // resolution at 48 kHz. That is the case 2048 (~47 Hz) cannot do at all --
  // D3-G3 are 49.2 Hz apart and E2-A2 only 27.6.
  // Retry while pane A still reports the base window: that is the refine not having
  // landed yet, not an answer. The value it must land on stays in the assertion.
  const refined = p => drew(p) && sgwin(p, "sgramCanvasA") !== 2048;
  const page = domDrawn(SG + "&zoom=sga:1,2.4", refined);
  ok(sgwin(page, "sgramCanvasA") === 8192,
    "a 1.4 s window on pane A resolves at 8192", String(sgwin(page, "sgramCanvasA")));

  // The cache key has to carry the pane and the window it was computed for. If it
  // carries neither, both panes report the same number and this catches it in the
  // same page load -- which a separate load, with a fresh cache, never could.
  // It is also the "resolution follows attention" rule stated in pixels: a pane
  // nobody zoomed is exactly the picture it has always been.
  ok(sgwin(page, "sgramCanvasB") === 2048,
    "…while the pane nobody zoomed still reports 2048",
    String(sgwin(page, "sgramCanvasB")));

  // 0.5-4.5 s is a 4 s span: back down the ladder to 4096. A build that keys its
  // cache on "is zoomed" rather than on the window bounds passes the assertion
  // above and fails this one.
  const wide = domDrawn(SG + "&zoom=sga:0.5,4.5", refined);
  ok(sgwin(wide, "sgramCanvasA") === 4096,
    "a 4 s window resolves at 4096, not at whatever was computed last",
    String(sgwin(wide, "sgramCanvasA")));

  // And the attribute is not the feature. Only this compare separates a real
  // recompute from a label: same zoom, refine on against refine off, and the
  // pane must actually look different.
  // refine=0 first, because it is the deterministic one — it only ever crops — and
  // it is what the refined shot is judged ready against. Readiness here is "the
  // refine changed anything at all"; whether it changed enough to be a redraw
  // rather than a label is the assertion, and stays the assertion.
  const off = shotDrawn(SG + "&zoom=sga:1,2.4&refine=0", TALL);
  const on = shotDrawn(SG + "&zoom=sga:1,2.4", TALL,
    img => diffPixels(img, off, 8).length > 0);
  const d = diffPixels(on, off, 8);
  ok(d.length > 500, "and the zoomed pane really is redrawn from the finer STFT",
    d.length + " px differ — an attribute without a redraw would be ~0");
}

// ------------------------------------------- harmonic tracks (R5) ----------
// Same anchoring rule as sgwin(): the page carries index.html's own source inline,
// so the string literal that writes the attribute would satisfy a bare match.
function sgcomb(page, id) {
  const m = page.match(new RegExp('<canvas[^>]*id="' + id + '"[^>]*>'));
  if (!m) return null;
  const c = m[0].match(/data-sgcomb="(\d+)"/);
  return c ? Number(c[1]) : null;
}

section("the overlay is off until asked for, and then says what it drew");
{
  const off = domDrawn(SG);
  ok(sgcomb(off, "sgramCanvasA") === null,
    "no overlay by default — the pane publishes no comb",
    String(sgcomb(off, "sgramCanvasA")));

  // One open string, the shipped default of six harmonics: six partials, and the
  // comb is global to the comparison, so both panes carry the same one.
  const one = domDrawn(SG + "&sgnote=0");
  ok(sgcomb(one, "sgramCanvasA") === 6,
    "one open string draws six partials on pane A", String(sgcomb(one, "sgramCanvasA")));
  ok(sgcomb(one, "sgramCanvasB") === 6,
    "…and the same comb on pane B", String(sgcomb(one, "sgramCanvasB")));

  // The count has to follow the user's harmonic limit. A build that hard-codes six
  // and only labels the rest passes the two assertions above and fails this one.
  const three = domDrawn(SG + "&sgnote=0&sgharm=3");
  ok(sgcomb(three, "sgramCanvasA") === 3,
    "and the count follows the harmonic limit, not a constant",
    String(sgcomb(three, "sgramCanvasA")));
}

section("and the tracks are pixels, not an attribute");
{
  // The attribute is not the feature — the same trap M2.7's refine compare closes.
  const off = shotDrawn(SG, TALL);
  const on = shotDrawn(SG + "&sgnote=0", TALL);
  const d = diffPixels(on, off, 8);
  ok(d.length > 500, "turning the overlay on really changes the spectrogram",
    d.length + " px differ — an attribute without a draw would be ~0");

  // Six tracks must mark more of the picture than two. This is the drawing loop
  // reading the limit, stated in pixels rather than in an attribute.
  const two = shotDrawn(SG + "&sgnote=0&sgharm=2", TALL);
  const d2 = diffPixels(two, off, 8);
  ok(d.length > d2.length,
    "and six harmonics mark more of it than two",
    d.length + " px vs " + d2.length + " px");
}

// R5.2 — a chord is a set of strings, so the track count is (sounding strings ×
// harmonics). The cluster counts behind these shapes are pinned in tests/r5.test.js;
// what only Chrome can say is that the picker reaches the drawing at all.
section("R5.2 — a chord overlays every string it sounds");
{
  const e = domDrawn(SG + "&sgchord=E");
  ok(sgcomb(e, "sgramCanvasA") === 36,
    "E major sounds all six strings — 36 partials at the default six harmonics",
    String(sgcomb(e, "sgramCanvasA")));
  ok(sgcomb(e, "sgramCanvasB") === 36, "…on both panes",
    String(sgcomb(e, "sgramCanvasB")));

  // D mutes the two lowest strings. A build that ignored the nulls would draw 36
  // here too, and would be drawing notes the player never fretted.
  const d = domDrawn(SG + "&sgchord=D&sgharm=3");
  ok(sgcomb(d, "sgramCanvasA") === 12,
    "D mutes two strings and honours the limit — 4 × 3 = 12",
    String(sgcomb(d, "sgramCanvasA")));

  // An unstocked name is not a chord. Muting first is what makes this nothing
  // rather than whatever was selected before.
  const none = domDrawn(SG + "&sgchord=Zz");
  ok(sgcomb(none, "sgramCanvasA") === null,
    "an unstocked name overlays nothing at all",
    String(sgcomb(none, "sgramCanvasA")));
}

section("…and a chord marks more of the picture than one string does");
{
  const off = shotDrawn(SG, TALL);
  const one = shotDrawn(SG + "&sgnote=0", TALL);
  const chord = shotDrawn(SG + "&sgchord=E", TALL);
  const dOne = diffPixels(one, off, 8);
  const dCh = diffPixels(chord, off, 8);
  ok(dCh.length > dOne.length,
    "six strings of tracks cover more than one string's six partials",
    dCh.length + " px vs " + dOne.length + " px");
}


// ------------------------------------------- overlay legibility (R5.6) -----
// Same anchoring rule as sgcomb(): the page carries its own source inline.
function sgattr(page, id, name) {
  const m = page.match(new RegExp('<canvas[^>]*id="' + id + '"[^>]*>'));
  if (!m) return null;
  const c = m[0].match(new RegExp(name + '="(\\d+)"'));
  return c ? Number(c[1]) : null;
}

// The bounding box of a difference. A control that moves is a handful of pixels in
// one place; the spectrogram is a thousand px wide — the two can't be confused.
function bbox(pts) {
  if (!pts.length) return { w: 0, h: 0 };
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of pts) { if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y; }
  return { w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
// The label count is what these assertions read, so it is also what "drawn" means
// here — an attribute-less dump is a page caught mid-draw, not a missing feature.
const labelled = id => p => sgattr(p, id, "data-sglabels") !== null;

section("R5.6 — the tracks say which harmonic they are");
{
  const off = domDrawn(SG);
  ok(sgattr(off, "sgramCanvasA", "data-sglabels") === null,
    "no overlay, no labels", String(sgattr(off, "sgramCanvasA", "data-sglabels")));

  const one = domDrawn(SG + "&sgnote=0", labelled("sgramCanvasA"));
  const n1 = sgattr(one, "sgramCanvasA", "data-sglabels");
  ok(n1 !== null && n1 >= 1 && n1 <= 6,
    "one open string at six harmonics labels its tracks", String(n1));

  // 36 tracks cannot carry 36 labels on a 372 px log axis — the upper partials of
  // six strings interleave to a few pixels apart. The guard has to drop them, and
  // dropping them is the difference between a legible plot and a smear.
  const e = domDrawn(SG + "&sgchord=E", labelled("sgramCanvasA"));
  const nE = sgattr(e, "sgramCanvasA", "data-sglabels");
  ok(nE !== null && nE > 0 && nE < 36,
    "a chord labels what it can and skips the rest", String(nE) + " of 36 tracks");

  // Under focus only one comb is lit, so only one comb is named.
  const f = domDrawn(SG + "&sgchord=E&sgfocus=0", labelled("sgramCanvasA"));
  const nF = sgattr(f, "sgramCanvasA", "data-sglabels");
  ok(nF !== null && nF <= nE, "holding one comb quiets the other labels",
    String(nF) + " vs " + String(nE));
}

section("R5.6a — the sheet is real, and only under an overlay");
{
  const bare = shotDrawn(SG, TALL);
  const bareSheet = shotDrawn(SG + "&sgscrim=90", TALL);
  // The sheet belongs to the overlay, not to the spectrogram: with nothing overlaid,
  // pressing the slider must not touch the picture. It does move the slider's own
  // thumb and readout — honest feedback, and the reason this bounds a box rather
  // than asserting zero. One control is ~110 px wide; the plot is over a thousand.
  const d0 = diffPixels(bare, bareSheet, 1);
  const bb = bbox(d0);
  ok(bb.w <= 160 && bb.h <= 24, "a scrim with nothing overlaid never touches the picture",
    d0.length + " px differ, bbox " + bb.w + "x" + bb.h);

  const flat = shotDrawn(SG + "&sgnote=0&sgscrim=0", TALL);
  const sheet = shotDrawn(SG + "&sgnote=0&sgscrim=90", TALL);
  const d = diffPixels(flat, sheet, 8);
  ok(d.length > 500, "…and with tracks on it dims the spectrogram under them",
    d.length + " px differ — a state key without a draw would be ~0");
}

section("R5.6c — holding a comb dims the others");
{
  const all = shotDrawn(SG + "&sgchord=E", TALL);
  const held = shotDrawn(SG + "&sgchord=E&sgfocus=0", TALL);
  const d = diffPixels(all, held, 8);
  ok(d.length > 500, "holding a comb changes the picture", d.length + " px differ");

  // …but so would the labels alone — a held comb is the only one named — and an
  // assertion satisfied by the wrong half of the feature is no assertion. The fade
  // is isolated by holding the SAME comb at two depths: same labels, same tracks,
  // only the weight of the five unheld combs differs.
  const soft = shotDrawn(SG + "&sgchord=E&sgfocus=0&sgdim=0", TALL);
  const deep = shotDrawn(SG + "&sgchord=E&sgfocus=0&sgdim=95", TALL);
  const dd = diffPixels(soft, deep, 8);
  ok(dd.length > 20000, "…and the unheld combs really do recede",
    dd.length + " px differ — the readout alone is a few hundred");

  const page = domDrawn(SG + "&sgchord=E&sgfocus=3");
  ok(sgattr(page, "sgramCanvasA", "data-sgfocus") === 3,
    "…and the pane says which one it is holding",
    String(sgattr(page, "sgramCanvasA", "data-sgfocus")));

  // Out of range is not a string. Nothing is held, and nothing moves.
  const bogus = domDrawn(SG + "&sgchord=E&sgfocus=9");
  ok(sgattr(bogus, "sgramCanvasA", "data-sgfocus") === null,
    "an index that is not a string holds nothing",
    String(sgattr(bogus, "sgramCanvasA", "data-sgfocus")));
  const bimg = shotDrawn(SG + "&sgchord=E&sgfocus=9", TALL);
  const db = diffPixels(bimg, all, 1);
  ok(db.length === 0, "…and leaves the picture exactly as it was",
    db.length + " px differ");
}
console.log("\n" + passed + " passed, " + failed + " failed");
console.log("artifacts: " + OUT);
process.exit(failed ? 1 : 0);
