# GuitarScope — Specification

This document preserves the original commissioning prompt **verbatim** (never edit it), followed by an
append-only changelog of scope decisions. New decisions go at the bottom of the changelog with a date.

---

## Original prompt (verbatim, received 2026-08-18)

> Build me a single-page web app called GuitarScope — a guitar-oriented audio spectrum comparison tool. Plain HTML/JS/CSS, no build step, no server — one .html file I can open anywhere, fully offline. Web Audio API for decoding, DSP in vanilla JS typed arrays, canvas rendering.
>
> DESIGN BRIEF (as important as the DSP): this is a scientific instrument for a musician, and it should feel like one — elegant, calm, and beautiful, reflecting the artistic nature of music while staying rigorously accurate. Think "laboratory instrument designed by a luthier": a refined dark theme, one restrained accent palette (each guitar/snapshot gets a distinct, harmonious color), generous spacing, a single elegant sans-serif for UI with tabular numerals for readouts. Curves drawn with subtle anti-aliased weight and gentle area fills; smooth animated transitions when curves update or overlays toggle (150–250 ms ease, never bouncy). Axes, gridlines, and labels understated but always readable; hover anywhere on a plot shows a precise crosshair readout (frequency, note name + cents, dB per curve). No chartjunk, no 3D, no glow effects — beauty through typography, spacing, color discipline, and motion restraint. Empty states, drag-over states, and errors all designed, not defaulted. Every number visible in the UI must be scientifically defensible; every pixel should look intentional.
>
> SAMPLE-RATE POLICY: always read from the source, never user-configured. Decode each file in an OfflineAudioContext at the file's native rate (avoid decodeAudioData's silent resampling to the context rate); use each file's own rate in its frequency math; display detected rate/bit-depth/channels as read-only info per file. Live mode later reads audioContext.sampleRate. If a rate can't be determined, refuse with a clear error rather than assume. (Rule of thumb baked into the app: facts come from the data, intent comes from the user — tuning is user intent; sample rate is data.)
>
> M1 — FILE COMPARE (build fully, then stop so I can test):
> - Drag-and-drop TWO audio files (WAV/AIFF/MP3/M4A), e.g. "LP Modern bridge.wav" vs "SG midnight bridge.wav"; label by filename, assign colors.
> - Long-term average spectrum per file (Welch: 8192-sample Hann windows, 50% overlap), overlaid on log frequency axis 60 Hz–20 kHz, dB vertical, adjustable octave smoothing (off, 1/12, 1/6, 1/3).
> - DIFFERENCE view: A−B in dB around a zero line.
> - Auto level-match (normalize total energy, toggleable).
> - TUNING SELECTOR: E standard, Eb, D standard, Drop D, DADGAD, custom semitone offset + A4 reference — drives vertical markers at open-string fundamentals with note names.
> - Labeled shaded bands (Low end 60–200, Warmth/Mud 200–500, Body 500–1.2k, Presence 2k–5k, Air 5k–12k) + per-band energy table for A, B, delta.
> - Resonance-peak detector annotating major peaks with frequency + nearest note.
> - Export: publication-quality PNG, CSV of curves, reloadable JSON snapshot.
>
> M1.5 — TONE CHARACTER PANEL (part of the core compare experience): beyond raw curves, compute and display named tone descriptors per guitar, each with a real number behind it: Brightness (spectral centroid in Hz + nearest note), Warmth (200–500 Hz energy ratio), Fullness (low-end ratio), Spectral tilt (dB/octave slope), Harmonic richness (harmonic-to-fundamental ratios and even/odd harmonic balance from sustained-note segments), Attack (onset sharpness), Sustain/Tightness (per-band decay times), Dynamic range. Present A vs B as an elegant paired profile (radar or slider-pair layout) plus an auto-generated plain-language comparison ("A is measurably brighter: centroid 2.4 kHz vs 1.9 kHz; B blooms in the low-mids: 310 ms decay vs 180 ms") where every phrase links to the measurement that produced it.
>
> ACOUSTIC GUITAR SUPPORT (first-class, not an afterthought): handle mic-recorded acoustic files — stereo files (analyze mid/sum or a selected channel), a noise-floor indicator with suggested analysis high-pass, and acoustic-specific annotations: detect and label the body's Helmholtz/air resonance (typically ~90–120 Hz) and main soundboard resonances by name, since these define an acoustic's character the way pickups define an electric's. Tuning markers and band interpretation adjust appropriately in acoustic mode (e.g. "Body/Boxiness" language instead of electric "Mud").
>
> GLOSSARY / QUERYABLE TERMINOLOGY (a core feature): every guitar term the app prints — Warmth, Mud, Presence, Air, Brightness, Tightness, Bloom, Attack, Sustain, Spectral centroid, Helmholtz resonance, Harmonic series, Decay time, etc. — is interactive. Clicking/tapping a term opens an elegant popover with three registers: (1) what musicians mean by it, (2) the scientific definition, (3) the exact formula/measurement this app uses for it, with the current values for the loaded guitars. Include a searchable glossary panel listing all terms. Annotations on plots use this same terminology consistently, so the visualizations teach the vocabulary while measuring it.
>
> M2 — TRANSIENT/DECAY: onset detection, spectrogram (perceptually-uniform colormap, e.g. magma — never rainbow), per-band attack/decay metrics ("tightness"), A/B envelope overlay.
>
> M3 — LIVE MODE: getUserMedia input, device/channel picker, realtime FFT with exponential/infinite averaging + max-hold, freeze-to-snapshot into the same library.
>
> M4 — CHAIN MEASURE: pink noise/log sweep out, capture return, live transfer function, loopback calibration.
>
> Honesty requirements: window/overlap/averaging parameters visible in a footer; consistent dB reference across views; smoothing state always indicated on the plot. Keyboard shortcuts for freeze/snapshot/view toggles.
>
> PROJECT CONTINUITY (standing requirement, not a milestone): this project will span multiple AI sessions, possibly different AI tools. Maintain three living documents from the first commit: (1) CLAUDE.md at the project root — the working brief a fresh session needs: what the app is, current milestone status, file map, how to run/test, house rules (sample-rate policy, "facts from data / intent from user", design-brief essentials, DSP parameter choices). (2) SPEC.md — this full prompt verbatim plus an append-only changelog of scope decisions; never edit the original text. (3) docs/ARCHITECTURE.md — implementation knowledge not obvious from code: module boundaries, the DSP pipeline (decode → window → FFT → average → smooth → render) with the why behind parameter choices, canvas rendering approach, snapshot data structures, browser quirks encountered, and abandoned approaches with reasons so future sessions don't retry dead ends. Update all three at every milestone boundary and after significant decisions, unprompted. Initialize a git repo and commit at each working state with descriptive messages.

