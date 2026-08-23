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
  stack so the envelope can't bleed in. **Exports are data-only:** `strings`,
  `stringHarmonics`, `sgAlign` never appear in CSV/JSON, and PNG builders force
  `state.strings=false` for the render (restored in `finally`); `_cardStateFor(name)`
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
- **Rameau phase R1 + R2 BUILT (branch `rameau-r1r2`, gate 1 passed 2026-08-23).**
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
- **NEXT — Rameau phase (c), the educational layer** (tasks + gates in docs/ROADMAP.md;
  specs in docs/STORY.md, math in docs/THEORY.md; do before M3/M4, which remain gated on
  explicit user go-ahead): **R3 discovery moments** — when a shown harmonic of one string
  coincides with another string's fundamental (±6 cents, fixed, no control), mark it with
  a quiet ✦ that click-opens a popover explaining the coincidence via the ratio; then
  **R4** harmonic-ancestry info in the per-string popovers (ratio to root,
  overtone-family vs shares-an-ancestor, the denominator rule); then **R5** interval
  consonance explainers (joint period, comb alignment, Plomp–Levelt roughness) — R5.2/R5.3
  blocked until the user resolves the two docs/THEORY.md §2.5 numeric caveats. Educational
  tone: measure first, never lecture — curiosity clicks the ✦. **Gate 2 sits after R3.1 +
  R3.2, before R3.3 starts:** `findCoincidences()` is shared block-0 code that R3.3, R3.4,
  R4.2 and R5 all inherit.
- 117/117 tests pass (`node tests/dsp.test.js`, including the M2.6e switch CSS contract and the R1.3 snapshot back-compat guard, extracted from `index.html` and mutation-checked). Demo pair verified end-to-end
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
  moments, R4 ancestry, R5 consonance) split into individually buildable, testable,
  commit-sized tasks with file anchors and done-when criteria. Read before starting
  any Rameau-phase work; update the task's status there when it lands. Its "Working
  discipline" section is the scope contract for anyone (human or model) building these
  tasks — smallest diff, no unrequested refactors/UI/deps, flag rather than improvise.

## Run / test

- Open `index.html` in a browser. `?demo` auto-loads the built-in demo pair
  (`?demo=a`/`=b` loads one side only). Other test hooks: `?theme=bright|dark`,
  `?sgalign=file|onset`, `?mag=<viewkey>`, `?guide`,
  `?zoom=key:x0,x1[,y0,y1]` (key = spec|diff|env|eqresp|sga|sgb|sgd; data units —
  sg keys take x in display-time seconds, y in Hz), `?vocab=eq|anatomy|solo|mix`
  (annotation-lane vocabulary), `?ca=RRGGBB`/`?cb=RRGGBB` (session-only guitar-color
  overrides), `?open=all|key,key` (unfold collapsed panels: diff|bands|tone|eq|sgram|
  env — **full-page screenshots need `?open=all`** now that eq/sgram/env start
  folded), `?pop=<glosskey>` (pin a glossary/region popover open for capture),
  `?strings=1|0` (bottom-axis open-string labels), `?harmonics=0|1` (compat hook —
  `1` turns harmonics 2–4 on for every string), `?how` (open the "How to use this
  app" walkthrough), `?about` (open the About modal), `?debug` (reveal the hidden
  "Load test files" button).
- `node tests/dsp.test.js` — full DSP suite. `node tests/make_samples.js` — regenerate WAVs.
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
  **max-pooled per cell** (never mean — see ARCHITECTURE.md), shared A/B color scale,
  difference pane onset-aligned, diverging colormap, p98 scale; individual panes get
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
  on the plot. Sgram zoom crops the rendered colormap image (no STFT recompute), so
  deep zooms blur rather than resolve.
- Keep `tests/make_samples.js` synth math identical to the in-app demo synth when
  editing either.
- Update SPEC.md changelog, this file, and ARCHITECTURE.md at milestone boundaries and
  after significant decisions, unprompted. Commit at each working state.
