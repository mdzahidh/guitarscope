# GuitarScope architecture

Implementation knowledge that is not obvious from reading the code. For scope decisions
and their dates see SPEC.md's changelog; for the working brief see CLAUDE.md.

## Module boundaries (five script blocks inside index.html)

`index.html` is the only shipped artifact — no bundler, no imports. It contains five
`<script>` blocks whose order is a dependency order:

| # | Role | Key contents |
|---|------|-------------|
| 0 | **DSP core** — pure functions, no DOM, node-safe | `welch`, `smoothOct`, `bandPower`, `spectralCentroid`, `spectralTilt`, `detectPeaks`, `makeLogGrid`, `resampleToGrid`, `noteInfo`, `TUNINGS`, `stftBands`, `detectOnsets`, `amplitudeEnvelope`, `attackTimes`, `bandDecays`, `autocorrF0`, `harmonicProfile`, `dynamicsMetrics`, `sniffAudioInfo` |
| 1 | **Audio ingestion** | File → ArrayBuffer → header sniff → `OfflineAudioContext` decode at the sniffed native rate → channel/mid selection |
| 2 | **Glossary** | Term database (musician / scientific / formula registers), popover wiring, searchable panel |
| 3 | **Rendering** | Canvas scenes (spectrum, difference), axes/bands/tuning markers, collision-aware peak labels, legend, status chip, hit-rects for glossary clicks, PNG export composition |
| 4 | **App** | State, drag-drop, toggles, tone-character panel, comparison prose generator, demo synth, CSV/JSON snapshot exports, keyboard shortcuts |

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

JSON with `kind:"guitarscope-snapshot"`, `version:1`, both slots' file facts (name,
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

- `tests/dsp.test.js` (41 tests): physics identities (Hann gain/ENBW/scalloping),
  synthetic-signal metrics (band powers, centroid, tilt, decay slopes, dynamics),
  sniffer byte-fixtures for every container, tuning/note math, attack regression cases.
- `tests/make_samples.js`: regenerates the demo WAVs and round-trips them through the
  app's own sniffer.
- A numeric probe replicating `computeTimeMetrics` end-to-end was used to validate the
  demo pair (onset times/count, attack, T20s, DR, f0, richness) against what the UI
  displays; the reference numbers live in the SPEC changelog discussion of 2026-08-19.