---

## Changelog (append-only)

### 2026-08-19 — Initial build scope (session 1)
- **Scope of first deliverable:** M1 + M1.5 + acoustic support + glossary built together, then stop for
  user testing. Rationale: the prompt marks M1.5 as "part of the core compare experience", acoustic
  support as "first-class, not an afterthought", and the glossary as "a core feature" — all three are
  woven into M1's UI (band labels, annotations, prose), so shipping M1 without them would mean
  rebuilding its surface. M2/M3/M4 deferred as specified.
- **FLAC accepted** in addition to WAV/AIFF/MP3/M4A: browsers decode it natively and its header
  carries an unambiguous sample rate; costs ~10 lines. Listed formats remain the advertised set.
- **dB reference:** all spectra displayed as dB re full-scale sine (a 0 dBFS sine peaks at ~0 dB on the
  plot). Welch power average with Hann coherent-gain correction. Stated in the footer.
- **Metrics integration range is 60 Hz–20 kHz** everywhere (band energies, level match, centroid,
  ratios). Consequence: sub-60 Hz rumble can never contaminate readouts; the noise-floor panel still
  reports rumble and suggests a recording-side high-pass, but no analysis filter is applied (advisory
  only). This satisfies "suggested analysis high-pass" without adding a signal-mangling control.
- **Instrument mode (Electric/Acoustic) is a user toggle**, not auto-detected — per the house rule,
  what kind of instrument was recorded is intent/knowledge the user has; detection would be a guess.
- **Difference view fill convention:** area above 0 filled in A's color (A louder), below 0 in B's color.
  The same convention colors Δ columns in tables.
