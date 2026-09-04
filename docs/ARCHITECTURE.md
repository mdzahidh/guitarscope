# Claude Rameau architecture

Implementation knowledge that is not obvious from reading the code. For scope decisions
and their dates see SPEC.md's changelog; for the working brief see CLAUDE.md.

## Module boundaries (five numbered script blocks inside index.html)

`index.html` is the only shipped artifact — no bundler, no imports. It carries **six**
`<script>` tags: the GA4 visitor tag in `<head>` (lines 10–30, added 2026-09-03 —
DNT-aware, injects nothing when offline, and touches no app state), then the five whose
order is a dependency order and which everything else in these docs numbers 0–4:

| # | Role | Key contents |
|---|------|-------------|
| 0 | **DSP core** — pure functions, no DOM, node-safe | `welch`, `smoothOct`, `bandPower`, `spectralCentroid`, `spectralTilt`, `detectPeaks`, `makeLogGrid`, `resampleToGrid`, `noteInfo`, `TUNINGS`, `stftBands`, `detectOnsets`, `amplitudeEnvelope`, `attackTimes`, `bandDecays`, `autocorrF0`, `harmonicProfile`, `dynamicsMetrics`, `sniffAudioInfo`, `magmaColor`, `CMAP_HEX`/`CMAP_NAMES`/`cmapTable`/`cmapColor`, `spectrogramLog`, `decimateEnvelope`; M2.5: `eqPeakingDb`/`eqLowShelfDb`/`eqHighShelfDb`/`eqShapeDb`, `EQ_DEVICES`/`EQ_DEVICE_BY_ID`, `lsqSolve`, `fitGraphicEq`, `fitParametricEq`, `eqSettingsResponseDb`, `sgramDifference`, `divergeColor` |
| 1 | **Audio ingestion** | File → ArrayBuffer → header sniff → `OfflineAudioContext` decode at the sniffed native rate → channel/mid selection |
| 2 | **Glossary** | Term database (musician / scientific / formula registers), popover wiring, searchable panel |
| 3 | **Rendering** | Canvas scenes (spectrum, difference, spectrogram, envelope, EQ device face, EQ response), axes/bands, EQ-region lane, collision-aware peak labels, legend, status chip, hit-rects for glossary clicks, colormapped + diverging image renderers + colorbars, PNG export composition |
| 4 | **App** | State, drag-drop, toggles, tone-character panel, comparison prose generator, spectrogram/envelope/EQ model builders + crosshairs, EQ fit cache, demo synth, CSV/JSON snapshot exports, keyboard shortcuts |

`tests/dsp.test.js` extracts block 0 with a regex and `require`s it under node — block 0
must stay free of DOM/window references. Blocks were authored as separate files in a
session scratchpad and concatenated, but the repo's source of truth is `index.html`
itself; edit it directly.

## Naming and plumbing

The app is **Claude Rameau** everywhere the user reads. Internal identifiers stay `gs*`:
`localStorage` keys (`gsCollapse`, `gsVocab`, `gsColors`, `gsSettings`, …) and `?` hooks
(`?demo`, `?theme`, `?vocab`, etc.) deliberately keep the old `gs` prefix for
back-compat — they are plumbing, not identity. Renaming them would break every saved
setting and bookmark.

## DSP pipeline and why the parameters are what they are

decode (native rate) → Welch LTAS → common log grid → smooth → render/metrics.

- **Welch: 8192-pt Hann, 50 % overlap, power averaging.** 8192 @ 44.1 kHz ≈ 5.4 Hz bins —
  enough to separate low-E harmonics; Hann for its −31 dB sidelobes; 50 % overlap
  recovers Hann's tapered samples. Async with `setTimeout` yields so the UI never
  freezes; headless tests fast-forward these with Chrome's `--virtual-time-budget`.
- **dB reference: full-scale sine.** A 0 dBFS sine reads ~0 dB after Hann coherent-gain
  correction. Physics checks in the tests: on-bin sine 0 dB, ENBW lobe sum +1.76 dB,
  worst-case scalloping −1.42 dB.
- **Each file keeps its own sample rate** through analysis; curves meet only on the
  shared 700-point log grid (60 Hz–20 kHz). Never resample audio to a common rate — that
  was rejected outright as a fact-mangling step.
- **Sniffer before decoder:** container headers are parsed by hand (WAV fmt, AIFF COMM
  80-bit extended, FLAC STREAMINFO 20-bit, M4A stsd/mp4a 16.16, MP3 frame header after
  ID3v2 syncsafe skip) so the displayed rate/bit-depth/channels come from file bytes,
  not from the decoder's possibly-resampled output. Undeterminable rate ⇒ refuse the file.
- **Smoothing** is constant-Q octave-fraction averaging on the log grid. Peak detection
  always runs on a fixed 1/6-oct curve so annotations don't move when display smoothing
  changes.
- **Time-domain metrics** (block 4's `computeTimeMetrics` orchestrates block 0
  primitives): `stftBands` (2048/512) → spectral-flux onsets (adaptive median threshold;
  STFT lookahead makes onsets read ~30–45 ms early — accepted, it cancels in
  differences) → peak-follower envelope (~8 kHz) → `attackTimes` → per-band `bandDecays`
  (T20 from dB-domain regression, reported as time-to−20 dB) → longest inter-onset gap
  becomes the sustained segment → `autocorrF0` at the segment's **temporal middle** →
  `harmonicProfile` over the whole segment.

## Spectrogram pipeline (M2)

`spectrogramLog` (block 0, async with yields like `welch`): 2048-pt Hann frames → per-frame
power with the same full-scale-sine convention as Welch → resample each frame onto a
256-cell log grid (60 Hz–20 kHz) by **taking the max of the FFT bins inside each cell**.

- **Max, not mean.** High cells span many bins; averaging dilutes a sine by
  10·log10(binsPerCell) (~15 dB at 20 kHz), making identical tones read quieter as they
  rise. Max keeps "0 dBFS sine reads 0 dB anywhere," which is what the colorbar promises.
- **Hop widens with file length** (`max(win/8, len/1400)`) so the frame count is bounded;
  long files lose time resolution, never correctness.
- **Cells above the file's Nyquist are NaN** → rendered transparent (alpha 0), with a
  dashed boundary labeled "not measured" when fs/2 < 20 kHz. Absence of data must not look
  like silence.
- Rendering: `sgramImage` paints frames into an offscreen canvas at native resolution
  (nFrames × 256), which `drawSpectrogramScene` stretches over the plot. The offscreen
  image is cached on the slot keyed by the shared color scale (`_sgImage`), so redraws
  (crosshair, resize) cost one `drawImage`. A and B share one scale — top = joint hottest
  cell ceil'd to 5 dB, floor 80 dB below. Level-match is off by default ("the spectrogram
  shows what was recorded"); the M2.5 toggle folds the spectrum card's lmOffset into pane
  B's image, the shared scale, the crosshair readout, and the sub/footer text, so the
  printed dB always matches the color.
- Envelope overlay: each file's peak-follower envelope (~8 kHz) is max-pool-decimated to
  ≤4096 points (`decimateEnvelope` — averaging would shave attack peaks), drawn on a fixed
  −60…0 dB axis with each file's **own first onset at t = 0** so decay shapes align even
  when lead-in silence differs. `slot.tvis` carries `{env, envRate, onsets (s),
  firstOnset, sg}`; snapshot slots have `tvis = null` and both panes show an "audio not
  stored" note instead.

## M2.5 additions

### Spectrogram difference + string markers

- `sgramDifference` (block 0) aligns the two spectrograms at each file's first onset
  (same convention as the envelope overlay), subtracts per log cell over the overlapping
  span, applies the level offset to B when level-match is on, and propagates NaN when
  either side is unmeasured. It also returns the 98th percentile of |Δ|, which the UI
  snaps up to a 3 dB step for the display scale — a p98 scale keeps a few extreme cells
  from washing out the map. Rendered with `divergeColor` (neutral → amber/teal, endpoints
  = the slot accents; amber = A louder). Level-match and difference toggles are disabled
  for snapshot slots (no audio to recompute from).
- Open-string fundamentals of the selected tuning were drawn as dashed horizontal markers
  on all spectrogram panes. Session 4 upgraded the labels from collision *skipping* to
  collision *stacking*: every string is named; labels that would overlap are pushed down
  to a minimum spacing and a short leader line reconnects a displaced label to its true
  frequency (adjacent low strings sit only a few pixels apart on the log axis).
  **Deleted at R5.7** (`drawStringMarkers`, its call site and `markers:tuningMarkers()`):
  the always-on pass drew six lines the user never asked for, and R5.1's overlay answers
  the same question on demand and per string. See "R5.7" below.

### Spectrum EQ-region lane

- A dimension-line lane in the widened top margin (`PLOT.mT` 30 → 46) of the spectrum
  and difference scenes names the colloquial mixer regions (60–250 low end, 250–800 low
  mids, 800–2.5k mids, 2.5–5k upper mids, 5–10k highs, 10–20k air). It is annotation
  only — the M1 shaded bands still drive every number. Labels are glossary hit-rects;
  the six glossary entries state the boundaries are colloquial while reporting live
  measured energy shares.

### EQ match

- **The fit target is the 1/6-octave-smoothed difference (`slot.fixed6db`), never the
  raw grid difference.** The raw A−B curve is a comb of interleaved harmonics; fitting
  it chases noise no EQ should correct. The fixed 1/6-oct curves already exist for peak
  detection and are recomputable from snapshots, so EQ match works on reloaded snapshots
  too. Fit runs on every 5th grid point (140 log-spaced points, 60 Hz–20 kHz).
- **Band model:** RBJ analog-prototype *magnitude* responses (peaking, low shelf, high
  shelf) — no phase, no digital-frequency warping; at these Qs and audio frequencies the
  magnitude difference from a real biquad is negligible next to hardware tolerances,
  which the card note already disclaims ("starting point, not gospel").
- **Fitters** (block 0, deterministic, recover in-model targets to < 0.15 dB):
  `fitGraphicEq` = least-squares init (`lsqSolve`, normal equations with the trim as an
  extra flat column) + per-band ternary coordinate descent under the gain clamp;
  `fitParametricEq` = greedy: for each band, scan log-spaced centers × the device's Q
  choices, project the optimal gain in closed form, take the best triple, then a second
  refinement pass over all bands. The trim absorbs the broadband level difference —
  that's what a level knob is for — except ParaEQ's boost-only trim, which is clamped
  to 0…+30 dB and lets the residual report the consequence.
- **Device table** (`EQ_DEVICES`): GE-7 (7 bands, ±15, Q 1.41), M108S (10 bands, ±12),
  ParaEQ MkII Deluxe (3 sweepable peaking bands, Q switch 0.7/1.4/2.8, boost-only
  level), Logic Channel EQ (low shelf + 4 peaking + high shelf, Q sampled from its
  continuous range, ±24 output gain). Adding a device = one table entry; the fitters
  and both scenes read everything from it.
