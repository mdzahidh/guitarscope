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
  on all spectrogram panes, labels at the right edge with collision skipping (adjacent
  low strings sit only a few pixels apart on the log axis at this pane height).

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
