# Claude Rameau architecture

Implementation knowledge that is not obvious from reading the code. For scope decisions
and their dates see SPEC.md's changelog; for the working brief see CLAUDE.md.

## Module boundaries (five script blocks inside index.html)

`index.html` is the only shipped artifact — no bundler, no imports. It contains five
`<script>` blocks whose order is a dependency order:

| # | Role | Key contents |
|---|------|-------------|
| 0 | **DSP core** — pure functions, no DOM, node-safe | `welch`, `smoothOct`, `bandPower`, `spectralCentroid`, `spectralTilt`, `detectPeaks`, `makeLogGrid`, `resampleToGrid`, `noteInfo`, `TUNINGS`, `stftBands`, `detectOnsets`, `amplitudeEnvelope`, `attackTimes`, `bandDecays`, `autocorrF0`, `harmonicProfile`, `dynamicsMetrics`, `sniffAudioInfo`, `magmaColor`, `spectrogramLog`, `decimateEnvelope`; M2.5: `eqPeakingDb`/`eqLowShelfDb`/`eqHighShelfDb`/`eqShapeDb`, `EQ_DEVICES`/`EQ_DEVICE_BY_ID`, `lsqSolve`, `fitGraphicEq`, `fitParametricEq`, `eqSettingsResponseDb`, `sgramDifference`, `divergeColor` |
| 1 | **Audio ingestion** | File → ArrayBuffer → header sniff → `OfflineAudioContext` decode at the sniffed native rate → channel/mid selection |
| 2 | **Glossary** | Term database (musician / scientific / formula registers), popover wiring, searchable panel |
| 3 | **Rendering** | Canvas scenes (spectrum, difference, spectrogram, spectrogram-difference, envelope, EQ device face, EQ response), axes/bands/tuning markers, EQ-region lane, collision-aware peak labels, legend, status chip, hit-rects for glossary clicks, magma + diverging image renderers + colorbars, PNG export composition |
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
- Open-string fundamentals of the selected tuning are drawn as dashed horizontal markers
  on all spectrogram panes. Session 4 upgraded the labels from collision *skipping* to
  collision *stacking*: every string is named; labels that would overlap are pushed down
  to a minimum spacing and a short leader line reconnects a displaced label to its true
  frequency (adjacent low strings sit only a few pixels apart on the log axis).

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
- **Data colormaps deliberately do not theme.** The magma spectrogram and the diverging
  difference images are perceptual encodings, not chrome — they render as dark
  scope-screens inside both themes. This keeps the palettes defensible (magma's
  uniformity claims assume the dark ground) and makes PNG exports identical across
  themes. *(Session-7 refinement: the diverging endpoints default to amber/teal but
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
  drop-C-like tunings). The spectrogram's right-edge string markers are a *different
  axis* (log-f is vertical there) and stay always-on — the toggle governs the two
  frequency line plots only.
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
  the instrument selector was removed) stores the analysis-fact settings the user
  *chose* (intent, not data):
  `tuning`+`customOffset`, `a4`, `smooth`, `eqDevice`/`eqDir`, `vocab`,
  `strings`, `stringHarmonics` (6×4). `lm` (level-match) is
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
  ridges**, and the track hues are `STRING_COLORS`, a **data** palette: the overlay is
  pixel-identical in Bright and Dark.
  No labels — the right-edge string markers are the reference and the plot has no room.
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

## Testing strategy

- `tests/dsp.test.js` (100 tests): physics identities (Hann gain/ENBW/scalloping),
  synthetic-signal metrics (band powers, centroid, tilt, decay slopes, dynamics),
  sniffer byte-fixtures for every container, tuning/note math, attack regression cases,
  spectrogram invariants (0 dB sine anywhere on the log grid, NaN above Nyquist, hop
  bounding), magma colormap endpoints/monotonicity (within 8-bit quantization),
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