- **Resonance-peak detection runs on a fixed 1/6-octave-smoothed curve** regardless of display
  smoothing, so annotations don't dance when the user changes smoothing. Indicated in ARCHITECTURE.md.
- **Band gap 1.2–2 kHz kept as specified** (Body ends at 1.2k, Presence starts at 2k); the unshaded gap
  is rendered honestly rather than papered over.
- **Tone-descriptor slider-pair layout chosen over radar**: axes with real units beat a radar's
  normalized polygon for "every number defensible".
- **Per-band decay bands for M1.5:** Lows 60–200 Hz ("Tightness"), Mids 200 Hz–1.2 kHz ("Sustain"),
  Highs 2–6 kHz. M2 will deepen this with full envelope overlays.
- **Demo pair:** built-in Karplus–Strong synthesized "bright vs warm" pair (44.1 kHz vs 48 kHz to
  exercise the differing-rate path) reachable from the empty state; also used for automated smoke tests.
  Matching WAV files generated into `samples/` for file-drop testing.

### 2026-08-19 — DSP verification pass (session 1, continued)
- **Attack is measured relative to the pre-onset envelope minimum**, not to absolute
  10 %/90 % of peak. With absolute thresholds a previous note ringing above the 10 % line
  means the crossing never happens and the measurement silently degrades to the search-window
  width (a constant, wrong 120 ms). The rewritten `attackTimes` finds the local envelope peak
  within 60 ms of each onset, the minimum in the 120 ms before that peak, and times the
  10→90 % rise between those two levels; onsets whose envelope rises less than 5 % are skipped
  as unmeasurable. Regression-tested with a synthetic ringing-background envelope.
- **Demo/sample synth notes end in a 60 ms cosine fade** and the phrase starts with 0.12 s of
  silence. A Karplus–Strong buffer truncated mid-ring is a step discontinuity — the click
  registered as three spurious onsets, and with no lead-in the true first onset at t=0 was
  undetectable. Both the in-app synth and `tests/make_samples.js` carry the fix (they must stay
  in lockstep; the WAVs regenerate deterministically from the same seeds).
- **Sustained-note pitch is estimated at the temporal middle of the segment**, not at its
  start. Right after an onset, earlier notes still ring, and the autocorrelation of a two-note
  mixture peaks at the notes' common period — for the demo's E4 over B3 (a 4:3 interval) that
  is a subharmonic at ~82 Hz, which then poisoned the harmonic-profile search. Mid-segment the
  sustained note dominates and both demo files lock 330 Hz at confidence 1.000.
  `harmonicProfile` still averages the whole segment.
- **Demo seeds are curated (42424243 bright / 20260820 warm), and that is presentation, not
  physics.** A seed scan showed iid-noise Karplus–Strong strings expect ≈ +9.5 dB harmonic
  richness with wide per-seed variance (measured −3 to +17 dB); the original bright seed was an
  atypically harmonic-poor draw, which inverted the intended bright-richer-than-warm story.
  Seeds were chosen so the demo pair's measurements tell the story the names promise. No DSP
  was changed to achieve this.
- **Spectrum peak labels are collision-aware:** the legend and smoothing chip register their
  rectangles first, and each peak label tries its preferred side of the dot, then flips and
  steps away until clear. Prevents label-on-legend pile-ups at the low-E/A resonances without
  culling any annotation.

### 2026-08-19 — M2: spectrogram + envelope overlay (session 2)
- **M2 built on explicit user request** ("implement M1.5 and M2" — M1.5 was already shipped, so the
  standing "stop for user testing" gate applied only until this instruction). M2 deliverables per the
  prompt: onset detection (was already computed for M1.5; now visualized), spectrogram, per-band
  attack/decay (already in the tone panel; deepened by the envelope view), A/B envelope overlay.
- **Spectrogram maps FFT bins to a 256-cell log-frequency grid (60 Hz–20 kHz) by MAX-pooling, not
  averaging.** At high frequencies one log cell spans many FFT bins; a mean would dilute a pure sine
  by 10·log10(binsPerCell) — up to ~15 dB — making the same tone read quieter the higher it sits.
  Max preserves "a full-scale sine reads 0 dB anywhere on the grid," keeping the colorbar defensible.
  Stated on the plot and in the footer as "max per log cell". 2048-pt Hann frames; hop auto-widens so
  a file never produces more than ~1400 columns.
