# GuitarScope — working brief

Single-page, offline guitar spectrum comparison tool. Drop two recordings (same riff,
different guitars), get long-term average spectra, band energies, and a tone-character
panel where every number is scientifically defensible. Read SPEC.md for the full
commissioning prompt (verbatim — never edit that section) and the append-only decision
changelog. Read docs/ARCHITECTURE.md before touching DSP or rendering.

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
- **UX batch 3 (2026-08-20, session 9): M2.6a + M2.6b + M2.6c BUILT** — M2.6a: global
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
  called from `setVocab()`. **Remaining: M2.6d** cursor/collapse affordance audit; **M2.6e**
  per-card exports (300-dpi PNG / JSON / CSV, EQ-match JSON); **M2.6f** versioned
  `gsSettings` persistence (user agreed: mode/tuning+offset/A4/EQ device/smoothing +
  Strings; NOT level-match; footer reset). One commit per submilestone.
- 100/100 DSP tests pass (`node tests/dsp.test.js`). Demo pair verified end-to-end
  against a numeric probe of the full pipeline; every view since M2 verified by headless
  `?demo` screenshots in both themes (EQ device faces, single-guitar, magnify, all four
  vocabulary lanes, zoomed panes, custom guitar colors incl. the recolored difference
  colormap, verdict strip, audition popovers, folded/unfolded cards) plus
  pixel-regression compares against prior commits at each step. UI state machines
  (audition html, card play, EQ text export, disclosure) have node tests that extract
  the real functions from index.html — see the scratchpad pattern in ARCHITECTURE.md.

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
  `?strings=1|0` (bottom-axis open-string labels), `?mode=electric|acoustic`
  (instrument mode, for headless acoustic checks).
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
  comes from the user" — instrument mode is a toggle, not detection.
- **Every visible number defensible.** Analysis params live in the footer; smoothing
  state is always printed on the plot; dB re full-scale sine everywhere; glossary terms
  link each label to its formula with current values.
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
  not a theme change.
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