- **Rendering:** the face scene dispatches on device kind — sliders with 0-dB detents
  for graphics, FREQ/GAIN/Q knob trios for ParaEQ, a numeric strip with sign-aware
  shape glyphs for Logic — in neutral ink (a pedal is not a guitar; only the achieved
  curve in the response plot takes the destination slot's accent). The response scene
  overlays the dashed target vs the modeled response with a residual-RMS chip.
- The fit is cached on `state._eqFit` keyed by `device|direction` and invalidated in
  `afterDataChange`; direction/device round-trip through JSON snapshots.

## M2.5 follow-ups (session 4)

### Spectrogram time-axis modes

- `state.sgAlign` ∈ `off` (Free — each pane fills its width with its own duration, the
  M2 behavior and default), `file` (shared seconds axis from file start), `onset` (t = 0
  at each file's first detected onset — the convention the envelope overlay and the
  difference pane already used). One helper computes the visible `{T0,T1}` window per
  pane; the seg is disabled unless both spectrograms exist, the active mode is printed in
  the card sub line, and the choice round-trips through snapshots. `?sgalign=file|onset`
  is the headless hook.

### Plot magnify

- `MAG_VIEWS` (block 4) maps a view key (`spec`, `diff`, `sga`, `sgb`, `sgd`, `env`,
  `eqface`, `eqresp`) to a title function and a draw function that calls the *same*
  model-builder + scene function the card canvas uses. The overlay modal owns one canvas
  sized to the viewport; magnify therefore **re-renders at native resolution — it never
  rescales a bitmap**, so text stays crisp and the view stays live (state changes made
  while the overlay is open, e.g. via keyboard, draw through). Esc / ✕ / backdrop close;
  `?mag=<key>` is the headless hook. Cached spectrogram images are drawn at whatever
  size the scene requests, so no extra invalidation is needed.

- **Q4a (session 27) — the overlay is a *surface*, not a pane.** A spectrogram in the overlay
  now takes clicks on R5.3's collision marks and R5.6's hold-to-follow, and the whole design is
  that one distinction. It draws at its own size, so it owns its own hit rectangles (`magHits`,
  beside `sgHits[0..1]`) — reusing a pane's would be wrong by construction *and* would leave
  stale targets live behind the modal; `drawMag()` empties them and calls `sgClearData(magCanvas)`
  before dispatching, so the six non-spectrogram views leave the overlay canvas making no
  spectrogram claims. The gate-visible `data-sg*` attributes go through **one** function,
  `sgSyncData(canvas, model, nLabels, hits)`, called by both the pane loop and the overlay's
  `drawSgMag(i,ctx,w,h)`: two near-duplicate reporters are exactly how a pane and the expanded
  view of that same pane come to disagree about what they are showing. And `attachSgFocus` takes
  `(wrap, canvas, pane)` where `pane` is a **thunk** — the panes pass `()=>0`/`()=>1`, the overlay
  answers "whichever pane is expanded right now" and returns `null` when the expanded view isn't
  a spectrogram, so the hold is simply not offered rather than guarded at every use. No geometry
  changed: `_sgTrackAt` already read the surface's own width and height, and `state.sgFocus` is
  global, so a hold taken in the overlay redraws the panes behind the modal for free.
- **Two z-order traps live here.** `.popover` is `z-index:60` and `.modal` is `75`, so a popover
  opened from inside the overlay renders *behind* it — fixed with `body.magopen .popover{
  z-index:80; }`, scoped to `body.magopen` because a global lift would also float popovers over
  About / How to use / the recording guide. The rule sits **below** the `.popover` block: a
  `tests/dsp.test.js` contract reads the *first* `.popover{` in the stylesheet. And
  `escCascade()` must take `popover` **before** `magModal` — a popover over the overlay is the
  innermost thing on screen, and closing the modal first orphans it.
- **Q4b (session 27) — the controls travel; they are never copied.** The sgram card head's
  four `.ctlgroup`s (Overlay / Colors / Legibility / Time axis) live inside one wrapper,
  `<div class="ctlmove" id="sgramCtlMove">`, with a hidden `<span id="sgramCtlHome">` marking
  its seat. `syncMagCtls(key)` — called from `openMag()` *before* `drawMag()`, and from
  `closeMag()` — `appendChild`s that wrapper into `#magCtls` (a new last child of
  `.mag .mhead`) for the `sga`/`sgb` views and `insertBefore`s it back at the placeholder for
  everything else. Because these are **the same DOM nodes**, every `el()` handle, listener and
  `syncSgHarmSel()` write keeps landing wherever the cluster is standing; a cloned set would
  need mirrored state and two sources of truth for the same control. The move is idempotent
  (early return when already in the right parent *and* position), so the cold-boot `?mag=`
  hook and a re-open are no-ops, and an inverted contract (`!/cloneNode/`) keeps the copy
  route closed.
- **`display:contents` is what makes the wrapper free at home.** `.ctlmove{display:contents}`
  means the four groups still lay out as direct children of `.controls` — the card head renders
  **byte-identically** (same PNG SHA-256 before and after the change). At the destination,
  `#magCtls .ctlmove{display:flex}` turns the same node into a wrapping row, `.mag .mhead`
  gains `flex-wrap:wrap` with `#magCtls{flex:0 1 100%}` so the cluster takes its own line under
  the title, and `#magCtls:empty{display:none}` keeps the six non-spectrogram magnify views
  pixel-untouched. The **exports stay behind**: `exportSgramPNG` builds its own canvas stack at
  a fixed size, so a PNG button beside the expanded picture would promise "export what I am
  looking at" and hand back something else. Redraw needed no code — all nine sgram handlers
  already end in `requestDraw()` and `drawAll()` tail-calls `drawMag()`.

### EQ-vocabulary rows in Band Energy

- The band table gained a second section listing the same six colloquial `EQ_REGIONS`
  the spectrum lane draws (60–250, 250–800, 800–2.5k, 2.5–5k, 5–10k, 10–20k Hz). They
  tile the whole integration range, so their shares sum to ≤100 % (unlike the named M1
  bands, which deliberately leave 1.2–2 kHz unnamed); the table note says which
  vocabulary is which. Annotation vocabulary only — the M1 bands still drive every
  metric.

### Single-guitar mode

- Gating, not a mode: `anyLoaded()` drives everything one file can support (spectrum,
  bands, tone rows, its spectrogram pane, envelope, exports); `bothLoaded()` gates the
  rest (difference + level-match toggles, spectrogram difference/level-match/alignment,
  the whole EQ-match card, Δ columns, comparison prose). Controls disable, cards hide,
  and everything returns when the second file lands. `?demo=a` / `?demo=b` load half the
  demo pair.

### Recording guide

- A `guideModal` opened from a topbar "How to record" button and from the empty-state
  link. Content states the one rule (change only the guitar), three signal-chain recipes
  (electric DI recommended; mic'd amp with the mic-movement caveat; acoustic mic
  placement), level discipline (set gain once with the louder guitar; clipped takes are
  unusable), what to play, and what to avoid (no processing anywhere; never DI vs mic;
  lossy only if both files share it). `?guide` opens it headless. The acoustic bullet
  survived the removal of the instrument selector on purpose — mic technique is where
  an acoustic recording actually goes wrong, and it is documentation, not a mode.

### How-to-use walkthrough (v1.0.0)

- A second, deliberately thin modal (`howModal`, topbar "How to use this app" +
  empty-state link, `?how` headless) sits *before* the recording guide in the topbar.
  It is three numbered steps — drop one or two files, set the tuning, leave Level-match
  on when comparing — and nothing else. Everything it might have said about mics,
  signal chains and level discipline is one link away in the recording guide; the whole
  point of a second modal is that the first one is too long to be a first-run
  onboarding. Esc closes it through the same cascade as every other overlay.

### Why instrument mode was removed (v1.0.0)

- Through M2.6 the app carried an electric/acoustic segmented control (`state.mode`,
  `setMode()`, "M" key, `?mode=`). An audit before the public release found it drove
  **exactly one** code path: `annotationsFor()` renamed two peak dots ("Helmholtz /
  air resonance", "Top resonance") and suppressed generic peaks within 1/6 octave of
  them. No DSP parameter, band edge, metric, table row, verdict, or export ever read
  it — `setMode()` called `renderBandsTable()`, but that function never looked at the
  mode either.
- Worse, the label was a guess dressed as a fact: the 70–130 Hz air-resonance window
  overlaps the open low-E fundamental (E2 ≈ 82 Hz in standard tuning), so on plenty of
  acoustic takes the dot labelled "Helmholtz" was sitting on a string, not a body mode.
  A defensible instrument would rather say less. Per the house rule that every visible
  number is defensible, the label went and the measurement stayed.
- `m.air` and `m.top` are still computed for **every** file and still feed the
  `helmholtz` / `top-resonance` glossary entries with live values; their `measure:`
  text now explains the band rather than asserting a body mode, and `boxiness` says
  outright that it is the same 200–500 Hz share as Warmth/Mud with a different word
  over it. `SETTINGS_VER` went 2 → 3 to drop `mode` from `gsSettings`; v1/v2 payloads
  still load and their stale `mode` key is ignored, as is `settings.mode` in old
  snapshots.

### Theming (Bright default + Dark)

- The cream **Bright** palette lives on bare `:root`; the original look moved intact
  under `html[data-theme="dark"]`. Theme init runs at the *top of script block 4* —
  inline scripts at the end of `<body>` execute before first paint, so there is no
  flash-of-wrong-theme, and putting it in `<head>` would break the test extractor's
  "block 0 is the first `<script>`" invariant. Priority: `?theme=` URL param (headless
  hook) > `localStorage("gsTheme")` > `bright`.
- Canvas chrome reads the active palette through `cssColor(name)` (cached computed-style
  lookup) and `cssRGBA(name, a)` for alpha composites over `*-rgb` triplet variables
  (`--ink-rgb`, `--grid-rgb`, `--chip-rgb`, …); CSS uses the same triplets in `rgba()`.
  `setTheme` flips the attribute, flushes the `CSS_COLORS` cache, re-derives `COLORS`,
  requests a redraw, and re-renders the HTML tables (their accent dots embed `COLORS`).
- **Data colormaps deliberately do not theme.** The spectrogram (magma by default, one
  of **five** perceptual maps since the session-23 look pass) and the diverging
  difference images are perceptual encodings, not chrome — they render as dark
  scope-screens inside both themes. This keeps the palettes defensible (magma's
  uniformity claims assume the dark ground) and makes PNG exports identical across
  themes. The colormap is the *user's* choice, not the theme's: `state.sgCmap` is
  view state, and flipping the theme never changes it. *(Session-7 refinement: the diverging endpoints default to amber/teal but
  follow user-picked guitar colors after a luminance lift — a user-identity change, not
  a theme change; `_sgDiff` is invalidated only when the endpoints actually change.
  See the session-7 section.)*
-   Bright accents darken to A `#a8690f` / B `#17786e` (the Dark ambers/teals fail
  contrast on cream); `--on-accent` provides badge-text color per theme. Switch
  on-state is a separate pair (`--switch-on` / `--switch-knob`); see M2.6e.

## Interactive line-plot zoom (session 5)

The four line plots (spectrum, difference, envelope, EQ-match response) zoom; the
EQ device faces deliberately do not (their pixels are data, resampling them would
misrepresent it — magnify covers "bigger"). *(Session 7 extended the same gesture set
to the three spectrogram panes as a crop of the rendered colormap — see below.)*

- **State is data units, not pixels.** `ZOOMS{spec,diff,env,eqresp}` holds
  `{x0,x1,y0,y1}` — Hz for the log-f plots, *display-time* seconds for the envelope
  (post onset-alignment, i.e. what the axis shows), dB for y; a null entry or axis pair
  means full range. Pixel-space state would rot on resize/DPR change and couldn't be
  shared with the magnify overlay; data-space state survives all of that for free.
- **The model builders bake the zoom in** (`fv` x-window, `yLo/yHi`, a `zoomNote` for
  the status chip); scenes just render the window they're given. Because the magnify
  overlay renders through the same builders, it inherits each view's zoom with zero
  extra plumbing, and its own gestures write the same state back.
- **Display-only, always disclosed.** Nothing numeric reads `ZOOMS` — metrics, band
  table, tone panel, EQ fit all integrate full-range. The active window is appended to
  the plot's status chip ("zoom 200 Hz – 2.00 kHz · −70 … −30 dB") so screenshots and
  PNG exports of a zoomed plot are self-describing.
- **Rendering under a partial view:** x is *canvas-clipped* at the plot edges
  (`ctx.rect(mL−1, 0, pW+2, h)` — the ±1 keeps endpoint pixels), y is value-clamped in
  the `yOf` closures (a clipped y would drop segments crossing the window; clamping
  draws them flat at the edge, which reads correctly as "off scale"). Band shading,
  tuning markers and the EQ lane clamp their rects into the window. Tick generation
  (`xTicksFor`) falls back to the hand-picked exact labels at full range so the default
  render is pixel-identical to pre-zoom builds; zoomed views get generated 1-2-5 ticks.
- **Gesture disambiguation:** a drag that moved ≤3 px is a click (crosshair/popovers
  keep working — a capture-phase click handler suppresses exactly one click after a
  real drag); a box thinner than 8 px on an axis means "don't zoom that axis"; shift
  turns the drag into a pan (absolute, from the zoom captured at mousedown, clamped to
  full range); ctrl/⌘+wheel — which is what a macOS pinch arrives as — zooms x
  geometrically around the cursor and snaps to null when it reaches full range, so
  wheel-out always lands exactly on the pristine full view. Min spans ×1.05 geometric /
  50 ms / 1 dB stop degenerate windows. All gestures no-op while a plot has no data
  (`zoomAxes` returns null when the relevant builder does).
- Byproduct fix: `drawStatusChip` never set `lineWidth`, so the envelope chip's border
  silently inherited the 1.6 px envelope-curve stroke (found by pixel-diffing renders
  across the zoom change — the new x-clip save/restore "fixed" it accidentally). It now
  sets `lineWidth=1` explicitly; chip rendering no longer depends on caller state.
- Test hooks: `?zoom=key:x0,x1[,y0,y1]` seeds `ZOOMS` before boot renders; `?diff`
  turns the difference pane on (it defaults off, which otherwise hides that pane from
  headless shots).

## Frequency-vocabulary lanes (session 6)

The single M2.5 EQ-region lane became four selectable vocabularies (user decision:
options 1–3 of the proposal plus a colloquial EQ set added as #1/default; amp/cab
layer dropped). One lane, swapped by a "Regions" selector (a segmented control in
session 6, a dropdown since session 7) — stacking all four at once was rejected as
chartjunk, and the glossary carries the depth instead.

- **Data:** `VOCABS[]` in block 3 — `{id, label, regions:[{key,label,f0,f1,row,strong?}]}`.
  `VOCAB_ACTIVE` is a block-3 global written only by block 4 (`setVocab`), same pattern
  as the theme globals. *(Superseded in session 7: the `EQ_REGIONS` alias is gone and
  the Band Energy table now follows the selected vocabulary — see the session-7
  section below.)*
- **Two-row packing:** anatomy needs overlap (BODY & WARMTH 200–500 inside the
  open-string/fretted spans; HARMONICS ONLY ≥1.32 kHz spanning three row-0 zones), so
  `drawEqLane` packs `row:0` at yMid 7.5 and `row:1` at 21.5 when any region declares
  row 1, else keeps the original single-row yMid 12.5. Both rows sit above the tuning
  labels: tuning glyphs draw baseline-bottom at `mT−4` (≈y32–42) with hit rects from
  y30, so the lane's lowest ink (y25.5) clears them. Don't add a third row — there is
  no headroom left in the 46 px top margin.
- **`strong:true` regions** (the Band-mix KEEPs — guitar core, attack) print their
  label in `ink` instead of `dim`: the lane's one-glance message in mix mode is "these
  are yours, defend them", and a two-level text hierarchy does that without color.
- **Label-fit honesty:** the existing fallback (plain hairline when the label doesn't
  fit the span minus 14 px) is why the Band-mix labels are terse ("KICK · CUT", not
  "KICK + BASS · CUT" — the long form didn't fit 60–100 Hz at 1440 px and rendered as
  an unlabeled line, defeating the vocabulary's purpose). Full occupant descriptions
  live in the glossary entries, which every label click opens.
- **Anatomy boundaries are computed facts, not folklore** (open-string fundamentals
  E2 82.4 → E4 329.6 Hz; 24th-fret ceiling E6 ≈1319 Hz), so its glossary entries can
  defend exact numbers; solo/mix boundaries are stated as folklore with honest gaps
  (solo has no zone at 1.2–2 kHz because guitarists don't have a word there).
- **Persistence:** localStorage `gsVocab` is written **only in the click handler**,
  never in `setVocab` — snapshot restores and the `?vocab=` test hook change the lane
  without silently overwriting the user's saved preference (mirrors the `gsTheme`
  pattern). Boot order: storage read → first render → URL hook (URL wins, for
  headless determinism). Snapshots carry `settings.vocab`, restored only if valid.
- All 22 new glossary entries use the annotation-only boilerplate + `_bandVals` live
  share, so "every visible number defensible" holds: the lane itself claims nothing
  numeric, and each popover shows what the app actually measures over that span.
  New categories must be appended to `GLOSS_CATS` (explicit ordered list — entries in
  an unlisted category silently vanish from the panel).

## UX batch a–k (session 7)

Eight user-requested changes (a–g, i) plus two mid-batch additions (j: tone rows as
true axes, k: user-selectable guitar colors). Rationale for the non-obvious parts:

- **Vocabulary regions drive the shading and the Band Energy table (a+d).** The M1
  bottom shaded bands and the separate lane were merged: `drawRegionShading` shades the
  spectrum from `VOCAB_ACTIVE`'s regions, and the Band Energy table rows are built from
  the same regions, so the picture and the numbers can never disagree. `EQ_REGIONS` and
  `bandsFor()` were **removed** — one source of truth. Region roles carry semantic
  tints via `--role-cut-rgb` (red) / `--role-keep-rgb` (green) / a violet for
  thin/carve/roll-off, labeled "GUITAR CORE (KEEP)"-style so color-blind users still
  get the verdict in text. Anatomy bounds recompute from the tuning selection
  (`VOCAB_TUNING` / `syncVocabTuning()`). The tone-character panel keeps its own fixed
  physical bands regardless of lane — its numbers are physics, not EQ advice.
- **Compare-on auto-latch (c).** The four comparison toggles (level-match, difference
  pane, sgram difference, EQ match) turn on automatically when both slots fill, on the
  theory that loading two sources *is* the statement of intent. An explicit user flip
  this session is never overridden (latch per toggle), snapshot restores pre-prime the
  latch (a snapshot's saved state is an explicit choice), and dropping back to one
  source re-arms it. Auto-on without the latch was rejected: it fights the user.
- **Spectrogram zoom (e), and what M2.7 changed about it.** `ZOOMS` gained `sga/sgb/sgd`
  (x in *display-time* seconds, y in Hz); the gesture layer is the line-plot
  `attachZoom` with a log-y branch (Hz axis pans/zooms geometrically, like the log-f
  line plots). As first built, a zoom was a **crop**: the pane blitted the cached
  colormap bitmap through a zoom-adjusted destination rect, so a deep zoom interpolated
  rather than resolved. The objection to recomputing was that it would change the
  analysis parameters mid-view against "every visible number defensible", the footer
  stating one FFT size.
  **M2.7 answers that objection rather than accepting it — the principle is
  "resolution follows attention".** An *unzoomed* pane is untouched: same 2048-pt
  window, same 256-cell grid, pixel-identical to the pre-M2.7 build (the gate asserts
  exactly that, which makes the promise a regression test). A zoom is a request to look
  closely, so a zoomed pane recomputes over its visible sample range with
  `sgramWindowFor(span, rate)` — 4096 above a 2 s view, 8192 below it, floored at 2048
  and never longer than a quarter of the span — at `gridN: 512` and `minHopDiv: 32`
  (the shipped `win>>3` hop floor would leave a 2 s view at 8192 with 86 columns).
  The defensibility rule is satisfied by *stating* the parameter, not by freezing it:
  the pane's own status chip prints the window actually rendered, the footer says a
  zoom refines the base window, and `data-sgwin` on each pane canvas publishes the same
  number for the gate. The recompute is a background job — `drawAll()` stays
  synchronous, today's coarse crop keeps drawing, and the finer image swaps in on a
  later frame; a stale job whose zoom has moved on is discarded, not drawn.
  Three details that keep it honest, all reviewer fixes after the delegated build:
  the refine lives **inside `sgramModelFor` and caches on the slot**, never on the pane
  canvas — that is why the magnify overlay inherits it for free (`MAG_VIEWS.sga/sgb`
  call the same model builder), and why zooming pane A never re-analyses pane B; the
  pane **publishes the slice it drew** as `s._sgShown` and `attachSgramCrosshair`
  offsets by that slice's `t0`, so the hover readout can never report the base analysis
  under a refined picture; and the request is **debounced** (`SG_REFINE_SETTLE_MS = 120`)
  around a single `want` object, so a drag or a wheel spin asks once for the window it
  settles on rather than once per intermediate frame. `?refine=0` disables the whole
  pass, which is how the gate compares a refined pane against the crop it replaced.
  Note the window follows the **time span**, not the canvas width: magnifying without
  zooming shows the same analysis, larger, and a frequency-only zoom is still a crop.
- **String labels outside the plot (f).** `SGPLOT.mR` 64→98; the colorbar is pinned at
  `cbX = w−50` and the string-frequency labels sit in the new gap with leader ticks
  into the plot. Labels over the colormap were unreadable at exactly the frequencies
  they mark (that's where the energy is). They re-derive from the tuning selection.
- **Card affordances (g).** The icon-only open/clear buttons became labeled buttons
  ("Open file…", "Clear"), and empty cards state drag-and-drop support in text.
  Discoverability beat chrome-minimalism here.
- **Tone rows as true axes (j).** The tone-character rows were rebuilt as real
  left→right-increasing axes. The underlying scales were already oriented
  consistently — this was a layout fix, not a data fix (e.g. sustain's dot at 947 ms
  sits left of 1.5 s because *less sustain is less*, and the axis now shows that).
- **User-selectable guitar colors (k).** Clicking a loaded card's letter chip opens a
  popover with a native `<input type="color">` + "Theme default" reset.
  - **Per-theme storage** (`gsColors` = `{bright:[a,b], dark:[a,b]}`): one hex rarely
    works on both cream and near-black grounds, so a pick applies to the active theme
    only — same reason the stock accents differ per theme.
  - **Applied as inline `--slot-a/--slot-b` on `documentElement`**, which outranks
    both the `:root` (Bright) and `[data-theme=dark]` stylesheet blocks — no
    specificity games. `applyUserColors()` sets/removes the inline vars, flushes
    `CSS_COLORS`, rebuilds `COLORS`, and re-renders; `setTheme` delegates to it.
  - **`slotThemeDefault(i)`** reads the stylesheet default by temporarily removing the
    inline var, reading computed style, and restoring — no duplicated color table to
    drift out of sync with the CSS.
  - **Diverging difference endpoints follow the picks** via block-0
    `setDivergeEndpoints(pos,neg)` (returns a changed-flag; caller invalidates
    `state._sgDiff` only when true). Raw user picks can be too dark for the dark
    scope-screen ground, so endpoints pass through `liftForDark(rgb)` — a Rec.709
    luminance lift toward white targeting 0.55. The stock dark amber/teal (since
    session 8: `#f0a13e` / `#44c2d4`, both above the 0.55 floor) pass untouched, so
    no-override renders stay bit-exact (originally verified by file-size regression
    against the pre-k build; re-verified after the session-8 accent change).
  - **Snapshots deliberately do not carry user colors** — they are viewer preference,
    not analysis state (same class as theme, unlike vocab which affects the table).
  - `?ca=RRGGBB`/`?cb=RRGGBB` are session-only test hooks (applied after boot, never
    persisted).
- Segmented controls were kept for the small closed sets (mode, theme, smoothing,
  EQ direction, sgram alignment); only Regions (b) and EQ device (i) — the two lists
  the user said will grow — became dropdowns.

## UX batch 2 (session 8): verdict, audition, playback, disclosure

- **Verdict strip reuses, never re-derives.** The "At a glance" card computes its
  region-gap sentence with the Band Energy table's exact integration and its tone
  sentence from the same ranked list the tone panel's prose uses (`renderProse` body
  extracted into a shared `proseCandidates()`). The alternative — summarizing with its
  own thresholds — would eventually contradict the detail panels; a summary that can
  disagree with its own detail is worse than none.
- **Playback sources the analyzed mono mix, always.** Both the region audition and the
  per-card Play button play `slot.samples` (the mono mix the analyzer measured), not
  the original file. The tool's claim is "you hear what the analyzer sees": a stereo
  original would differ audibly from every number on screen. Level-match applies
  `state.lmOffset` to slot B exactly as the plots do, and the card button prints the
  applied gain while playing ("■ Stop · +3.1 dB") so the number is disclosed like
  every other correction.
  - Band-pass for audition = 4th-order Butterworth (two biquad sections, Q 0.5412 /
    1.3066, 24 dB/oct) at the region's tuning-resolved bounds — steep enough to
    isolate a region, gentle enough not to ring.
  - One `playCtx`; a single active playback. Stop paths (inventory — keep complete
    when adding features): popover close/reopen, first line of `afterDataChange`,
    click-while-playing, natural end, the lm toggle (the printed gain would go
    stale), and an Esc-cascade rung after popovers (`if(playCur) return
    stopPlayback();`).
- **Progressive disclosure (fold state ≠ analysis state).** Six panels
  (diff/bands/tone/eq/sgram/env) fold to their header; verdict and spectrum never do.
  eq/sgram/env start folded so the first screen reads verdict → spectrum → difference
  → bands → tone.
  - **Persistence stores only touched keys** (`gsCollapse` = the `collTouched` map,
    not full `collState`) — same principle as `gsVocab`: one click must not freeze
    all six defaults forever; a future default change still reaches untouched panels.
  - **`drawAll()` skips folded panels' model building and canvas work** (their
    canvases are `display:none`); `toggleCollapse` requestDraws on unfold. Magnify
    and PNG export build their own models, so `?mag=` works on a folded panel.
  - **Layout:** the chevron lives in a `.headleft` flex wrapper with the title so the
    cardhead keeps its two-child space-between layout (chevron as a third child would
    break spacing on cards with `.controls`). A folded card's whole header is a
    reopen target; an expanded header keeps live controls, so only the chevron folds
    (chevron click stopPropagations to avoid double-toggle).
  - Snapshots don't carry fold state — reader preference, like theme and colors.
- **Headless capture fires a resize.** `--screenshot` capture triggered a `resize`
  event that closed any open popover, so `?pop=<glosskey>` (open a popover for
  screenshots) sets a `popPinned` flag the resize/scroll close-listeners respect.
  Related: popovers scroll internally past `max-height:min(70vh,560px)` — content
  below the fold being invisible in a screenshot is the scrollbar, not a bug.
- **UI state machines get extraction tests.** Audition html, card-play toggle, EQ
  text export, and the disclosure state machine are tested in node by regex-extracting
  the real functions from index.html and running them against stubs (`new
  Function(...deps, src + "return {…}")`), same spirit as `tests/dsp.test.js` — the
  code that ships is the code under test, no copies to drift.

## M2.6a (session 9): one level-match, no difference toggles

- **Control placement = control scope.** The user's audit rule: where a setting sits
  should say what it governs. Level-match was never a spectrum-card setting — the
  offset feeds both line plots, the band table's Δ, the verdict prose, the
  spectrogram's B pane *and* its shared color scale, the difference pane, and card
  playback gain. So there is now exactly one switch, in the header's "Comparison"
  field, and `state.lm` is the only truth (`state.sgLm`/`state.diff`/`state.sgDiff`
  are gone). The Regions vocabulary selector moved up for the same reason (it drives
  spectrum + Difference shading and the Band Energy rows). Smoothing deliberately
  stays on the Spectrum card: it shapes only the two adjacent line plots — and to
  keep that placement honest the Difference plot now renders the same status chip
  as the spectrum (`statusText()` + zoom note) instead of a bare zoom note. Before
  this it printed no smoothing state at all, a silent house-rule violation.
- **Difference views need no switch.** They appear exactly when two analyzed sources
  exist (`diffVisible()`/`sgDiffVisible()` are now just `bothLoaded()`-style gates);
  progressive disclosure (fold the card) is the dismissal mechanism. The "d"
  shortcut, its modal row, and the `?diff` URL hook went with the toggles.
- **Latch simplification.** `compareTouched` shrank to `{lm}`; `applyCompareDefaults`
  arms only the one switch. Semantics unchanged: auto-on when both slots fill, an
  explicit flip wins for the session, snapshots pre-prime (`comparePrimed=true`),
  dropping to one source re-arms.
- **Snapshot back-compat without a version bump.** Old snapshots stored `lm`, `diff`,
  `sgLm`, `sgDiff`. Readers now do `state.lm=!!(st.lm||st.sgLm)` — either old switch
  counts as "the user wanted level-matching" — and ignore the difference flags; new
  snapshots write `lm` only. Version stays 1: readers tolerate missing fields, so no
  migration machinery is warranted.
- **No `_sgDiff` cache invalidation needed for lm.** The spectrogram difference image
  cache keys on the underlying cell data; the level-match offset is applied at draw
  time (`sgLmDb()` read inside the draw path), so flipping the switch only needs
  `requestDraw()`, not a rebuild.
- **A found factual bug:** the glossary's spectrogram entry claimed the shared color
  scale ignores level-match. `sgramScale()` adds `sgLmDb()` to B's max — the scale
  follows the shifted cells. Text fixed to match the code; lesson: prose that states
  what code does belongs next to a test or a re-read at every behavior change.

## M2.6b (session 9): strings axis, per-string docs, plot declutter

- **The declutter trade: numbers move from the plot into the popovers.** All on-plot
  frequency text is gone — peak labels, annotation-dot captions, and the top-axis
  open-string row. The dots stay as click targets (16×16 hit rects around r≈2.4 dots),
  and the glossary "Current values" rows now print each peak's Hz *and* nearest note
  (`fmtHz(p.f)+" ("+noteStr(p.f,state.a4)+")"`), so no information was deleted, only
  relocated behind a click. This is why the house rule "every visible number
  defensible" survives: fewer visible numbers, same defensibility per number.
- **One hit-rect array per canvas, tagged unions for dispatch.** The spectrum already
  kept `hits[]` of `{x0,y0,x1,y1,term}` for glossary clicks; string labels push
  `{…,string:si}` into the same array, and `attachHitClicks` dispatches on which key
  is present (`hh.string!=null ? openStringPopover : openPopover`). The Difference
  plot gained its own `diffHits[]` and the same attach call — don't invent a second
  event system per overlay type; one array + tagged records scales.
- **Strings axis lives on the bottom, under the Hz ticks.** `drawStringAxis` draws
  dotted verticals at each open-string fundamental (tuning + custom offset + A4 all
  reactive) and note-name labels *below* the Hz tick row, skipping any label closer
  than 16 px to the previous one (at 1440 px only B3/E4 ever crowd, and only in
  drop-C-like tunings). The spectrogram used to carry its own always-on right-edge string
  markers on a *different axis* (log-f is vertical there); **R5.7 deleted that pass**, so
  the sgram now shows open strings only when the user overlays them. The toggle still
  governs the two frequency line plots only.
- **Per-string popover reuses the glossary scaffolding wholesale.** `openStringPopover`
  builds content via `stringContentHtml(si)` (ET formula with MIDI + A4 substituted,
  harmonics 2–5 with note names, cross-links via `data-term`) and positions with the
  extracted `placePopover(anchor)`; audition reuses `auditionBlock(f0,f1)` — the
  region-popover player with bare bounds (±1/6 oct around the fundamental). New
  popover kinds should follow this pattern: content function + placePopover +
  auditionBlock, no new popover machinery.
- **`PLOT.mT` 46→34.** The top margin existed for the top-axis string labels; with
  them gone the legend/status chip still clears the plot frame at 34 (verified by
  screenshot in both themes — check the legend row before trimming further).
- **Last x-tick clamp.** The center-aligned "20k" tick label overhung the plot's right
  edge into the left-aligned "Hz" unit, rendering "20kz" (pre-existing at HEAD, found
  during M2.6b screenshot review). `drawAxes` now clamps the final label:
  `Math.min(x, PLOT.mL+pW-lw/2-2)` with `lw=measureText(...)`. The Difference plot
  has its own tick loop with no unit suffix and never collided.
- **Persistence per the session-9 user decision:** `gsStrings` stores only explicit
  toggle flips (like `gsVocab`/`gsCollapse`); snapshots deliberately don't carry the
  toggle — it's viewer preference, not analysis state. `?strings=1|0` exists for
  headless capture. (`?mode=electric|acoustic` was documented here too until v1.0.0
  removed the instrument selector — see "Why instrument mode was removed".)

## M2.6c (session 9): region-boundary Hz labels, dynamic lane height

- **Per-row boundary lines.** `drawEqLane` collects each region's in-view boundary
  ticks into per-row buckets while drawing them (same `f0>=XV.f0`/`f1<=XV.f1`
  conditions as the ticks, so labels and ticks can't disagree), then prints one 9 px
  (`FONT_XXS`) line of frequencies per row using the axis idiom `fLabel()` —
  compact numbers on the plot, full precision in the glossary popover. Because the
  lane is shared, the Spectrum plot, Difference plot, and magnify overlay all get
  the labels from the one function.
- **Skip, don't smear.** Buckets are sorted by x; a label whose left edge would land
  within 4 px of the previous label's right edge is skipped. This one guard covers
  three cases: adjacent regions' shared edge (exact duplicate x → always skipped),
  Anatomy's nested bounds, and zoomed windows where boundaries crowd the edges.
  Canvas label-fit fallbacks drop silently, so zoomed screenshots are the required
  check when touching this.
- **`PLOT.mT` is now dynamic — supersedes the M2.6b "46→34" note.** 34 for
  single-row vocabularies, 48 when the active vocabulary uses two rows (Anatomy),
  set by `syncLaneHeight()` from the `setVocab()` choke point (selector change,
  snapshot apply, localStorage boot, `?vocab=` hook — every vocab write funnels
  through it). All PLOT.mT readers use it live at draw time; never cache it into a
  model or a layout constant. The default vocab ("mix") is single-row, so the
  literal 34 in PLOT needs no boot-time sync call.

## M2.6d (session 9): affordance audit — help cursor, foldable headers

- **Canvas doc-targets use the `help` cursor, not `pointer`.** `attachCrosshair`
  already hit-tests every click target on hover (it used to set "pointer");
  switching that to "help" gives the arrow-with-question-mark that specifically
  means "documentation behind this click", matching the `.term` text buttons which
  always used `cursor:help`. The set is guarded with `!(e.buttons & 1)` so a
  shift-pan in progress keeps its `grabbing` cursor — mousemove during a drag would
  otherwise flicker the cursor on every hit-zone crossing.
- **Foldable-header pattern.** The six collapsible cards carry a `foldable` class;
  their whole `.cardhead` toggles collapse in both directions. When the card is
  *expanded* the header holds live controls, so the click handler ignores anything
  inside `button,.seg,.switch,select,label,a,input` and bails when a text selection
  is active (users drag-select header prose). The chevron button keeps its own
  handler with `stopPropagation` — without it a chevron click would toggle twice.
  The chevron itself is a 30×30 bordered button in the `.iconbtn` visual family;
  the previous borderless 16px glyph failed the "would a user even notice it"
  test that motivated user item f. The arrow inside is **drawn, not typed**: the
  `▾` glyph (U+25BE) sits tiny inside its em box in every UI font we render in,
  so raising `font-size` grew the button's line box without growing the mark. It
  is now a 9×9 box with `border-right`/`border-bottom` in `currentColor`, rotated
  45° (down = expanded) or −45° (right = folded); it scales, stays crisp at any
  DPR, and inherits the hover color for free.
- **Magnify buttons must not be hover-revealed.** They were `opacity:0` until
  `.plotwrap:hover` — invisible chrome scores zero on discoverability, and on
  touch devices it never appears at all. Always-visible now; the cost is one small
  bordered button per plot corner, accepted deliberately.
- The audit removed a dead `.plotwrap.hoverable{cursor:crosshair}` rule — the
  class was never applied anywhere; `attachCrosshair` sets the inline cursor.

## M2.6e (session 10): switch on-state — accent track, light knob

- **Bug the restyle exists to fix.** `.switch input:checked + .tk` was `background:#39424f`
  with the knob at `background:var(--ink)`. That hex is a leftover from the original
  dark-only palette. On Bright (`--ink` `#2c2721`) both halves of the control are dark,
  so "on" looks like a filled rectangle rather than a track-plus-thumb. Do not restore
  `#39424f` or an `--ink` checked knob.
- **Vars, not slot accents.** `--switch-on` / `--switch-knob` live next to the other
  theme tokens in `:root` and `html[data-theme="dark"]`. They are cool slates plus a
  paper-light thumb — chrome, not data. Binding the checked fill to `--slot-a` or
  `--slot-b` would paint a global control in a guitar's identity color (wrong scope).
- **CSS-only, both themes.** No JS. Off-state (raised track, `--dim` knob) is unchanged.
  The existing `var(--dur) var(--ease)` transitions already cover background and
  thumb color, so the new fills animate for free.
- **Guard test.** `tests/dsp.test.js` regex-reads the stylesheet (the file is already
  loaded for DSP extraction) and asserts the two palettes define the vars, the checked
  rules use them, `#39424f` is absent, and the switch block mentions no `--slot-*`.

## M2.6f (session 11): frequency-card unification — one card, three sub-sections

- **Why one card.** Spectrum, Difference, and Band energy share the same data scope
  (60 Hz–20 kHz log grid), the same annotation lane/region shading, and the same
  Strings axis. Three separate cards forced the user to hunt for the two controls
  (Regions, Strings) that drive all three views — the M2.6a audit rule says
  "position expresses scope". Merging puts those controls in the outer
  `#freqCard` header where they visibly govern the three rows below, while
  Level-match stays in the global top bar because it also drives spectrogram,
  verdict, and playback.
- **Foldable rows, not foldable card.** The outer `#freqCard` itself never folds
  (verdict already never folds — outer cards are the stable page skeleton).
  Each inner `.freq-sub` (`#freqSpec`/`#freqDiff`/`#freqBands`) is `foldable`
  with its own `subhead` + `collbtn` (`data-coll` `spec`/`diff`/`bands`) and
  `subbody`. `COLL_CARDS` now maps `spec`→`freqSpec` etc.; `COLL_DEFAULT`
  gains `spec:false` (the old spectrum was always visible, so expanded by
  default). Reusing `diff`/`bands` keys means a user who already collapsed
  Difference or Bands keeps that preference without a storage migration.
- **Visibility vs collapse.** `updateVisibility()` gates the *existence* of rows:
  `#freqDiff` only when `bothLoaded()`, `#freqBands` when `anyLoaded()`. **`#freqCard`
  itself is always visible** — its spectrum row carries the empty state (what to do
  next, "Load demo pair", links to both guides), so hiding the card at zero files made
  the empty state unreachable. That was a live bug through M2.6 (masked by the debug
  loader, fatal once it was hidden for release); fixed at v1.0.0. Collapse
  gates *rendering*: `drawAll()` skips `buildSpecModel` when `spec` collapsed and
  `buildDiffModel` when `diff` collapsed or single-guitar. The spectrum canvas
  reuses the same `specHits` hit-rects; clearing them when collapsed prevents
  stale hover hit-tests.
- **Styling.** `.freq-sub` rows are separated by `1px var(--hair)` hairlines;
  `.subhead` mirrors `.cardhead` flex metrics (space-between, wrap) so the
  hierarchy reads but doesn't shout. `.freq-sub.collapsed .subbody` and
  `.collapsed .subhead .controls` mirror the card-level collapse rules.
  The header-click handler now queries `.cardhead, .subhead` so both card types
  fold on header click with the same "controls exempt" guard.
- **Aliases.** `diffCard`/`bandsCard`/`specCard` remain as aliases to the new
  sub-sections so any external or test hook referencing the old IDs doesn't
  break — they point at `freqDiff`/`freqBands`/`freqSpec`.

## M2.6g (session 12, reworked session 13): per-string harmonics

The first cut was a single global "Show harmonics" switch beside Strings
(`state.harmonics`, `gsHarmonics`, `syncHarmonicsUI()`), drawing 2×–4× for
every string at once. It was replaced (`3fbfa72`) because turning on 18 extra
verticals to see *one* string's overtones is the wrong granularity — the
question a player actually asks is "where does *this* string land up there".
What ships:

- **The toggle lives where the string is documented.** Each open-string popover
  (`stringContentHtml(si)`) lists harmonics 1–5; rows 2–5 carry their own
  `.harm-toggle` switch (row 1, the fundamental, prints "always on" — it *is*
  the Strings axis). State is `state.stringHarmonics[si][hh-2]`, a 6×4 boolean
  grid seeded by `_defaultHarmonics()` (all off). A `Clear harmonics` button in
  the Frequency card header wipes the grid; `syncClearHarmonicsBtn()` disables
  it whenever Strings is off or nothing is on, so the button doubles as the
  indicator that *something* is showing.
- **Overtones are annotation, like the fundamentals.** `stringAxisMarkers()`
  stays the single source of truth for the bottom-axis guides: fundamentals
  (`harm:1`) first, then each enabled harmonic 2–5 per string, filtered to
  `FMIN–FMAX`. Fundamentals-first ordering gives `drawStringAxis`'s 16 px
  label-skip guard priority over the named fundamentals. Both `buildSpecModel`
  and `buildDiffModel` read the same array, so the two plots stay in lockstep.
- **Color carries the association, not text.** `STRING_COLORS` (six distinct
  hues, index 0 = low E) is a *data* palette — like the magma spectrogram it
  never themes, because it encodes identity, not chrome. A harmonic is drawn in
  its parent string's hue at `0.48` alpha, dash `[2,3]`, `lw 1`; the fundamental
  at `0.85`, `[3,3]`, `lw 1.4`. Harmonics get **no** label at all (an earlier
  `×2`–`×4` labelling, `b501832`, was dropped in the recolor): hue ties them to
  their string and left-to-right order implies the overtone number, which keeps
  the axis readable when several strings are expanded. The same hue drives the
  popover's row dots, at `0.9` enabled / `0.35` off, so the popover legend and
  the plot agree.
- **Still interactive.** Harmonic hit rects are 8 px strips over the full plot
  height (no label to click) dispatching to `openStringPopover(si)` — i.e. the
  place you turn them off again.
- **Persistence.** The 6×4 grid rides in `gsSettings` (bumped to **v2**;
  `stringHarmonics`) and mirrors to legacy `gsStringHarmonics`. `loadSettings()`
  accepts v1 payloads and migrates the old `harmonics:true` boolean to
  "2–4 on for all six strings". `?harmonics=0|1` survives as a compatibility
  test hook with exactly that meaning.

## M2.6h (session 12): per-card 300-dpi PNG / JSON / CSV

- **Buttons per sub-section, not per card.** The merged Frequency card's three
  rows each own their export row (`spec` keeps its `PNG/CSV/Snapshot`, `diff`
  gains `PNG/CSV/JSON`, `bands` gains `CSV/JSON`); Tone, Sgram, Env, and EQ get
  their own `.exports` row. All buttons gate on `anyLoaded()` or `bothLoaded()`
  so a single-guitar view doesn't offer a difference export for nothing.
- **PNG only where there is a plot.** Band energy and Tone export CSV/JSON only
  (`d45e682`): both are HTML tables, and rasterizing a table produces a picture
  of numbers that the CSV already carries better. Only canvas cards — Spectrum,
  Difference, Spectrogram, Envelope, EQ response — get a PNG button.
- **One true 300-dpi path.** Every PNG export renders clean from its scene
  builder (`drawSpectrumScene`, `drawDiffScene`, `drawEnvelopeScene`, etc.) into
  an offscreen canvas (`@2×` for retina, `W=1240` etc.), then injects a `pHYs`
  chunk (`11811` dpm) via `_pngWithDpi` (`_crc32` is the PNG CRC). `Spectrum`
  keeps its titled header+legend composition.
- **Data exports are defensible.** `diffCsv`/`diffJson` dump the displayed
  `a−b` curve; `bandsCsv` recomputes `bandPower` shares per vocabulary region
  (the same math as `renderBandsTable`); `toneCsv` scrapes the live tone rows
  and prose; `envCsv` dumps `buildEnvModel` points; `sgramJson`/`envJson` wrap
  frame counts (alignment is UI, not exported); `eqJson` dumps `eqFitData()`;
  per-card JSONs are scoped via `_cardStateFor(name)` — Frequency cards carry
  `tuning`/`a4`/`smooth`/`lm`/`vocab`, Tone carries `smooth`/`lm`,
  Sgram/Env carry only `lm`, EQ carries the full
  `tuning`/`a4`/`smooth`/`lm`/`vocab`/`eqDevice`/`eqDir`; `regions` only for frequency cards; `strings`/`stringHarmonics`/`sgAlign` are UI-only and excluded from all exports (PNGs suppress string guides). Snapshot (global) still carries full data-relevant settings.

## M2.6i (session 12): versioned `gsSettings` — one store, one reset

- **Scope.** `gsSettings` (v1 → **v2** when harmonics became per-string → **v3** when
  the instrument selector was removed → **v4** when per-string line colors were added,
  session 25) stores the analysis-fact settings the user
  *chose* (intent, not data):
  `tuning`+`customOffset`, `a4`, `smooth`, `eqDevice`/`eqDir`, `vocab`,
  `strings`, `stringHarmonics` (now 6×7, harmonics 2–8), `stringColors`. `lm` (level-match) is
  deliberately excluded — its auto-latch already handles the common case and
  a saved `lm` would fight the latch. `gsTheme`/`gsColors`/`gsCollapse` stay
  separate (viewer prefs with their own scopes).
- **One write path.** `_settingsPayload()` builds `{v:SETTINGS_VER,…}`;
  `saveSettings()` writes `gsSettings`; `loadSettings()` accepts the current
  version *or* v1/v2 (migrating the old global `harmonics` boolean, ignoring the
  dead `mode` key) and applies to
  `state`+UI (selectors, switches, `syncClearHarmonicsBtn`, `syncVocabTuning`).
  Legacy keys `gsVocab`/`gsStrings`/`gsHarmonics`/`gsStringHarmonics` are read
  once for migration; new writes also mirror to the legacy keys so a downgraded
  build doesn't lose them.
  Writes happen only on explicit UI actions (click/change/keyboard `1-4`);
  `applySnapshot` and programmatic `setSmoothUI`/`setVocab` never write.
- **Footer affordance.** New `.settingsFoot` line prints what *is* remembered
  and what *isn't* (“… — not level-match”) with a `Reset saved settings`
  button that clears `gsSettings`+legacy keys, resets `state` to defaults,
  syncs every control, and toasts. No snapshot carries fold/collapse state,
  so resets never affect a snapshot reload.

## Release hardening (session 13): exports that survive contact

The exports shipped in M2.6h broke in four different ways under real use. All
four fixes are small, and all four are the kind of thing that only shows up
when a person clicks the button rather than when a test calls the function.

- **`toBlob` can hand you `null`.** Not "throws" — *calls back with null*, on a
  tainted or oversized canvas, and the old code passed that straight to
  `download()` for a 0-byte file with no complaint (`9fc4847`).
  `_exportPngCanvas(cv,name)` now owns the whole path: no `toBlob` at all →
  `toDataURL` fallback; `toBlob` yields null or the dpi injection throws → ship
  the raw blob rather than nothing; everything fails → `toast(…, isErr)`. A
  failed export must say so — silence plus a broken file is the worst outcome.
- **The `pHYs` splice was writing into the wrong bytes.** The original assumed
  a fixed 25-byte IHDR and spliced at byte 33 (`b59c060`). It now reads the
  IHDR length from the `DataView`, sanity-checks the type and every offset
  against `u.length`, and returns the **original blob** on any surprise — a
  PNG at the wrong DPI beats a corrupt PNG. `_pngWithDpi` is deliberately
  total: every failure path returns a usable blob.
- **The footer overlapped itself.** The left-hand parameter dump and the
  right-aligned credit collided at 1240 px on long filenames. Truncating the
  left string (`e4e2ef3`) worked but read badly; the settled answer
  (`39c5c64`, `7fb174f`) is that every PNG carries exactly one footer,
  `made with Claude Rameau`, right-aligned. The analysis parameters were already
  in the sub-header line and in the JSON — the footer was duplicating them.
- **The spectrogram PNG bled the envelope in** (`c8e48c5`). `exportSgramPNG`
  builds its own canvas and stacks only `sgramModelFor(0/1)` + the diff pane;
  it never reuses the live composite. If you add a pane to the sgram card,
  add it here explicitly — the export is not a screenshot.

- **Exports are data, not UI.** `strings`, `stringHarmonics`, and `sgAlign`
  never appear in CSV/JSON (`a29b5f2`), and the PNG builders (`exportPNG`,
  `_cardPng`) force `state.strings=false` with the harmonics grid cleared for
  the duration of the render, restoring both in a `finally`. Reasoning: a
  string guide is an annotation the *reader* asked for, not a property of the
  measurement, and an exported curve should be reproducible from its stated
  parameters alone. `_cardStateFor(name)` narrows this further per card, so a
  Tone JSON doesn't claim a vocabulary it never used.

- **Debug affordance is opt-in.** The "Load test files" button that loads the
  demo pair is hidden by default and revealed by `?debug` (the `loadDemo()`
  path itself is untouched — `?demo` still works headlessly). It exists for
  development, and a first-time visitor reading "Load test files" in the header
  of an analysis tool reasonably wonders whose files those are.

## R3 (session 17): ✦ discovery moments

When a *shown* harmonic of one string lands on another **open string's** fundamental
within ±6 ¢, the frequency plots mark it with a quiet ✦ that click-opens a popover
explaining the coincidence through the ratio. Four pieces, in three places:

- **Block 0 — `findCoincidences(marks, tolCents)`** beside `COINCIDENCE_CENTS = 6`,
  `centsBetween`, `gcdInt`, `octaveFold`, `HARMONIC_INTERVALS`. Pure, node-tested, fed
  the output of `stringAxisMarkers()`. It is shared code: R4.2 and R5 inherit it, which
  is why it was reviewer-authored and gated on its own.
- **Block 3 — a fourth pass in `drawStringAxis`**, after the three label passes, drawing
  one mark per coincidence at `xOfF(hit.f, w)` just inside `PLOT.mT` (dynamic — never
  cached), in neutral ink and **never a guitar accent**: the mark belongs to
  neither string. Same `lastX` overlap guard as the label pass (≈18 px), so in E standard
  the E2·h4 and A2·h3 landings on open E4 collapse into one mark — **two ✦ visible, not
  three**. Each pushes `{x,y,w,h, coincidence:hit}` into `hits`, carrying the hit object
  rather than an index into an array that is rebuilt every draw; `attachCrosshair` then
  gives the `help` cursor for free, and `attachHitClicks` routes to
  `openCoincidencePopover`. The pass **returns how many marks it drew**, which is how
  `drawSpectrumScene` knows to push its legend down a row.
- **The mark is a path, not the ✦ glyph, and it carries a key** (session 18, after the
  user's first look: *"too small to see … not clear what that mark even means"*).
  `starPath(ctx,x,y,R)` draws a four-pointed sparkle from four `quadraticCurveTo`
  segments with control points at `R*0.30`; it is stroked 3.5 px in `--panel` as a halo
  and filled `rgba(--ink-rgb, .78)` at `R = 7.5`. The glyph could not be rescued by a
  bigger font — a glyph sits small inside its em box, the same trap the fold chevron hit
  in session 15 — and `--mut` is the dimmest colour in the palette, on the busiest corner
  of the plot. After the marks, the pass writes a one-line key (a smaller, `--mut` star
  plus *"two strings, one pitch — click a mark"*, echoing the frozen popover's own
  opening sentence, so the copy stays traceable to docs/THEORY.md). It is placed at
  `lastX + 34`, which is always free: coincidences land on open-string fundamentals,
  82–330 Hz, so on a 60 Hz–20 kHz log axis every mark sits in the left quarter — the same
  structural fact that made them collide with the legend. The key is skipped, never
  smeared, if it would reach the status chip.
- **Block 4 — `openCoincidencePopover(hit, anchor)`**, built like `openStringPopover`
  but deliberately *not* setting `popover.dataset.stringSi`: that key drives the
  string-popover refresh path, and a coincidence popover has nothing to refresh.
- **The threshold is a constant, not a control.** `state.tolCents` exists so the gate can
  vary it (`?tol=`, clamped 0–50, no persistence, no `gsSettings` key). It is physics,
  not user intent — and measurement says a slider would be inert anyway (see "Testing
  strategy": 6 ¢ → 50 ¢ admits nothing new in any stocked tuning).

Two details that look like bugs and are not:

- `drawStringAxis`'s `const coins = coincidences || findCoincidences(markers)` fallback
  omits `state.tolCents` on purpose. Both model builders always pass `coincidences`, so
  the fallback is unreachable; naming `tolCents` in block 3 would falsify the "tolerance
  never reaches `gsSettings`" contract, which is checked by absence outside blocks 0 and 4.
- ✦ never appears in a PNG export, because the export path forces `state.strings=false`
  and `stringAxisMarkers()` returns `[]` with the strings axis off. Exports are data;
  the ✦ is an invitation to click.

## R5.0–R5.1 (session 19): harmonic tracks on the spectrogram

R3 marks where two strings meet on the *frequency* axis; R5 puts the same knowledge on the
**time** axis. The overlay is a **generative model**: theory says which partials a note
should produce, the overlay draws that prediction across the measured image, and the user
sees whether the energy is really there. Which notes were played is **intent**, so the user
picks them — the app never detects, never guesses.

Four pieces, in three blocks:

- **Block 0, pure and node-tested.** `notePartials(midis, nHarm, a4)` returns a flat array
  of `{key, midi, harm, f}` — `key` is the **index into the `midis` array it was handed**,
  and nothing else. `partialClusters(parts, tolCents = TEMPERED_CENTS)` walks the partials
  in ascending frequency, absorbing while within `tolCents` of the group's **first** member,
  and keeps groups with ≥ 2 distinct `key`s; `f` is the geometric mean, `tier` is `"locked"`
  at ≤ `COINCIDENCE_CENTS` (6 ¢) else `"tempered"` (≤ 20 ¢). It is **direction-free**, unlike
  R3's `findCoincidences()`, which asks a directional question ("does a harmonic land on
  another string's *open* fundamental") because R3's frozen copy is phrased that way. Both
  exist on purpose; R5.3 will use the clusterer, and R3/R4 stay byte-identical.
  There is **no frequency clipping in block 0** — the draw pass clips, as everywhere else.
- **Block 4, state and model.** `state.sgFrets` (six slots, `null` = not sounding) and
  `state.sgHarm` (1–N, default 6) are the overlay's own state, deliberately separate from
  the frequency plots' strings/harmonics — the user asked for that separation, and the two
  surfaces answer different questions. Neither is persisted, neither enters `gsSettings`,
  neither reaches an export. `sgramModelFor()` gains `comb`, the flat partial array or
  `null`, and **must not perturb M2.7's refine key** — the two cache-key lines mention
  neither `sgFrets` nor `sgHarm`, so changing the overlay never re-runs an STFT.
- **Block 3, the draw pass.** A fourth pass in `drawSpectrogramScene()`, after
  `drawStringMarkers()` and before the colorbar, clipped to the plot rect: per partial a
  full-width horizontal at `yOfF(f)` — a 5 px `rgba(0,0,0,0.75)` halo first, then 2.5 px in
  `_trackColor(key)`, solid for the fundamental and dashed `[6,4]` above it (the widths and
  the lift are the R5.1a legibility pass below; as first built it was 3 px / 1.5 px / 0.55
  and `_stringColor`). **Black is the only halo that survives both the magma floor and its
  ridges** — *true, but only of hues that live inside the colormap; the session-23 look
  pass gives the user hues that don't, and those draw with no halo at all — and after R5.7
  the halo is drawn only under the String-hues modifier. Dash `[6,4]` was superseded by the
  finer `[1,3]` default at the look pass and restored as the default at R5.7. See "The look
  pass" and "R5.7" below.* The track hues were `STRING_COLORS`, a **data** palette: the
  overlay is pixel-identical in Bright and Dark — still true of every palette R5.7 added.
  No labels — *superseded twice: R5.6 labelled each partial inside the plot, and R5.7 moved
  the labels out to the right margin, which the plot now widens to make room for.*
- **Hooks, because the canvas is unreachable from node.** `?sgnote=<0-5>` and `?sgharm=<n>`
  (unpersisted, gate-only), and each pane canvas publishes `data-sgcomb="<count>"`, absent
  when the overlay is off — the same reasoning as M2.7's `data-sgwin`.

**The trap this milestone set, and the assertion that now guards it.** `key` is both the
index into the array handed to `notePartials()` *and* the thing that picks the track's hue
via `_stringColor(key)`. Hand it the one selected note (`[midi]`) and every partial comes
back `key === 0`, so every string paints in `STRING_COLORS[0]` — red — and the bug is
invisible whenever the low E is the string under test. `sgramModelFor()` therefore builds a
**six-slot** `sgMidis` array with the unsounded slots left `null`. `tests/r5.test.js`'s 76th
assertion parses the first argument of every `notePartials(…, state.sgHarm` call and counts
**top-level** commas inside the brackets — an earlier form using a character class was
satisfied by `[sgMidis[sgSi]]` and failed its own mutation check.

**PNG exports carried no tracks as built; the user reversed it (R5.1a).** As shipped,
`exportSgramPNG()` saved `state.sgFrets`, blanked it and restored in a `finally`, following
the data-only precedent. The taste call raised at the boundary came back the other way — *"i
woiuld like any export of PNG to include the visualization"* — so the blanking is gone from
all three PNG paths. See R5.1a for where the line now sits.

## R5.1a (session 20): the legibility pass the user asked for

The user tested R5.1 and returned four items. All four are fixed; each was diagnosed with a
measurement rather than an opinion, because "hard to see" and "too small" are exactly the
claims that dissolve into taste if nobody counts pixels.

- **(a) "The colors are very hard to see because of the spectogram's colormap."** Two
  independent deficits, not one. First, the strokes were sub-pixel on a Retina pane: a 3 px
  halo behind a 1.5 px line leaves 0.75 CSS px of black per side, which at
  `devicePixelRatio` 2 antialiases to nearly nothing. Widths went 3 → **5** and 1.5 → **2.5**
  (halo − track ≥ 2 is now a gate contract, so a later tweak cannot re-create the same
  sub-pixel edge), the halo alpha 0.55 → **0.75**, and the dash `[3,3]` → **`[6,4]`** so a
  dashed partial still reads as a line at a glance. Second — and this is the part the first
  written rationale got wrong — the hue is **not** read against the magma image. A pixel
  census of a rendered pane says **94.8 % of track pixels have both vertical neighbours
  below 0.18 relative luminance**: what a track sits against is its own halo. The palette's
  own luminance runs 0.36–0.56, so unlifted it clears that halo by a contrast ratio of only
  ≈3.4. `_trackColor(si, alpha)` (block 4, beside `_stringColor`) passes the same six data
  colors through `liftForDark(rgb, 0.62)` — the existing diverging-endpoint precedent, which
  gained an optional target — giving ≈4.8 while the six stay hue-distinct (measured
  before → after: `#e74c3c` 0.423 → 0.619, `#e67e22` 0.555 → 0.620, `#27ae60` 0.548 → 0.620,
  `#3498db` 0.532 → 0.619, `#8e44ad` 0.358 → 0.619, `#d64582` 0.409 → 0.619). The lift is
  **per surface, not per theme** — identical in Bright and Dark — so "data colormaps never
  theme" still holds.
- **(b) "the default view of the graph with such small height makes the default view almost
  useless."** `SGPLOT` spends `mT + mB = 64` px of any pane on chrome, so the 230 px canvas
  left **166 px** for 60 Hz–20 kHz on a log axis — about 20 px per octave. The panes are now
  **372 px** (308 px of plot, +85 %), and **288 px** under `@media (max-width:900px)`. The
  gate reads the rule out of the stylesheet and requires ≥ 340 px, with the narrow rule
  shorter than the wide one but still above the old height.
- **(c) "The harmonic range selector isn't obivous what it is for."** Fixed with
  affordances, not help text: the options name what they count (`Harmonics 1–4 / 1–6 / 1–8`,
  not `4 / 6 / 8`), both selects carry plain-language `title=` tooltips, and `#sgHarmSel`
  ships `disabled` — `syncSgHarmSel()` re-enables it only once a note is overlaid, called
  from every door into `state.sgFrets` (the change handler, `fillSgNoteSel()`, the `?sgnote=`
  hook). A greyed control is how the app says "this means nothing yet". That needed one CSS
  rule to be *visible*: `select:disabled{ opacity:.4; cursor:default; }`, the same idiom
  `.seg button:disabled` already used — without it the disabled state was nearly invisible
  in Bright, which the first screenshot caught.
- **(d) "i woiuld like any export of PNG to include the visualization."** Taken in the broad
  reading, and the line moved: **a PNG is a picture of what you are looking at; CSV and JSON
  stay data-only.** `exportPNG()`, `_cardPng()` and `exportSgramPNG()` no longer blank
  `state.strings`, `state.stringHarmonics` or `state.sgFrets`, so a PNG carries the strings
  axis, the per-string harmonics, the ✦ marks and the overlay exactly as drawn. The only
  surviving `state.strings=false` is the settings **reset** path. The R3/R4/R5.1 note that
  "✦ never reaches a PNG" and "sgram PNGs strip the overlay" is therefore obsolete. The gate
  asserts the inverse of what it used to: none of the three exporters may assign to those
  keys. `exportSgramPNG()` also gained the catch/toast the other exporters had.

## Spectrogram difference removed (session 21): a false premise, deleted

M2.5's spectrogram-difference pane (`sgramCanvasD`, `buildSgramDiffModel`,
`drawSgramDiffScene`, `attachSgramDiffCrosshair`) subtracted the two spectrograms **cell by
cell at shared file time**. That is only meaningful if both recordings play the same section,
starting together, at the same tempo — a premise the app never checked and cannot enforce.
The user named it on 2026-08-25: two takes of the same riff drift within a bar, and every
pixel after the drift compares a note against a different note. The pane was removed
(≈290 lines of `index.html`) rather than patched, because there is no honest reading of a
naive subtraction of unaligned time axes.

- **What was kept.** `sgramDifference(sgA, t0A, sgB, t0B, dbOffsetB)` stays in block 0: it is
  pure math, node-tested, and the warped replacement will call it after the warp. Its CSS
  rules stay too, inert — deleting them would have churned the stylesheet the gate hashes for
  no behavioral gain.
- **What survives as the comparison.** The **LTAS Difference** (`diffCanvas`) needs no
  alignment at all: a long-term average spectrum is time-invariant by construction, which is
  precisely why it was the original difference view and why it is untouched here.
- **What replaces it, eventually.** An onset-warped / beat-aligned (DTW) difference that maps
  one file's time axis onto the other's onset grid *before* subtracting. Deferred until after
  R6 — see docs/ROADMAP.md "Deferred — warped spectrogram difference". The obsolete bullets
  above (`_sgDiff` cache invalidation, the sgram-difference auto-latch, the M2.5 pane
  description) describe code that no longer ships; they are left as the record of what was
  built and why it was wrong.

## R5.2 (session 21): a chord, from a picker

R5.1 overlaid one string. A single note's partials rarely collide with anything — the
interesting picture is a **chord**, where six strings' harmonic series interleave and the
merge is visible in the image before anything is marked. That is the user's case (b), and it
is why R5.3's ✦ clusters come after this and not before.

- **A chord is fret offsets, not pitches.** `SG_CHORDS` (block 4) stocks eight open shapes as
  six-slot fret arrays (`null` = muted): E, Em, A, Am, C, D, Dm, G. The pitch is computed the
  same way everything else is — `tuningMidi(state.tuning, state.customOffset)[si] + fret`,
  through the existing ET formula — so a chord shape **moves with the tuning**: pick Drop D
  and the E shape sounds what those frets actually sound. Storing MIDI numbers would have
  frozen the chords in E standard, and the gate asserts the addition explicitly (a loose
  regex here passed a mutation that hard-coded the open notes; the assertion now captures the
  tuning variable's own name and requires `<name>[si] + fr`).
- **One state, one draw pass.** `state.sgFrets` was already a six-slot array — R5.1 simply
  never filled more than one slot. A chord fills several; `sgramModelFor()` maps it to MIDI,
  hands the **six-slot** array to `notePartials()` (`key` indexes that array and `key` picks
  the hue — the R5.1 trap), and publishes the flat result as `comb`. Nothing in
  `drawSpectrogramScene()` changed: one string was always just a chord with five nulls.
- **The picker.** `fillSgNoteSel()` grows a second `<optgroup label="Open chord">` built
  **from** `SG_CHORDS`, values namespaced `chord:<name>`; the change handler branches on
  `startsWith("chord:")`, mutes all six slots first, and assigns `ch.frets.slice()` — a copy,
  because the shipped table must not become the live state. `_sgChordName(frets)` reverses the
  lookup for the status chip, requiring an exact six-slot match.
- **`?sgchord=<name>` (gate hook only).** The canvas is unreachable from node, so headless
  reads `data-sgcomb` — sounding strings × harmonic limit. `&sgchord=E` gives 36 at the
  default six harmonics, `&sgchord=D&sgharm=3` gives 12 (D mutes two strings), and an
  unstocked name (`Zz`) overlays **nothing**: the hook mutes before it resolves, so a typo
  cannot silently leave the previous chord on screen. Unpersisted, no `gsSettings` key, no UI
  — same standing as `?sgnote=` / `?sgharm=` / `?tol=` / `?refine=0`.

## R5.6 (session 22): three answers to a congested pane

A chord draws 36 tracks. The user tested R5.2 and sent three items in one message: name the
harmonics, and two ideas for the congestion — a translucent sheet under the lines, and
click-and-hold to follow one comb — both "with some tunable parameter (in the UI for
debugging)". Built before R5.3 on purpose: the ✦ marks have to land on whatever legibility
scheme wins, and marking a picture you cannot yet read would be marking the wrong thing.

- **The draw order is the feature.** `drawSpectrogramScene()` is now: image → **scrim** →
  chrome/axes → tracks → labels. The scrim sits between the measurement and the prediction,
  which is exactly what makes the prediction readable without editing the measurement's own
  pixels — the magma cells still carry their true colors under a known, printed alpha. It is
  gated on `model.comb && model.comb.length`: **no comb, no sheet.** A dimmed spectrogram
  with nothing overlaid would be a picture that lies about its own contrast, and the gate
  asserts it is byte-identical to no scrim at all (`?sgscrim=90` with no overlay, a 160×24
  bounding-box bound so the status chip's own text is the only permitted difference).
- **`partialLabel()` lives in block 0, not block 3.** The label is arithmetic on the note
  system (`noteInfo`, `midiToFreq`, `COINCIDENCE_CENTS`), so it is node-testable and the
  gate checks the arithmetic against independently computed note names rather than against a
  screenshot. The fundamental prints alone (`E2`); harmonics print `E2 ×3 = B3` when the
  landing is inside R3's locked tier and `E2 ×5 ≈ G♯4` when it is not. **The `≈` is not
  hedging** — the 5th harmonic is 14 ¢ below the tempered note that shares its name
  (THEORY §1, §5), and the whole point of the overlay is that the ear hears the ratio while
  the fretboard names the temperament. An `=` there would teach the wrong thing.
  This **reverses R5.1's "no labels" decision**, which was correct only while a single string
  could be overlaid: with six hues and one comb, left-to-right order said everything; with
  six combs interleaved, hue alone cannot say which harmonic of which string a line is.
- **Labels thin themselves, they never smear.** Drawn highest-frequency first, skipping any
  label within 12 px of the last one drawn — M2.6c's region-label rule, reused rather than
  reinvented. A pane with 36 tracks prints the ones it can print. `data-sglabels` publishes
  how many it managed, because the canvas is unreachable from node.
- **Hold-to-follow is a hit test, not a mode.** `_sgTrackAt(i,x,y,w,h)` asks `notePartials()`
  the same question `sgramModelFor()` asks, maps each partial through the pane's own zoom
  window, and takes the nearest within 8 px. mousedown sets `state.sgFocus` to that partial's
  **string** (not the partial — you follow a comb, not a line); the comb pass gives every
  other string `1 − state.sgDim` alpha and drops its labels with it; mouseup and mouseleave
  clear. A drag past 3 px hands the gesture off to the existing zoom box, so following a comb
  never costs a zoom. `?sgfocus=<0-5>` holds one without a mouse, `data-sgfocus` publishes it.
- **Two ranges, both born disabled.** `sgScrimRange` (0–90 %, default 45) and `sgDimRange`
  (0–95 %, default 85) sit in the sgram card head with live outputs, and `syncSgHarmSel()`
  enables them from `state.sgFrets` at **every** door into that state — the R5.1a affordance
  rule applied to two more controls. That same sync clears a focus whose string has stopped
  sounding, which is the only way `state.sgFocus` can be stale. None of `sgScrim`/`sgDim`/
  `sgFocus` is persisted, exported, or part of the M2.7 refine cache key: they are view state,
  exactly like `sgFrets`. The gate carries that as an **inverted** contract — no exporter and
  no settings writer may assign them.
- **A headless lesson, not an app one.** Two M2.7 assertions went red mid-build and were not a
  regression: the decode/draw race missed 7 launches in 8 on an **unmodified** checkout while
  a runaway indexer held 99 % CPU at load 5.7, and 0 in 8 once the machine settled. The
  answer was not a looser assertion — `domDrawn`/`shotDrawn` now report which launch
  succeeded and shout when the entire retry budget passed undrawn, so the next loaded machine
  reads as a loaded machine instead of an unwired attribute.

## R5.3 (session 22): where two strings meet, marked and clickable

R5.1 predicted one comb, R5.2 six, R5.6 made six readable. R5.3 answers the user's first
item from that same message: mark the places where the combs **collide**. A chord's
character is not that six notes sound at once — it is which of their partials arrive at the
same pitch, and how nearly.

- **No new detector and no new tolerance.** `sgramModelFor()` calls
  `partialClusters(comb, TEMPERED_CENTS)` — the R5.0 primitive, at the R5.0 tempered tier —
  and publishes the result as `model.clusters`. R3's `findCoincidences()` and its locked
  `COINCIDENCE_CENTS = 6` are still the only other caller of the same idea, still untouched.
  `partialClusters()` already drops any group whose members come from fewer than two keys,
  so "a string with itself" is not a collision, and each cluster already carries the `tier`
  that says whether the meeting is inside ±6 ¢ or only inside ±20 ¢.
- **The chord reads itself backwards out of the landing.** `clusterRatio()` (block 0) is the
  R5.3 maths. Every member reaches the same pitch, so `f = f_i × h_i` holds for all of them,
  and the fundamentals therefore go as `1/h_i`: take one member per key at its **lowest**
  colliding harmonic, set `L = lcm(h_i)`, and each string's term is `L / h_i`. Those terms
  are already in lowest terms — `gcd(L/h_i) = L/lcm(h_i) = 1` — so no second reduction is
  needed there. The **folded** set does need one: a string an octave above another
  contributes the same pitch class, so exact power-of-two duplicates are dropped
  (`isPow2`, R4's) before naming, which is how an open C still names itself `4:5:6` with its
  doubling folded away, and the survivors are then divided by their gcd. Names come from
  `CHORD_RATIO_NAMES` and cover only the ratios docs/THEORY.md fixes — `4:5:6` major
  (§1: a segment of one harmonic series), `10:12:15` minor (§4: a stack, not a segment),
  and the five two-term intervals. Anything else returns `name: null` and the copy says the
  ratio and stops, rather than improvising a chord name.
- **The mark takes no side.** `starPath()` again — a drawn path, never the ✦ glyph (the
  session-15 chevron trap, restated at R3). The landing belongs to neither string, so it
  gets neither guitar accent nor themed ink: a fixed light neutral `rgba(247,242,232,·)`
  over a 4 px black halo, because it sits on the magma, which is dark in **both** themes.
  Tier is drawn, not written: **filled** when the pitches agree inside R3's ±6 ¢,
  **hollow** when only temperament's ±20 ¢ holds them together and the ear hears the
  difference as beating. The mark obeys R5.6c — a held focus fades every cluster none of
  whose members is the focused string, by the same `1 − state.sgDim`.
- **Spread along time, thinned on the axis that smears.** The user asked for the marks to be
  spread rather than stacked, and x on this pane is time, which a *predicted* landing does
  not have — so the marks are laid out evenly across the plot's inner width and the status
  chip says "click a mark where strings meet" rather than naming a moment. That layout also
  changes which guard is correct: the string labels' vertical 18 px rule would drop marks
  that never touch (two landings a quarter-octave apart sit half a pane apart
  horizontally), so R5.3 thins by **x stride** instead — keep every mark while the spacing
  clears a mark's own width, stride past some once a dense chord would pack them tighter.
  Same house rule as everywhere else, skip rather than smear, measured on the axis that
  actually smears.
- **The click is the existing door.** The mark pass pushes `{x,y,w,h,cluster}` into
  `sgHits[i]`, which `drawAll()` clears per pane and `attachHitClicks()` reads — the same
  hit-rect machinery the spectrum's ✦ and every glossary term use, so the `help` cursor
  (M2.6d) and the popover lifecycle come for free. `attachSgramCrosshair()` only offers that
  cursor when no button is down, so following a comb never fights it.
  `openClusterPopover()` opens the third **frozen** copy block
  (`// ---------- collision clusters: the ✦ popover (R5.3) ----------`, SHA `1da64ae2…` in
  `tests/verify.sh`): *Musician's ear* / *The physics* / *Equal temperament* / *How Claude
  Rameau places it* / *Current values*, with each term printed as `E2 ×3 = 247.5 Hz`, the
  mistuning in cents **and** in Hz of beating, and the ±1/6-octave audition button.
- **What a node gate can count.** `?pop=clu<N>` pins the Nth cluster's popover (canvas is
  unreachable from node), and each pane publishes `data-sgclusters` — deliberately the
  number of marks **drawn**, not clusters found, so the stride is observable. The mark's
  cream is a literal that appears nowhere else on the pane, which is what lets
  `tests/headless.js` census the marks as pixels: near-`rgba(247,242,232)` blobs of the
  right size, `22 = 2 × 11` across the two panes for an open E, and strictly fewer lit once
  `?sgfocus=0&sgdim=95` fades the rest.

## The look pass (session 23): five colormaps, and a line the colormap cannot make

The user asked for a quick visual experiment — "*without too much rigorous testing … to
nail the color before we do anything complicated*": selectable perceptual colormaps, track
colors **outside** the colormap so the halo could go ("*makes the lines look much thicker
and ugly*"), and a finer default dot pattern.

**The premise that had quietly expired.** R5.1a's census was sound — 94.8 % of a track's
pixels have both vertical neighbours below 0.18 L, so a track is read against *its own
halo*, not the magma — but it assumed the track hue lives **inside** the colormap's gamut,
which is exactly what makes a halo necessary. Give the user a hue the map never emits and
the premise dissolves: black on parula, white on magma. So the halo is not a global rule,
it is a **property of the color choice**, and the code says precisely that:
`const tk = SG_TRACKS[model.track] || SG_TRACKS.string, halo = !tk.rgb;` — "no fixed RGB"
means "this hue comes from the colormap's neighbourhood, so it needs separating."

- **Block 0, the colormap layer.** `CMAP_HEX` holds five 256×3 tables as hex strings
  (`magma` aliases the existing `MAGMA_HEX`; `inferno`/`viridis`/`cividis` verbatim from
  matplotlib 3.10.1; `parula` from OpenCV's `COLORMAP_PARULA`). `cmapTable(name)` inflates
  one lazily into a flat `Uint8Array(768)` and memoizes it in `_CMAPS`, which is pre-seeded
  with the existing `MAGMA` — so **magma costs nothing new and `magmaColor`/`MAGMA` survive
  byte-identical**, which matters because `tests/dsp.test.js` names them. `cmapColor(name,t)`
  clamps, quantizes to 8 bits and indexes; an unknown name falls back to magma rather than
  throwing. `sgramImage()` takes the map name as a fifth argument.
- **Perceptual is measured, not asserted.** The gate computes CIE L* from each table's sRGB
  in-test (linearize at 0.04045, Y = .2126R+.7152G+.0722B, cube-root branch at 0.008856) and
  requires a rise of more than 55 L* end to end with no backward step worse than −2.5. All
  five pass: magma 0.1→97.9, inferno 0.1→98.0, viridis 14.9→90.9 (worst step −0.03),
  cividis 13.8→91.3 (−0.01), parula 24.2→95.6 (−0.17). A table pasted in wrong fails this;
  eyeballing a strip would not.
- **Block 4, three tables and three keys.** `SG_TRACKS` (String hues / Black / White / Cyan /
  Magenta) and `SG_DASHES` (Fine dots `[1,3]` — the new default — / Dots `[2,4]` / Dashes
  `[6,4]` — R5.1a's / Solid `[]`). `state.sgCmap`/`sgTrack`/`sgDash` join the sgram's other
  view state: unpersisted, unexported, absent from `_cardStateFor`. Only `SG_TRACKS.string`
  lacks `rgb`; `tk.halo` is the **label outline** color and never touches the line.
  *R5.7 rewrote both tables: Cyan and Magenta are gone, String hues stopped being an entry
  and became a checkbox modifier, Triad joined, and the default dash went back to `[6,4]`.
  The `halo = !tk.rgb` test became `halo = !!model.hue`. See "R5.7" below.*
  *Session 26 stocked two more fixed colors — Bright yellow and Bright red — and reordered
  `CMAP_NAMES` to `parula, viridis, cividis, magma, inferno`, making **parula** the default.
  See "Small changes a/b/c" below.*
- **Block 3, the draw pass.** With a fixed color: no halo, one 1.4 px stroke — a third of the
  ink R5.1a laid down. With String hues: unchanged from R5.1a (5 px black at 0.75α, then
  2.5 px lifted hue). The fundamental is always solid; `model.dash` styles the harmonics.
  As always, block 3 reads only `model` — the model carries `cmap`, `track` and the resolved
  `dash` array, never `state`.
- **Recoloring must not re-run an FFT.** M2.7's refine cache key was split in two:
  `gkey` is the analysis the refine asks for (dB scale + offset), and `key = gkey + "|" + cm`
  is what the *image* is cached under. Changing colormap repaints; it never re-analyses.
  A gate assertion pins the line-style keys out of both.
- **Hooks and attributes.** `?sgcmap=`/`?sgtrack=`/`?sgdash=` (lowercased, validated against
  their tables, unpersisted, gate-only), `data-sgcmap` on every drawn pane and `data-sgtrack`
  only when a comb exists. The status chip prints the colormap by name, because *every visible
  number is defensible* extends to "the reader can tell which map they are looking at."
- **Affordance.** All three selects sit in one `Colors` group in the sgram card head;
  `sgTrackSel`/`sgDashSel` ship `disabled` and `syncSgHarmSel()` enables them at every door
  into `state.sgFrets`, exactly like the harmonic limit (R5.1a c).

Gate: `tests/r5.test.js` 232 → **264**, every new assertion mutation-checked the day it was
written. Two initially **missed** their mutation and were strengthened: the fixed-color
assertion accepted any `rgb`, so it now demands the exact `[0,0,0]`/`[255,255,255]` triples;
and a "parula is perceptual" check was satisfied by a renamed table because `cmapTable`'s
magma fallback quietly absorbed it — the mutation now corrupts the real table instead.
No new headless assertion: the user asked for a quick experiment, a launch costs 4–5 minutes,
and the rot risk here is source-shaped, not pixel-shaped.

## R5.7 (session 24): nothing on by default, and colors that mean the chord

The user tested the look pass and returned six changes plus one about process. The theme
running through all six: **the spectrogram should show the measurement until asked**, and
what the overlay then draws should say *which voice of the chord* a line is, not just which
string it came from.

- **The always-on pass is gone.** `drawStringMarkers()`, its call site and
  `markers: tuningMarkers()` were deleted outright — not switched off. Six horizontal lines
  and six labels drew on every pane whether or not the user cared, and R5.1's overlay
  already answers "where do this string's partials fall?" better, per string, on request.
  With nothing overlaid a pane is now the image, the axes and the colorbar.
- **`None` and `All open strings`.** The note select's off value reads **None** (it read
  `Off`), and `fillSgNoteSel()` prepends a second entry, `all`, that fills all six slots
  with the open tuning — the old always-on view, now one click and one status-chip line
  away. The harmonic select keeps 6 as its default and gains **1st harmonic only**, which
  is the honest way to ask "where are the fundamentals?" — the question the deleted pass
  was answering badly.
- **Labels moved outside the plot.** `SGPLOT.mR` is **dynamic**: `SG_MR_BASE = 98` normally,
  `SG_MR_LABELS = 150` whenever `model.comb` is non-empty, assigned before `pW` is computed.
  Each partial's label is drawn to the right of the plot rect at `SGPLOT.mL + pW`, preceded
  by a short leader tick in the track's own color, in `cssRGBA("ink-rgb", 0.82)` — the label
  is chrome, so it themes, while the tick is data, so it doesn't. The 12 px vertical skip
  guard from R5.6 is unchanged: **skip rather than smear**. This is why any headless compare
  that straddles overlay-on and overlay-off can only prove *that* something changed — the
  whole image re-lays-out. Compare comb against comb.
- **Triad, and why the colors are measured.** `SG_TRACKS` is now `{white, black, triad}`.
  Triad paints by **degree, not by string**: `triadDegrees(midis)` in block 0 reduces the
  sounding notes to pitch classes, finds the root whose stack the others sit on, and returns
  one slot per string — `null` where silent, else `0` root / `1` third / `2` fifth — so every
  harmonic of a note inherits its note's color and a six-string chord reads as three voices.
  The three defaults (`SG_TRIAD_DEFAULT = #ff4400 / #00ff00 / #cc00ff`) were **chosen by
  measurement**, the same discipline as the colormaps: minimum pairwise CIE-Lab ΔE among the
  three is 145.7 (the gate demands > 90), and each one's minimum ΔE to any of parula's 256
  entries is > 40. The user asked for "most distinct perceptually and highest contrast with
  parula"; that is a number, so it is asserted as one.
  *Superseded in session 26: the user named the palette outright — white / bright yellow /
  bright red — so the defaults are now a **stated** choice, not a measured one. The pairwise
  floor still holds (min ΔE 97.0); the background floor does not, and the cost is recorded
  rather than papered over. See "Small changes a/b/c" below.*
- **String hues became a modifier.** It was never a color — it is "tint by origin", which is
  orthogonal to "which voice is this". `state.sgHue` (default **off**) is a checkbox;
  `_trackPaint(model, key, alpha)` resolves the base color (`white`/`black`/the triad slot)
  and, when the modifier is on, mixes it toward `_trackHueRgb(si)` and re-enables the 5 px
  black halo. *(The mix ran at 0.62 until session 26, which is closer to replacement than
  tint; it is 0.30 now — the chosen color has to survive the modifier.)* **The halo is now a property of the modifier**, not of the color table:
  `const halo = !!model.hue`. Cyan and Magenta were removed on the user's instruction.
- **Default dash back to `[6,4]`.** The look pass made fine `[1,3]` the default against the
  magma background; with the labels outside the plot and fewer lines by default, the user
  preferred the heavier dash. `SG_DASH_NAMES` orders the select `dash / dot / fine / solid`.
- **Hooks.** `?sgnote=all` joins `?sgnote=<0-5>`; `?sghue=0|1` and
  `?sgtriad=RRGGBB,RRGGBB,RRGGBB` are new; `?sgtrack=` now validates against
  `white|black|triad`. All unpersisted, gate-only. `data-sgtrack` is unchanged in meaning.
- **A TDZ trap worth remembering.** `state` is an object literal evaluated at load, so it
  **cannot** name a `const` declared later in the same block — `state.sgTriad` therefore
  starts `null` and `fillSgLookSels()` seeds it from `SG_TRIAD_DEFAULT`. (Block *3* may call
  block 4's consts freely: that is a call-time reference, not a load-time one.)

Gate: `tests/r5.test.js` 264 → **259** and `tests/headless.js` stayed at 64 — see
"Verification, in proportion" in docs/ROADMAP.md. The suite got *smaller* on purpose: the
deleted marker pass took its assertions with it, and three headless assertions that pinned
absolute counts (`data-sgclusters` = 11 / 8) became relational, with the exact numbers pinned
in the node suite where they cost no browser launch.

## Quality-of-life batch a/b/c (session 25): who is who, and which harmonic is that

Three items the user asked to lump into one sub-milestone. None is deep, but each touches a
place the app had been quietly ambiguous.

**(a) A/B color keys, and why the strip sits *outside* `.cardhead`.** `AB_KEY_CARDS` names the
six analysis cards; `syncAbKeys()` builds a `.abkey` strip of `.abchip` swatches and inserts it
as a **sibling immediately after** each card's `.cardhead` (`verdictCard`, which has no fold
head, takes `afterbegin`). Placing it *inside* the head is the obvious thing and it is wrong:
M2.6d made the entire header of a foldable card a toggle, so every click on a color chip would
fold the card. The strip is rebuilt from `updateVisibility()` (slot count changes) and
`applyUserColors()` (the user recolored a guitar), so it can never disagree with the plots.

**The EQ card's "Target" is now "Reshape".** The old label named the *goal* curve; the user
reads the card the other way round — the guitar being reshaped is the one in their hands, and
the response plot shows what happens when *that* guitar is played. So `buildEqModels()` emits
`legendTarget:"reshape …"`, `legendFit:"… response on <letter>"` and, most importantly,
`colorFit: COLORS[fit.src]` — the fitted response now wears the reshaping guitar's accent
instead of a fixed one. **No fit math moved**; this is naming and color only.

**(b) Solid fundamentals, dashed harmonics, and one override point for the hue.** Pass 1 of
`drawStringAxis` now branches on `const isHarm = m.harm && m.harm > 1` —
`setLineDash(isHarm?[5,4]:[])` — and strokes `_stringColor(m.si, …)`. The hue itself comes from
a new one-liner:

```js
function _stringHex(si){ return (state.stringColors && state.stringColors[si%6]) || STRING_COLORS[si%6]; }
```

Everything that wanted a string's color already went through `_stringColor` or `_trackHueRgb`,
and both now read `_stringHex`, so **the override has exactly one door**. The popover's new
**Line color** row previews live on `input` and commits on `change` (and on Default) via
`_setStringColor(si, hex, commit)`; commit re-renders the *whole* popover rather than patching
the swatch, because R4's ancestry section also prints a dot for the **adjacent** string, which
may be the one that just changed.

Persistence took `gsSettings` **v3 → v4**: the payload gains
`stringColors:(state.stringColors||STRING_COLORS).slice()`, v1–v3 payloads still load, and each
stored slot is hex-validated on read (a corrupt slot falls back rather than poisoning a stroke).

**Harmonics to the 8th.** `HARM_MAX = 8` with `HARM_SLOTS = HARM_MAX-1` sizes the 6×7 grid, the
settings payload and every loop that walked 2–5. `harmonicIntervalPhrase` already named 6/7/8
correctly; `HARM_NODES` gained their fret positions from THEORY §6.1. **This cannot change R3's
✦ set**, and the reason is arithmetic, not testing: harmonic 5 sits 27.86 semitones above its
fundamental (6 → 31.02, 7 → 33.69, 8 → 36), while the widest open-string span in any stocked
tuning is **26** (Drop D). Nothing above the 4th harmonic can reach another open string, in any
tuning the app stocks.

**(c) Labels, rotated.** A third pass draws `partialLabel(m, state.a4)` — deliberately the
spectrogram's own function, so the two views can never word the same fact differently — near
the bottom axis, **rotated −90°**, skipped rather than smeared within 11 px. The brief said
"inside the plot … towards the bottom", and horizontal was tried first: with strings and
harmonics on, a log axis carries ~42 verticals, and horizontal text collides with its neighbour
almost everywhere, so the skip guard would have eaten most of the labels. Rotating trades one
line of transform for labels that nearly all survive. This **reverses R5.1's "no labels" rule
for the line plots only** — the spectrogram's own rule was already reversed at R5.6.

**Two frozen blocks re-frozen by their author.** `HARM_NODES` lives inside R3's frozen copy
block and `harmonicRowNoteHtml`'s range gate (`h>5` → `h>8`) inside R4's, so both SHAs moved.
That is legitimate — the freeze exists to stop a *delegated builder* rewriting reviewed physics,
not to stop the reviewer who wrote it extending it — but the discipline is: diff the extracted
block against `master` first to prove the change is yours, then update **both** copies of the SHA
(`tests/verify.sh` *and* the suite that also asserts it), each with a comment naming the change,
and record it in SPEC.md.

**Gate, and a lesson about source-read assertions.** 16 assertions appended to
`tests/dsp.test.js` (171 → **187**); no new suite, no new `verify.sh` step. Three survived
mutation and had to be strengthened, all for the same structural reason: the slice being
searched was too big. The old `drawStringAxis` slice ran to the next `"\nfunction "`, which is
**thousands of characters away** — 9267 against the function's true 5006 — so it swallowed
`VOCABS`, and `/partialLabel\(/` and `/continue;/` matched happily with the label pass deleted.
The fix is to **brace-match the function**, and the general rule is: *an assertion that reads
source must scope to the smallest construct that can hold the thing it claims* — then delete the
code and confirm it goes red.

## Small changes a/b/c (session 26): a glyph that lied, defaults from real material, and a key

**(a) The shelf glyph contradicted its own name.** `drawEqShapeGlyph` drew every shape
centred on the box, so both halves of a shelf floated on nothing: a low-shelf **cut** and a
high-shelf **boost** produced the same picture, and the two Logic-EQ band icons were
indistinguishable. The fix is one line of context — a faint 0-dB reference stroked across the
box in `cssRGBA("ink-rgb", 0.16)` — plus **anchoring the flat half of each shelf on it**. A
low shelf sits on the reference to the right of the corner and departs to the left; a high
shelf is the mirror; `dy = up ? -5 : +5` carries the sign. Four distinguishable pictures for
four cases.

  The report carried a question worth answering in the docs, because the naming trips people:
  **low/high names the side of the corner frequency, not the direction.** A shelf boosts or
  cuts by the sign of `gainDb`, and the least-squares fit hands either sign to either shelf.
  The RBJ math was already right; only the icon was wrong.

**(b) Defaults, and one place a measured floor was retired.** `CMAP_NAMES` is reordered to
`parula, viridis, cividis, magma, inferno` — the head of that list is both the selector's
first row and the default, so one edit does both. `_CMAPS` stays pre-seeded with `MAGMA`, so
**magma remains byte-identical and costs nothing** even though it is no longer what you open
on; three internal fallbacks that said `"magma"` now say `CMAP_NAMES[0]`, so the default can
move again without hunting literals. Scrim 45 % → **10 %**, hold fade 85 % → **80 %**.
`SG_TRACKS` gains Bright yellow and Bright red.

  **String hues mixes at 0.30, not 0.62.** At 0.62 the modifier was effectively a substitution
  — the checkbox promised a tint and delivered a different color. The R5.1a lift that produced
  0.62 was solving a different problem (a hue read against the magma), and that problem is now
  the *halo's*.

  **The Triad palette is a stated choice now, not a measured one.** R5.7 asserted two floors:
  min pairwise ΔE > 90 and min ΔE > 40 against every parula entry. White/yellow/red keeps the
  first (97.0) and fails the second, because **parula ends in bright yellow** (`#f9fb0e`) —
  the third's track measures ΔE **2.8** from the hottest cells and vanishes inside them. When
  the user names a palette, the gate pins the palette; the measurement that no longer holds is
  written into the assertion's comment so the next reader sees the trade instead of
  rediscovering it. (The escape, if it bites in use: pick a different colormap, or switch the
  third off the default.)

**(c) The collision key, and a margin that must not vary per pane.** The R5.3 pass draws both
marks a second time above the plot — filled and hollow, halo and all, **as the pane draws
them**, never described in words — each on an 18×18 chip of `cmapColor(cmap, 0.05)`, because
the marks are fixed cream and a cream star on a cream panel is invisible. The tolerance in the
label prints from `COINCIDENCE_CENTS`; a number typed into a caption is a number that can
drift from the detector. The row skips rather than smears if it would reach the plot's right
edge.

  `SGPLOT.mT` is dynamic for the same reason `mR` is — `SG_MT_BASE 30 → SG_MT_KEY 52`, set at
  the head of `drawSpectrogramScene` **before `pH` is derived from it**. The subtle part is
  what it keys off: **`model.clusters`, the whole set**, not the marks that survive this pane's
  zoom window. `SGPLOT` is a module-level singleton, written by whichever pane drew last and
  read *live* by `attachSgramCrosshair` and `_sgTrackAt`; a margin that differed between A and
  B would have the crosshair measuring one pane's pixels against the other's geometry. Any
  future dynamic margin must obey the same rule: **depend only on pane-invariant model
  fields.** A pane with no clusters keeps `mT = 30`, so nothing moves until something is found.

Gate: `tests/r5.test.js` 259 → **267**, all new and changed assertions mutation-checked; no
new suite, no new `verify.sh` step, no headless launch — the rot risk here is source-shaped.
The key is canvas drawing **outside** the R5.3 sentinels, so no frozen copy block moved.

## R5.5 (session 26): a difference of silences, disclosed rather than corrected

Two views of the same band can look like they contradict each other. Above ~10 kHz the demo
pair shows a per-bin Δ of several dB on the **LTAS Difference** while the **Band Energy**
share for that band reads 0 %. Neither number is wrong: the Difference is a **log-ratio per
bin**, and a ratio does not care how small its operands are; the share is a **linear power
integral**, and two very small numbers integrate to nothing. A large Δ where both curves sit
on the floor is a difference *of silences*.

The house rule fixes what to do about it: keep the raw Δ honest, and **disclose** where it is
inaudible rather than warp it. A loudness-weighted Δ (A-weighting, or a sone/ERB
specific-loudness integral) would fold the disclosure into the number itself — deferred, and
still recorded in ROADMAP, because it replaces a defensible measurement with a modelled one.

- **The predicate is dual, and the looser floor wins.** `nearFloorDb(a,b)` is
  `Math.max(NEARFLOOR_ABS_DB, peak − NEARFLOOR_REL_DB)` with `-60` dBFS and `45` dB. The
  absolute test catches what no sane monitoring level would reveal; the relative test catches
  what is buried under its **own** spectrum's body. Taking the **max** means a hot recording
  is judged against its own peak and a quiet one against full scale — a single fixed floor
  would mark half of a quiet take as inaudible. The peak is scanned across **both** curves
  (the predicate must be symmetric in A and B, or swapping the slots would change the
  disclosure), and a bin is marked only when **both** curves are under it: one curve alone
  under the floor is a real, audible difference.
- **Despeckling belongs in the predicate, not the renderer.** Single grid points dipping under
  the floor between audible neighbours drew as 1-px light streaks through the solid fill around
  10–13 kHz. `NEARFLOOR_MIN_RUN = 4` drops runs shorter than four grid points **inside
  `nearFloorMask`**, because the physical claim is the same as the fix: a lone bin under the
  floor between audible neighbours is a **notch in an audible region**, not a floor region. In
  the predicate it is pure, node-testable, and `data-nearfloor` keeps describing exactly what
  is drawn. In the renderer it would have been an unexplained cosmetic threshold. The log grid
  runs ≈84 points/octave, so four points is about half a semitone; on the demo pair the count
  went 61 → 58.
- **Runs overlap by one point.** `drawDiffScene` walks the curve in runs of equal near-floor
  state and pushes `[Math.max(0,i0-1), i1, near]`, so consecutive runs share their boundary
  point and the line has no seam where the style changes. One `runs` array drives both the
  sign-split fill and the stroke, so fill and line can never disagree about where the floor is.
- **The fill dims too.** ROADMAP specified the line only (40 % alpha, dashed `[4,4]`). The
  sign-split fill at 0.20 alpha is what actually shouts *big difference here*, so it drops to
  0.06 in near-floor runs. A faint dashed line inside a full-strength fill would have
  contradicted itself.
- **The footnote prints the floor it used.** `dashed = both below -60 dB (≈ inaudible)`, not a
  static caption — every visible number defensible. It is appended to the existing status chip
  only when `nNearFloor > 0`, so a pair with no floor region reads exactly as before.
- **Zero near-floor points is byte-identical to the pre-R5.5 render.** `runs` collapses to
  `[[0,N,0]]`, one fill path per sign and one solid stroke — which is why R5.5 needed no new
  headless launch and why every existing Difference-plot pixel assertion stayed valid.
- **All four consumers inherit it** because the mask lives on the model: `drawAll`, the magnify
  overlay, the crosshair readout, and `exportDiffPNG` (PNG = the view). The numeric `+X.X dB`
  at the crosshair is unchanged — the disclosure qualifies the claim, never the value.

Gate: `tests/r5.test.js` 267 → **284** (6 pure-math on `nearFloorDb`/`nearFloorMask`, 11
source-read wiring contracts, including an **inverted** one that no delta value is rewritten
after the mask is built). All mutation-checked in one batched driver; two of them first passed
vacuously — an empty regex slice satisfies "nothing was written to `diffBuf`" — and were
strengthened to require a non-trivial body. No new suite, no new `verify.sh` step.

## Q3 (session 26): the same floor in three cards

R5.5 disclosed the floor on the Difference plot. The user then found the identical paradox
printed twice more — a Band Energy row reading `0.0 %` beside `+6.7 dB`, and an At-a-glance
strip naming that band as "their widest spectral gap". Same defect, same answer: **keep the
number, disclose the floor.**

- **`fmtPct` prints `< 0.1 %`, never a rounded `0.0 %`.** A high band on an electric really can
  hold 0.04 % of the energy; `0.0 %` asserts *absent*, which is false, and was half of why the
  row looked self-contradictory. All six callers are shares of energy, so the fix is central.
- **`nearFloorBands()` is the single shared predicate.** It reads `displayedDb(0)`/
  `displayedDb(1)` — the settled, cached curves, **not** `dispDb`, which may be mid-animation —
  and hands back `{floorDb, onFloor}` built from R5.5's own `nearFloorMask()`/`nearFloorDb()`.
  One predicate, never two: the band table and the verdict's region scan call the same helper,
  so the two cards cannot state different floors or disagree about which bands are silence.
- **A band is silence only when *every* grid point inside it is masked.** One audible point
  inside the band makes the band audible. The looser "any point" reading would let a single
  masked bin condemn a live band.
- **The table discloses by row, the strip by sentence.** A floored cell takes `.delta-floor`
  (dim, `opacity:.45`) and a `title=` naming the measured floor, the footnote prints that floor
  once, and `data-nearfloor-rows` is set **only when some row is floored** — absent, not `"0"`,
  matching `diffCanvas`'s `data-nearfloor`. In the strip, `biggestRegionDelta()` splits its
  candidates so a floored band competes only with floored bands and can never win the headline
  by being the loudest silence; the headline says "widest **audible** spectral gap", and a
  floored band that out-measures it gets its own disclosing sentence. **Neither Δ is rewritten**
  — an inverted assertion pins that.
- **Flagged, not hidden: a domain mismatch bought on purpose.** The mask lives on the *display*
  curve (smoothed, level-matched); the band table integrates *raw* Welch power over [f0,f1].
  Binding them makes the table's disclosure inherit the plot's smoothing setting. That is the
  deliberate trade — one floor across the app beats domain purity, because a user reading two
  cards is comparing claims, not domains. Its one consequence is fixed: `setSmooth()` now
  re-renders the verdict and the band table, which it previously did not.

Gate: `tests/r5.test.js` 284 → **298**, all 14 mutation-checked in one batched driver. One
mutation was **inert** — `indexOf("function nearFloorBands")` still matches a renamed
`nearFloorBandsZ`, the `setSmoothUI` prefix trap for the second time — so every body lookup in
the section now includes the `(`. The demo pair has no near-floor region at shipped thresholds,
so both verdict paths were proved through real Chrome against a scratch copy with
`NEARFLOOR_ABS_DB` lowered to −47 (lowering `NEARFLOOR_REL_DB` cannot work: the floor is the
**looser** of the two tests). No new suite, no new `verify.sh` step, no new Chrome launch.

## Q5 (session 28): the verdict strip has two families, not one ranking

- **A single top-scoring sentence is a spectral sentence.** `proseCandidates()` ranks ten
  contrasts; six of them are spectral and they carry the larger multipliers, so `cands[0]`
  is almost always about colour. That is why a 1.6x sustain difference between the user's
  two guitars never reached "At a glance" — not a threshold failure (`r >= 1.35` passed),
  a selection failure.
- **Tag, do not rescore.** Each candidate now declares `fam:"tone"` or `fam:"time"` and
  `renderVerdict()` prints `cands[0]` plus the first candidate of the other family.
  Re-weighting the scores would have worked too, and would have reordered the tone panel's
  prose paragraph along with it — the list is shared verbatim (`cands.slice(0,4)`), which is
  the whole reason summary and detail cannot contradict each other. Preserve the ordering;
  change what the *consumer* selects.
- The second sentence is conditional on the measurement, not on the layout: with nothing in
  the other family over threshold, `find` returns undefined and the strip is exactly what it
  was. Contract in `tests/dsp.test.js` (193 assertions).

## Q6 (session 28): every plot names both of its axes

Five plots carried units and nothing else — the two frequency line plots and the EQ
response printed a bare `Hz` at the right end of the tick row and a rotated `dB` up the
left margin; the spectrogram and envelope printed `s` and `Hz`/`dB` the same way. A unit
is not a label: `dB` alone does not say whether the axis is a level, a difference between
two levels, or a filter's gain, and the app draws all three on the same kind of canvas.
The design brief is a laboratory instrument, and an instrument names its quantities.

**One helper, both axes, every plot.** `drawAxisTitles(ctx, w, h, P, xTitle, yTitle,
xDrop, xRightText)` sits immediately above `drawAxes` in block 3. `P` is `PLOT` or
`SGPLOT` — passed in, so the dynamic margins (`PLOT.mT` by vocabulary rows, `SGPLOT.mR`
by comb, `SGPLOT.mT` by cluster key) are read live at draw time like every other consumer,
never captured. The five titles:

| plot | x | y |
|---|---|---|
| Spectrum | Frequency (Hz) | Level (dB) |
| LTAS Difference | Frequency (Hz) | Difference (dB) |
| EQ match response | Frequency (Hz) | Gain (dB) |
| Spectrogram | Time (s) | Frequency (Hz) |
| Envelope | Time (s) | Level (dB) |

`drawAxes` gained a `yTitle` parameter and calls the helper itself, so the spectrum and
the EQ response name their own y quantity at the call site (`"Level (dB)"` vs
`"Gain (dB)"`). `drawDiffScene` draws its own grid and never calls `drawAxes`, so it calls
the helper directly; so do `drawSpectrogramScene` and `drawEnvelopeScene`.

**The y title runs at x = 12.** Rotated −90° with `textBaseline="middle"`, which puts the
glyph column at x ≈ 12–22. The right-aligned y tick labels end at `PLOT.mL - 8 = 44` and
the widest of them (`-100`) reaches back to x ≈ 24. The two columns never touch, and the
same holds for `SGPLOT.mL`. This is why the title is drawn at a fixed 12 rather than
derived from the margin.

**`PLOT.mB` went 34 → 48, and that was the whole layout problem.** The x title has to sit
*below* `drawStringAxis`'s open-string names, which are written at `PLOT.mT + pH + 20`
with a 14 px click rect — rows +18..+32, i.e. the old bottom margin was already full. The
title drops to +34 and needs 48 px of margin. The cost is 14 px of plot height on the four
line plots (the Difference canvas is 232 px, so its plot goes 164 → 150). Every reader of
`mB` derives from the live object — the scene builders, the crosshairs, the zoom
hit-testing, the magnify overlay and the PNG exporters — so growing it needed no other
edit; there is no hardcoded 34 anywhere. `SGPLOT.mB` stays **34**: only ticks live in it
(`SGPLOT.mT + pH + 7`, rows ≈ +7..+20), so the spectrogram's title drops just +21.

**`xRightText` is "skip rather than smear" again.** The spectrogram prints its zoom note
right-aligned at `SGPLOT.mT + pH + 19` — the x title's own row. Rather than move either
element, the helper takes the text already occupying that row, measures it, and skips the
centred title if it would reach within 10 px of it. On the demo pair at `?zoom=sga:0.5,1.5`
both print with room to spare; the guard exists for a narrow pane or a longer note. The
line plots pass nothing: their zoom note goes into the top `statusText`, not the tick row.

The removed unit blocks set `ctx.font`/`fillStyle`/`textAlign` outside any save/restore,
and the helper restores. Every later `fillText` in those scenes (nyquist banner, partial
labels, cluster key, colorbar, name/status, zoom note, the envelope's `t = 0` label) sets
its own font and alignment, so nothing depended on the leak.

**No test moved.** The change was made under an explicit "without any testing" instruction;
no suite asserted an axis unit string or `PLOT.mB` beforehand (`grep` over `tests/*.js`
confirmed it), so the gate's counts are unchanged. Verified by reading the eight call
sites, `node --check` on all five script blocks, and headless screenshots of
`?demo&open=all&strings=1&zoom=sga:0.5,1.5` in which all five plots were cropped at full
resolution and read — including the spectrum with open-string names directly above its new
title, and the zoomed spectrogram with title and zoom note sharing a row.

## M5 (session 29): record into a slot — observe the channel count, never ask for it

A take is recorded into a guitar slot and lands through the **existing** pipeline:
`landRecording()` calls the same `finishSlotFromBuffer()` a dropped file reaches, with
`{kind:"recording", container:"Live input", bitDepth:"32-bit float"}`. Downstream —
Welch, spectrogram, envelope, EQ fit, exports, snapshots — nothing knows the difference,
which is the whole design constraint: *a recorded take must be indistinguishable,
downstream, from a dropped file.* M5 is **not** M3: nothing is analysed in realtime, the
capture graph produces no picture, and M3 (live input) stays gated.

**Raw Web Audio PCM, never `MediaRecorder`.** The first attempt (reverted the same day,
recovery ref `refs/tbh/recovery/before-discard/20260904T011041Z-45812`) recorded through
`MediaRecorder` into Opus/WebM and decoded that back. This app integrates an LTAS to
20 kHz and prints dB re full-scale sine; a perceptual codec that discards exactly the
quiet high-frequency content the app is built to measure makes every number on the page
indefensible. The capture graph now keeps `Float32Array` blocks and builds the
`AudioBuffer` itself, so no `decodeAtNativeRate` and no header sniffer is involved — the
one thing this rewrite *deletes* rather than adds.

### How many channels? Observe, never ask

The user's device is a macOS **"Aggregate Device" with 10 input channels**, and that is
the case that broke attempt one, because it asked two questions the platform is free to
answer wrongly:

- `getSettings().channelCount` / `getCapabilities().channelCount.max` — an unsupported
  constraint is **silently ignored** per spec, so even `{exact:N}` can be accepted and
  not honoured. A claim is not a delivery.
- `createMediaStreamSource(stream).channelCount` — that node has no inputs, so the spec
  default (2) is what it reports, forever, regardless of the stream.

So the code observes instead. `probeDeviceChannels()` opens the device, runs it into a
**32-channel `ScriptProcessorNode` with `channelInterpretation="discrete"`** for 700 ms,
and scans every channel for a non-zero sample. Discrete up-mixing **zero-fills** channels
the device did not supply, so a non-zero sample in channel *c* is proof that channel *c*
was delivered:

```
n = max(heard, claimed, 1)      // clamped to REC_MAX_CH = 32
```

`claimed` is `getSettings()` **only** — `getCapabilities()` was deliberately dropped from
that max. Capabilities say what the device *could* do; sizing the graph by it would make
the "Mix" a mean over zero-filled channels (10 real of 32 requested is −10 dB of nothing).

**Silence proves nothing**, which is the honest limit of the method: a device that is
delivering 10 channels of nothing measures as 1. So the panel asks the user to play
something while it probes, and offers a **↻ Re-check** button (`recheckRecChannels()`)
rather than pretending the first answer is final.

**`ScriptProcessorNode` over `AudioWorkletNode`, deliberately.** `addModule()` must fetch
a module URL, and a `file://` page (null origin) cannot be relied on to allow that; M5
runs no realtime analysis, so a deprecated node doing 700 ms of arithmetic is the right
trade. The node only runs while it reaches `destination`, so it routes through a gain of
**0** — nothing is monitored back into the room and into the mic.

Every processing block is off (`echoCancellation:false, noiseSuppression:false,
autoGainControl:false`). None of the three belongs near a spectrum measurement, and in
Chrome multi-channel is only ever delivered with the APM disabled.

### Reducing online, and landing

`_startCapture` fixes the reduction once, at open: `sel>0` keeps channel `sel-1`; Mix
with `nch<=2` keeps **both** (so the Mid/L/R segment behaves exactly as it does for a
dropped stereo file); Mix with `nch>2` keeps the mono mean. Reducing in the audio callback
is what keeps a long take bounded — 10 ch × 48 kHz × 4 B is 1.9 MB/s. `_takeBuffer()`
builds the `AudioBuffer` **while the capture context is still alive**, at that context's
rate: the rate that made these samples, so nothing is re-decoded or resampled. A rate
outside 8–384 kHz is refused through `slotLoadError()` with the device-settings fix.

There is **at most one** `recCap` for the whole app. `recAbort(i)` runs at the *head* of
`loadFileIntoSlot`/`applySnapshot`/`loadDemo` — not the end — because a capture left
running would keep a `● Recording` card alive over the new file and then land its take on
top of it. A discard bumps `loadSeq[i]`, so nothing partial can arrive late.

Device enumeration is **lazy** and never runs from `boot()`: `enumerateDevices()` wakes
the OS audio service and raced the demo decode. `refreshRecDevices()` re-runs on
`devicechange`. `state.recDevice`/`state.recChannel` persist in `gsSettings`, which stays
**v4** — the two keys are additive, and `tests/dsp.test.js` pins `SETTINGS_VER = 4`.

### Chrome on macOS clamps every input device to 2 channels

Measured here through real headless Chrome, 2026-09-04:

| Device | `capabilities.channelCount` | `settings.channelCount` | delivered |
|---|---|---|---|
| BlackHole 16ch | `{min:1,max:2}` | 2 | 2 |
| Pro Tools Aggregate I/O (16) | `{min:1,max:2}` | 2 | 2 |
| Pro Tools Aggregate I/O (32) | `{min:1,max:2}` | 2 | 2 |
| Pro Tools Aggregate I/O (64) | `{min:1,max:2}` | 2 | 2 |
| Aggregate Device (10 in) | `{min:1,max:2}` | 2 | 2 |

This is Chromium's own `AudioManagerMac` input clamp, not a constraint that can be lifted
from the page — no combination of `ideal`/`exact` changes it, which is why `recOpen()`
tries 32 → unconstrained → bare `{audio:true}` and then simply believes what arrives.
Safari is the only browser that can plausibly surface all ten, and is **untested here**;
the panel says so as a suggestion, not as a promise. The probe is what makes this
survivable: when a browser *does* deliver ten channels, the picker offers ten without a
single line changing.

The lesson, written down because it generalises past M5: **do not ask a question the
platform is free to answer wrongly — arrange for the answer to be observable.**

## Hard-won correctness notes (dead ends — do not retry)

- **Absolute attack thresholds are wrong for phrases.** 10 %/90 %-of-peak is never
  crossed while a previous note rings above the 10 % line; the measurement silently
  becomes the search-window constant (120 ms). Attack must be measured relative to the
  pre-peak envelope minimum. There is a regression test with a ringing background.
- **f0 at segment start is wrong for phrases.** A two-note mixture autocorrelates
  strongest at the common period — E4 over still-ringing B3 (4:3) yields ~82 Hz, a
  subharmonic of both. Measure pitch mid-segment where the sustained note dominates.
- **Truncating a synthesized ring is a click.** The demo synth's notes end in a 60 ms
  cosine fade and the phrase starts with 0.12 s silence; without these, onset detection
  finds 3 phantom onsets and misses the first real one. `tests/make_samples.js` mirrors
  the synth verbatim — keep them in lockstep.
- **Karplus–Strong richness folklore:** with iid noise excitation, expected harmonic
  richness is ≈ +9.5 dB regardless of damping; per-seed variance is huge (−3 to +17 dB
  measured). Damping alone does not make a "warm" string measure less rich — the demo
  seeds are curated for the story (SPEC changelog 2026-08-19). Don't "fix" DSP to match
  seed luck.
- **A first theory that Welch-averaging-over-decay strongly penalizes high harmonics was
  wrong** — the penalty is only ~1–2 dB (λ-ratio effect). Measured, not assumed.
- **One rAF id cannot serve two clients.** The coalescing `requestDraw` and the reveal
  animation loop originally shared `rafId`; a pending `requestDraw` frame made
  `startAnimLoop` think a loop was already running, so the animation never ticked and
  pane B's spectrogram stayed un-revealed (a race — only when a redraw was requested in
  the same tick the animation started). Fixed with a `rafAnim` flag: the animation loop
  cancels a pending plain redraw and takes over the id (its tick redraws anyway).
  Symptom to remember: a blank pane with correct state and no errors.

## Rendering approach

Every scene redraws fully into a device-pixel-ratio-scaled canvas — no retained scene
graph, no incremental invalidation; a full redraw is ~1 ms for 700-point curves.
Glossary interactivity on canvas text works via hit-rects: draw functions push
`{x,y,w,h,term}` for every term they print, and the canvas click handler does rect
lookup. Peak labels are collision-aware: the legend and smoothing chip register their
rects first, each label tries its preferred side, then flips/steps until clear, and
registers where it landed. PNG export re-renders the same scenes into an offscreen
canvas at 2× with an opaque panel background and a caption strip — never a screenshot
of the live canvas.

## Snapshot format

JSON with `app:"Claude Rameau"` (snapshot reader also accepts legacy `app:"GuitarScope"` for back-compat), `type:"snapshot"`, `version:1`, both slots' file facts (name,
container, sample rate, bit depth, channels, duration, channel mode), the raw (unsmoothed)
grid spectra, tone metrics, band table, peaks, and the analysis settings that produced
them. Reload path treats a snapshot like a file drop: everything recomputable is
recomputed from the stored spectra; only facts that need the original audio (time-domain
metrics) are carried as stored values and labeled as such.

## Browser quirks encountered

- `OfflineAudioContext` must be constructed with the file's native rate (sniffed first) —
  constructing at a default rate silently resamples and falsifies the rate readout.
- `decodeAudioData` needs a *copy* of the ArrayBuffer if you also want to keep the bytes
  for sniffing (it detaches/neuters the buffer in some engines).
- Chrome headless: `--virtual-time-budget` fast-forwards `setTimeout` chains (the Welch
  yields), making `?demo` screenshots deterministic and instant.
- **…but it does not fast-forward real work, so anything asynchronous behind a decode or
  an FFT is a race.** Virtual time runs ahead as fast as it can whenever no virtual timer
  is pending, so the budget can expire — and `--dump-dom`/`--screenshot` fire — while an
  `OfflineAudioContext` decode or M2.7's refinement STFT is still running in real time.
  Two symptoms, one cause: a launch can draw nothing at all (the decode), and after M2.7 a
  *zoomed* sgram load can be fully drawn but still showing the base 2048-pt image (the
  refine, ~1 run in 4). Measured, not guessed: four consecutive `tests/headless.js` runs
  failed a refine assertion twice, in two different places — `data-sgwin` reading 2048
  where 4096 was due, and the refine-on/refine-off pixel compare showing 0 px differ; and
  a direct probe of eight `--dump-dom` loads came back with three bare
  `<canvas id="sgramCanvasA">` tags, no `width`, no `data-sgwin`, which is what a `[null]`
  assertion failure looks like. **The decode rate is load-dependent** — ~1 in 6 idle, 3 in
  8 with a second Chrome running alongside — so never launch two headless Chromes at once,
  and size the retry for the loaded rate: six tries puts a site at ~0.3 %, where three left
  ~5 %. A bigger budget does not fix any of it (identical at 30 s and 90 s); the fix is to
  retry the *launch* until the page is ready, which is what `drew()` /
  `domDrawn(query, ready)` / `shotDrawn(query, size, ready)` do. Two rules for the
  predicate. It must read **what the assertion reads**: `drew()` asks for `data-sgwin`
  rather than the canvas width, because `drawAll()` writes both in the same branch but the
  overlay-off assertions check that `data-sgcomb` is *absent* — which an undrawn page
  supplies for free. And it must be strictly **weaker** than the assertion — "the refine
  landed at all" (`sgwin !== 2048`, "differs from the refine-off build at all"), never "the
  refine landed on 4096" — so a build that never refines still fails every try and reports
  the wrong number. R5.3 hit the same rule from the other side: a predicate that waited only
  for **pane A**'s overlay let a launch through with pane B still decoding, and the pane-B
  assertion read `[null]` — which looks exactly like an unwired attribute. The fix is a
  predicate that waits for both (`bothCombed`), not a looser assertion.
- **Chrome headless does not exit when given `--user-data-dir`.** With a throwaway
  profile it renders and writes the PNG on time (~3 s), then sits there. Two runs left
  going overnight both finally returned **after 23 h 20 m**, and the last lines of each
  log say what was holding them: `chrome/updater/updater.cc … UpdaterMain (--wake-all)`.
  So the shot is never the problem — the process is, and only the *process* hangs.
  Suppressing the usual suspects (`--no-first-run`, `--no-default-browser-check`,
  `--disable-search-engine-choice-screen`, `--disable-component-update`,
  `--disable-sync`) does not help; the updater is attached to the profile, not to the
  page. `tests/headless.js` therefore passes no `--user-data-dir` at all and relies on
  `?demo` writing no localStorage (settings save on explicit clicks only); its
  determinism assertion would catch it if that changed. Give any Chrome invocation a
  `timeout` anyway — the PNG is complete long before the process admits it.
- **`--dump-dom` output contains the whole app's source.** `index.html` ships its five
  `<script>` blocks inline, so every string literal in the app appears in the dump
  whether or not anything rendered. An assertion like "the popover says X" passes
  vacuously against the raw dump; scope it to the target element first. Extracting
  `#popover` needs `<div>`-depth counting, not a lazy regex — its content is full of
  nested divs, so `[\s\S]*?</div>` stops at the first inner close.
- **Chrome aborts at startup inside a seatbelt sandbox — and macOS pops a crash dialog
  for every launch.** Reported by the user (session 18) while a delegated builder ran the
  gate: "chrome headless crashes a lot and makes me having to click on the ignore button
  over and over again." The crash reports all end the same way — `abort` ←
  `___RegisterApplication_block_invoke` ← `_RegisterApplication` ← `TransformProcessType`
  ← `ChromeMain` — i.e. Chrome asking HIServices to register the process and not reaching
  `com.apple.coreservices.launchservicesd`. Reproduced deliberately with a two-line
  profile (`(allow default)` + `(deny mach-lookup (global-name
  "com.apple.coreservices.launchservicesd"))`) under `sandbox-exec`: exit **134**
  (128 + SIGABRT), no screenshot, one ReportCrash dialog — the abort happens before
  crashpad initializes, so nothing suppresses it from inside Chrome. Unsandboxed the same
  binary is not flaky at all: 12 sequential launches, 12 successes, mean 3.0 s. The cause
  is therefore the *runner*, not the browser — agent runners sandbox shell commands by
  default (Muse does; `muse sandbox` offers a Windows setup only, no macOS allowlist), so
  every Chrome launch in a suite aborts and every abort raises a dialog. Two responses:
  run the builder with `--disable-sandbox` (recorded in docs/ROADMAP.md "Working
  discipline"), and — in the repo, where it can't be forgotten — `chrome()` in
  `tests/headless.js` catches `SIGABRT`/status 134, prints the diagnosis with that fix,
  and exits on the **first** abort, so a bad run costs one dialog instead of twenty. The
  message also says out loud what gate 3 learned the hard way: do not point `$CHROME` at
  a stub to get past this — a step that cannot run is red.
- zsh: `echo =====` triggers globbing errors; quote such literals in shell commands.
- **Flex wrapping is decided by content width, not by shrink.** A `flex-wrap:wrap`
  row lays items out at their hypothetical (content) size and wraps when the sum
  overflows — `flex-shrink`/`min-width:0` only kick in *after* that decision. So any
  card header whose subtitle length depends on a control will flip its `.controls`
  between row 1 and row 2 as the user changes that control, if the header happens to
  sit near the threshold. That is what the EQ-match header did (session 14): the
  subtitle names the fitted device, ~60 px wider for "Logic Pro Channel EQ" than for
  "Boss GE-7". Fix is `#eqCard .headleft{flex:1 1 100%}` (title column always owns
  the first row, so wrapping is no longer a function of text) plus a one-line
  ellipsized `#eqSub` (so a long name cannot wrap downward either). Note a native
  `<select>` is *not* a source of this — it is sized by its widest option and holds
  width across selections. Watch for the same pattern if another card's `.cardsub`
  ever becomes control-dependent.
- **`--use-file-for-fake-audio-capture` yields silence in this Chrome build.** The flag is
  accepted, `getUserMedia` resolves, the track reports `live` — and every sample is zero,
  so a channel probe that trusts it measures 1 channel on every device. M5's headless
  checks use `--use-fake-ui-for-media-stream` (auto-grant) plus Chrome's built-in fake
  device tone; never the file variant.
- **Chrome on macOS clamps microphone input to 2 channels regardless of the device.**
  Measured 2026-09-04 across BlackHole 16ch, three Pro Tools aggregate bridges (16/32/64)
  and the user's 10-channel Aggregate Device: all five report
  `capabilities.channelCount {min:1,max:2}`, `settings.channelCount` 2, and deliver 2.
  It is Chromium's `AudioManagerMac` input clamp, not liftable by any constraint —
  `{ideal:32}`, `{exact:10}` and no constraint at all give the same stream. Safari is the
  only plausible route to a multi-channel take on this platform. See the M5 section:
  the code never asks, it observes what actually arrives.

## Testing strategy

- `tests/dsp.test.js` (100 tests): physics identities (Hann gain/ENBW/scalloping),
  synthetic-signal metrics (band powers, centroid, tilt, decay slopes, dynamics),
  sniffer byte-fixtures for every container, tuning/note math, attack regression cases,
  spectrogram invariants (0 dB sine anywhere on the log grid, NaN above Nyquist, hop
  bounding), colormap endpoints/monotonicity (within 8-bit quantization; the look pass adds a
  CIE L* check over all five tables),
  envelope decimation peak preservation, and (M2.5) RBJ identities (exact center gain,
  asymptotes, boost/cut reciprocity), EQ fitter recovery of in-model targets,
  spectrogram-difference alignment/NaN propagation, and diverging-colormap endpoints.
- `tests/make_samples.js`: regenerates the demo WAVs and round-trips them through the
  app's own sniffer.
- **The R3 gate (session 16): `./tests/verify.sh`.** Written *before* the milestone it
  guards, because the builder of R3.2–R3.5 is delegated (Sonnet) and writes no tests
  of its own. Three properties make it worth the trouble:
  - **Red by design.** `tests/r3.test.js` asserts the block-0 coincidence math (green
    already — the detector is reviewer-authored) *and* the R3.2/R3.3/R3.4 wiring
    contracts, read out of `index.html`'s own source with the usual extraction pattern.
    Those are red until the wiring lands; "done" is `exit 0`, not a judgement call.
  - **Differential pixels, no golden image.** `tests/headless.js` renders the same page
    twice differing in exactly one query parameter (`?tol=0` vs the default) and asserts
    on the *difference*: pixels changed, 1–4 blobs, each glyph-sized, all within 6 px on
    x (both frequency plots share the axis), and none within 24/channel of either guitar
    accent (the ✦ belongs to neither string). Nothing to re-bless when unrelated pixels
    move. It proves determinism first — two identical runs must be byte-identical —
    which is what licenses every other pixel claim. `tests/png.js` is a dependency-free
    decoder (node `zlib` only; validated against PIL) since there is no package.json.
  - **Tamper guards.** `git diff <base>...HEAD -- tests/` must be empty, and the frozen
    ✦-popover copy between its sentinel comments must match a recorded SHA-256. A builder
    free to edit the gate can always pass it; the educational prose in particular is
    traced to docs/THEORY.md and reviewed, so wiring it up is the task and rewriting it
    is not.
  Canvas and DOM are unreachable from node, which is why R3.2 owes the gate one hook,
  `?pop=coin<N>` — the only way to confirm the frozen copy renders inside real popover
  chrome.
- **Measure before asserting.** Three assertions in the first draft of `tests/r3.test.js`
  were written from the design rather than from data, and all three were false: no 5/4
  landing exists in E standard at any tolerance (only *open strings* are candidate
  targets, and none sits near another string's 5th harmonic), so "widen the tolerance and
  the tempered major third appears" cannot happen, and drop D finds *fewer* landings than
  E standard, not more. Ground truth across the stocked tunings: E std / Eb / D std 3 each,
  drop D 2, DADGAD 5 (4 exact); every landing a fifth (−1.955 ¢) or an octave (exactly 0);
  every one folds to a power-of-two denominator; 6 ¢ → 50 ¢ admits nothing new anywhere.
  The tests now pin those properties, and that insensitivity is the empirical argument for
  a fixed ±6 ¢ constant instead of a user slider.
- **A contract a comment can satisfy is not a contract (gate 3).** `tests/r3.test.js`
  checked the `?pop=coin<N>` door with `/[?&]pop=[\s\S]{0,1200}coin/` — which cannot
  match the shipped hook, because the source spells it as a *regex literal*,
  `/[?&]pop=([a-z0-9-]+)/`, whose own text has `]` where the pattern demands `pop=`. The
  only text in `index.html` that ever satisfied it was a comment reading `// ?pop=coin
  hook`, and the builder wrote that comment instead of reporting the contract. Two
  lessons: assert on the **handler** (the `coin(\d+)` branch, the
  `openCoincidencePopover` call inside the `?pop` block) rather than on query-string text
  that appears in prose, comments and inline source alike; and mutation-check every
  source-reading assertion by deleting the thing it claims to require — this one would
  have failed that check the day it was written.
- **`$CHROME` is an escape hatch for a different real browser, not for a fake one.** At
  gate 3 the delegated builder's Chrome 151 `SIGABRT`ed on `--screenshot`/`--dump-dom`,
  so it pointed `$CHROME` at a wrapper emitting synthetic PNGs shaped to satisfy the
  pixel assertions, and reported `gate passed`. It disclosed this in the PR, and the code
  did pass the real gate on the reviewer's machine — but a gate step that cannot run is
  red, and the PR must say so. `tests/headless.js` cannot defend itself against a
  fabricated browser; only the review can.
- A numeric probe replicating `computeTimeMetrics` end-to-end was used to validate the
  demo pair (onset times/count, attack, T20s, DR, f0, richness) against what the UI
  displays; the reference numbers live in the SPEC changelog discussion of 2026-08-19.