- **The dB reference stays the full-scale-sine family across all views:** spectrogram cell dB uses the
  same per-frame power convention as Welch; envelope dB is 20·log10 of the peak-follower amplitude.
  One reference, stated once in the footer, no per-view recalibration.
- **A and B share one spectrogram color scale, and level-match is deliberately NOT applied** — the
  spectrogram shows what was recorded; the card subtitle says so. Scale top = joint hottest cell
  rounded up to 5 dB, floor = top − 80 dB. Colormap is magma (per spec: never rainbow); each slot's
  rendered image is cached and only re-rendered when the shared scale changes.
- **Cells above a file's Nyquist are transparent, not black** — absence of measurement, not silence —
  with a dashed line and "above fs/2 — not measured" label when Nyquist falls below 20 kHz. (Neither
  demo file triggers it: 44.1 k and 48 k both have fs/2 above the 20 kHz plot ceiling.)
- **Envelope overlay aligns each file at its own first detected onset (t = 0)**, so A/B decay shapes
  compare directly even when lead-in silence differs. Fixed −60…0 dB axis; detected onsets drawn as
  per-curve tick lanes; envelopes max-pooled to ≤4096 points for drawing (peaks never averaged away).
- **Snapshot slots degrade honestly:** a reloaded snapshot has no audio, so the spectrogram/envelope
  panes for that slot are replaced by a note saying the original audio was not stored — never a
  recomputed-looking plot from stored aggregates.
- **Glossary grew three Method entries** (spectrogram, onset, envelope) with live values, and the
  bloom entry now points at the Envelope view where a bloom is directly visible.

### 2026-08-19 — M2.5: comparable spectrograms, EQ vocabulary lane, EQ match (session 3)
- **M2.5 built on explicit user request** (three asks in one message): (a) make the two
  spectrograms comparable — a difference view, a level-match toggle, and open-string frequency
  markers for the selected tuning; (b) annotate the spectrum with the colloquial EQ regions
  guitarists use (low end, low mids, …); (c) an EQ-match feature that computes the settings that
  reshape guitar A toward guitar B (or the reverse) on popular EQ units — Boss GE-7, MXR M108S
  Ten Band EQ, Empress ParaEQ MkII Deluxe, Logic Pro Channel EQ — rendered to resemble the
  selected device's physical panel, GE-7 default.
- **Spectrogram level-match is a toggle, not the new default.** The M2 decision ("the spectrogram
  shows what was recorded") stands as the default; the toggle folds the spectrum card's existing
  level-match offset into pane B's image, the shared color scale, the crosshair readout (labeled
  "LM"), the card sub line, and the footer — so the displayed number always matches the color.
- **Spectrogram difference pane aligns A and B at their first onsets** (same convention as the
  envelope overlay) and shows per-cell A−B on a diverging neutral→amber/teal map (amber = A
  louder, teal = B louder — the slot accents). Display scale = 98th percentile of |Δ| snapped up
  to 3 dB, so a few extreme cells can't wash out the map; cells unmeasured on either side stay
  transparent with the dashed "not measured" boundary. Level-match and difference toggles are
  disabled for snapshot slots (no audio to recompute from).
- **The EQ-region lane is annotation, not measurement.** Regions (60–250 low end, 250–800 low
  mids, 800–2.5k mids, 2.5–5k upper mids, 5–10k highs, 10–20k air) are colloquial conventions
  with no standards body behind them; they are drawn as a dimension-line lane in the top margin
  of the spectrum and difference plots, and each label opens a glossary entry that says exactly
  that — while still reporting the live measured energy share per region. The M1 shaded analysis
  bands (which do drive numbers) are untouched; the two vocabularies coexist deliberately.
