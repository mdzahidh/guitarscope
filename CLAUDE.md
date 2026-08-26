# Claude Rameau — working brief

*(formerly GuitarScope; renamed 2026-08-22 — see docs/STORY.md for the name's story)*

**Claude Rameau** — *"Yes — but why does it sound that way?"* (the slogan; it renders
next to the app title). Single-page, offline guitar spectrum comparison tool. Drop two
recordings (same riff, different guitars), get long-term average spectra, band energies,
and a tone-character panel where every number is scientifically defensible. Read SPEC.md
for the full commissioning prompt (verbatim — never edit that section) and the
append-only decision changelog. Read docs/ARCHITECTURE.md before touching DSP or
rendering. **Read docs/STORY.md before touching user-facing copy, naming, or the About
section** — it holds the app's identity, the About text, and the educational product
direction. **docs/THEORY.md is ground truth for every educational/physics claim** —
build educational copy from it, never re-derive from scratch.

## Status

- **M1 + M1.5 + acoustic support + glossary + M2 (spectrogram, envelope overlay, onset
  ticks) + M2.5 (spectrogram difference/level-match/string markers, EQ-region lane,
  EQ match with device faces) + M2.5 follow-ups (spectrogram time-axis alignment,
  plot magnify, EQ-vocabulary rows in Band Energy, single-guitar mode, recording guide,
  Bright/Dark themes with Bright default) + interactive zoom on the four line plots
  (box-select, shift-pan, ctrl/⌘-wheel, reset) + frequency-vocabulary lanes (user
  request (b): EQ speak default / Anatomy / Solo EQ / Band mix, selector on the spectrum
  card) + the 2026-08-20 UX batch a–k (region vocabularies drive plot shading and the
  Band Energy table with keep/cut role colors; Regions + EQ-device dropdowns;
  comparison toggles auto-on when both slots fill; spectrogram zoom; string labels
  outside the sgram plot; labeled file-card buttons; tone rows as true left→right
  axes; user-selectable per-theme guitar colors) + the 2026-08-20 UX batch 2 (more
  distinct default accents; Band-mix default vocabulary; stronger region shading incl.
  the Difference plot; "At a glance" verdict strip; EQ-match "Copy settings" export;
  region audition buttons; per-card loudness-matched Play; progressive disclosure —
  six panels fold, EQ/sgram/envelope start folded): BUILT, awaiting user testing.**
  All built on explicit user request 2026-08-19/20. User rejected renaming A/B to file
  names, and deferred task-based entry points to M3. Do not start M3 (live input) or
  M4 (chain measure) until the user has tested and said so.
- **UX batch 3 (2026-08-20, session 9): M2.6a + M2.6b + M2.6c + M2.6d BUILT** — M2.6a: global
  Level-match switch in the header (Comparison field; spectrum/sgram twins and both
  Difference toggles + "d" key + `?diff` hook deleted — difference views exist
  whenever two sources do, fold the card to dismiss); Regions selector also moved to
  the header (cross-card scope); Difference plot now prints the spectrum's status
  chip (smoothing/lm/zoom); snapshots write `lm` only, readers treat old `sgLm` as
  `lm`. M2.6b: header Strings toggle (default off, `gsStrings`, "S" key) puts
  open-string note labels on the **bottom** axis of both frequency line plots as
  dotted verticals, click-for-docs (per-string popover: ET formula with MIDI + A4
  substituted, harmonics 2–5 with note names, ±1/6-oct audition); top-axis tuning
  labels and ALL on-plot frequency text removed — peak/annotation dots are dots-only
  click targets, glossary values now print Hz + nearest note; Difference-plot lane
  and string labels clickable; PLOT.mT 46→34; sgram right-edge markers unchanged
  (different axis); snapshots don't carry the toggle. M2.6c: region-boundary Hz
  labels under the lane ticks, one small line per row (9 px, `fLabel` compact
  format), overlap guard skips rather than smears; lane height now dynamic —
  PLOT.mT 34, or 48 for two-row vocabularies (Anatomy), via `syncLaneHeight()`
  called from `setVocab()`. M2.6d: affordance audit — canvas doc-targets hover the
  `help` cursor (attachCrosshair hit-test; guarded so it never fights a pan's
  `grabbing`), collapse chevron restyled as a real bordered button, the whole
  header of the six foldable cards toggles both ways (`.foldable`; clicks on
  controls/text selections exempt), magnify buttons always visible (were
  hover-revealed). **M2.6e BUILT (session 10):** checked switches use `--switch-on`
  (cool slate, not `--slot-a/--slot-b`) with `--switch-knob` (paper-light) in both
  themes; the old `#39424f` + `--ink` fill read as a solid dark pill on Bright.
  CSS-only. **M2.6f BUILT (session 11):** one "Frequency analysis" card with three
  individually foldable sub-sections (Spectrum / Difference / Band energy);
  Difference sub-section exists only with two sources; Strings + Regions move from
  the global header into the card header (scope = this card), Level-match stays
  global; `gsCollapse`/`?open=` gain sub-section keys (`spec`/`diff`/`bands`);
  magnify keys unchanged. **M2.6g BUILT (session 12), REWORKED (session 13):** harmonics
  are **per string, not global** — the old "Show harmonics" switch is gone; each
  open-string popover carries a switch per harmonic 2–5 (`state.stringHarmonics`,
  a 6×4 grid, all off by default), and a `Clear harmonics` button in the Frequency
  card header wipes them (`syncClearHarmonicsBtn()` disables it when Strings is off
  or nothing is on). Each string owns one of six `STRING_COLORS` (a **data** palette
  — never themed); its harmonics draw in the same hue at 0.48 alpha / dash [2,3]
  vs the fundamental's 0.85 / [3,3], and carry **no labels** (an earlier ×2–×4
  labelling was dropped — hue + left-to-right order say it). `?harmonics=0|1`
  survives as a compat hook meaning "2–4 on for every string". **M2.6h BUILT
  (session 12):** per-card 300-dpi PNG (`pHYs` 11811 dpm) / JSON / CSV —
  Spectrum/Difference buttons per sub-section inside the merged card, Bands
  CSV/JSON only, plus Tone (CSV/JSON), Sgram/Env/EQ; **PNG only for canvas cards**
  — Band energy and Tone are HTML tables and export data, not a picture of numbers.
  PNGs render clean from scene builders via `_cardPng`/`_exportPngCanvas`.
  **M2.6i BUILT (session 12), bumped to v3 (session 13):** versioned `gsSettings`
  (**v3**: tuning+offset/A4/smooth/EQ device+dir/vocab/Strings + the 6×4
  `stringHarmonics` grid; NOT level-match, and no longer `mode` — v1/v2 payloads
  still load, their stale `mode` key ignored) with migration from v1 (global
  `harmonics` boolean → 2–4 on all strings) and from legacy
  `gsVocab`/`gsStrings`/`gsHarmonics`/`gsStringHarmonics`,
  `saveSettings()` on explicit actions, footer “Remembered … — Reset saved
  settings” (`resetSettingsBtn`).
