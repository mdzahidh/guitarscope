# GuitarScope architecture

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
  lossy only if both files share it). `?guide` opens it headless.

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
- Bright accents darken to A `#a8690f` / B `#17786e` (the Dark ambers/teals fail
  contrast on cream); `--on-accent` provides badge-text color per theme.

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
- **Spectrogram zoom (e) is a crop, not a recompute.** `ZOOMS` gained `sga/sgb/sgd`
  (x in *display-time* seconds, y in Hz); the pane blits the cached colormap bitmap
  with a zoom-adjusted destination rect. Unzoomed renders are pixel-identical to the
  previous build. Deep zooms therefore blur rather than resolve — an honest tradeoff:
  recomputing the STFT per window would change the analysis parameters mid-view and
  break "every visible number defensible" (the footer states one FFT size). The
  gesture layer is the line-plot `attachZoom` with a log-y branch (Hz axis pans/zooms
  geometrically, like the log-f line plots).
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
  toggle — it's viewer preference, not analysis state. `?strings=1|0` and
  `?mode=electric|acoustic` exist for headless capture; the latter because instrument
  mode is a user toggle (never detected), so tests need a way to set it.

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
  The chevron itself is a 24×24 bordered button in the `.iconbtn` visual family;
  the previous borderless 16px glyph failed the "would a user even notice it"
  test that motivated user item f.
- **Magnify buttons must not be hover-revealed.** They were `opacity:0` until
  `.plotwrap:hover` — invisible chrome scores zero on discoverability, and on
  touch devices it never appears at all. Always-visible now; the cost is one small
  bordered button per plot corner, accepted deliberately.
- The audit removed a dead `.plotwrap.hoverable{cursor:crosshair}` rule — the
  class was never applied anywhere; `attachCrosshair` sets the inline cursor.

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

JSON with `app:"GuitarScope"`, `type:"snapshot"`, `version:1`, both slots' file facts (name,
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
- zsh: `echo =====` triggers globbing errors; quote such literals in shell commands.

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
- A numeric probe replicating `computeTimeMetrics` end-to-end was used to validate the
  demo pair (onset times/count, attack, T20s, DR, f0, richness) against what the UI
  displays; the reference numbers live in the SPEC changelog discussion of 2026-08-19.