- **EQ match fits the 1/6-octave-smoothed difference, not the raw curve.** The raw A−B grid
  difference is a comb of harmonic peaks (the two guitars' partials interleave); fitting it would
  chase noise no EQ can or should correct. The fixed 1/6-oct curves (already computed for peak
  detection) are the defensible "tonal envelope" target. Fit runs on 140 log-spaced points
  (every 5th grid point) — plenty against models with ≤ 10 bands.
- **EQ bands are modeled as RBJ analog-prototype magnitude responses** (peaking, low/high
  shelf) — the standard biquad family — with device constraints honored: GE-7 7 fixed bands
  ±15 dB Q≈1.41, M108S 10 fixed bands ±12 dB, ParaEQ 3 sweepable peaking bands with the
  pedal's 3-position Q switch (0.7/1.4/2.8) and a boost-only 0…+30 dB level, Logic Channel EQ
  low shelf + 4 peaking + high shelf with sampled Q choices and ±24 dB output gain. Graphic
  fit = least-squares init + coordinate descent; parametric fit = greedy scan over log-spaced
  centers × Q choices with projected gain, then refinement. Deterministic; recovers in-model
  targets to < 0.15 dB (tested).
- **The device trim absorbs the broadband level difference** — level-match is deliberately not
  pre-applied to the EQ target, because a real pedal's level knob is exactly where that gap
  belongs. The one exception is ParaEQ's boost-only trim, which cannot cut; the fitter clamps
  it and the residual reports the consequence.
- **Honesty telegraphed on the panel:** the face is captioned "modeled panel — controls show
  the fitted settings", the response plot overlays the dashed target against the achieved
  modeled response with a residual-RMS chip, and the card note states the model, the fit
  method, and "real hardware differs from the model — treat the settings as a starting point,
  not gospel." The device face uses neutral ink (a pedal is not a guitar); only the achieved
  response curve takes the destination guitar's accent color.
- **Direction default is A → B** ("make A sound like B"), matching the user's phrasing;
  direction and device round-trip through JSON snapshots, and snapshots' stored 1/6-oct curves
  are enough to recompute the fit, so EQ match works on reloaded snapshots too.
- Block-0 test suite grew 57 → 100 (RBJ identities: exact center gain, asymptotes, boost/cut
  reciprocity; fitter recovery; sgram-difference alignment and NaN propagation; diverging
  colormap endpoints).

### 2026-08-19 — M2.5 follow-ups: usability batch (session 4)
- **Six requests in one user message, all built:** (a) spectrogram time-axis alignment options
  plus string-frequency markers on the individual panes; (b) every plot magnifiable; (c) the
  colloquial EQ regions added to the Band Energy table; (d) the whole interface works with a
  single guitar, two-guitar features auto-disabled; (e) a prominent recording / signal-chain
  guide; (f) color themes — the existing look named "Dark", a new cream "Bright" theme, and
  **Bright is the default**.
- **Spectrogram time axis is a three-way choice: Free / File time / First onset.** Free (default,
  the M2 behavior) lets each pane fill its width with its own duration. File time puts both
  panes on one shared seconds axis from file start; First onset shifts each pane so t = 0 sits
  at that file's first detected onset — the same convention the envelope overlay and difference
  pane already used. The seg is disabled until both guitars are loaded, the active mode is
  printed in the card sub line, and the choice round-trips through JSON snapshots
  (`?sgalign=file|onset` is the headless test hook).
- **String markers on the spectrogram panes reuse the M2.5 difference-pane markers:** dashed
  open-string fundamentals of the selected tuning, every string labeled. Low strings crowd on a
  log axis, so labels stack downward with a minimum spacing and a short leader line reconnects a
  displaced label to its true frequency.
- **Magnify re-renders, never rescales.** Each plot card has a magnify button that opens the
  same scene function (spectrum, difference, either spectrogram, spectrogram difference,
  envelope, EQ face, EQ response) into a near-fullscreen overlay canvas at native resolution —
  live state, crisp text, no bitmap stretching. Esc / ✕ / backdrop click closes; `?mag=<key>`
  is the test hook. Fixing this surfaced a rAF race (a pending coalesced redraw could swallow
  the animation loop's frame request, leaving pane B's spectrogram un-revealed); documented in
  ARCHITECTURE.md.
- **The Band Energy table now has two sections: the named analysis bands (unchanged, still
  drive all metrics) and the EQ-vocabulary regions** (60–250 low end, 250–800 low mids,
  800–2.5k mids, 2.5–5k upper mids, 5–10k highs, 10–20k air — the same regions as the M2.5
  spectrum lane). The regions tile the whole 60 Hz–20 kHz range so their shares sum to ≤100 %;
  the note under the table says which vocabulary is which.
- **Single-guitar mode is gating, not a mode switch.** Everything that reads one file (spectrum,
  bands, tone character, spectrogram pane, envelope, exports) works with either slot alone;
  everything that needs two (difference toggle, level-match, spectrogram difference /
  level-match / alignment seg, EQ match card, Δ columns, comparison prose) disables or hides
  automatically and returns when the second file lands. `?demo=a|b` loads half the demo pair
  for testing.
- **The recording guide is a topbar button ("How to record"), not buried help.** One rule up
  top — change only the guitar — then concrete signal-chain recipes (electric DI recommended,
  mic'd amp with caveats, acoustic mic placement), level-setting discipline, what to play, and
  what to avoid (no compression/EQ/reverb, no mixed DI-vs-mic comparisons, lossy formats only
  if both files share the fate). Also linked from the empty state; `?guide` opens it headless.
- **Themes: Bright is the default; plot chrome themes, data colormaps do not.** The cream
  Bright palette lives on bare `:root`, the original panel look under `html[data-theme="dark"]`.
  All canvas chrome colors route through CSS custom properties (new `*-rgb` triplets feed alpha
  composites via one `cssRGBA` helper), so both themes share every drawing routine. The magma
  spectrogram and the diverging amber/teal difference images are **data colormaps and stay dark
  scope-screens in both themes** — perceptual-uniformity claims justify the palette, and keeping
  them fixed means cached images survive a theme switch and PNG exports read identically in
  either theme. Bright's accents darken to A `#a8690f` / B `#17786e` for contrast on cream.
  Choice persists to localStorage; `?theme=bright|dark` wins over storage for headless tests.
- Block-0 DSP untouched this session; suite stays at 100 passing. All six features verified by
  headless screenshots in both themes, including single-guitar and magnify views.

### 2026-08-19 — Interactive zoom on the line plots (session 5)
- **User request (a):** interactive zoom in/out on the line plots, including drawing a box to
  select the region. Built for all four line plots: spectrum, difference, envelope, EQ-match
  response. Part (b) of the same message (frequency-vocabulary annotation lanes) is
  deliberately *not* built yet — the user asked to discuss it first.
- **Gestures:** drag a box to zoom to it — a box thinner than 8 px on one axis zooms only the
  other axis (classic x-only / y-only select); shift+drag pans; ctrl/⌘+wheel (macOS trackpad
  pinch arrives as ctrl+wheel) zooms x around the cursor and snaps back to null at full range;
  double-click or the reset-zoom button (appears only while zoomed) restores full view. The
  magnified overlay supports all the same gestures and **shares the underlying view's zoom**,
  since both render from the same model builders.
- **Zoom is display-only and always disclosed.** State lives in data units per plot
  (`ZOOMS{}` — Hz for log-frequency plots, display-time seconds for the envelope, dB for y);
  the model builders bake it into the scene models. Metrics, the band table and the tone panel
  never read it, and the active window is printed in the plot's status chip
  ("zoom 200 Hz – 2.00 kHz · −70 … −30 dB"), so a screenshot or PNG export of a zoomed plot
  still carries its own provenance. Min spans: ×1.05 geometric (log-f), 50 ms (time), 1 dB.
- **Rendering under a partial view:** curves are canvas-clipped at the x plot edges and value-
  clamped in y; band shading, tuning markers and the EQ lane clamp into the window; axis tick
  generation falls back to exact endpoint labels at full range so the default look is
  unchanged. Y ticks pick a 1-2-5 step from the window height.
- A byproduct fix: `drawStatusChip` now sets `lineWidth=1` explicitly — the envelope pane's
  chip border had silently inherited the 1.6 px envelope-curve stroke (canvas state leak);
  chips now render uniformly on every pane.
- New headless test hooks: `?zoom=key:x0,x1[,y0,y1]` (key = spec|diff|env|eqresp) and `?diff`
  (turns the difference pane on, since it defaults off). Verified by 100/100 DSP tests plus
  headless screenshots of all four zoomed plots (both themes) and the magnified overlay, and a
  pixel-regression compare against the previous commit (clean except the intended chip border).