- **Release hardening (session 13), then v1.0.0 tagged:** PNG export made total —
  `_exportPngCanvas` handles `toBlob` returning null (→ `toDataURL` fallback →
  raw blob → error toast), `_pngWithDpi` parses the real IHDR length and
  bounds-checks every offset, returning the original blob on any surprise; one
  footer on every PNG (`made with GuitarScope`); `exportSgramPNG` builds its own
  stack so the envelope can't bleed in. **Exports were data-only:** `strings`,
  `stringHarmonics`, `sgAlign` never appear in CSV/JSON, and PNG builders forced
  `state.strings=false` for the render (restored in `finally`) — **the PNG half of that
  was reversed at R5.1a on user request; see the R5.1a bullet**; `_cardStateFor(name)`
  narrows the recorded settings per card. The debug **“Load test files” button is
  hidden** in the shipped app and revealed by `?debug` (`loadDemo()` untouched).
- **v1.0.0 release batch (session 13, user request):** (a) **“How to use this app”**
  modal (`#howBtn` beside “How to record”, `#howLink` in the spectrum empty state,
  `?how` hook, Esc cascade) — three steps only: drop one or two files, set the
  tuning, leave Level-match on for comparisons; it hands off to the recording guide
  rather than repeating it. (b) **Instrument selector removed** — electric/acoustic
  drove exactly two peak-dot *labels* in `annotationsFor()` and nothing else, so
  `state.mode`, `setMode()`, `modeSeg`, the “M” key, `?mode=`, the shortcut row and
  the PNG-header mode line are all gone; the air/top resonance numbers are still
  measured for every file and reported through the glossary (their `measure:` text
  rewritten to say the band is the same physics under either word), and the
  acoustic mic-placement bullet stays in the recording guide. Old snapshots'
  `settings.mode` is deliberately ignored. (c) **Empty-state fix:** `updateVisibility()`
  used to hide the whole Frequency card at zero files, which made the empty state
  (what-to-do-next, “Load demo pair”, both help links) unreachable — the card now
  always renders and `#freqBands`/`#freqDiff` gate on the source count instead.
  This mattered acutely once the debug loader was hidden.
- **Post-v1.0.0 legibility fixes (session 15, user request):** Tone-character value
  dots 9 → 13 px with a 2 px background ring (labels nudged 7 → 9 px off the axis);
  the fold chevron is a 30×30 button whose arrow is **drawn from two borders on a
  rotated box**, not the `▾` glyph — that glyph renders tiny inside its em box, so
  enlarging the font never enlarged the mark. Down = expanded, right = folded.
  CSS only, both themes verified.
- **Post-v1.0.0 fix (session 14, user report): the EQ-match header no longer jumps
  when the device changes.** The subtitle names the device, and `.cardhead` wraps on
  content width (shrink is irrelevant to the wrap decision), so a longer device name
  flipped Direction/Device/Copy settings/JSON between the title row and their own
  row. CSS only: `#eqCard .headleft{flex:1 1 100%}` + a one-line ellipsized `#eqSub`.
  Pixel-identical to before for the default device; see ARCHITECTURE "Browser quirks".
- **Post-v1.0.0 fix (session 16, user report): scrollable overlays no longer chain to
  the page.** Reading to the bottom of a tall popover used to hand the remaining scroll
  to the document, and `window.scroll` closes an unpinned popover — so finishing the
  text dismissed it. `overscroll-behavior:contain` on all three scroll containers
  (`.popover`, `.glosslist`, the modal body). CSS only; a test asserts every rule
  carrying `overflow-y:auto` also contains its overscroll, so a fourth scrollable
  overlay can't be added without one.
- **Rameau phase R1 + R2 BUILT — gate 1 passed and merged to master 2026-08-23 (`f4046bf`).**
  (a) **Rename** GuitarScope → **Claude Rameau** in every user-visible string —
  `<title>`, header title + slogan, how-to modal, PNG footer, recording guide,
  glossary/string popover labels, verdict/tone prose, drop hint, footer chip, README,
  and export **filenames** (`rameau_*`). Internal `gs*` localStorage keys and `?`-hooks
  are deliberately unchanged (plumbing, not identity — ARCHITECTURE.md "Naming and
  plumbing"). The snapshot reader accepts **both** `"Claude Rameau"` and legacy
  `"GuitarScope"` so v1.0.0 snapshots still load; its test extracts the guard out of
  `index.html` and runs it. (b) **About modal** — a clone of `#howModal` carrying the
  five docs/STORY.md paragraphs verbatim, reached by two doors (an `About` button and
  the clickable title+slogan `.brandbtn`), `?about` hook, Esc cascade after `#howModal`.
  Known open taste call: the `About` button wraps the `.globals` cluster to a second row
  at 1440 px.
- **R3 gate harness BUILT (session 16, `0c713b7`); the milestone it guards is now BUILT too — see the R3 bullet below.** The
  user's workflow from here is: a delegated builder (Sonnet) implements a milestone
  and opens a PR, I review and merge. Sonnet writes no tests, so the gate exists first:
  **`./tests/verify.sh`** is the definition of done and is **deliberately red** until
  R3.2–R3.5 land. It runs `tests/dsp.test.js` (shipped-math baseline),
  `tests/r3.test.js` (block-0 coincidence math, green, + the R3.2/R3.3/R3.4 wiring
  contracts read out of `index.html`'s own source, red), `tests/headless.js` (drives
  real Chrome and compares two builds of the same page differing in one query
  parameter — no golden image to maintain), then two tamper guards: `tests/`
  byte-identical to the base, and the frozen ✦-popover copy matching its SHA-256.
  **`tests/` is read-only for the builder** — that guard is what makes the rest mean
  anything, and it is written into ROADMAP's "Working discipline". R3.2 owes the gate
  one new hook, **`?pop=coin<N>`** (canvas is unreachable from node). Measured while
  building it, and now asserted: only *open strings* are coincidence targets, so
  widening the tolerance 6 ¢ → 50 ¢ admits **nothing new in any stocked tuning** —
  every landing is a fifth (−1.955 ¢) or an octave (exactly 0), each folding to a
  power-of-two denominator (E std/Eb/D std 3 each, drop D 2, DADGAD 5 with 4 exact).
  That insensitivity is the empirical case for a fixed ±6 ¢ over a slider.
- **R3 discovery moments BUILT — gate 3 passed, merged to master 2026-08-24
  (`ddde88b` + reviewer commit `49878f1`).** Built by the delegated builder (Sonnet)
  from `docs/handoff/spark-r3.md`; `./tests/verify.sh` prints **`gate passed`** (171 + 40
  + 20 assertions, both tamper guards). A quiet ✦ sits on both frequency plots wherever a
  *shown* harmonic of one string lands within **±6 ¢** of another **open string's**
  fundamental; clicking it opens the frozen R3.4 popover, which explains the coincidence
  through its ratio. The threshold has **no control** — `?tol=<0-50>` is a gate hook only
  (unpersisted, no `gsSettings` key), and measurement says a slider would be inert.
  `state.tolCents` lives in block 4; `findCoincidences()` in block 0 (shared — R4.2 and R5
  inherit it); a fourth pass in `drawStringAxis` draws the mark in `cssColor("mut")`,
  never a guitar accent, with the same ≈12 px overlap guard as the labels (so E standard
  shows **two** ✦, near 247 Hz and 330 Hz, not three). ✦ never reached a PNG export
  (`state.strings=false` there) **until R5.1a, which made PNGs render the view as it
  stands**. Two reviewer findings are recorded in SPEC.md and
  ARCHITECTURE.md: the builder faked the headless step with a wrapper emitting synthetic
  PNGs (disclosed in its PR; the code does pass the real gate here), and a defective
  `?pop=coin` assertion of mine was being satisfied by a comment rather than reported.
  **Open taste call for the user:** the coincidence popover runs past the fold at 1440 px.
- **R3 legibility fix (session 18, user report: "too small to see … not clear what that
  mark even means"):** the ✦ is now a **drawn path** (`starPath()`, R=7.5, halo stroked
  3.5 px in `--panel`, filled `rgba(--ink-rgb,.78)`), never the ✦ character — a glyph
  sits small inside its em box, so raising the font could never raise the mark (the
  session-15 chevron trap). Still neutral ink, never a guitar accent. The overlap guard
  went 12 → 18 px (no count changes in any stocked tuning). The plot now carries a
  one-line key — a smaller `--mut` star plus *"two strings, one pitch — click a mark"*,
  drawn at `lastX + 34`, skipped rather than smeared if it would reach the status chip;
  the wording echoes the frozen popover's opening sentence rather than inventing physics.
  `drawStringAxis` returns its mark count and `drawSpectrumScene` passes `nCoin ? 20 : 0`
  as `drawLegend`'s new `yShift`, so the legend steps out of the ✦ row instead of being
  crowded (coincidences are always open-string fundamentals, 82–330 Hz — on a log axis
  that is always the legend's own corner). PNG exports were unaffected (`state.strings=false`
  there: no marks, no key, no shift) **until R5.1a — a PNG now carries whatever the plot
  carries, key and legend shift included**. Gate green; `tests/r3.test.js` is now **42** — its
  R3.3 contracts were rewritten because `/✦/` in the body would now be satisfied by a
  comment, and they assert the filled path *scoped to the mark loop* (the key draws a
  star too), the absence of `fillText("✦")`, neutral ink, and the key's presence — all
  four mutation-checked.
- **R4 harmonic ancestry BUILT — gate 4 passed, merged to master 2026-08-24 (`9be2849`;
  builder commits `5780f50` + `471d5c6`).** Gate first, then handoff
  (`docs/handoff/spark-r4.md`), then the delegated builder (Sonnet), launched from
  here — same order as R3, second time it worked. Block 0
  carries `JUST_INTERVALS`/`isPow2`/`stringAncestry()`; block 4 carries a **second frozen
  copy block** (`// ---------- harmonic ancestry copy (R4) ----------` → its end sentinel:
  `ANCESTRY_TEMPER`, `harmonicIntervalPhrase`, `landingFor`, `harmonicRowNoteHtml`,
  `ancestrySectionHtml`, `denominatorRuleHtml`) — all **inert until wired**, all traced to
  docs/THEORY.md, all SHA-frozen. `landingFor()` calls R3's `findCoincidences()` with the
  same `state.tolCents`: one detector, never two. **The pair read is the *adjacent*
  string, not the lowest** — every adjacent gap in all five stocked tunings is 5/4/7/2
  semitones (4/3, 5/4, 3/2, 9/8, all fixed by THEORY §3 and §5), whereas E→D is a minor
  seventh THEORY leaves ambiguous (§3.5); flag the gap, don't improvise. `tests/verify.sh`
  is now **five steps with two frozen SHAs**; `tests/r4.test.js` (49/11) and
  `tests/headless.js` (22/5) were written red and mutation-checked the same day, and the
  shipped build takes them to **60/0 and 27/0** exactly as the scratch build predicted.
  The shipped diff is **13 lines of `index.html`** — `harmonicRowNoteHtml(si,hh)` per
  harmonic row, `ancestrySectionHtml(si)` above "Current values", `denominatorRuleHtml()`
  as a native `<details class="pop-more">` (no JS, no state key, nothing persisted), the
  `?pop=str<N>` door beside `coin<N>`, and the `.pop-sub`/`.pop-more` rules. Verified here
  rather than trusted: real unsandboxed Chrome, no `$CHROME` wrapper, `?pop=str3`
  screenshotted in both themes (D3 146.8 / G3 196.0 / perfect fourth · 4/3 / both
  harmonics of 48.9 Hz · G1 / +2.0 ¢ from just). **Open taste call for the user:** the
  string popover is now ≈1130 px against the 560 px `.popover` cap, so the per-harmonic
  toggles sit below its scroll fold — placement was my spec (ROADMAP R4.2, asserted by
  `tests/r4.test.js`), so moving or folding the section is a reviewer edit to source *and*
  contract. Note for anyone editing the guards: **the awk programs in `verify.sh` must stay inline** — `awk -v` eats
  backslashes, so a pattern passed that way matches nothing and hashes the empty string.
- **M2.7 resolution follows attention BUILT — gate 6 passed, merged to master 2026-08-24
  (`c6ab4f9`, builder commit `3272e23`; reviewer fixes `f96e806`).** Same delegate-and-gate
  order as R3/R4 — gate first (`529a498`), docs corrected before the code (`42e8154`),
  handoff (`docs/handoff/spark-m27.md`, `7d7f6a5`), Sonnet builds, reviewer merges and
  fixes. **Spectrogram zoom is no longer only a crop:** when a pane carries an x-zoom the
  STFT is recomputed for that window at a finer resolution — `sgramWindowFor(spanSec, rate)`
  in block 0 (8192 below 2 s, 4096 at/above, floor 2048, capped by `1<<floor(log2(span*rate/4))`,
  deliberately **non-monotone** in span), with `spectrogramLog`'s new `opts.minHopDiv`
  (default **8**, so every shipped caller is byte-identical; the refine passes **32**) and
  `gridN:512`. An **unzoomed pane is pixel-identical to v1.0.0** and reports
  `data-sgwin="2048"`; refinement is per pane, so zooming A never re-analyses B. The refine
  lives **inside `sgramModelFor`** and caches **on the slot**, which is why the magnify
  overlay gets it for free — verified by hand in both themes (8192-pt Hann at a 1.4 s span).
  `drawAll()` stays synchronous: the pane draws the base pass and swaps in the finer one when
  it lands. Reviewer additions (M2.7.4, not in the handoff): the crosshair now reads the slice
  the pane actually drew (`s._sgShown`, offset by that slice's `t0`) so the hover number can't
  disagree with the pixel under it; one refine per gesture (`SG_REFINE_SETTLE_MS = 120`, stale
  jobs dropped rather than overwriting a newer one); `?refine=0` made a real hook (its contract
  had been satisfied by a decoy string). **No third frozen copy block** — M2.7 ships no
  educational prose. Known gap: nothing in the gate asserts the *magnify overlay's* window
  (≈1 headless launch in 6 races the refine); the by-hand check is recorded in ROADMAP M2.7.
- **R5.0 + R5.1 BUILT (session 19) — gate 7 passed; awaiting the user's visual test.**
  Same delegate-and-gate order as R3/R4/M2.7: gate first (`61e3918`, written red), handoff
  (`docs/handoff/spark-r5.md`), builder, reviewer merges and fixes. The **spectrogram
  overlay is a generative model** — the user names the note, the app draws the partials
  theory predicts across the measured image, and the user sees whether the energy is there.
  It never detects: which notes sounded is *intent*. **R5.0** (`3befbfc`) adds block 0's
  direction-free `notePartials()` / `partialClusters()` and a second tolerance tier
  `TEMPERED_CENTS = 20` (R3's `findCoincidences()` and `COINCIDENCE_CENTS = 6` are
  untouched and byte-identical — two questions, one set of primitives; the reasoning and
  the measured 17–50 ¢ dead zone are in SPEC.md). **R5.1** (`154eec9` + `0da9427`) adds
  `state.sgFrets`/`state.sgHarm` — the overlay's **own** state, separate from the frequency
  plots', unpersisted, never exported — an `Overlay` control pair in the sgram card head,
  `comb` on `sgramModelFor()`, a fourth draw pass in `drawSpectrogramScene()` (black halo,
  then `_stringColor(key)`; solid fundamental, dashed above; no labels; clipped to the
  plot rect), and the gate hooks `?sgnote=<0-5>` / `?sgharm=<n>` plus `data-sgcomb`.
  **Reviewer fix, and the trap to remember:** `key` is the index into the array handed to
  `notePartials()` *and* the thing that picks the hue, so the builder's one-note call
  painted every string red — `sgramModelFor()` now hands it a six-slot array, and the 76th
  r5 assertion (mutation-checked against two spellings) closes the gap. Proved in pixels,
  not by eye: a hue census per string, and — because the demo pair *is* the six open
  strings — the six predicted tracks sit on local luminance maxima of the overlay-off
  image. sgram PNGs stripped the overlay as built; **the user reversed that at R5.1a.**
- **R5.1a legibility pass BUILT (session 20, reviewer, from the user's visual test).** Four
  items, all reviewer-built (≈40 lines — three of them are judgement calls about what a
  control says, not plumbing). **(a) tracks hard to see against the magma:** halo 3 → 5 px
  at alpha 0.55 → 0.75, track 1.5 → 2.5 px, dash `[3,3]` → `[6,4]`, and `_stringColor` →
  **`_trackColor(si,alpha)`** = `liftForDark(STRING_COLORS[si], 0.62)`. Diagnosed by census,
  not by eye: **94.8 % of a track's pixels have both vertical neighbours below 0.18 L**, so
  a track is read against **its own halo**, not the spectrogram — the lift target has to
  clear the palette (contrast 3.38 → 4.78). Lifted **per surface, not per theme**: identical
  in Bright and Dark, like every other data color. **(b) panes too short to read frequency
  in:** `#sgramCanvasA/B/D` 230 → **372 px** (`SGPLOT.mT+mB` eats 64, so 166 → 308 px of
  plot for 60 Hz–20 kHz on a log axis), **288 px** under `@media (max-width:900px)`.
  **(c) the harmonic selector didn't say what it was for:** options read `Harmonics 1–N`,
  both Overlay selects carry `title=`, and `#sgHarmSel` ships **disabled** —
  `syncSgHarmSel()` enables it from `state.sgFrets` and is called from **every** door into
  that state (the note select's change handler, the `?sgnote=` hook, `fillSgNoteSel()`),
  with `select:disabled{opacity:.4}` so the greying is visible. Affordance, not help text.
  **(d) "any export of PNG should include the visualization"** — taken **broadly**:
  `exportPNG`, `_cardPng` and `exportSgramPNG` all stop blanking `state.strings` /
  `stringHarmonics` / `sgFrets`. **PNG = the view, CSV/JSON = the data.** This retires the
  sgram-PNG taste call and the older "✦ never reaches a PNG" rule. Gate: `tests/r5.test.js`
  76 → **102**, including the **inverted** exporter contract (no exporter may assign those
  keys); all 11 new assertions mutation-checked the day they were written.
- **Spectrogram difference pane REMOVED (session 21, user report).** The pane subtracted the
  two spectrograms **cell by cell at shared file time** — meaningful only if both takes play
  the same section, start together and hold the same tempo. Real takes drift within a bar, so
  after the drift every pixel compared one note against a different note. Deleted rather than
  caveated (≈290 lines: `sgramCanvasD`, `buildSgramDiffModel`, `drawSgramDiffScene`,
  `attachSgramDiffCrosshair`). **Kept:** `sgramDifference()` in block 0 (pure node-tested math
  the warped replacement will call after the warp) and its CSS, left inert rather than churning
  a stylesheet the gate hashes. **The comparison that survives is the LTAS Difference**
  (`diffCanvas`) — a long-term average spectrum is time-invariant, so it needs no alignment;
  that is why it was the original difference view. An onset-warped / DTW replacement is
  recorded in ROADMAP as deferred until after R6.
- **R5.2 open-chord picker BUILT (session 21).** R5.1 overlaid one string; a chord is where
  several harmonic series interleave and **the merge is visible before anything is marked** —
  which is why R5.3's ✦ clusters come after it. `SG_CHORDS` stocks eight open shapes (E, Em,
  A, Am, C, D, Dm, G) as six-slot **fret** arrays (`null` = muted), so a shape **moves with
  the tuning** (`tuningMidi(...)[si] + fret`) instead of freezing in E standard; `_sgChordName()`
  reverses the lookup for the status chip. No new state and no new draw code — `state.sgFrets`
  was always six slots and R5.1 merely never filled more than one, so `sgramModelFor()` hands
  `notePartials()` the same **six-slot** array and each string keeps its own hue (`key` indexes
  what it was given — the R5.1 trap). The picker is a second `<optgroup label="Open chord">`
  built **from** `SG_CHORDS`; the handler mutes all six slots, then assigns `ch.frets.slice()`
  — a copy, never the shipped table. Gate: `?sgchord=<name>` (gate-only hook, unpersisted),
  `tests/r5.test.js` 102 → **128**, `tests/headless.js` 40 → **45**, reading `data-sgcomb`
  through real Chrome (E → 36, D at N=3 → 12, `Zz` → absent). One assertion was **too loose**
  and survived a mutation that hard-coded the open notes; it now captures the tuning variable's
  own name from `const <v> = tuningMidi(state.tuning` and requires `<v>[si] + fr` inside the map
  body. All 31 new assertions mutation-checked the day they were written.
- **R5.6 legibility BUILT (session 22, reviewer).** The user tested R5.2 and returned three
  items: label the harmonics, and two ideas for the congestion 36 tracks make — both "with
  some tunable parameter (in the UI for debugging)". Built **before R5.3** because the ✦
  marks have to sit on whatever legibility scheme wins. **(b) Labels:** `partialLabel(p,a4)`
  in block 0 — the fundamental prints alone (`E2`), harmonics print `E2 ×3 = B3` inside R3's
  locked tier and `E2 ×5 ≈ G♯4` beyond it; the `≈` carries the lesson (the 5th harmonic is
  14 ¢ under the tempered note, THEORY §1/§5). Drawn highest-first, **skipped rather than
  smeared** within 12 px (M2.6c's rule). **This reverses R5.1's "no labels"**, which held
  only while one string could be overlaid. **(a) Scrim:** `state.sgScrim` (default 0.45,
  range 0–90 % in the card head, `?sgscrim=`) fills the plot rect between the image and the
  tracks — **no comb, no sheet**, so the measurement is never dimmed for its own sake.
  **(c) Hold-to-follow:** `attachSgFocus(i)` hit-tests with `_sgTrackAt()` (the same
  `notePartials()` question the model asks, through the pane's zoom window, 8 px), sets
  `state.sgFocus` to that **string**, and every other comb draws at `1 − state.sgDim`
  (default 0.85, range 0–95 %, `?sgdim=`) with its labels gone; a drag past 3 px hands off to
  the zoom box, mouseup/mouseleave clear, `?sgfocus=<0-5>` holds without a mouse. Both ranges
  ship `disabled` and `syncSgHarmSel()` enables them at every door into `state.sgFrets` (it
  also clears a focus whose string stopped sounding). None of the three keys is persisted,
  exported, or in the refine cache key. Gate: `data-sglabels`/`data-sgfocus` beside
  `data-sgcomb`, `tests/r5.test.js` 128 → **180**, `tests/headless.js` 45 → **56** (a scrim
  with no overlay is pixel-identical to none; `sgdim=0` vs `sgdim=95` differ by 741 px); all
  new assertions mutation-checked the day they were written. **Harness note:** two M2.7
  assertions went red mid-build and were **environmental** — the decode/draw race missed 7
  launches in 8 on an *unmodified* checkout under 99 % background CPU, 0 in 8 once idle;
  `domDrawn`/`shotDrawn` now report the launch they succeeded on and shout when the whole
  budget passed undrawn, and no assertion was weakened.
- **R5.3 collisions marked and clickable BUILT (session 22, reviewer).** The user's first
  item from the same message: mark where the combs **collide**. `sgramModelFor()` calls
  `partialClusters(comb, TEMPERED_CENTS)` — the R5.0 primitive at the R5.0 tier, **no new
  detector and no new tolerance** (R3's `findCoincidences()`/`COINCIDENCE_CENTS = 6` are
  byte-identical). `clusterRatio()` in block 0 reads the chord backwards out of the landing:
  every member meets at `f = f_i × h_i`, so the fundamentals go as `1/h_i` — one member per
  key at its **lowest** colliding harmonic, `L = lcm(h_i)`, term `L/h_i` (already lowest
  terms, `gcd(L/h_i) = 1`), exact octave duplicates folded away with `isPow2` and the
  survivors reduced. `CHORD_RATIO_NAMES` names only what THEORY fixes — `4:5:6` major (§1,
  a segment of one series), `10:12:15` minor (§4, a stack), five two-term intervals;
  anything else prints the ratio and stops rather than guessing a chord name. A fourth draw
  pass places one `starPath()` per in-range cluster — **path, never the ✦ glyph** — in fixed
  cream over a black halo (the landing belongs to neither string, and the magma is dark in
  both themes), **filled** inside ±6 ¢ and **hollow** in the tempered tier, fading with
  R5.6c's focus. Marks spread evenly along **x**, which carries no meaning here (a predicted
  landing has no time), so the thinning is by **x stride**, not the labels' vertical 18 px
  guard — skip rather than smear, measured on the axis that smears. Clicks reuse
  `sgHits[i]`/`attachHitClicks` (so the M2.6d `help` cursor comes free) into
  `openClusterPopover()` and the **third frozen copy block** (SHA `1da64ae2…`): musician's
  ear / physics / equal temperament / how Rameau places it / current values, each term as
  `E2 ×3 = 247.5 Hz`, the mistuning in cents *and* Hz of beating, ±1/6-oct audition. Gate:
  `?pop=clu<N>` and `data-sgclusters` (marks **drawn**, not clusters found — the stride is
  observable), `tests/r5.test.js` 180 → **232**, `tests/headless.js` 56 → **64**, including a
  pixel census of the marks' cream (E → 11 per pane of 36 partials, 22 drawn; C → 8; fewer
  lit at `?sgfocus=0&sgdim=95`). All new assertions mutation-checked the day they were
  written — one pairing had to be re-run because a mutation that removed the write path
  **masked** a second mutation under test.
- **NEXT — R5.4** (tasks + gates in docs/ROADMAP.md; specs in docs/STORY.md, math
  in docs/THEORY.md; do before M3/M4, which remain gated on explicit user go-ahead):
  bound the overlay in time, then **R5.5** near-floor disclosure on the LTAS
  Difference. R5.1/R5.2/R5.6/R5.3 are all built and awaiting the user's visual test. **R6** is the old R5 — interval consonance
  explainers (joint period, comb alignment, Plomp–Levelt roughness) — still blocked until
  the user resolves the two docs/THEORY.md §2.5 numeric caveats. Educational tone: measure
  first, never lecture — curiosity clicks the ✦. **Delegation shape, proven at gates 3, 4
  and 7: write the physics copy myself, freeze it by sentinel + SHA, hand the builder only
  the plumbing (Sonnet — via exec for milestones, sub-agents for small tweaks per 2026-08-26).**
- The full gate is green: `./tests/verify.sh` — dsp 171, r3 42, r4 60, m27 51, r5 232, headless 64, plus
  all four tamper guards (`tests/` untouched, all three frozen copy SHAs). `tests/dsp.test.js` includes the M2.6e switch CSS contract and the R1.3
  snapshot back-compat guard, extracted from `index.html` and mutation-checked. Demo pair verified end-to-end
  against a numeric probe of the full pipeline; every view since M2 verified by headless
  `?demo` screenshots in both themes (EQ device faces, single-guitar, magnify, all four
  vocabulary lanes, zoomed panes, custom guitar colors incl. the recolored difference
  colormap, verdict strip, audition popovers, folded/unfolded cards) plus
  pixel-regression compares against prior commits at each step. UI state machines
  (audition html, card play, EQ text export, disclosure) have node tests that extract
  the real functions from index.html — see the scratchpad pattern in ARCHITECTURE.md.
  M2.6e adds a CSS-contract check in `tests/dsp.test.js` (same `index.html` read)
  so the switch on-state cannot silently revert to the dark pill or guitar colors.

## File map

- `index.html` — the entire app, the only shipped artifact. No build step, no server, no
  network. Five `<script>` blocks in order: **0** DSP (pure functions, node-safe — tests
  import this block by extraction), **1** audio decode/sniffing glue, **2** glossary data
  + popovers, **3** canvas rendering, **4** app state/UI/synth/exports.
- `tests/dsp.test.js` — extracts script block 0 from index.html, runs it under node.
  No framework; prints `N passed, M failed`, exit code 1 on failure.
- `tests/verify.sh` — **the Rameau gate** (R3, then R4, then M2.7, then R5); the one command a delegated
  builder must get to exit 0 before opening a PR. Runs the five node suites plus
  `tests/headless.js` and the untouched-`tests/` and frozen-copy guards; `BASE=<ref>` picks the comparison base (default `master`).
- `tests/r3.test.js` — the R3 suite: `findCoincidences()` math and the R3.2–R3.4 wiring
  contracts, all read out of `index.html`. `tests/r4.test.js` — the same shape for R4:
  `stringAncestry()`/`isPow2` math plus the R4.1–R4.4 wiring contracts and the frozen
  ancestry-copy SHA. `tests/m27.test.js` — the M2.7 suite: `sgramWindowFor()` math, the
  M2.7.1–M2.7.4 wiring contracts, and the guard that ARCHITECTURE.md's "zoom is a crop"
  bullet was rewritten and SPEC.md appended (docs the code contradicts are a gate failure).
  `tests/r5.test.js` — the R5 suite: `notePartials()`/`partialClusters()` math, the
  consistency assertion binding every `findCoincidences()` landing to some cluster, and the
  R5.1 wiring contracts — including the one that the note set handed to `notePartials()` is
  **string-indexed, not the single selected note** (`key` picks the hue).
- `tests/headless.js` — differential pixel + DOM checks through real Chrome. Note two
  traps recorded in ARCHITECTURE: `--user-data-dir` makes headless Chrome hang forever
  in first-run setup, and `index.html` carries its own source inline, so `--dump-dom`
  contains every string literal — scope copy assertions to the target element.
- `tests/png.js` — dependency-free PNG decode / pixel diff / blob clustering (node
  `zlib` only), used by `headless.js`.
- `tests/make_samples.js` — regenerates `samples/*.wav` (deterministic Karplus–Strong,
  same seeds/math as the in-app demo — the two must stay in lockstep), then verifies the
  app's own sniffer reads the rates back.
- `samples/demo-bright-44k.wav`, `samples/demo-warm-48k.wav` — drag-drop test material.
- `SPEC.md` — verbatim prompt + decision changelog. `docs/ARCHITECTURE.md` — DSP
  pipeline, parameter rationale, browser quirks, dead ends.
- `docs/STORY.md` — the app's identity: name/slogan origin, the About-section text,
  and the educational product direction (discovery moments, ancestry views,
  consonance explainers). Read before user-facing copy.
- `docs/THEORY.md` — the verified physics/math source (harmonic series, roughness
  §2.5, consonance §2.6, denominator rule §3.4, narrative §3.6, dynasty of
  fifths/Tonnetz §3.7, Rameau appendix) — ground truth for all educational features.
- `docs/ROADMAP.md` — the Rameau phase (R1 rename, R2 About modal, R3 ✦ discovery
  moments, R4 ancestry, M2.7 resolution-follows-attention, R5 harmonic tracks,
  R6 consonance) split into individually buildable, testable,
  commit-sized tasks with file anchors and done-when criteria. Read before starting
  any Rameau-phase work; update the task's status there when it lands. Its "Working
  discipline" section is the scope contract for anyone (human or model) building these
  tasks — smallest diff, no unrequested refactors/UI/deps, flag rather than improvise.

## Run / test

- Open `index.html` in a browser. `?demo` auto-loads the built-in demo pair
  (`?demo=a`/`=b` loads one side only). Other test hooks: `?theme=bright|dark`,
  `?sgalign=file|onset`, `?mag=<viewkey>`, `?guide`,
  `?zoom=key:x0,x1[,y0,y1]` (key = spec|diff|env|eqresp|sga|sgb; data units —
  sg keys take x in display-time seconds, y in Hz), `?vocab=eq|anatomy|solo|mix`
  (annotation-lane vocabulary), `?ca=RRGGBB`/`?cb=RRGGBB` (session-only guitar-color
  overrides), `?open=all|key,key` (unfold collapsed panels: diff|bands|tone|eq|sgram|
  env — **full-page screenshots need `?open=all`** now that eq/sgram/env start
  folded), `?pop=<glosskey>` (pin a glossary/region popover open for capture; `?pop=coin<N>` pins
  the Nth ✦ coincidence popover, N indexing the sorted `findCoincidences()` result;
  `?pop=str<N>` pins the open-string popover for string N = 0–5, low E first;
  `?pop=clu<N>` pins the Nth collision-cluster popover of the current overlay),
  `?tol=<0-50>` (coincidence tolerance in cents — **gate hook only**, unpersisted, no UI),
  `?refine=0` (disable M2.7's zoom refinement, restoring the crop-only spectrogram —
  **gate hook only**, unpersisted, no UI; each sgram pane canvas also carries
  `data-sgwin="<window>"`, the window that pane actually rendered, for the same reason:
  the canvas is unreachable from node),
  `?sgnote=<0-5>` (spectrogram harmonic overlay: pick one open string; out of range selects
  nothing), `?sgchord=<name>` (one of the eight stocked open chords — `E|Em|A|Am|C|D|Dm|G`;
  an unstocked name overlays nothing, because the hook mutes all six strings before it
  resolves) and `?sgharm=<n>` (harmonics 1–N, clamped 1–16) — **gate hooks only**,
  unpersisted; each sgram pane canvas carries `data-sgcomb="<count>"`, the number of partial
  tracks in that pane's overlay (sounding strings × the harmonic limit), absent when the
  overlay is off,
  `?sgscrim=<0-90>` / `?sgdim=<0-95>` (R5.6's scrim opacity and unfocused-comb dimming, as
  percentages — these *do* have UI ranges in the sgram card head; the hooks exist so the gate
  can set them) and `?sgfocus=<0-5>` (hold one string's comb without a mouse; out of range
  holds nothing) — unpersisted, never exported; panes also carry `data-sglabels="<count>"`
  (harmonic labels actually drawn, after the 12 px overlap guard), `data-sgfocus="<si>"`
  (the comb being held) and `data-sgclusters="<count>"` (R5.3 collision marks actually
  **drawn**, after the x-stride thinner — not the number of clusters found), all absent
  when there is nothing to report,
  `?strings=1|0` (bottom-axis open-string labels), `?harmonics=0|1` (compat hook —
  `1` turns harmonics 2–4 on for every string), `?how` (open the "How to use this
  app" walkthrough), `?about` (open the About modal), `?debug` (reveal the hidden
  "Load test files" button).
- `node tests/dsp.test.js` — full DSP suite. `node tests/make_samples.js` — regenerate WAVs.
- `./tests/verify.sh` — the Rameau gate (all suites + tamper guards; seven steps as of R5).
  **Green as of gate 7**; keep it that way, and reuse its shape (frozen copy + read-only
  `tests/`) for R5.2 on.
  **It must not run inside a shell sandbox** — Chrome aborts at startup in
  `_RegisterApplication` (exit 134) when it cannot reach `launchservicesd`, and macOS
  pops a crash dialog per launch. `tests/headless.js` recognises that abort, prints the
  cause and the fix, and stops on the first one. Delegated milestone builds launch as
  `/usr/local/bin/muse exec --disable-sandbox --prompt-file docs/handoff/spark-<task>.md`
  (add `--disable-approval` unattended, `-w create` for a worktree). Small instrument tweaks
  (R5.1a, the 2026-08-25 sgram-diff removal, R5.5 near-floor disclosure) delegate instead via
  in-session Sonnet sub-agents per 2026-08-26 — same gate, `tests/` still read-only. Never point `$CHROME`
  at a stub to get past it: a gate step that cannot run is red.
- Headless screenshot (virtual time fast-forwards the Welch yields):
  `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new
  --disable-gpu --hide-scrollbars --window-size=1440,2900 --virtual-time-budget=30000
  --screenshot=out.png "file:///…/index.html?demo"` — use `?demo&open=all` and a
  taller window (≈4600) to capture the panels that start folded.

## House rules

- **Sample rate is read from file bytes, never asked of the user.** Decode via
  OfflineAudioContext at the file's native rate; each file's own rate in its frequency
  math; refuse files whose rate can't be determined. "Facts come from the data, intent
  comes from the user" — tuning and A4 are user-set, never guessed from the audio.
  **There is no instrument (electric/acoustic) selector** — it was removed at v1.0.0
  because it changed nothing in the analysis (see ARCHITECTURE.md "Why instrument mode
  was removed"); acoustic body resonances are still measured and reported in the
  glossary, and acoustic mic technique lives in the recording guide.
- **Every visible number defensible.** Analysis params live in the footer; smoothing
  state is always printed on the plot; dB re full-scale sine everywhere; glossary terms
  link each label to its formula with current values.
- **Identity & education.** The app is **Claude Rameau**; the slogan *"Yes — but why
  does it sound that way?"* sits beside the title. Educational features teach the way
  the app's own origin did (docs/STORY.md): the instrument surfaces a curiosity
  marker (✦), the user clicks, the physics answers — measure first, never lecture.
  Every educational sentence must trace to docs/THEORY.md; if THEORY.md doesn't
  cover a claim, flag the gap to the user instead of improvising physics.
- **Design brief:** laboratory instrument built by a luthier. Two themes, **Bright
  (cream) is the default**, Dark is the original look; one accent per guitar per theme
  (Dark: A amber `#f0a13e`, B teal `#44c2d4`; Bright: A `#c05f04`, B `#0c6e80`),
  **user-overridable per theme** by clicking a loaded card's letter chip (localStorage
  `gsColors`, applied as inline `--slot-a/--slot-b`; snapshots deliberately don't carry
  colors — viewer preference, not analysis state). Tabular numerals, no
  chartjunk/3D/glow, 150–250 ms non-bouncy transitions. All plot chrome routes through
  CSS vars (`cssColor`/`cssRGBA`); **data colormaps never theme** — the magma
  spectrogram (never rainbow) and the diverging difference stay dark scope-screens in
  both themes. The diverging endpoints default to amber/teal and follow user-picked
  guitar colors after a luminance lift (see ARCHITECTURE.md) — a user-identity change,
  not a theme change. Checked `.switch` tracks fill `--switch-on` with a `--switch-knob`
  (paper-light in both themes); never `--slot-a/--slot-b` — those would imply the
  control belongs to one guitar.
- **DSP params:** Welch LTAS 8192-pt Hann 50 % overlap; log grid 60 Hz–20 kHz (700 pts);
  metrics integrate 60 Hz–20 kHz only; octave smoothing off/1-12/1-6/1-3; peak detection
  always on 1/6-oct curve. Spectrogram 2048-pt Hann, 256 log cells 60 Hz–20 kHz,
  **max-pooled per cell** (never mean — see ARCHITECTURE.md), shared A/B color scale;
  individual panes get
  a Free / File-time / First-onset time-axis choice; envelope overlay
  aligned at each file's first onset. **One global Level-match switch** (header
  Comparison field, M2.6a) drives plots, band table, verdict, spectrogram cells +
  shared scale, and playback gain; it **auto-latches on when both slots fill** — an
  explicit user flip this session is never overridden, snapshots pre-prime the latch
  (old snapshots' `sgLm` arms it too), dropping to one source re-arms it. Difference
  views have no toggle — they exist whenever two sources do (fold the card to
  dismiss). Both line plots print the status chip (smoothing · level-match · zoom);
  the header Regions field holds the vocabulary selector. **Strings axis (M2.6b):**
  header toggle (default off, `gsStrings`, "S" key) draws open-string fundamentals as
  dotted verticals labeled on the **bottom** axis of both frequency line plots; labels
  click to a per-string docs popover (ET formula, harmonics, ±1/6-oct audition). No
  frequency text on plots — peak/annotation markers are dots-only click targets and
  the glossary values print Hz + nearest note; the sgram's right-edge string markers
  are a separate always-on axis. **Region-boundary Hz labels (M2.6c):** the lane
  prints each region's start/end frequency directly below its ticks (per lane row,
  compact axis format; full precision stays in the region's glossary popover);
  labels sort by x, shared edges print once, and any label that would touch its
  neighbor is skipped rather than smeared. The lane is taller only for two-row
  vocabularies (PLOT.mT 34 vs 48, kept in step by `syncLaneHeight()` from the
  `setVocab()` choke point — PLOT.mT is dynamic, never cache it). EQ match: least-squares fit of RBJ
  analog-magnitude band models against the **1/6-oct-smoothed** difference (never the
  raw comb) on 140 log points; device trim absorbs the broadband level gap; "Copy
  settings" exports the same `eqFitData()` as plain text. The annotation lane
  (`VOCABS` in block 3: EQ speak / Anatomy / Solo EQ / **Band mix, the default** —
  persisted via localStorage `gsVocab` written only on explicit clicks, with a one-time
  `gsVocabMig` migration clearing a stored pre-flip "eq") **drives the spectrum AND
  Difference-plot shading and the Band Energy table rows** (roles color-coded
  cut/keep/other; Anatomy bounds are tuning-reactive via
  `VOCAB_TUNING`/`syncVocabTuning()`); the tone-character panel keeps its own fixed
  physical bands regardless of lane. All lane regions are click-to-glossary; new
  glossary categories must be appended to `GLOSS_CATS` or their entries won't render.
  The "At a glance" verdict strip reuses the Band-Energy math and the tone panel's
  `proseCandidates()` verbatim so summary and detail can never disagree. Playback
  (region audition buttons in popovers; per-card Play) always sources the **analyzed
  mono mix** — never the original file — with level-match gain on B when active
  (printed on the card button); region audition band-passes with a 4th-order
  Butterworth. One playback at a time; stops on popover close, data change, lm
  toggle, Esc, or natural end.
  Progressive disclosure: diff/bands/tone/eq/sgram/env fold to their header chevron
  (verdict + spectrum never fold; **eq/sgram/env start folded**); folded panels skip
  model + canvas work in `drawAll()`; localStorage `gsCollapse` stores only
  explicitly-clicked panels; snapshots don't carry fold state.
  Plot zoom (line plots **and** spectrogram panes) is **display-only** (`ZOOMS{}` in
  data units, baked in by the model builders, shared with the magnify overlay):
  metrics/band table/tone panel never read it, and the active window is always printed
  on the plot. **Sgram zoom refines (M2.7):** an x-zoomed pane re-runs the STFT over just
  that window at `sgramWindowFor(span, rate)` (up to 8192-pt, hop `win>>5`, `gridN:512`) and
  the pane says which window it drew — in the status chip, in the crosshair readout, and in
  `data-sgwin`. Refinement is per pane and lives inside `sgramModelFor` (cached on the slot),
  so the magnify overlay inherits it; an **unzoomed** pane still crops the base 2048-pt image
  and is pixel-identical to v1.0.0. A frequency-only zoom is still a crop — the window follows
  the **time** span. `drawAll()` stays synchronous; the finer pass swaps in when it lands.
  **Harmonic-track overlay (R5.1):** the sgram card's `Overlay` controls pick one open
  string and a harmonic limit into `state.sgFrets`/`state.sgHarm` — the spectrogram's **own**
  note state, deliberately separate from the frequency plots' Strings/harmonics, unpersisted,
  never exported, and **not part of the refine cache key**. `sgramModelFor()` publishes the
  flat `notePartials()` array as `comb` (unclipped — the draw pass clips); a fourth pass in
  `drawSpectrogramScene()` draws each partial full-width at `yOfF(f)`: a 5 px black halo at
  alpha 0.75, then 2.5 px of `_trackColor(key)` — `STRING_COLORS[key]` lifted to 0.62 L,
  because a track is read against its own halo rather than the magma — solid fundamental /
  dashed `[6,4]` above. Panes are **372 px** tall (288 px narrow) so the log
  frequency axis is readable at all. Hand `notePartials()` the
  **six-slot** note array, never the one selected note — `key` is the index it was given and
  `key` picks the hue. The tracks are a **data** palette: identical in both themes. The app
  never detects which notes were played; the user names them (intent), the overlay predicts,
  the measurement judges. The harmonic-limit select is **disabled until a note is overlaid**
  (`syncSgHarmSel()`, called from every door into `state.sgFrets`). **PNG exports render the
  view as it stands (R5.1a)** — tracks, strings axis, ✦ and all; CSV/JSON stay data-only.
  **Chords + overlay legibility (R5.2/R5.6):** `SG_CHORDS` stocks eight open shapes as
  **fret** arrays, so a shape moves with the tuning. Because six combs interleave, each
  partial now carries a label — `partialLabel()` in block 0: `E2` for a fundamental,
  `E2 ×3 = B3` inside R3's locked tier, `E2 ×5 ≈ G♯4` outside it (the 5th harmonic really
  is 14 ¢ flat of the tempered note — the `≈` is the lesson, THEORY §1/§5). Labels draw
  highest-first and are **skipped, never smeared**, within 12 px. The draw order is
  image → **scrim** (`state.sgScrim`, default 0.45, 0–90 % range, `?sgscrim=`) → chrome →
  tracks → labels: the sheet separates prediction from measurement and appears **only when
  a comb does**. Holding the mouse on a track sets `state.sgFocus` to its **string** (comb,
  not line) and dims every other comb to `1 − state.sgDim` (default 0.85, 0–95 %,
  `?sgdim=`); a >3 px drag hands off to the zoom box. `sgScrim`/`sgDim`/`sgFocus` are view
  state like `sgFrets` — unpersisted, unexported, not in the refine cache key — and their
  ranges ship disabled until something is overlaid.
  **Collision marks (R5.3):** `partialClusters(comb, TEMPERED_CENTS)` — the R5.0 primitive,
  no new detector, no new tolerance — puts one `starPath()` mark per cluster on the pane, in
  fixed cream over a black halo (it belongs to neither string, and the magma is dark in both
  themes), **filled** inside R3's ±6 ¢ and **hollow** in the tempered tier. Marks spread
  along x, which carries no meaning here, so they thin by **x stride** rather than the
  labels' vertical guard. Clicking one opens `clusterRatio()`'s reading of the chord —
  fundamentals go as `1/h_i`, octave duplicates folded, named only where docs/THEORY.md
  fixes the ratio (`4:5:6`, `10:12:15`, five intervals) and left as a bare ratio otherwise.
- Keep `tests/make_samples.js` synth math identical to the in-app demo synth when
  editing either.
- Update SPEC.md changelog, this file, and ARCHITECTURE.md at milestone boundaries and
  after significant decisions, unprompted. Commit at each working state.
