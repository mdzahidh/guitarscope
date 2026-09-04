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

### 2026-08-19 — Frequency-vocabulary lanes (session 6)
- **User request (b), decided after discussion:** of the four proposed vocabularies the user
  chose options 1 (guitar anatomy), 2 (solo tone-shaping words) and 3 (band-mix zones; option
  4, amp/cab layer, dropped for now), and added a simpler colloquial EQ vocabulary
  (low end / low mids / mids / …) **as #1 and the default**. Option 3 was specified to label
  each zone with the dominant instrument/component living there plus whether guitar typically
  keeps or cuts it, so a semi-professional guitarist can roughly tune a signal chain and EQ
  from the plot.
- **Built as one selectable lane**, not stacked lanes: a "Regions" segmented control on the
  spectrum card swaps the annotation lane between **EQ speak** (default; the former M2.5
  EQ-region lane verbatim), **Anatomy** (open strings 82–330, fretted fundamentals to the
  24th-fret E6 ≈1.32 kHz, pick attack 2–5k, string zing 5–10k, air, plus a second lane row for
  the overlapping body & warmth 200–500 and the harmonics-only ≥1.32 kHz fact), **Solo EQ**
  (rumble/mud/boxy/honk/harsh/bite/fizz/air with honest gaps where folklore has none), and
  **Band mix** (kick CUT, bass THIN, mud pile-up CUT, guitar core KEEP, vocals CARVE, attack
  KEEP, cymbals+air ROLL OFF — the KEEP zones print in ink rather than dim). The difference
  pane and magnify overlay follow the same selection.
- **Annotation only, same as the original EQ lane:** the M1 shaded bands still drive every
  number; the Band Energy table's EQ rows stay tied to the EQ-speak set regardless of the
  lane selection. All 22 new regions are click-to-glossary with entries (three new categories:
  Guitar anatomy, Solo EQ words, Band-mix zones) that state boundary folklore honestly and
  show a live measured band share for reference.
- Selection persists to localStorage (`gsVocab`, written only on explicit clicks so test hooks
  and snapshot restores don't overwrite the preference), rides snapshot JSONs, and has a
  `?vocab=eq|anatomy|solo|mix` headless hook. Verified: 100/100 DSP tests (block 0 untouched),
  headless screenshots of all four lanes (Bright + Dark), the two-row anatomy lane clear of
  the tuning markers, magnify, and the difference pane following the selection.

### 2026-08-20 — UX batch a–k: regions everywhere, compare-on defaults, sgram zoom, user colors (session 7)
- **User request, nine items (a–g, i) plus two added mid-session (j, k),** with a closing
  question asking for UX simplification suggestions (answered in the session report, not
  built). One commit per coherent item group:
- **(b)+(i)+(c) — dropdowns + compare-on defaults** (`fcb2c1d`): the Regions vocabulary
  selector and the EQ Match device chooser became `<select>` dropdowns (both lists will
  grow). When both slots fill, the four comparison toggles (level-match, difference,
  spectrogram level-match, spectrogram difference) now switch on automatically — two
  sources means comparison is the intent. A toggle the user flipped explicitly in the
  session is never overridden; snapshots pre-prime the latch so saved settings stay
  authoritative; dropping to one source re-arms it. Snapshots now carry the Difference
  toggle.
- **(a)+(d) — the selected region vocabulary drives shading and the Band Energy table**
  (`5cd6b64`): the M1 five-band shading + bottom label row is gone; the active lane's
  regions shade the spectrum plot, so annotation and shading always agree. Band-mix
  regions tint by role (cut = red, keep = green, thin/carve/roll-off = violet) and labels
  carry the role, e.g. "GUITAR CORE (KEEP)". The Band Energy table follows the selected
  vocabulary (group header names it; per-vocab footnote explains tiling/overlap); the
  `EQ_REGIONS` alias and `bandsFor()` were removed. The Anatomy vocabulary is
  tuning-reactive: bounds resolve against the current tuning/A4 (`VOCAB_TUNING`),
  refreshed on every tuning change and snapshot restore. Tone-panel physics bands are
  unchanged — descriptors stay pinned to fixed physical ranges.
- **(f) — spectrogram string labels moved outside the plot** (`038c085`): right margin
  widened (64 → 98 px), colorbar pinned where it was, labels sit in the new gap with
  leader ticks when stacking displaces them; they already follow the tuning selector.
- **(e) — spectrogram zoom** (`18e1bdd`): all three spectrogram panes accept the same
  gestures as the line plots (box-select, shift-pan, ctrl/⌘-wheel on time, double-click/
  chip reset). New `ZOOMS` keys `sga|sgb|sgd` (x = display-time s, y = Hz, `?zoom=`-able).
  The colormap image is blitted with a zoom-adjusted destination rect — a crop of the
  already-rendered image, not an STFT recompute, so deep zooms interpolate rather than
  gain resolution (disclosed here; acceptable for navigation). Unzoomed output verified
  pixel-identical to the prior commit.
- **(g) — obvious file-card actions** (`5792225`): empty cards pair the drop hint with an
  explicit "Open file…" button; loaded/error cards use labeled, bordered "⟳ Replace" /
  "✕ Clear" buttons instead of borderless icons.
- **(j) — tone-character rows read as true axes** (`0617794`): the flanking columns now
  hold the real axis min/max, always increasing left→right; each guitar's value rides
  with its dot (A above, B below). No metric changed — this was a layout fix; the
  underlying axes were already oriented consistently.
- **(k) — user-selectable guitar colors** (`1ddee78`): clicking a loaded card's letter
  chip opens a color popover (native picker + "Theme default" reset). Picks are stored
  **per theme** in localStorage `gsColors` (a color chosen for cream is not assumed
  legible on dark), applied as inline `--slot-a/--slot-b` overrides so every reference
  follows: curves, legends, peak labels, tables, tone dots, envelope, EQ response,
  markers — and the diverging difference colormap, whose endpoints follow the picks
  after a luminance lift (Rec.709, target 0.55) so the pane stays a legible dark scope
  screen in both themes. Stock defaults are bit-exact when no override is set (DSP
  tests untouched). Decision: **snapshots deliberately do not carry user colors** —
  they are viewer preference, not analysis state. Headless hooks `?ca=`/`?cb=`.
- Colormap-rule interpretation recorded: "data colormaps never theme" still holds — the
  magma spectrograms never change, and the diverging difference never follows the
  *theme*; it now follows an explicit *user pick* for the two guitars, which is the
  same identity the rest of the UI uses. See ARCHITECTURE.md for the rationale.

### 2026-08-20 — UX batch 2: defaults, verdict, audition, playback, disclosure (session 8)
- **User message, three direct items (a–c) plus verdicts on the seven UX suggestions
  from the session-7 report:** #1 rename A/B → **rejected** ("names of the file can be
  messy and long" — A/B stays); #2 verdict strip, #3 audition by region, #4 EQ-match
  exportable settings, #5 progressive disclosure, #7 loudness-matched playback → all
  **built this session**; #6 task-based entry points → **deferred to M3** by the user.
- **(a)+(b)+(c) — distinct default accents, Band-mix default, stronger shading**
  (`566cf02`): default guitar colors pushed apart in hue and chroma — Bright A
  `#c05f04` / B `#0c6e80`, Dark A `#f0a13e` / B `#44c2d4`; the diverging-difference
  default endpoints follow the new dark accents (user picks still override). Default
  region vocabulary is now **Band mix**, with a one-time localStorage migration
  (`gsVocabMig`) clearing a stored pre-flip "eq" so the new default actually shows —
  explicit choices still stick. Region shading roughly doubled (keep 0.14, other roles
  0.11, neutral 0.06/0.03) and is now drawn on the Difference plot too, so annotation
  and shading agree there as well.
- **#2 — "At a glance" verdict strip** (`a5af9fa`): a plain-language summary card above
  the spectrum whenever anything is loaded. Both slots: broadband level gap + whether
  level-match corrects it, the widest region gap in the active vocabulary (computed
  with the Band Energy table's exact math so the two can never disagree), and the
  strongest tone contrast (same ranked candidates as the tone panel's prose, via shared
  `proseCandidates()`). One slot: centroid, tilt, longest note, and a drop-a-second-file
  hint. Guitar names render in slot colors; terms link to the glossary.
- **#4 — EQ match "Copy settings"** (`f0cd695`): header button copies the fitted
  settings as fixed-width plain text (device, direction, per-band rows, trim, residual,
  RBJ caveat) from the same `eqFitData()` the device face draws — panel and export can
  never disagree. Clipboard API with textarea fallback; "Copied" flash.
- **#3 — audition by region** (`f7b9ab2`): every region popover (lane labels, plot
  shading, Band Energy rows) gains per-slot play buttons that band-pass the **analyzed
  mono mix** (4th-order Butterworth, 24 dB/oct) to the region's tuning-resolved bounds,
  level-match applied to B when active — you hear what the analyzer sees. One playback
  at a time; stops on popover close, data change, Esc, or natural end. `?pop=<glosskey>`
  headless hook with a `popPinned` guard (headless capture fires a resize that
  otherwise closes popovers).
- **#7 — loudness-matched playback** (`7dcd2bb`): each loaded card gets a Play/Stop
  button playing the whole take full-range through the same engine, so level-match gain
  lands on B exactly as in the plots and the applied dB is printed on the button while
  playing ("■ Stop · +3.1 dB"). Stops on lm toggle (printed gain would go stale), Esc,
  data change, or natural end. Snapshot slots (no audio) get no button.
- **#5 — progressive disclosure** (`0a66086`): Difference, Band energy, Tone character,
  EQ match, Spectrogram, and Envelope fold to their header line via a left-of-title
  chevron; the verdict strip and the Spectrum never fold. **EQ match, Spectrogram, and
  Envelope start folded** so a fresh comparison reads verdict → spectrum → difference →
  bands → tone with the deeper instruments one click away. A folded card's whole header
  reopens it; an expanded header keeps its live controls, so only the chevron folds.
  Folded panels skip model building and canvas work; unfolding redraws. localStorage
  `gsCollapse` stores **only explicitly clicked panels**, so future default changes
  still reach untouched ones; snapshots don't carry fold state (reader preference, not
  analysis state). `?open=all|key,key` session-only hook.
- Decision: playback everywhere sources the analyzed mono mix, never the original
  multichannel file — the tool's claim is "this is what the analyzer sees," and a
  stereo original would sound different from every number on screen.

### 2026-08-20 — UX batch 3 staged as submilestones M2.6a–e (session 9)
- **User message with eight items (a–h), to be staged into submilestones, merged into
  this SPEC, then executed one at a time with a commit per submilestone:**
  - (a) Level-match is global — even the card Play buttons obey it — so its UI must
    live somewhere that makes that scope obvious; audit every setting's placement so
    position expresses scope.
  - (b) The "Difference" toggle is probably superfluous — the Difference card already
    only appears with two inputs.
  - (c) Open-string labels on the top axis + frequency labels on the plot are
    cluttered. Replace with a **toggle** for open-string labels on the **bottom** axis
    (no frequency labels on the plots), each label clickable for detail docs (e.g.
    D#2 → exact frequency).
  - (d) Label region start/end frequencies directly below the lane ticks in a smaller
    but clearly readable font, no overlaps — Guitar anatomy is the stress case.
  - (e) Elements that open documentation on click should signal it with a meaningful
    mouse cursor.
  - (f) The collapse/expand control is too small to notice — make it obvious; audit
    whether each UI element's presentation expresses its function.
  - (g) Every card gets meaningful export/save: visualization cards add a **300 dpi
    PNG** (clean, reflecting exactly what the card shows); line-plot cards add **JSON**
    (guitar details, tuning, current region definitions, enabled visualization
    options) and a simpler **CSV** of the plot data.
  - (h) EQ match keeps "Copy settings" and adds a more detailed **JSON** export.
- **Staging (executed in this order, one commit each):**
  - **M2.6a — control scope & placement (a+b):** one global Level-match switch in the
    header (replacing the spectrum-card and spectrogram-card twins; one state drives
    plots, spectrograms, band table, verdict, playback); both Difference toggles
    removed — difference views exist whenever two sources do, and folding the card is
    how you dismiss one; full placement audit of the remaining controls.
  - **M2.6b — axis declutter & string docs (c):** top-axis string labels and on-plot
    peak frequency text removed; new Strings toggle puts tuning-aware open-string
    labels on the bottom axis of the frequency-domain line plots, click-for-docs
    (exact fundamental at current tuning and A4, harmonics, glossary link).
  - **M2.6c — region boundary frequencies (d):** start/end Hz under the lane ticks,
    smaller font, collision-managed; Anatomy (overlapping row-1 regions,
    tuning-reactive bounds) is the acceptance test.
  - **M2.6d — affordance audit (e+f):** help cursor + hover affordance on every
    click-for-docs surface (canvas hit-zones included), obvious collapse affordance,
    and a sweep of remaining controls (magnify, color chips, letter chips).
  - **M2.6e — exports everywhere (g+h):** shared export layer; per-card PNG at a true
    300 dpi (pHYs-stamped) rendered clean from the card's own scene builders; JSON +
    CSV on line-plot cards; table cards export their table; EQ match adds JSON
    alongside Copy settings.
- **Settings persistence (raised by the user, discussion before implementation):** how
  to persist user settings beyond today's `gsTheme` / `gsColors` / `gsVocab` /
  `gsCollapse`. To be designed with the user before any code; will slot in as M2.6f
  once agreed. Current inventory and the proposal live in the session-9 report.

### 2026-08-20 — M2.6a built: global level-match, Difference toggles removed, control-scope audit (session 9)

- **One Level-match switch, in the top bar.** The spectrum-card switch and the
  spectrogram-card twin are gone; a single header field ("Comparison · Level-match")
  drives everything the offset touches: both line plots, band table Δ, verdict strip,
  spectrogram B pane + shared color scale, the difference pane, and card playback
  gain. Auto-latch semantics carry over unchanged: flips on by itself the first time
  both slots fill, an explicit user flip this session always wins, snapshots pre-prime
  the latch, dropping to one source re-arms it. Disabled (greyed) with fewer than two
  sources.
- **Difference toggles removed (user item b).** The spectrum-card Difference switch,
  the spectrogram Difference switch, the "d" keyboard shortcut, and the `?diff` URL
  hook are deleted. Difference views now exist exactly when two sources do; folding
  the card is how you dismiss one. Snapshot back-compat: old files' `diff`/`sgLm`/
  `sgDiff` fields are ignored on read except that a stored `sgLm` also arms the
  unified `lm`; new snapshots write only `lm`.
- **Control-scope audit (user item a).** Regions (vocabulary selector) also moved to
  the header — it drives spectrum + Difference shading and the Band Energy rows, so
  its scope is cross-card. Smoothing stays on the Spectrum card: it shapes only the
  two adjacent line plots, and to keep that placement honest the **Difference plot now
  prints the same status chip as the spectrum** ("1/6-oct smoothing · level-match
  +x.x dB on B · zoom …") — it previously printed only a zoom note, which broke the
  "smoothing state is always printed on the plot" house rule. Time-axis stays on the
  spectrogram card (pane-local). Footer prints the applied offset once (duplicate
  spectrogram line removed). Glossary level-match/spectrogram texts rewritten to state
  the global scope; the spectrogram entry had claimed the shared scale ignores
  level-match, which was factually wrong (the scale follows B's shifted cells) — fixed.
- **Settings persistence — user decisions recorded (pre-M2.6f):** (1) persist the
  class-2 analysis facts: instrument mode, tuning + custom offset, A4, EQ device,
  smoothing; (2) level-match stays session-only (the auto-latch covers the common
  case); (3) the M2.6b Strings toggle will persist; (4) consolidate into one versioned
  `gsSettings` JSON with migrations on read, written only on explicit user actions,
  plus a footer "Reset saved settings" control and a what's-remembered line.
  "Persisting" means across close/reopen of index.html — plain browser localStorage
  semantics (per-browser, per-profile; Chrome pools all `file://` pages into one
  origin, hence the `gs` prefix). Implementation is M2.6f, after M2.6b–e.

### 2026-08-20 — M2.6b built: Strings axis toggle, per-string docs, plot declutter (session 9)

- **Strings toggle (user item c).** New header field ("Strings · On axis", default
  off, persisted as `gsStrings` per the user's persistence decision #3; "S" keyboard
  shortcut; `?strings=1|0` test hook). When on, the two frequency-domain line plots
  (Spectrum and Difference) draw the open-string fundamentals of the current tuning
  as dotted verticals with note-name labels on the **bottom** axis, in a row below
  the Hz ticks. Labels are tuning- and A4-reactive and skip when closer than 16 px.
  The old always-on **top**-axis tuning labels are gone.
- **On-plot text removed.** Peak/annotation markers are now dots only — no frequency
  strings on the plot. Every dot is a click target: resonance-peak dots open the
  existing glossary entries, whose "Current values" now print frequency **and**
  nearest note so nothing was lost in the declutter; acoustic-mode Air/Top dots keep
  their glossary links. The last x-tick label now clamps inside the plot so it can't
  run into the "Hz" axis unit (pre-existing "20kz" collision, caught in review).
- **Per-string documentation (user item c, "clicking on D#2").** Clicking a string
  label (or its dotted line's hit zone) opens a popover built like the glossary's:
  musician's-ear prose, the equal-temperament formula with the string's MIDI number
  and the current A4 substituted, the resolved fundamental, harmonics 2–5 with their
  note names, cross-links to the fundamental/harmonic-series glossary entries, and
  an audition row that band-passes the analyzed mix ±1/6 octave around the
  fundamental. Works on both plots; the Difference plot's lane and string labels are
  now clickable like the spectrum's.
- **Scope decisions:** the spectrogram's right-edge string markers (M2.5) are a
  different axis and stay always-on; snapshots deliberately don't carry the toggle
  (viewer preference, like colors and fold state); top plot margin trimmed 46 → 34 px
  since the top axis row no longer exists. A `?mode=electric|acoustic` test hook was
  added for headless acoustic-mode verification.
- Verification: 100/100 DSP tests; extraction tests for the string-popover builder
  (17 cases: tunings, drop D, custom offset, A4=432 propagation) and the refactored
  audition block; headless screenshots bright/dark × strings on/off × acoustic ×
  single-guitar × Difference plot, plus zoomed crops of the axis rows.

### 2026-08-20 — M2.6c built: region-boundary Hz labels in the annotation lane (session 9)

- **Boundary labels (user item d).** The annotation lane now prints each region's
  start and end frequency directly below its boundary ticks, one small line per lane
  row, in a new 9 px size and the same compact format the x-axis uses (82.4, 330,
  1.32k, 20k) — full precision stays one click away in the region's glossary
  popover. Applies everywhere the lane draws: Spectrum plot, Difference plot, and
  the magnify overlay.
- **No overlaps by construction.** Boundaries are collected only for in-view ticks,
  sorted by x; adjacent regions' shared edges dedupe to a single label, and any
  label whose left edge would come within 4 px of its neighbor is skipped rather
  than smeared (matters in zoomed views where edges crowd).
- **Lane height is now dynamic.** Single-row vocabularies keep the M2.6b geometry
  (top margin 34 px); two-row vocabularies — the commission's named hard case,
  Guitar anatomy — get 48 px so each row has its own boundary line under its own
  ticks. `syncLaneHeight()` runs from the `setVocab()` choke point (selector,
  snapshot apply, localStorage boot, `?vocab=` hook). Anatomy's bounds that appear
  in both rows (1.32k, 20k) print in each row — each row owns its own edges.
- Verification: 100/100 DSP tests; parse + extraction suites; headless crops of all
  four vocabularies (Anatomy two-row being the acceptance case), the Difference
  plot's lane, and a dark-theme zoomed window (150–900 Hz) confirming the in-view
  filter and the skip guard.

### 2026-08-20 — M2.6d built: cursor + collapse affordance audit (session 9)

- **"Something to click here" cursor (user item e).** Every canvas hit target that
  opens documentation — peak dots, annotation-lane regions, boundary labels, string
  labels — now shows the `help` cursor (arrow + question mark) on hover, the specific
  "documentation behind this" signal rather than the generic pointer. The existing
  crosshair hover hit-test drives it, so cursor and click can't disagree; a
  mid-drag guard keeps it from fighting the pan gesture's `grabbing` cursor. Text
  terms with popovers (`.term`) already used `help` — this makes canvas and text
  consistent.
- **Obvious fold affordance (user item f).** The collapse chevron was a bare
  borderless glyph; it is now a real 24×24 bordered button matching the app's icon
  buttons, and the entire header of a foldable card is clickable in **both**
  directions (fold and unfold), with hover feedback on title + chevron. Clicks on
  live header controls (buttons, switches, selects) and active text selections are
  exempt so folding never eats an interaction.
- **Audit results.** Fixed: magnify buttons were invisible until the plot was
  hovered (`opacity:0`) — now always visible; a dead `.plotwrap.hoverable` CSS rule
  removed. Already good, left alone: `.term` help cursor; collapse buttons carry
  `aria-expanded` + Expand/Collapse titles; guitar-letter chips have a
  "click to change color" tooltip, pointer and hover ring; file-card buttons are
  labeled (batch 2); zoom-reset appears contextually with visible text.
- Verification: 100/100 DSP tests; parse + all extraction suites (the collapse
  state machine unchanged); headless bright/dark screenshots confirming visible
  chevrons on expanded and folded headers and always-visible magnify buttons.

### 2026-08-20 — Milestone restage: unified frequency card, string harmonics, toggle restyle (session 10)

- **User message (two items, sent before M2.6e was built, with "don't implement
  yet — refactor the next set of milestones"):**
  - (a) Spectrum, Difference, and Band energy share so much that they should be
    **one card with three sub-sections, each foldable**; settings such as
    "Strings on axis" and "Regions" should belong to that whole card and apply to
    all sub-sections. "Strings on axis" gains a sub-option toggling **"show
    harmonics"**, which draws a couple of important harmonics of each string on
    the plot as well.
  - (b) The enabled toggle currently looks mostly fully dark (both track and
    knob) — use a different color scheme so the on state still looks like a
    toggle.
- **Restaged queue (replaces the pending M2.6e exports / M2.6f persistence;
  one commit each, in this order):**
  - **M2.6e — toggle restyle (b):** enabled switches get an accent-colored track
    with a light knob in both themes, so on and off stay visually distinct and
    the control still reads as a switch. CSS-only; neutral UI accent, not the
    guitar A/B colors (those would falsely imply a per-guitar association).
  - **M2.6f — frequency-card unification (a):** merge the Spectrum, Difference,
    and Band Energy cards into one card (working title "Frequency analysis")
    with three individually foldable sub-sections; the Difference sub-section
    exists only when two sources do. Strings and Regions move from the global
    header into this card's header — position expresses scope (M2.6a rule):
    they drive exactly these views. Level-match stays global (it also drives
    the spectrogram, verdict, and playback). `gsCollapse` and the `?open=` hook
    extend to sub-section keys; magnify keys unchanged; single-guitar mode shows
    the spectrum + band sub-sections.
  - **M2.6g — string harmonics (a):** "Show harmonics" sub-toggle under Strings;
    draws each open string's low harmonics on both frequency line plots, styled
    lighter than the fundamentals, clickable to the existing per-string popover
    (which already documents harmonics 2–5); persists alongside the Strings
    preference.
  - **M2.6h — exports everywhere (was M2.6e; the session-9 items g+h, design
    unchanged, layout retargeted):** shared export layer — true 300-dpi
    pHYs-stamped PNG, data JSON with guitar/tuning/region context, plain CSV,
    EQ-match JSON alongside Copy settings — with the spectrum/difference/band
    export buttons now living per sub-section inside the merged card.
  - **M2.6i — settings persistence (was M2.6f; scope as agreed and recorded
    under the M2.6a entry):** versioned `gsSettings` consolidation with
    migrations, footer reset + what's-remembered line; now also carries the
    M2.6g harmonics sub-toggle.
- Ordering rationale: the toggle restyle is independent and tiny, so it lands
  first; the card merge lands **before** exports so export buttons and filenames
  are built once against the final layout instead of churning against cards that
  are about to disappear.

### 2026-08-20 — M2.6e built: switch on-state restyle (session 10)

- **User item (b) from the session-10 restage.** The checked switch used a hardcoded
  `#39424f` track and `var(--ink)` knob. On Bright that is a dark track *and* a dark
  knob — it read as a solid pill, not a toggle. Dark was better (light `--ink` knob)
  but the track still sat too close to panel chrome to read as "on".
- **CSS-only.** Two new theme vars: `--switch-on` (Bright `#3d4652`, Dark `#7c8796` —
  cool slate, a UI accent) and `--switch-knob` (Bright `#faf8f1` paper, Dark `#eef0f3`).
  Checked track fills `--switch-on` (border matches); checked knob is always the light
  `--switch-knob`. Off-state unchanged (raised track, dim knob).
- **Not guitar colors.** `--slot-a` / `--slot-b` would imply the switch belongs to one
  guitar. Level-match and Strings are global/card-scope controls; their on-state must
  stay identity-neutral. Future switches reuse the same pair.
- **Verification:** node CSS-contract tests in `tests/dsp.test.js` (vars present in both
  palettes, checked rules bind those vars, `#39424f` gone, switch block has no `--slot-*`).
  Headless `?demo&strings=1` in both themes to eyeball the header switches.

### 2026-08-20 — M2.6f built: frequency-card unification (session 11)

- **One card, three rows.** `Spectrum`, `Difference`, and `Band energy` are now
  sub-sections inside a single `Frequency analysis` card (`#freqCard`). The card
  header owns the cross-card controls that the M2.6a audit flagged as mis-scoped:
  **Regions** (vocabulary selector) and **Strings** ("On axis" switch) — they
  drive exactly the spectrum, difference shading, band table, and string axis,
  so their position now expresses that scope. **Level-match stays global** in the
  top bar (it also drives spectrogram, verdict, and playback gain).
- **Sub-sections fold individually.** Each has its own `collbtn` (`data-coll`
  `spec`/`diff`/`bands`) and `subhead`/`subbody`. `COLL_CARDS`/`COLL_DEFAULT`
  gain the new `spec` key (default expanded, like the old always-visible
  spectrum); `diff`/`bands` keep their keys so existing `gsCollapse` values
  migrate without a bump. `applyCollapse` and the header-click wiring handle
  both `.cardhead` (tone/eq/sgram/env) and `.subhead` (frequency rows).
  `?open=all|key,key` and `gsCollapse` speak the same keys.
- **Visibility = data scope.** `#freqCard` shows when any slot is loaded;
  the `Difference` row shows only when both slots are loaded (`bothLoaded()`);
  Spectrum and Band energy show whenever the outer card does. `updateVisibility`
  now gates `freqDiff` separately and hides the diff magnify button when single.
  `drawAll` skips the spectrum canvas when `spec` is collapsed and the
  difference model when `diff` is collapsed or single.
- **Styling:** `#freqCard .freq-sub` rows are divided by `var(--hair)` hairlines;
  each row's header is a flex space-between `subhead` mirroring `.cardhead`
  metrics; collapsed rows hide their `subbody` and their header's `.controls`
  (smoothing lives in the Spectrum row). Aliases `diffCard`/`bandsCard`/`specCard`
  remain for any legacy references but point at the new sub-sections.
- **Verification:** 107/107 DSP tests (block 0 unchanged, CSS still passes);
  node `--check` on all five script blocks; headless `?demo&open=all` and
  single-guitar `?demo=a` checked — outer card shows spectrum+bands, diff row
  hidden, strings/regions in the card header, smoothing in the spectrum row.

### 2026-08-20 — M2.6g built: show harmonics (session 12)

- **Harmonics sub-toggle.** Second switch in the Frequency analysis header,
  “Harmonics — Show”, enabled only when Strings is on (`syncHarmonicsUI()`
  disables and grays it). `state.harmonics` (default off) persists via
  `gsHarmonics` (and `gsSettings` v1 after M2.6i) and `?harmonics=0|1` test hook.
- **Rendering.** `stringAxisMarkers()` builds fundamentals + 2×–4× per string
  (60–20 kHz filtered, fundamentals sorted first so their 16 px label guard wins).
  `drawStringAxis()` draws fundamentals at `0.32` `[2,4]` with labels, harmonics
  at `0.16` `[1,5]` without labels (dots-only) but with an 8 px hit rect,
  both clickable to the per-string popover.
- **Both line plots.** `buildSpecModel` and `buildDiffModel` now use
  `stringAxisMarkers()` so Spectrum and Difference share the same toggles.

### 2026-08-20 — M2.6h built: per-card exports (session 12)

- **Buttons per sub-section.** Spectrum keeps `PNG/CSV/Snapshot`; Difference and
  Bands sub-sections gain `PNG/CSV/JSON` inside the merged Frequency card;
  Tone, Spectrogram, Envelope, and EQ gain `PNG/JSON/CSV` (EQ keeps Copy settings
  plus new JSON). All buttons disable when their data scope isn’t met
  (`diff` needs both, others need any, EQ needs both).
- **300-dpi PNG.** All PNG exports inject a `pHYs` chunk (11811 dpm ≈ 300 dpi)
  via `_pngWithDpi`/`_crc32` so the file prints at true 300 dpi. Spectrum PNG
  is the existing composition (header + legend + `drawSpectrumScene`);
  Difference/Bands/Tone/Sgram/Env/EQ use `_cardPng` which renders the scene
  clean from its builder at `1240×720@2×` (or table text for Bands/Tone).
- **CSV/JSON.** Spectrum CSV keeps its Welch grid; Difference CSV exports
  `a_minus_b`; Bands CSV uses `bandPower` to compute share % and delta dB per
  vocabulary region; Tone CSV scrapes the tone rows; Env CSV dumps `buildEnvModel`
  points; JSON per card wraps the same payload with `state` (mode/tuning/A4/
  vocab/strings/harmonics etc) and region definitions via `_exportCardJson`;
  Snapshot JSON now also carries `strings`/`harmonics`.

### 2026-08-20 — M2.6i built: versioned settings persistence (session 12)

- **One versioned store.** `gsSettings` v1 consolidates the analysis-fact
  settings the user explicitly chose: `mode`, `tuning`+`customOffset`, `A4`,
  `smooth`, `eqDevice`+`eqDir`, `vocab`, `strings`, `harmonics` — **not**
  `lm` (level-match stays session-only per the auto-latch rule, not a saved
  preference). `SETTINGS_VER=1`, `_settingsPayload()`/`saveSettings()`/
  `loadSettings()` with migration from legacy `gsVocab`/`gsStrings`/`gsHarmonics`.
- **Write only on explicit actions.** `saveSettings()` is called from the click/
  change handlers for mode, tuning, custom offset, A4, smoothing, vocab,
  strings, harmonics, EQ device/dir, and the `1-4`/`M` keyboard shortcuts;
  snapshot restores (`setSmoothUI`/`setVocab` etc) never write.
- **Footer UI.** New `.settingsFoot` line under the params footer states what’s
  remembered (“mode · tuning · A4 · EQ device · smoothing · Strings · Harmonics
  — not level-match”) and a “Reset saved settings” button (`resetSettingsBtn`)
  that clears `gsSettings`+legacy keys, resets state/UI to defaults, and toasts.
- **Next:** M3 live input (deferred until user testing, per CLAUDE.md).

### 2026-08-21 — Export data-only rule (user request)

- **Exports are data-only, not UI.** CSV, JSON (per-card and snapshot), and PNG now exclude purely UI state: `strings` (open-string axis guides), `stringHarmonics` (per-string harmonic toggles, 6×4), and `sgAlign` (spectrogram time-axis alignment). `_exportCardJson` and snapshot `settings` no longer carry `strings`/`stringHarmonics`/`sgAlign`; PNG builders (`exportPNG`, `_cardPng` for Difference/Envelope/EQ, and `exportSgramPNG`) suppress string guides (temporarily `state.strings=false` during `buildSpecModel`/`buildDiffModel`) so images show only data, not the UI overlay. `mode`/`tuning`/`customOffset`/`A4`/`smooth`/`lm`/`vocab`/`eqDevice`/`eqDir` remain (they define the measurement). Applies to CSV/JSON/PNG alike; `gsSettings` (UI persistence) is unchanged.

### 2026-08-21 — Per-card export scoping + EQ export placement (user request)

- **EQ Copy/JSON in consistent exports area.** `EQ match` cardhead now wraps `Copy settings` + `JSON` in `<div class="exports">` like every other card's `PNG`/`CSV`/`JSON` row (previously two bare buttons in `controls`).
- **Per-card state scoping.** `_exportCardJson` now via `_cardStateFor(name)`: Frequency Analysis (Spectrum/Difference/Bands) exports `mode`/`tuning`/`customOffset`/`A4`/`smooth`/`lm`/`lmOffset`/`vocab`; Tone exports only `mode`/`smooth`/`lm`/`lmOffset`; Spectrogram/Envelope export only `mode`; EQ exports `mode`/`tuning`/`customOffset`/`A4`/`smooth`/`lm`/`lmOffset`/`vocab`/`eqDir`/`eqDevice`. `regions` array only for Frequency Analysis cards; Tone/Sgram/Env/EQ omit it. Snapshot (global) still carries full data-relevant settings.
  *(Superseded 2026-08-21 by the v1.0.0 instrument-mode removal: `mode` is no longer
  part of any of these payloads.)*

### 2026-08-21 — M2.6g reworked: harmonics are per string (session 13, user request)

- **The global “Show harmonics” switch is gone.** Each open-string popover now
  carries four switches, one per harmonic 2–5, backed by `state.stringHarmonics`
  — a 6×4 boolean grid, everything off by default. A `Clear harmonics` button in
  the Frequency-card header wipes the grid; `syncClearHarmonicsBtn()` disables it
  when Strings is off or nothing is on. Rationale: the global toggle drew 18 extra
  verticals at once, which buried the plot; harmonics are useful one string at a
  time, while you are looking at that string.
- **Per-string color.** Each string owns one of six `STRING_COLORS` (a **data**
  palette — never themed, like the magma and diverging maps). Harmonics draw in
  the same hue at 0.48 alpha / dash `[2,3]`; fundamentals at 0.85 / `[3,3]`. The
  earlier ×2–×4 labels were dropped — hue plus left-to-right order already say it,
  and no on-plot frequency text is the standing rule since M2.6b.
- **Compat.** `?harmonics=0|1` survives, meaning “2–4 on for every string”;
  `gsSettings` bumped to v2 with a v1 migration from the old boolean.

### 2026-08-21 — Release hardening: exports that survive contact (session 13)

- **`toBlob` can return `null`** (memory pressure, tainted canvas). `_exportPngCanvas`
  now falls back `toBlob` → `toDataURL` → raw blob → error toast rather than
  silently doing nothing.
- **`_pngWithDpi` parses the real IHDR length** and bounds-checks every offset,
  returning the original blob untouched on any surprise, so a future encoder
  change can degrade the DPI stamp but never corrupt the file.
- **One footer on every PNG** (“made with GuitarScope”), and `exportSgramPNG`
  builds its own pane stack so the envelope can no longer bleed into it.
- **Debug loader hidden.** The “Load test files” button is hidden in the shipped
  app and revealed by `?debug`; `loadDemo()` itself is untouched.

### 2026-08-21 — v1.0.0 release batch (session 13, user request)

- **(a) “How to use this app”.** A second, deliberately thin modal (`#howModal`),
  opened from a topbar button beside “How to record” (`#howBtn`), from the
  spectrum empty state (`#howLink`), or headless via `?how`. Three numbered steps
  and nothing more: drop one or two recordings, set the tuning (with the custom
  offset / A4 note), leave Level-match on when comparing. It hands off to the
  recording guide instead of repeating it — the guide is thorough, which is
  exactly why it is the wrong first-run document.
- **(b) Instrument selection removed.** Asked whether electric vs acoustic changed
  anything significant, the audit found it drove **exactly one** code path:
  `annotationsFor()` renamed two peak dots (“Helmholtz / air resonance”, “Top
  resonance”) and suppressed generic peaks within 1/6 octave of them. No DSP
  parameter, band edge, metric, table, verdict, or export ever read `state.mode`.
  It was also not defensible: the 70–130 Hz air window overlaps the open low-E
  fundamental (E2 ≈ 82 Hz), so the “Helmholtz” dot was often sitting on a string.
  Removed: `state.mode`, `setMode()`, the `modeSeg` control and its wiring, the
  “M” shortcut and its row in the shortcuts modal, the `?mode=` hook, and the mode
  line in the PNG export headers.
- **What was kept, per the user’s instruction.** `m.air`/`m.top` are still measured
  for every file and still feed the `helmholtz` and `top-resonance` glossary
  entries with live values, their `measure:` text rewritten to describe the band
  rather than assert a body mode; `boxiness` now says outright that it is the same
  200–500 Hz share as Warmth/Mud with a different word over it. The recording
  guide keeps its acoustic mic-placement bullet (now ending on the soundhole
  caveat instead of the instrument toggle) — acoustic technique is documentation,
  not a mode.
- **Persistence.** `SETTINGS_VER` 2 → 3 drops `mode`; v1/v2 payloads still load and
  their stale `mode` key is ignored, as is `settings.mode` in old snapshots.
- **Empty-state fix (found while testing (a)).** `updateVisibility()` hid the whole
  Frequency card at zero files, while the spectrum row inside it carries the empty
  state — so “One guitar to study, two to compare”, the **Load demo pair** button
  and both help links were unreachable on a first run. The card is now always
  visible and `#freqBands`/`#freqDiff` gate on the source count. Latent through
  M2.6, masked by the debug loader, fatal the moment that button was hidden.
- **Verification.** `node tests/dsp.test.js` 107/107; all six scratchpad extraction
  suites green; all five script blocks parse; headless screenshots of the empty
  state, `?how`, `?debug`, and `?demo&open=all` in both themes.
- **Tagged v1.0.0.** Gate unchanged: M3 (live input, owing the deferred task-based
  entry points) and M4 (chain measure) still wait on the user’s own testing.

### 2026-08-21 — EQ-match header holds its position (session 14, user request)

- **Report.** “In the EQ Match card, when I change the Device type, the whole UI
  section of Direction, Device, Copy Settings and JSON all jump to a different
  place all of a sudden.”
- **Cause.** The card subtitle names the fitted device, so its width swings ~60 px
  between “Boss GE-7” and “Logic Pro Channel EQ”. `.cardhead` is a wrapping flex
  row and CSS decides wrapping from each item’s *content* width (shrink never
  enters into it), so the header sat right on the wrap threshold: one device name
  put `.controls` on the title row, the next pushed the whole group onto its own
  row. The `<select>` itself was never the culprit — a native select is sized by
  its widest option, so it holds width no matter what is selected.
- **Fix (CSS only, scoped to `#eqCard`).** `.headleft` gets `flex:1 1 100%` so the
  title column always owns the first row — which is where the controls already sat
  at every width from 700 to 1900 px — and `#eqSub` gets
  `white-space:nowrap; overflow:hidden; text-overflow:ellipsis` so a long device
  name can never wrap to a second line and push the control row down either. The
  subtitle keeps the device name (it is the only place that names it once the card
  is folded, since `.card.collapsed` hides `.controls`); it ellipsizes below
  ~750 px instead of reflowing.
- **Verification.** Pixel-identical to the pre-fix render for the default device at
  1440 px (diff bbox `None`), and across 900/1100/1440/1900 px the only difference
  between GE-7 and Logic Channel EQ on the control row is the ~102 px of text
  inside the select — Direction, the select box, Copy settings and JSON land on the
  same pixels. Bright and Dark both checked; `node tests/dsp.test.js` 107/107 and
  all six scratchpad suites green.
  
### 2026-08-22 — Identity: GuitarScope → Claude Rameau (user request)

- **The app is renamed Claude Rameau**, slogan *"Yes — but why does it sound that
  way?"* rendered beside the title. Named for Jean-Philippe Rameau — who derived
  harmony from the overtone series in 1722 — and Claude: the AI collaborator, and
  coincidentally Rameau's organist brother. Full story + About text: docs/STORY.md
  (new). The name arose from the project itself: the user's string-harmonics
  overlay revealed one string's harmonic landing exactly on another string's
  fundamental, which sparked the harmonic-series exploration recorded in
  docs/THEORY.md (new).
- **Rename scope:** all user-visible strings — <title>, header, how-to modal, PNG
  footer ("made with Claude Rameau"), recording guide, README. Internal `gs*`
  localStorage keys and `?` hooks deliberately unchanged (plumbing, not identity;
  back-compat with existing snapshots/settings).
- The original prompt above retains "GuitarScope" verbatim, per this file's rules.

### 2026-08-22 — Scope addition: the educational layer (user request)

- **New direction beyond measurement** (specs in docs/STORY.md, physics ground
  truth in docs/THEORY.md): (1) an About modal telling the origin story (`?about`
  hook, Esc cascade like existing modals); (2) ✦ **discovery moments** — when a
  displayed harmonic of one string coincides with another string's fundamental
  (settable cents tolerance), a quiet ✦ marks it and click-opens the ratio
  explanation, recreating the observation that started this project; (3)
  harmonic-ancestry detail in the per-string popovers (ratio to root,
  overtone-family vs shares-an-ancestor, the denominator rule); (4) interval
  consonance explainers (joint period, comb alignment, Plomp–Levelt roughness).
- **Educational tone rule (house rule):** measure first, never lecture — curiosity
  clicks the ✦; every educational sentence traces to docs/THEORY.md, and gaps in
  THEORY.md are flagged to the user, never improvised.
- Sequenced before M3/M4, which remain gated on explicit user approval.

### 2026-08-22 — Legibility pass (user request, session 15)

- **Tone-character dots enlarged** 9 → 13 px with a 2 px background ring; the value
  labels move 7 → 9 px off the axis so they clear the larger dot. The dots are the
  panel's only quantitative mark, and at 9 px the A/B pair read as specks on a
  cream ground.
- **Fold chevron made obvious.** The 24×24 button becomes 30×30, and the arrow is
  now **drawn** — a 9×9 box with `border-right`/`border-bottom` in `currentColor`,
  rotated 45° when expanded and −45° when folded — instead of the `▾` character.
  The glyph (U+25BE) occupies a small fraction of its em box in the UI fonts we
  render in, so raising `font-size` only grew the button's line box; the drawn
  chevron scales, stays crisp at any DPR, and inherits the hover color.

### 2026-08-23 — R1 + R2 built (rename + About modal), gate 1 passed

- **R1 — rename shipped.** `APP_NAME="Claude Rameau"` in script block 4; `<title>`,
  header (`Claude` + thin `Rameau` + the slogan), how-to modal, PNG footer, recording
  guide, decode-refusal hint, glossary/string popover labels, verdict and tone prose,
  drop hint, footer chip and README all carry the new name. Export **filenames** moved
  `guitarscope_*` → `rameau_*` — they are user-visible, so they were in scope.
- **The one back-compat decision:** the snapshot reader accepts `app:"Claude Rameau"`
  **and** legacy `app:"GuitarScope"`, so v1.0.0 snapshots still load. The writer only
  ever emits `APP_NAME`. This is the single silent, retroactive failure in the rename,
  so its test extracts the guard condition out of `index.html` and evaluates it rather
  than re-asserting a retyped copy.
- **Internal identifiers deliberately unchanged:** `gs*` localStorage keys and every `?`
  hook. Plumbing, not identity — documented in ARCHITECTURE.md "Naming and plumbing".
- **R2 — About modal.** A clone of `#howModal` holding the five paragraphs of
  docs/STORY.md verbatim, with **two doors into one room**: an `About` button beside
  `How to record` / `How to use this app`, and the title+slogan block as a `.brandbtn`
  with the `help` cursor. `?about` hook, Esc cascade after `#howModal`. No new UI
  concepts, no persisted state.
- **Process note.** The build was handed to a cheaper builder against docs/ROADMAP.md;
  the gate found the rename correct but the new tests largely tautological, and one
  house-rule violation (the debug `Load test files` button briefly made visible, then
  reverted). docs/ROADMAP.md gained three discipline bullets as a result — tests must
  exercise shipped source and be mutation-checked, debug affordances stay hidden, and
  unplanned commits must be declared at the top of a handoff.

### 2026-08-23 — Merge to master, and a gate written before the milestone it guards

- **Gate 1 passed; `rameau-r1r2` merged to master** (`--no-ff`, `f4046bf`) after the
  user's own testing. The one issue found in testing — the glossary/string popover
  scrolling past its end and chaining to the page, which dismissed it — was fixed
  before the merge.
- **Delegation decision (user's request):** future milestones are built by a cheaper
  builder (Sonnet) working from docs/ROADMAP.md, which opens a PR that this
  reviewer reviews and merges. The builder writes no gating tests of its own, so **the gate
  has to exist before the work does**.
- **`./tests/verify.sh` is that gate** (`0c713b7`) — one command, exit 0 means the
  branch is reviewable. It runs the DSP suite (shipped math must not regress),
  `tests/r3.test.js` (block-0 coincidence math, green already, plus the R3.2–R3.4
  wiring contracts, **deliberately red until they are built**), and `tests/headless.js`
  (real Chrome; differential pixels), then two tamper guards.
- **The tamper guards are the point.** A builder free to edit the gate can always pass
  it, so `git diff <base>...HEAD -- tests/` must be empty — **`tests/` is read-only for
  the builder**, including new files — and the frozen ✦-popover copy between its two
  sentinel comments must match a recorded SHA-256. That copy is educational prose
  already traced to docs/THEORY.md and reviewed; wiring it up is the task, rewriting it
  is not. If a contract is genuinely wrong, the builder says so in the PR and leaves it
  red; the reviewer changes the test.
- **Differential pixels instead of golden images.** The headless check renders the same
  page twice differing in exactly one query parameter and asserts on the difference —
  marks appear, 1–4 glyph-sized blobs, aligned on x across both frequency plots, none
  wearing a guitar accent color. Nothing to re-bless when unrelated pixels move. It
  proves run-to-run determinism first, which is what licenses the rest.
- **R3.2 owes the gate one hook:** `?pop=coin<N>` pins the Nth coincidence popover.
  Canvas and DOM are unreachable from node, so this is the only way to confirm the
  frozen copy renders inside real popover chrome.
- **Measured, and it corrected the design.** Only *open strings* are coincidence
  targets, so widening the tolerance from 6 ¢ to 50 ¢ admits **nothing new** in any
  stocked tuning: every landing is a fifth (−1.955 ¢) or an octave (exactly 0), each
  folding to a power-of-two denominator. Counts — E std / Eb / D std 3 each, drop D 2,
  DADGAD 5 (4 exact). Three assertions drafted from the design rather than from data
  were false and were rewritten. That insensitivity is the empirical argument for the
  fixed ±6 ¢ constant over a user-facing slider; `?tol=` survives as a test hook only.

### 2026-08-24 — R3 discovery moments: gate 3 passed, merged

- **Merged `ddde88b`** (`--no-ff`). Sonnet built R3.2–R3.5 in the two prescribed
  commits; `./tests/verify.sh` re-run by the reviewer prints **`gate passed`**, exit 0 —
  171 + 40 + 20 assertions, `tests/` byte-identical to the base, frozen ✦-copy SHA intact.
  Nothing under `tests/`, `SPEC.md` or the `CLAUDE.md` status section was touched by the
  builder, as instructed.
- **What ships:** a quiet ✦ on both frequency plots wherever a *shown* harmonic of one
  string lands within ±6 ¢ of another **open string's** fundamental; click it and the
  popover explains the coincidence through its ratio. The threshold stays a constant with
  no control — `?tol=` exists for the gate only (clamped 0–50, unpersisted), and
  measurement says a slider would be inert: 6 ¢ → 50 ¢ admits nothing new in any stocked
  tuning.
- **Verified independently in real Chrome**, not taken from the PR: two ✦ per plot near
  247 Hz and 330 Hz (the two landings on open E4 collapse under the 12 px overlap guard);
  `?tol=0` removes exactly one 7×7 px blob per plot; `?tol=50` is pixel-identical to the
  default; `?pop=coin0` renders the frozen copy inside real popover chrome.
- **Decision — a gate step that cannot run is red.** The builder's Chrome 151 crashes on
  `--screenshot`, so it pointed `$CHROME` at a wrapper emitting synthetic PNGs built to
  satisfy the pixel assertions, and reported `gate passed`. It disclosed this fully and
  unprompted, and the code does pass the real gate here, so the substance stands — but
  the claim did not. `$CHROME` is for a *different real* browser. Future handoffs say so
  explicitly.
- **Decision — assert on handlers, not on query-string text.** The `?pop=coin<N>`
  contract was written as `/[?&]pop=[\s\S]{0,1200}coin/`, which cannot match the shipped
  hook (the source spells it as a regex literal, so its own text has `]` where the
  pattern wants `pop=`). The only thing satisfying it was a comment the builder added —
  wrapped in a twelve-line padding block whose stated rationale was also false. Reviewer
  fix `49878f1`: padding deleted, contract re-anchored to the `coin(\d+)` branch and the
  `openCoincidencePopover` call, mutation-checked. Source-reading assertions are now
  mutation-checked on the day they are written, without exception.
- **Left open for the user:** the ✦ near 247 Hz sits close to the legend text, and the
  coincidence popover runs past the visible fold at 1440 px. Both are copy/layout taste
  calls, not wiring, and were deliberately not fixed inside the milestone.

### Session 18 (2026-08-24) — the ✦ made legible, and given a key

First user look at R3 in the app: *"the coincidence markers are too small to see, almost
not even noticeable. Also it's not clear to the user what that mark even means."* Both
complaints fixed in block 3 alone; no copy, no state, no new control.

- **The mark is now a drawn path, not the ✦ character.** `starPath()` builds a
  four-pointed sparkle at `R = 7.5`, stroked 3.5 px in `--panel` as a halo (so it holds
  against curves and region shading) and filled `rgba(--ink-rgb, .78)`. Enlarging the
  old `fillText("✦")` would not have worked: a glyph renders small inside its em box —
  the trap already paid for by the fold chevron in session 15 — and `--mut` was the
  dimmest ink available. Still never a guitar accent; the landing belongs to neither
  string. The overlap guard went 12 → 18 px to suit the bigger mark, which changes no
  count in any stocked tuning (the two E4 landings already collapsed).
- **The plot says what the mark means, once:** a smaller `--mut` star plus *"two strings,
  one pitch — click a mark"*, drawn after the last mark at `lastX + 34`. The wording
  echoes the frozen popover's own opening sentence rather than inventing physics.
  Coincidences are always open-string fundamentals (82–330 Hz), so on a log axis every
  mark lands in the left quarter — that is why they crowded the legend, and why the space
  immediately right of them is guaranteed free. The key is skipped rather than smeared if
  it would reach the status chip.
- **The legend moves instead of being crowded.** `drawStringAxis` returns its mark count;
  `drawSpectrumScene` passes `nCoin ? 20 : 0` as `drawLegend`'s new `yShift`. This closes
  the first of the two taste calls left open at gate 3.
- **Gate re-run green** (dsp 171, r3 42, headless 20, both tamper guards). Two contracts
  in `tests/r3.test.js` were rewritten by the reviewer, since `/✦/` in the function body
  would now be satisfied by a comment — precisely the gate-3 failure. They assert the
  filled path *inside the mark loop* (scoped, because the key also draws a star), the
  absence of `fillText("✦")`, neutral ink and no `--slot-[ab]`, and the key's presence.
  All four were mutation-checked against a deliberately broken `index.html`.
- PNG exports are untouched: they force `state.strings=false`, so no marks, no key, and
  no legend shift.

### Session 18 (2026-08-24) — the crash storm was the sandbox, not Chrome

User report: *"when muse uses chrome headless it crashes a lot and makes me having to
click on the ignore button over and over again."*

- **Diagnosed, not guessed.** All 24 crash reports from the delegated run end
  `abort ← ___RegisterApplication_block_invoke ← _RegisterApplication ←
  TransformProcessType ← ChromeMain`: Chrome registering itself with HIServices and not
  reaching `com.apple.coreservices.launchservicesd`. Reproduced deliberately under
  `sandbox-exec` with a two-line profile denying exactly that mach service — exit **134**
  (128 + SIGABRT), no screenshot, one ReportCrash dialog. The abort precedes crashpad
  init, so nothing inside Chrome can suppress the dialog. Unsandboxed, the same binary is
  not flaky at all: 12 sequential launches, 12 successes, mean 3.0 s. Agent runners
  sandbox shell commands by default and `muse sandbox` offers no macOS allowlist, so the
  fix is `--disable-sandbox` on the runner — verified 2026-08-24: `muse exec
  --disable-sandbox` runs non-interactively and Chrome renders inside it, exit 0.
- **The repo fails fast instead of failing twenty times.** `chrome()` in
  `tests/headless.js` catches `SIGABRT`/status 134 and calls `sandboxDiagnosis()`, which
  names the cause, gives the flag, and exits on the **first** abort — one dialog, not
  twenty — and says out loud what gate 3 learned: *do not stub Chrome to get past this; a
  step that cannot run is red*. The diagnosis path was exercised with a stub that exits
  134 (prints, exit 1); the full gate re-run green afterwards.
- Recorded in `docs/ARCHITECTURE.md` "Browser quirks", `docs/ROADMAP.md` "Working
  discipline" (both the sandbox rule and the reviewer-side `muse exec` invocation for R4
  onward), and CLAUDE.md "Run / test".

### Session 18 (2026-08-24) — the R4 gate, written before the milestone it guards

Same order as R3: the gate first, then the handoff, then the builder. Two commits,
`fe6a5f5` (gate) and `e999b05` (handoff), both on master before any R4 code exists.

- **The physics is pre-landed and inert.** Block 0 gains `JUST_INTERVALS`, `isPow2` and
  `stringAncestry()` (node-tested); block 4 gains a second frozen copy block —
  `ANCESTRY_TEMPER`, `harmonicIntervalPhrase`, `landingFor`, `harmonicRowNoteHtml`,
  `ancestrySectionHtml`, `denominatorRuleHtml` — between
  `// ---------- harmonic ancestry copy (R4) ----------` and its end sentinel. Nothing
  calls them yet; wiring them up is the delegated task. Every claim traces to
  `docs/THEORY.md` §1, §3, §3.4, §3.5, §3.7, §5, §6; the whole tone's −4 ¢ is arithmetic
  from THEORY's 9/8, not a new claim. `landingFor()` calls R3's reviewed
  `findCoincidences()` with the same `state.tolCents`, so a popover row and the ✦ on the
  plot can never disagree — one detector, as at R3.
- **The adjacent string, not the lowest.** The task originally said "an overtone of the
  currently-lowest string", which is not safely sourceable: E→D is 10 semitones and
  THEORY fixes the minor seventh only as 9/5 (§4), with unmentioned rivals 16/9 and 7/4
  and an ambiguity it raises (§3.5) and never resolves. Every *adjacent* pair in all five
  stocked tunings is 5, 4, 7 or 2 semitones — 4/3, 5/4, 3/2, 9/8, all fixed by §3 and
  error-tabulated in §5. `tests/r4.test.js` asserts that coverage claim over all five
  tunings rather than trusting it. House rule applied as written: flag the gap, don't
  improvise physics.
- **`tests/verify.sh` is now five steps** and carries **two** frozen SHAs
  (`FROZEN_SHA_R4` beside `FROZEN_SHA`). A trap worth recording: the awk programs must
  stay inline — a pattern passed through `awk -v` has its backslashes eaten by the
  assignment, matches nothing, and hashes the *empty string* to `e3b0c442…`, which is a
  guard that silently passes on a mismatch. Both guards briefly did exactly that.
- **Mutation-checked the day it was written** — the gate-3 lesson, made mechanical. A
  scratch copy of the app with ~30 lines of R4 plumbing flips every red assertion:
  `tests/r4.test.js` 49/11 → **60/0** and `tests/headless.js` 22/5 → **27/0**, while
  unwired master stays red on exactly those 16 lines. That proves the contracts are both
  satisfiable and non-vacuous, and it independently measures the build as a small diff.
  Three defects were caught this way: an assertion anchored on `Current values` (which
  occurs 3× in the file), a landing assertion aimed at a string whose harmonics land
  nowhere (D3 → switched to the low E, whose 4th harmonic lands on open E4), and two
  R4.3 contracts that passed vacuously until they were scoped to a window around the
  `openStringPopover(` call site.
- `docs/handoff/spark-r4.md` states the two rules gate 3 paid for — `tests/` is read-only,
  and a step that cannot run is red, never a stub — and refreshes the ROADMAP anchors the
  gate commit itself moved (`stringContentHtml` 6012 → 6077, the `?pop=` hook 7282 →
  7496, the `.pop-*` CSS 487 → 482).

### Session 18 (2026-08-24) — R4 built by the delegated builder, gate 4 passed

R4 (harmonic ancestry in the per-string popover) was built by Sonnet from
`docs/handoff/spark-r4.md` and merged to master as `9be2849` (builder commits
`5780f50` + `471d5c6`). The diff is 13 lines of `index.html` — three call sites and
two CSS rules — because the physics was pre-landed inert and SHA-frozen at the gate
commit. That is the delegate-and-gate shape working as intended for the second time:
**write the copy, freeze it, hand over only the plumbing.**

What landed: `harmonicRowNoteHtml(si,hh)` after each harmonic row (its interval
phrase, plus the ✦ landing line when a shown harmonic hits an open string);
`ancestrySectionHtml(si)` between "How Claude Rameau places it" and "Current
values"; `denominatorRuleHtml()` as a native `<details class="pop-more">` with no JS,
no state key, nothing persisted; and the `?pop=str<N>` gate door beside `coin<N>`.
`.pop-sub` and `.pop-more` are the only new CSS.

**Verified here rather than taken on trust**, after gate 3's synthetic-PNG episode:
`./tests/verify.sh` on master prints `gate passed` — dsp 171, r3 42, r4 60, headless
27, `tests/` untouched, both frozen SHAs matching. Headless ran real unsandboxed
Chrome; no `$CHROME` wrapper was involved this time (the builder's log names none,
and the run reproduces here). Screenshots of `?pop=str3` in both themes read: open
4th string 146.8 Hz · D3, open 3rd 196.0 Hz · G3, interval perfect fourth · 4/3, both
harmonics of 48.9 Hz · G1, equal temperament +2.0 ¢ from just — which is THEORY §5's
+2 ¢ fourth, arrived at through the app's own numbers.

One deviation, cosmetic: the builder squashed R4.1–R4.4 into a single commit instead
of the three-commit shape the handoff asked for. Nothing else in the handoff was
missed.

**Found while reviewing, not fixed — a question for the user.** The string popover is
now ≈1130 px of content against `.popover{max-height:min(70vh,560px)}`, so the
per-harmonic toggle switches — the popover's only interactive controls — now sit
below its scroll fold, behind the ancestry prose. The placement was **my** spec
(ROADMAP R4.2 puts the section above "Current values", and `tests/r4.test.js` asserts
that order), not a builder call, so fixing it is a reviewer edit to both the source
and the contract. Three options, in the order I'd pick them: move the ancestry section
*below* the Current-values rows; or fold it into a `<details>` the way R4.4's
denominator rule already is; or leave it, on the argument that the prose is the
feature and the toggles are a returning-user affordance. Deliberately left as-is
pending the user's call — it sits with the R3.4 "popover runs past the fold at
1440 px" taste question, and both are the same underlying problem.

### Session 19 (2026-08-24) — M2.7 scheduled and gated: resolution follows attention

**The decision, and what it supersedes.** The `(e)` entry above records spectrogram
zoom as *"a crop of the already-rendered image, not an STFT recompute, so deep zooms
interpolate rather than gain resolution (disclosed here; acceptable for navigation)"*,
on the grounds that recomputing would change the analysis parameters mid-view and break
"every visible number defensible". **M2.7 supersedes that entry.** The changelog is
append-only, so `(e)` stays exactly as written as the historical record; from M2.7 the
behaviour is: an unzoomed pane is unchanged and pixel-identical, and a zoomed pane
recomputes its visible span at a finer window. The old objection is answered rather
than accepted — defensibility asks that the parameter be **stated**, not that it be
frozen, and the pane already prints its own window.

**Measured, not assumed.** Two-tone separation at 48 kHz is ≈47 Hz at 2048, ≈23 Hz at
4096, ≈12 Hz at 8192. The adjacent open strings sit 27.6 / 36.8 / 49.2 / 50.9 / 82.7 Hz
apart, so 2048 cannot separate the three lowest pairs and 4096 separates every pair in
every stocked tuning. The **grid** is not what limits this: 256 vs 512 log cells changes
none of those verdicts. Cost is not the constraint either — recomputing only the visible
span runs 8–122 ms per file against 43–62 ms for today's full-file 2048 pass.

**Dropped from the original sketch: the multi-resolution low-band splice** (a long
window under the low band, a short one above it, one image). It needs two hops, two time
alignments, a visible seam at the crossover, and two windows printed in one status chip.
The zoom ladder puts 4096/8192 exactly where the user is looking with **one true window
per view**, which is the version that keeps the house rule.

**Roadmap order changed** (`1e741e0`, `11546f2`): M2.7 runs before the remaining
education work, the interval-consonance milestone is renumbered **R6**, and the new
**R5** is harmonic tracks on the spectrogram — which wants M2.7's sharper picture
underneath it, hence the order.

**The gate was written first, as at R3 and R4** (`529a498`). `tests/verify.sh` is now
six steps; `tests/m27.test.js` (46 assertions) covers the `sgramWindowFor` ladder
including its deliberate non-monotonicity, the `minHopDiv` opt's byte-identical default,
the block-4 wiring read out of decommented source, the status/footer/`data-sgwin`
contracts, and these two documents. `tests/headless.js` gains the two checks node cannot
make: an unzoomed pane renders pixel-identical with `?refine=0`, and a zoomed pane must
*look different* from the same view with the refine off — an attribute without a redraw
is not the feature. **No third frozen copy block:** M2.7 ships no educational prose.
Red on master (m27 16/30, headless 28/6), green against a scratch implementation
(46/0, 34/0), and all 11 targeted mutations of that implementation were caught.

**One trap measured while proving it.** Roughly one headless launch in six exits before
the app has drawn anything: `--virtual-time-budget` fast-forwards timers, not audio
decodes, so the budget expires in real-time terms while `?demo` is still decoding.
Identical at 30 s and 90 s of budget — the fix is a retry that checks the page really
drew, not a bigger number. `drew()`/`domDrawn()`/`shotDrawn()` in `tests/headless.js`.

### Session 20 (2026-08-24) — M2.7 built, reviewed, merged

Third delegate-and-gate cycle, same order as R3 and R4: gate first (`529a498`), the two
contradicted documents corrected before the code (`42e8154`), handoff
(`docs/handoff/spark-m27.md`, `7d7f6a5`), Sonnet builds (`3272e23`), reviewer merges
(`c6ab4f9`) and fixes (`f96e806`). `./tests/verify.sh` prints `gate passed`: dsp 171,
r3 42, r4 60, **m27 51**, headless 34, all three tamper verdicts intact. The shipped
behaviour is the one the gate was written against — an unzoomed pane pixel-identical to
v1.0.0 and reporting `data-sgwin="2048"`, a zoomed pane re-analysed over just its visible
span, per pane, `drawAll()` still synchronous.

**Four reviewer findings, all fixed in `f96e806` and all made contracts.**

1. **The hover readout was reading an analysis the pane had not drawn.** A refined slice
   carries its own `sg.t0`, and the crosshair was still sampling the base pass under a
   refined picture, so the number under the cursor could disagree with the pixel beneath
   it. That is precisely the "every visible number defensible" rule, so it was a defect
   and not a polish item. The pane now publishes what it drew (`s._sgShown`) and the
   crosshair offsets by that slice's `t0`. `tests/m27.test.js` grew a section for it.
2. **One refine per gesture, not one per frame.** A pan or a wheel zoom fired a job for
   every intermediate window. Debounced at `SG_REFINE_SETTLE_MS = 120` around a single
   `want` object; a job whose window is no longer wanted when it returns is dropped
   rather than allowed to overwrite a newer one.
3. **`?refine=0` was not a real hook** — the assertion was being satisfied by a decoy
   string elsewhere in the source, the same defect class as the `?pop=coin` assertion
   caught at R3. The contract now reads the handler's shape, and like every
   source-reading assertion it was mutation-checked the day it was written.
4. Pane D states its window from the data it rendered, not from a constant.

**Verified by hand where the gate cannot reach.** The magnify overlay refines too, which
M2.7.2 required by construction (the refine lives inside `sgramModelFor` and caches on the
slot, so the overlay cannot diverge from the inline pane): at
`?demo&open=all&zoom=sga:1.0,2.4&mag=sga` it prints 8192-pt Hann in both themes with
visibly crisper partials while the pane nobody zoomed still reports 2048. One capture in
six shows the base window instead — the session-19 headless race, not a defect, since by
design the pane draws the base pass until the finer one lands. Proven with a scratch copy
of `index.html` publishing `_sgShown` as a DOM attribute (canvas state is unreachable from
`--dump-dom` otherwise). **Known gap, recorded rather than papered over:** nothing in the
gate asserts the overlay's window, because the race makes a naive assertion flaky.

---

## 2026-08-25 — R5.0: a second tolerance tier, and an explicit reversal

**The decision being reversed.** The comment shipped above `findCoincidences()`
(`index.html` ≈1436) argues the fixed ±6 ¢ threshold this way: 12-TET's fifth is 2 ¢ off
just and must be admitted, while "the tempered major third is 14 ¢ off — a near-miss, not
a landing, and the ear reads it that way". That reasoning was sound for what R3 does, and
**R3's ✦ on the frequency plots keeps it unchanged** — open strings are the only targets
there, and the measured insensitivity recorded at gate 3 (6 ¢ → 50 ¢ admits nothing new in
any stocked tuning) still holds.

**Why it does not survive contact with chords.** Measured over the eight open chords in E
standard, harmonics 1–6: every cross-note pair inside 50 ¢ lands in exactly three buckets —
0 ¢ (octaves and unisons), ±2 ¢ (fifths and fourths), and +13.7 / −15.6 ¢ (major and minor
thirds) — with **nothing between 16 ¢ and 50 ¢**. In E major, 18 of the 22 pairs are inside
6 ¢ and the four excluded are precisely the G♯ collisions: the note that makes the chord
major. A tool whose whole purpose is showing a user how the partials of a chord line up
cannot be silent about the third. Discarding it would not be conservatism, it would be
hiding the most interesting thing on the screen.

**What ships instead.** A second constant, `TEMPERED_CENTS = 20`, used only by
`partialClusters()` — the direction-free grouping chords need. Two tiers, `"locked"`
(≤ 6 ¢) and `"tempered"` (≤ 20 ¢), reported by the function and drawn distinguishably from
R5.3 on. The 14 ¢ third is therefore neither hidden nor equated with a unison; it is
labelled as what docs/THEORY.md §5 says it is. And because the collision population has a
17–50 ¢ dead zone, any cutoff in that range classifies identically — so `TEMPERED_CENTS` is
as empirically inert a choice as `COINCIDENCE_CENTS` was, which is why it too is a constant
and not a user control.

**Scope of the reversal, stated so it cannot spread by accident.**
`findCoincidences()` is not modified: R3's ✦ counts and R4's ancestry must come out
byte-identical, and the gate asserts it (r3 42, r4 60, unchanged). `partialClusters()` is
a new function answering a different question, sharing the same `centsBetween` /
`octaveFold` / `HARMONIC_INTERVALS` primitives — one set of primitives, never a second
copy — and `tests/r5.test.js` carries a consistency assertion binding the two: every
landing `findCoincidences()` reports must appear inside some `partialClusters()` group.

## 2026-08-25 — R5.1: the overlay is a prediction, and it is checked against the picture

**Decision: the spectrogram overlay carries its own note state, separate from the frequency
plots'.** The user asked for the separation and it is right: the frequency plots answer
"where do these strings sit against the spectrum", the spectrogram answers "which string
and which of its harmonics are sounding, when". `state.sgFrets` / `state.sgHarm` are
therefore new state, not a reuse of `state.strings` / `state.stringHarmonics`. Neither is
persisted, neither enters `gsSettings` (a v4 decision to take once the shape has been used),
and neither reaches any export — they are UI state, and exports are data-only.

**Decision: the app never detects which notes were played.** Which notes sounded is
*intent*, so the user picks them; the overlay then draws what theory predicts and the user
judges whether the measurement agrees. This is the existing house rule ("facts come from the
data, intent comes from the user") pointed at a new surface, and it is what makes the
feature honest: an auto-detector would be answering the question the overlay exists to let
the user ask.

**Decision: the tracks are drawn in `STRING_COLORS`, unthemed, unlabelled.** The overlay is
a data colormap in the same sense the magma spectrogram is, so it is pixel-identical in
Bright and Dark (verified by census, not by eye). Halo is black at 0.55 — the only stroke
that survives both the magma floor and its ridges. No text: the right-edge string markers
are already the reference and the plot has no room.

**Verification, recorded because it is what makes the claim "generative model" more than a
metaphor.** The demo pair is exactly the six open strings, so the overlay's prediction has a
right answer. With `?sgnote=0` the six track rows were located in the rendered pane, then
luminance was read at those rows in the overlay-**off** image against ±10/±14 px neighbours:
all six rows are local maxima. The prediction sits on the measured energy. Separately, a
pixel census proved each string paints only its own hue — which caught a real defect: the
builder passed `notePartials()` the single selected note, giving every partial `key === 0`
and therefore one colour for every string. `sgramModelFor()` now hands it a six-slot array,
and `tests/r5.test.js` grew a 76th assertion (mutation-checked against two spellings of the
bug) so the gap that allowed it is closed.

**Open taste call, raised rather than settled.** `exportSgramPNG()` blanks `state.sgFrets`
in a `finally`, so an exported spectrogram carries no tracks — consistent with every other
export (no strings axis, no harmonics, data only). The counter-argument is real: a picture
of an overlay is arguably the point of exporting it. Left to the user.

## R5.1a — the user's legibility pass (session 20)

The user visually tested R5.1 and returned four items. All four are built; the two that are
*decisions* rather than repairs are recorded here.

**Decision, reversing the taste call directly above: a PNG is a picture of what you are
looking at.** The user's answer was *"i woiuld like any export of PNG to include the
visualization"*, and it was taken in the broad reading rather than the narrow one:
`exportPNG()`, `_cardPng()` and `exportSgramPNG()` no longer blank `state.strings`,
`state.stringHarmonics` or `state.sgFrets`, so **every** PNG now carries the strings axis,
the shown harmonics, the ✦ coincidence marks and the spectrogram overlay as drawn. CSV and
JSON are untouched and stay data-only, and `_cardStateFor()` still narrows what settings a
card records. The line is now: **PNG = the view, CSV/JSON = the data.** This retires the
release-hardening rule "exports are data-only" for the PNG half only, and the gate asserts
the inverse of what it did — none of the three exporters may assign to those state keys.

**Decision: the track hues are lifted for the surface they are drawn on, not for a theme.**
The first written rationale claimed the unlifted hues were lost in the magma ridges; a pixel
census said otherwise, and the rationale was rewritten to match the measurement rather than
the other way round. 94.8 % of track pixels have both vertical neighbours below 0.18
relative luminance — a track is read against **its own black halo**, not against the image.
The palette's luminance is 0.36–0.56, clearing that halo by a contrast ratio of only ≈3.4;
`_trackColor()` runs each hue through `liftForDark(rgb, 0.62)` for ≈4.8, and the six stay
hue-distinct. The lift is identical in Bright and Dark, so **data colormaps never theme**
still holds — this is per-surface, not per-theme, the same distinction the diverging
difference endpoints already make.

The other two items were repairs with numbers behind them: the spectrogram panes went 230 →
**372 px** (166 → 308 px of actual plot for 60 Hz–20 kHz on a log axis; 288 px under
`max-width:900px`), and the harmonic-count select now names what it counts, carries a
tooltip, and ships `disabled` until a note is overlaid — with `select:disabled{opacity:.4}`
so that state is visible. Gate: `tests/r5.test.js` 76 → **102**, every new assertion
mutation-checked the day it was written.

## The spectrogram difference pane, removed (session 21, user report)

The user looked at the sgram difference pane and named its premise: it subtracts the two
spectrograms **cell by cell at shared file time**, which only says anything if both takes
play the same section, start together, and hold the same tempo. Two real performances of the
same riff drift within a bar, and after the drift every pixel compares one note against a
different note. The number it printed was well-defined and meaningless.

**Decision: delete rather than patch.** There is no honest reading of a naive subtraction of
unaligned time axes, and a caveat under the plot would not have made one. `sgramCanvasD`,
`buildSgramDiffModel`, `drawSgramDiffScene` and `attachSgramDiffCrosshair` are gone (≈290
lines). What was kept: `sgramDifference()` in block 0 — pure, node-tested math the warped
replacement will call *after* the warp — and its CSS, left inert rather than churning a
stylesheet the gate hashes. What survives as the comparison: the **LTAS Difference**
(`diffCanvas`), which needs no alignment because a long-term average spectrum is
time-invariant by construction. That is why it was the original difference view.

The replacement — an onset-warped / beat-aligned (DTW) difference that maps one file's time
axis onto the other's onset grid before subtracting — is recorded in docs/ROADMAP.md as
deferred until after R6. It is a real feature, not a consolation: it is the version whose
number means what the picture implies.

## R5.2 — a chord, from a picker (session 21)

R5.1 could overlay one string. One note's partials rarely collide with anything; the picture
worth looking at is a **chord**, where several strings' harmonic series interleave and the
merge is visible in the image *before* anything is marked. That ordering is deliberate —
R5.3's ✦ clusters name what the eye has already found.

**Decision: a chord is stored as fret offsets, never as pitches.** `SG_CHORDS` stocks eight
open shapes (E, Em, A, Am, C, D, Dm, G) as six-slot fret arrays with `null` for a muted
string; the pitch comes from `tuningMidi(state.tuning, state.customOffset)[si] + fret`
through the same ET formula everything else uses. So the shapes **move with the tuning** —
pick Drop D and the E shape sounds what those frets actually sound, which is the physically
true answer and also the more interesting one. Storing MIDI numbers would have frozen the
chords in E standard and quietly lied under any other tuning.

No new state and no new draw code: `state.sgFrets` was always six slots, and R5.1 merely
never filled more than one. `sgramModelFor()` hands `notePartials()` the **six-slot** array
(the R5.1 trap: `key` indexes what it was given, and `key` picks the hue), so a chord paints
six hues for free.

**Gate.** `tests/r5.test.js` 102 → **128**, `tests/headless.js` 40 → **45**, plus the new
gate-only hook `?sgchord=<name>` — the canvas is unreachable from node, so headless reads
`data-sgcomb` (sounding strings × harmonic limit): `E` → 36, `D&sgharm=3` → 12, and an
unstocked name overlays nothing, because the hook mutes all six slots before it resolves.
One assertion had to be tightened after mutation testing: `state.sgFrets.map(… + fr)` was
loose enough that hard-coding the open notes still passed, so the test now captures the
tuning variable's own name from `const <v> = tuningMidi(state.tuning` and requires
`<v>[si] + fr` inside the map body. Every new assertion was mutation-checked the day it was
written.

## R5.6 — the overlay says which harmonic, and lets you follow one comb (session 22)

The user tested R5.2 and sent three items in one message: label the harmonics so the label
itself says which harmonic it is, and — because 36 tracks look congested — two ideas, "both
can be implemented with some tunable parameter (in the UI for debugging)": a translucent
sheet over the spectrogram with the lines drawn on top of it, and click-and-hold on a line to
highlight the comb it belongs to while the rest dim. Item 1 of that message (marking comb
collisions) was already spec'd as R5.3; these three became **R5.6** and were built **first**,
because R5.3's ✦ marks must land on whatever legibility scheme wins.

**The label's `=` versus `≈` is a decision, not formatting.** `partialLabel()` prints
`E2 ×3 = B3` when the partial lands inside R3's `COINCIDENCE_CENTS` tier and `E2 ×5 ≈ G♯4`
when it does not. The 5th harmonic sits 14 ¢ below the tempered note that shares its name
(docs/THEORY.md §1, §5); writing `=` there would assert something false about equal
temperament in an app whose whole subject is the gap between the ratio and the fret. The
fundamental prints alone — `E2 ×1 = E2` is arithmetic, not information. *(The user's own
example, `C2 × 2 = (C4)`, was off by an octave — doubling is one octave, so `C2 ×2 = C3`. Said
so and shipped the correct arithmetic.)*

**This reverses R5.1's "no labels".** That rule was right while one string could be overlaid:
six hues in left-to-right order said everything a label would. A chord interleaves six combs,
and hue alone cannot then say *which harmonic of which string* a line is. The overlap guard
is M2.6c's — highest-frequency first, skip anything within 12 px, never smear.

**The scrim is gated on the comb.** With nothing overlaid there is no sheet, at any setting.
A dimmed spectrogram with no prediction on it would be a picture lying about its own
contrast; the gate asserts `?sgscrim=90` with no overlay is pixel-identical to no scrim.

**Focus follows the comb, not the line.** The hit test finds a partial; the state records its
**string**. Following one line of a harmonic series would answer a question nobody has —
the series is the object. A drag past 3 px hands the gesture to the existing zoom box, so
holding a comb never costs a zoom.

`sgScrim` / `sgDim` / `sgFocus` join `sgFrets` / `sgHarm` as spectrogram **view** state:
unpersisted, never exported, not part of M2.7's refine cache key. The gate carries that as an
inverted contract — no exporter and no settings writer may assign them. `tests/r5.test.js`
128 → 180, `tests/headless.js` 45 → 56; every new assertion mutation-checked the day it was
written.

**A gate-reliability finding, recorded because it will recur.** Two M2.7 assertions went red
during this build. They were environmental: with a runaway indexer at 99 % CPU (load 5.7) the
headless decode/draw race missed 7 launches in 8 on an **unmodified** checkout, and 0 in 8
once the machine settled. The fix was diagnostic, never a weakened check — `domDrawn` and
`shotDrawn` now report which launch succeeded and shout when the whole retry budget passed
undrawn. A loaded machine must read as a loaded machine, not as an unwired attribute.

## R5.3 — the marks say where two strings meet (session 22)

The user's first item from the R5.2 test message, built after R5.6 because the marks have to
sit on top of whatever legibility scheme wins. A chord is several harmonic series interleaved;
the ✦ says **where two of them arrive at the same pitch**. One mark per `partialClusters()`
cluster, never one per pair — three strings landing on one frequency is one event.

**The chord reads itself backwards out of the landing.** Every member of a cluster satisfies
`f = f_i × h_i`, so the fundamentals go as `1/h_i`: invert the harmonic numbers, clear the
fractions, and whole numbers fall out. `clusterRatio()` does exactly that, one member per
string at its **lowest** colliding harmonic (the higher ones are that same arrival doubled).
Octave duplicates fold before naming, so an open C whose top string doubles at 10 is still
4:5:6 — but only exact power-of-two duplicates fold, and only the ratios docs/THEORY.md fixes
get names (4:5:6 major §1, 10:12:15 minor §4, the five plain intervals). Anything else returns
a null name and the copy **says nothing rather than improvising physics**.

**One detector, two tiers, no new tolerance.** `sgramModelFor()` calls `partialClusters(comb,
TEMPERED_CENTS)` — R5.0's primitive at the wider tier, because a fretted chord in equal
temperament misses just intonation by up to ~16 ¢ and a meeting the ear fuses is still a
meeting. The cluster carries its own `tier`, so the mark distinguishes a locked landing
(filled) from a tempered near miss (hollow) without a second detector and without a control.

**The mark takes no side.** The landing belongs to neither string, so it wears no guitar
accent and no themed ink: a fixed light cream over a black halo, because it sits on the magma,
which is dark in both themes. Drawn as a path (`starPath`, R = 8), never the ✦ glyph — the
session-15 chevron lesson. That fixed literal appears nowhere else in the app, which is what
makes a pixel census of the marks possible at all.

**Spread along time, per the user's suggestion — and thinned on the right axis.** Frequency
sets `y`; `x` is spread evenly across the pane and means nothing, which is why the status chip
names the click rather than a time. The string labels' vertical 18 px guard would be the wrong
guard here (two landings a quarter-octave apart sit half a pane apart horizontally), so the
thinner is an **x-stride**: keep every mark while the spacing clears a mark's own width, stride
past some once a dense chord packs them tighter. Skip rather than smear, measured on the axis
that actually smears. The pane therefore publishes **marks drawn**, not clusters found.

**Gate.** `tests/r5.test.js` 180 → **232**, `tests/headless.js` 56 → **64**, and a third frozen
copy block (`collision clusters: the ✦ popover (R5.3)`, SHA `1da64ae2…`) — `verify.sh` now
carries three. Through real Chrome: no overlay → no attribute and no marks; `sgharm=1` → 6
partials and **no** marks, because a chord's open strings are never the same pitch; `sgchord=E`
→ 11 marks per pane out of 36 partials; `sgchord=C` → **8**, so a build that marked a constant
(every landing of the tuning, say) would print the same number twice and fail. A census of
star-sized near-cream blobs binds the picture to the attribute — 22 drawn = 2 × 11 counted —
and falls to 10 when one comb is held at `?sgdim=95`, because the marks fade with the combs
they belong to. Every new assertion mutation-checked the day it was written; one pairing had to
be re-run because a mutation that removed the write path **masked** a second mutation under
test.

One harness fix rode along, and it is the standing rule applied once more: the pane-B
assertion above read `[null]` on a loaded machine because the launch predicate waited only for
**pane A**'s overlay. A predicate must read what the assertion reads — so it now waits for
both panes (`bothCombed`), still strictly weaker than the assertion it guards. No assertion was
weakened.

## The look pass — five colormaps, and a line the colormap cannot make (session 23, user request)

> "Few things lets make quick changes without too much rigorous testing to experiment with
> first to nail the color before we do anything complicated. a. Lets add a couple of
> perceptual colormaps for the spectogram including parula, viridis etc. b. The line used for
> frequency comb, lets have options for colors that are not part of the colormap and very
> distinct, e.g. "black" in the parula would work great and we wouldn't need any halo or other
> effects thatt makes the lines look much thicker and ugly. Lets also have options for the
> dotted patterns, by default we should have a finer dotted pattern."

The user's own diagnosis, and it is the right one. R5.1a widened the tracks (halo 3 → 5 px,
line 1.5 → 2.5 px) because a census said a track is read against **its own halo** rather than
against the magma. That census was true and the conclusion followed from a premise nobody had
questioned: that the track's hue is one of the six string colors, which live *inside* the
colormap's own gamut and therefore need something black underneath. Change the premise and
the whole width goes away. A hue no perceptual colormap ever produces separates itself — one
stroke, 1.4 px, no halo at all. The user reached for black on parula; the reason it works is
that a perceptual colormap by construction never reaches its own extremes.

**Explicitly framed as an experiment.** The rigour was relaxed for the look, not for the gate:
the contracts added are exactly the ones that would rot silently — a colormap that isn't
perceptual, a halo that quietly becomes unconditional again, a default dash that drifts back
to `[6,4]`, a line style leaking into the refine cache key. Nothing was added to assert taste.

**(a) The colormaps.** `CMAP_HEX` / `CMAP_NAMES` / `cmapTable()` / `cmapColor()` join block 0
beside `MAGMA`. `magma` stays first, stays the default, and — this mattered — keeps both its
name and its table: `MAGMA_HEX`, `MAGMA` and `magmaColor()` are byte-identical, so
`tests/dsp.test.js`'s existing colormap assertions and every old caller read what they always
read. `inferno`, `viridis` and `cividis` are matplotlib 3.10.1 verbatim; `parula` is MATLAB's
default via OpenCV's `COLORMAP_PARULA`. `cmapTable()` builds the flat 768-byte table lazily
and caches it, and an unknown name falls back to magma rather than throwing.

**"Perceptual" is measured, not asserted.** The gate computes CIE L\* from each table's own
sRGB triples and requires the last entry to clear the first by > 55 and no step to fall back
by more than 2.5. Measured: magma 0.1 → 97.9 and inferno 0.1 → 98.0 (both strictly rising),
viridis 14.9 → 90.9 (−0.03), cividis 13.8 → 91.3 (−0.01, and colorblind-safe by construction),
parula 24.2 → 95.6 (−0.17 — the least uniform of the five, kept because its mid-blues are
exactly what leaves a black line legible). A rainbow cannot pass this; that is the point.

**(b) The track color, and the halo it retires.** `SG_TRACKS` in block 4 offers the R5.1
`string` hues plus four fixed colors (black, white, cyan, magenta). The draw pass reads
`halo = !tk.rgb` — the halo is *exactly* the statement "this hue lives inside the colormap",
never a style choice of its own. With `string` the pass is unchanged from R5.1a (5 px black at
α 0.75, then 2.5 px of `_trackColor`); with a fixed color it is one 1.4 px stroke and nothing
else. Fixed colors lose the per-string identity, which is the trade the selector makes
explicit rather than hides. Label outlines still get a contrasting stroke in every mode
(`tk.halo`), because text needs one regardless of what the line needs.

**(c) The dash.** `SG_DASHES` — `fine [1,3]` (the new default), `dot [2,4]`, `dash [6,4]`
(R5.1a's), `solid []`. At a 10 px period with six combs interleaved the dash was reading as
line *weight* rather than as pattern; at 4 px it reads as a dotted line. The fundamental stays
solid in every mode, because that distinction carries information (THEORY §1) rather than
decoration. This supersedes R5.1a's `[6,4]` and R5.1's "no labels, dashes carry the rank".

**Three selects in the sgram card head**, grouped as `Colors`. The colormap select is always
live; the track and dash selects ship `disabled` and are enabled by `syncSgHarmSel()` from
every door into `state.sgFrets`, exactly as R5.6's ranges are — an affordance, not help text.
`state.sgCmap` / `sgTrack` / `sgDash` are view state like the rest of R5.6: unpersisted, never
exported, absent from `_cardStateFor`. Hooks `?sgcmap=` / `?sgtrack=` / `?sgdash=`; panes
publish `data-sgcmap` always and `data-sgtrack` whenever a comb is drawn.

**The cache key had to split.** `sgramModelFor()` now keeps two: `gkey` is the analysis the
M2.7 refine asks for (`dbMax|dbMin|offset`, plus window and span), and `key = gkey + "|" + cmap`
is what the rendered image is cached under. Recoloring therefore repaints from the cached
analysis and **never re-runs an FFT**; the track color and dash reach neither key, because they
are drawn on top of the image rather than into it. The gate asserts this directly — a build
that put `sgTrack` in the refine key would make every restyle cost a re-analysis.

**Gate.** `tests/r5.test.js` 232 → **264**; the full seven steps green (dsp 171, r3 42, r4 60,
m27 51, r5 264, headless 64, four tamper guards). One existing assertion was invalidated
honestly rather than deleted: it matched a literal `setLineDash([6,4])` in the draw pass, which
no longer exists, so it now asserts the pattern comes from `model.dash` *and* that the
fundamental is drawn solid whatever the pattern is. All eleven new assertions were
mutation-checked the day they were written, and two initial **misses** were closed by
strengthening the assertion, never by weakening the mutation: the black/white check matched
only key names (now it requires the exact `[0,0,0]` / `[255,255,255]` triples inside their own
entries), and a colormap-name mutation was a no-op because `cmapTable()` falls back to magma
for an unknown name — replaced by real table corruption (parula's 256 triples reversed, then
shuffled; both caught by the L\* assertions). No new headless launch: the user asked for a
quick experiment, and each launch costs four to five minutes.

## R5.7 — nothing on by default, and colors that mean the chord (session 24, user request)

The user tested the look pass and returned six changes plus one about process, verbatim:
"*lets not show the open strings labeling or track by default on the spectogram. Rather, we
have an option in the overlay selector (default: None) to show "All open strings" and for the
harmonic selector (default: upto 6 harmonics) we also have a option for only the 1st harmonic
only … move the Harmonic labeling on the right side and outside of the plot itself but along
the vertical axis … make the default line style to "Dashes" … also have an option Triad, which
is a pallete of three colors corresponding to the 3 notes of a chord, while the harmonics of
each note share the same color … pre-populate a default set of three that are the most distict
perceptually and also with the highest contrasts with the Parula colormap as the background …
the "String Hues" is not itself a color but a modifier on top of whatever color … lets add a
checkbox option seperate for that (by default off). Also remove cyan and magenta … Also take
this opportunity to heavily simplify your testing and verificiation strategies.*"

**(a) The always-on pass is deleted, not switched off.** `drawStringMarkers()`, its sole call
site and `markers: tuningMarkers()` are gone from `index.html`. Six dashed horizontals and six
stacked labels drew on every pane from M2.5 onward whether or not the reader had asked about
open strings, and R5.1's overlay answers the same question better: on request, per string, with
its harmonics. A pane with nothing overlaid is now the measurement, the axes and the colorbar —
which is the house position (*measure first, never lecture*) applied to pixels.

**(b) `None` and `All open strings`.** The note select's off entry reads **None**; `fillSgNoteSel()`
prepends a second entry, `all`, that fills all six slots from the current tuning — the deleted
view, restored as a choice, and it moves with the tuning like `SG_CHORDS` does. The harmonic
select keeps 6 as its default and gains **1st harmonic only**, the honest form of the question
the deleted pass was answering badly. Hook: `?sgnote=all`.

**(c) Labels outside the plot.** `SGPLOT.mR` is now dynamic — `SG_MR_BASE = 98`, or
`SG_MR_LABELS = 150` whenever `model.comb` is non-empty — assigned before `pW` is computed, so
the plot rect shrinks and the labels get their own column instead of sitting over the
measurement. Each label draws at `SGPLOT.mL + pW`, preceded by a short leader tick in the
track's own color, the text in `cssRGBA("ink-rgb", 0.82)`: the tick is data and never themes,
the text is chrome and does. R5.6's 12 px vertical guard is unchanged — **skipped, never
smeared**. The consequence for anyone writing a pixel test: overlay-on and overlay-off are two
different layouts, so a diff between them can only prove *that* something changed. Compare comb
against comb.

**(d) Triad, measured rather than picked.** `SG_TRACKS` is now `{white, black, triad}`. Triad
paints by **degree, not by string**: `triadDegrees(midis)` in block 0 reduces the sounding notes
to pitch classes, finds the root whose stack the others sit on, and returns one slot per string —
`null` where silent, else `0` root / `1` third / `2` fifth — so every harmonic inherits its
note's color and a six-string chord reads as three voices rather than six. The user asked for
"most distinct perceptually and highest contrast with parula", which is a measurable claim, so it
is measured: `SG_TRIAD_DEFAULT = #ff4400 / #00ff00 / #cc00ff` has a minimum pairwise CIE-Lab ΔE
of 145.7 (the gate demands > 90) and each color's minimum ΔE to any of parula's 256 entries is
> 40. Three `<input type="color">` pickers ship `disabled` and are enabled only under Triad, by
`syncSgHarmSel()`, like every other overlay control since R5.1a. Hook:
`?sgtriad=RRGGBB,RRGGBB,RRGGBB`.

**(e) String hues is a modifier.** It never was a color — it is "tint by origin", orthogonal to
"which voice is this". `state.sgHue` (default **off**) is a checkbox; `_trackPaint(model, key,
alpha)` resolves the base color and, when the modifier is on, mixes it toward `_trackHueRgb(si)`.
**The halo followed it**: the look pass had `halo = !tk.rgb` ("this hue lives inside the
colormap"), and the draw pass now reads `halo = !!model.hue` — a fixed or triad color is one
1.4 px stroke, a string-tinted one keeps R5.1a's 5 px black. Cyan and Magenta are removed.
Hook: `?sghue=0|1`; `?sgtrack=` validates against `white|black|triad`.

**(f) Default dash back to `[6,4]`.** The look pass chose fine `[1,3]` against a plot that could
hold thirty-six lines with labels on top of the image; with nothing on by default and the labels
outside, the heavier dash reads better, and the user asked for it by name. `SG_DASH_NAMES` orders
the select `dash / dot / fine / solid`. The fundamental is still always solid.

**(g) The process change, made durable.** The user's last sentence is a standing instruction, so
it is written into docs/ROADMAP.md's "Working discipline" as **Verification, in proportion**:
exact counts get pinned in the node suites where a run is free, headless assertions are
*relational* (B's pane equals A's; C's chord marks fewer than E's) because a Chrome launch costs
four to five minutes; sections that can share a page load are merged; the full gate runs **once**,
at sign-off, not after each edit; new assertions are mutation-checked one line each rather than
swept; and a suite is allowed — expected — to shrink when the feature does.

**Gate.** `tests/r5.test.js` 264 → **259** and `tests/headless.js` held at **64** while three of
its assertions were rewritten from constants (`data-sgclusters` = 11 on A, 11 on B, 8 for C) to
relations, with the exact numbers kept in the node suite; two overlay pixel sections merged into
one layout-stable section, cutting six launches to four. Full run green: dsp 171, r3 42, r4 60,
m27 51, r5 259, headless 64, four tamper guards.

## Quality-of-life batch a/b/c (session 25, user request)

Three small items the user asked to lump into a sub-milestone of their own. All three are
about *reading* the plots, not about new measurement — no DSP changed, and no educational
claim was invented (the one piece of new prose is a node map lifted from docs/THEORY.md §6.1).

**(a) Every card says which color is which.** A `.abkey` strip — one `.abchip` per loaded
source, the letter in that guitar's accent, the file name beside it — is inserted by
`syncAbKeys()` into each of the six analysis cards listed in `AB_KEY_CARDS`
(`verdictCard`, `freqCard`, `toneCard`, `eqCard`, `sgramCard`, `envCard`). It goes in as a
**sibling after `.cardhead`**, never inside it: M2.6d made the whole head a fold target, and a
strip inside it would collapse the card on every click. `verdictCard` has no head, so it gets
`afterbegin`. The strip is rebuilt from `updateVisibility()` and from `applyUserColors()`, so
it follows both the source count and a user recolor.

**The EQ card's "Target" is renamed "Reshape", and the fitted response takes the reshaped
guitar's color.** The user's reasoning is the correct one: the guitar being reshaped is the one
in their hands. `buildEqModels()` now emits `colorFit: COLORS[fit.src]` (was the destination's)
and `legendTarget: "reshape A: B − A (1/6 oct)"`; the magnify title and `renderEqNote()` follow.
Nothing in the fit math moved — the curve was always `dst − src`; only the label and the hue
now say whose curve it is.

**(b) Solid fundamentals, dashed harmonics, in a color the user owns.** `drawStringAxis`'s
vertical pass splits on `m.harm > 1`: an open string draws solid at 1.4 px and alpha 0.85, its
harmonics dashed `[5,4]` at 1 px and alpha 0.55, both in `_stringColor(m.si, …)`. The line
style carries "measured note vs predicted overtone"; the hue carries "which string".

The hue is now **user-settable and remembered**. `state.stringColors` (six hex strings, seeded
from `STRING_COLORS`) is read by `_stringHex(si)` and therefore by `_stringColor` and
`_trackHueRgb` — one override, every consumer. The control is a `Line color` row at the top of
the open-string popover: an `<input type="color">` that previews live on `input` (repaint plus
the popover's own dots) and commits on `change`, beside a `Default` button. Commit persists,
then re-renders the popover, because R4's ancestry section also draws a dot for the *adjacent*
string and a blanket dot rewrite would recolor the wrong one. `gsSettings` goes **v3 → v4**;
v1–v3 payloads still load, and `j.stringColors` is hex-validated per slot before it is trusted.

**The popover now offers harmonics 2–8** (`HARM_MAX = 8`, `HARM_SLOTS = HARM_MAX - 1`; the
per-string grid, the settings payload and every loop are sized from those constants rather than
from literals). The documentation was extended with it: `harmonicIntervalPhrase` already read
6/7/8 correctly through `octaveFold` (an octave and a fifth / two octaves and a harmonic seventh
/ three octaves), so only `HARM_NODES` needed new entries, taken verbatim from docs/THEORY.md
§6.1 — the 6th shares the 3rd's 7th fret, the 7th's nodes all fall between frets because 7 is
prime, the 8th shares the 4th's 5th fret.

**R3's coincidence set is unchanged by the widening, and that is geometry rather than luck**:
harmonic 5 sits 27.86 semitones above its fundamental (6 → 31.02, 7 → 33.69, 8 → 36), and the
widest open-string span in any stocked tuning is 26 (Drop D). Nothing above the 4th harmonic can
land on an open string, so `findCoincidences()` returns exactly what it returned before. The
comment above `HARM_NODES` records this, so the inert entries are not mistaken for live paths.

**Two frozen copy blocks were re-frozen by their author.** R4's `harmonicRowNoteHtml` range gate
went `h>5` → `h>8`, and R3's `HARM_NODES` gained three entries. The freeze exists to stop a
delegated builder rewriting reviewed physics, not to stop the reviewer who wrote it from
extending it; both new SHAs carry a comment in `tests/verify.sh` saying which change and why.

**(c) The harmonics are labeled on the line plots too.** A third pass in `drawStringAxis` prints
`partialLabel(m, state.a4)` — the spectrogram's own wording, so the two views cannot disagree —
in the string's hue over a 3 px `--panel` halo, with the same skip-rather-than-smear rule as
every other label in the app (11 px here).

**Deviation from the brief, deliberate:** the user asked for labels "towards the bottom" of the
plot, and R5.7 put the spectrogram's labels horizontally outside the plot. These are **rotated
−90°, reading up from the bottom axis**. Horizontal text cannot work here: with six strings ×
seven harmonics the plot can carry forty-two verticals, several of them within a few pixels on a
log axis, and horizontal labels would be skipped almost everywhere. Rotated, the guard rejects
almost nothing. This reverses R5.1's "tracks carry no labels" for the **line plots** only; the
spectrogram's own labels are unchanged.

**Gate.** The three items are guarded by 16 source-read assertions appended to
`tests/dsp.test.js` (171 → **187**) rather than by a new suite and a new `verify.sh` step —
"Verification, in proportion". All 16 were mutation-checked; three initially survived and were
strengthened: the `drawStringAxis` slice is now **brace-matched** (the next top-level `function`
is thousands of characters away, so the old slice swallowed unrelated code and stopped failing),
the label-skip assertion pins the guard expression rather than the words around it, and the
`_stringHex` assertion reads that function's **first return**. Full run green: dsp 187, r3 42,
r4 60, m27 51, r5 259, headless 64, four tamper guards.

## Small changes a/b/c (session 26, user request)

Three items from one message: a shelf glyph that contradicted its own name, a set of
defaults the user re-set after looking at real material, and a key for the collision marks.

**(a) The shelf icons could not tell a low shelf from a high one.** The user's report —
"the icon used for HI SHELF … is the same as LOW SHELF, that cannot be accurate" — was
correct, and the question inside it deserves a plain answer: **no**, "low" and "high" do
not mean cut and boost. A shelf names **which side of its corner frequency** it acts on,
and it boosts or cuts by the **sign of the fitted gain** — the fit can hand a low shelf
either sign. The glyph was drawing both curves floating on the box's centre line, so a
LO SHELF cut and a HI SHELF boost came out as the same picture. `drawEqShapeGlyph` now
strokes a faint 0-dB reference (`cssRGBA("ink-rgb",0.16)`) across the box and **anchors
the flat half of each shelf on it**: a low shelf leaves the reference flat on the right
and departs on the left, a high shelf the reverse, with `dy = up ? -5 : +5` carrying the
direction. Name and picture now agree in all four combinations. No fit math moved.

**(b) Defaults the user set after seeing them.** The colormap default is **parula** and
the selector reads `Parula, Viridis, Cividis, Magma, Inferno` (`CMAP_NAMES` reordered;
`_CMAPS` stays pre-seeded with `MAGMA`, so magma remains byte-identical and free, and
three internal fallbacks moved off the literal `"magma"` onto `CMAP_NAMES[0]`). Sheet
legibility defaults to **10 %** and hold fade to **80 %** (`state.sgScrim 0.10`,
`state.sgDim 0.80`, with the HTML `value=`/`<output>` pairs matched). `SG_TRACKS` gains
**Bright yellow** and **Bright red** as fixed colors, and the Triad default becomes
**white / bright yellow / bright red** for root / third / fifth.

**String hues is now genuinely a modifier.** It was mixing at 0.62, which mostly replaced
the chosen color; it mixes at **0.30**, so the choice survives and the string is a tint on
top of it, which is what the checkbox says.

**A measured floor gave way to a stated choice, and the cost is written down.** R5.7 chose
the Triad defaults by measurement: minimum pairwise CIE ΔE > 90 *and* ΔE > 40 against every
entry of parula. White/yellow/red keeps the first (min pairwise **97.0**) but breaks the
second: parula **ends** in bright yellow (`#f9fb0e`), so the third's track measures **ΔE
2.8** from the hottest cells and will disappear inside them. The user named the palette
outright, and a stated choice outranks a measured one — so `tests/r5.test.js` now pins the
three colors by name instead of enforcing the background floor, with the 2.8 recorded in
the assertion's own comment rather than hidden behind a rule the palette no longer meets.

**(c) The collision marks now carry a key.** A filled ✦ and a hollow ✦ cannot say what they
mean by themselves. The R5.3 pass, after placing the marks, draws both of them again above
the plot — **as the pane draws them**, halo and all, each on an 18×18 chip of
`cmapColor(cmap, 0.05)` because a cream star on a cream panel is nothing — labelled *"same
pitch — inside 6 ¢"* (the number printed from `COINCIDENCE_CENTS`, never typed into a
caption) and *"a near miss — you hear it beating"*. It skips rather than smears if the row
would run past the plot's right edge.

The row lives in a **dynamic top margin**: `SG_MT_BASE 30 → SG_MT_KEY 52`, set at the head
of `drawSpectrogramScene` before `pH` is derived from it, exactly like `SG_MR_BASE →
SG_MR_LABELS`. It keys off **`model.clusters`, the whole set** — deliberately not the marks
that survive this pane's zoom window — because `SGPLOT` is a module-level singleton written
by whichever pane draws last and read *live* by `attachSgramCrosshair` and `_sgTrackAt`: a
margin that varied per pane would let the crosshair measure one pane's pixels against
another pane's geometry. A pane with no clusters keeps `mT = 30` and is layout-identical to
the shipped build.

**Gate.** `tests/r5.test.js` 259 → **267**: the two re-set ranges, the widened track roster,
the named Triad palette, the colormap order, and eight contracts for the key — that it draws
real marks rather than describing them, prints the tier constant, chips them against the
colormap's own floor, and that the margin is dynamic, pane-invariant and set before `pH`.
All new and changed assertions were mutation-checked. The key is drawn on canvas, **outside**
the R5.3 sentinels, so no frozen copy block moved. Full run green: dsp 187, r3 42, r4 60,
m27 51, r5 267, headless 64, four tamper guards.

### 2026-08-26 — R5.5: near-floor disclosure on the LTAS Difference (session 26, user request)

The user's release gate: *"R5.5 is important cavaet as after that I can truly release this to
the public as a reliable tool to compare guitar tones and learn about harmonics."* Built here,
not delegated (≈70 lines).

**The contradiction it answers.** Above ~10 kHz the demo pair shows several dB of per-bin Δ on
the LTAS Difference while Band Energy reports a 0 % share for the same band. Both are correct:
the Difference is a **log-ratio per bin**, indifferent to how small its operands are; the share
is a **linear power integral**, and two tiny numbers integrate to nothing. The large Δ is a
difference *of silences*. A user comparing two guitars reads that as a real tonal difference,
which is precisely the kind of unreliable claim the release gate is about.

**The decision: disclose, never correct.** The Δ stays raw. Where both curves sit on the floor,
the plot says so — the segment draws faint and dashed and the status chip names the floor it
used. The alternative, a loudness-weighted Δ (A-weighting or a sone/ERB specific-loudness
integral), folds the judgement into the number and replaces a defensible measurement with a
modelled one; it stays deferred in ROADMAP.

**The predicate is dual, and the looser floor wins.** `nearFloorDb(a,b) =
max(NEARFLOOR_ABS_DB, peak − NEARFLOOR_REL_DB)` at `-60` dBFS and `45` dB. Absolute catches
what no monitoring level reveals; relative catches what is buried under its own spectrum's
body. The **max** means a hot take is judged against its own peak and a quiet one against full
scale. The peak is scanned across **both** curves so the predicate is symmetric in A and B, and
a bin is marked only when **both** curves are under the floor — one curve alone under it is a
real, audible difference.

**Three deviations from the ROADMAP spec, all deliberate and all recorded there.**
1. The footnote prints the **measured** floor (`dashed = both below -60 dB (≈ inaudible)`)
   rather than the spec's static caption — every visible number defensible; a bare "near floor"
   is an unexplained verdict.
2. The near-floor **fill** dims 0.20 → 0.06 as well as the line. The spec named the line, but
   the sign-split fill is what shouts *big difference here*.
3. `NEARFLOOR_MIN_RUN = 4` was added after visual testing: single-bin dips drew as 1-px light
   streaks through the solid fill at 10–13 kHz. The despeckle lives **in the predicate**,
   because the physical claim is the same as the fix — a lone bin under the floor between
   audible neighbours is a notch in an audible region, not a floor region — which keeps it pure,
   node-testable, and keeps `data-nearfloor` describing exactly what is drawn. The log grid runs
   ≈84 points/octave, so 4 points ≈ half a semitone; the demo pair went 61 → 58 marked points.

**Back-compat.** With nothing near the floor the run walker collapses to `[[0,N,0]]` and the
render is byte-identical to the pre-R5.5 plot, so every existing headless pixel assertion held
and R5.5 needed no new Chrome launch.

**Gate.** `tests/r5.test.js` 267 → **284** — 6 pure-math assertions plus 11 source-read wiring
contracts, one of them **inverted** (no delta value may be rewritten after the mask is built).
All mutation-checked in a single batched driver, 14 single-anchor mutations, each killing
exactly its target; two assertions first passed vacuously against an empty regex slice and were
strengthened. Per the user's standing instruction to *"heavily simplify your testing and
verification strategies"*: no new suite, no new `verify.sh` step, no new headless launch. Full
run green — dsp 187, r3 42, r4 60, m27 51, r5 284, headless 64, four tamper guards.

**A note on the `tests/` guard.** Step 7 diffs `"$BASE...HEAD" -- tests/`, a *commit-range*
diff, so it reports a reviewer-authored test change once it is committed. That is the intended
behaviour — the guard exists so a **delegated builder** cannot edit the tests it must pass; the
reviewer may, and records the change here, as with every prior reviewer commit.

---

## Q3 — the same floor in three cards (2026-08-26, session 26)

R5.5 disclosed the near-floor only where it was first noticed, on the LTAS Difference plot. The
user read the other two cards and found the same contradiction printed twice more:

> "what about the "Band Energy" card, e.g. in one case the String Zing, and Air has 0% energy but
> difference is +6.7 dB?"

> "when we are summarizing things "AT A GLANCE" we need to be careful about the differences when
> they are audible … the String Zing part is ~0% energy, but the difference (likely within the
> silence) is 6.7 db and the At a glance says … *Their widest spectral gap is String zing
> (5–10 kHz), where SG runs 6.7 dB hotter* … which sounds misleading"

Both are the R5.5 defect — a log ratio quoted beside a linear power integral without saying that
both sides are silence — and both take the R5.5 answer: **keep the raw Δ honest, disclose
inaudibility, never warp the number.**

1. **`fmtPct` no longer rounds a real share to zero.** Under 0.05 % it prints `< 0.1 %`. A high
   band on an electric guitar genuinely can hold 0.04 % of the energy; `0.0 %` asserts *absent*,
   a different and false claim, and was half of why the row read as self-contradictory. All six
   callers are shares of energy, so the change is safe centrally.
2. **One predicate, never two.** `nearFloorBands()` calls R5.5's `nearFloorMask()`/`nearFloorDb()`
   on `displayedDb(0)`/`displayedDb(1)` — the settled curves, not `dispDb`, which may be
   mid-animation — and returns `{floorDb, onFloor}`. The Band Energy table and the verdict's
   region scan both call it, so the cards cannot disagree about which bands are silence. A band
   counts as floor only when **every** grid point inside it is masked: one audible point inside
   the band makes the band audible.
3. **The table discloses per row.** A floored Δ cell takes `.delta-floor` (dim, `opacity:.45`)
   rather than its A/B color, carries a `title=` naming the measured floor, and the footnote
   gains one sentence printing that floor — the same floor the Difference plot's status chip
   prints. `data-nearfloor-rows` is set only when some row is floored: absent, not `"0"`, like
   `diffCanvas`'s `data-nearfloor`.
4. **The strip never headlines a silence.** `biggestRegionDelta()` splits candidates so a floored
   band competes only with floored bands; the headline reads "their widest **audible** spectral
   gap"; and a floored band with a larger Δ gets its own sentence — *"Air (10–20 kHz) shows a
   wider 7.0 dB Δ, but both takes sit below −47 dB there — a difference of silences, not a tone
   difference."* Disclose, never hide, and never rewrite.

**One cost, flagged rather than buried.** The mask lives on the *display* curve (smoothed,
level-matched); the band table integrates *raw* Welch power. Binding them makes the table's
disclosure inherit the plot's smoothing setting. Accepted deliberately — one floor across the app
beats domain purity, because a user reading two cards is comparing claims, not domains. Its one
consequence is fixed: `setSmooth()` now re-renders the verdict and the band table, which it did
not before.

**Gate.** `tests/r5.test.js` 284 → **298**, all 14 new assertions mutation-checked in one batched
driver, including the inverted "no Δ is rewritten" contract. One mutation came back **inert**:
`indexOf("function nearFloorBands")` still matches a renamed `nearFloorBandsZ` — the
`setSmoothUI` prefix trap for the second time — so every body lookup in the section now includes
the `(`. The demo pair has no near-floor region at shipped thresholds, so both verdict paths were
proved through real Chrome against a scratch copy with `NEARFLOOR_ABS_DB` lowered to −47
(lowering `NEARFLOOR_REL_DB` cannot produce a partial floor: `nearFloorDb` takes the **looser**
of the two tests). No new suite, no new `verify.sh` step, no new Chrome launch.

## Q4a — the expanded view, truly expanded (1/2): the two interactions (2026-08-26, session 27)

The user's request, recorded and split at Q3: *"in the expanded view of the spectrogram, the
clicking of the collision markers, and Hold-Fade should also work interactively."* The magnify
overlay had `attachZoom` and nothing else — a spectrogram drawn at full screen where every
click target R5.3 built was inert and every hold R5.6 built was ignored. Four commits,
111 lines of `index.html`.

**The overlay is a surface, not a pane — and that is the whole design.** Everything else fell
out of taking that seriously:

1. **Its own hit array.** `magHits` beside `sgHits[0]`/`sgHits[1]`. The overlay draws at its own
   size, so a pane's rectangles are wrong for it by construction; reusing them would also leave
   stale targets live behind the modal. `drawMag()` empties `magHits` and calls
   `sgClearData(magCanvas)` before dispatching, so the six non-spectrogram views leave the
   overlay canvas carrying no spectrogram claims at all.
2. **One reporter, never two.** The pane loop's seven `setAttribute`/`removeAttribute` pairs
   became `sgSyncData(canvas, model, nLabels, hits)` with `sgClearData(canvas)` beside it, and
   the overlay's new `drawSgMag(i, ctx, w, h)` calls the same function on `magCanvas`. Two
   near-duplicates are precisely how a pane and the expanded view of that same pane come to
   disagree about what they are showing.
3. **The surface and the pane it shows are different things.** `attachSgFocus(i)` became
   `attachSgFocus(wrap, canvas, pane)` where `pane` is a **thunk**: the panes pass `()=>0` and
   `()=>1`, the overlay passes `()=>magKey==="sga"?0:magKey==="sgb"?1:null` and the hold is
   simply not offered when the expanded view is not a spectrogram. No math changed — `_sgTrackAt`
   already read the surface's own width and height. `state.sgFocus` is global, so a hold taken in
   the overlay redraws the panes behind the modal for free (`drawAll()` tail-calls `drawMag()`).

**Both ordering traps found while costing the task were real, and each cost one line.**
`.popover` is `z-index:60` against `.modal`'s `75`, so a cluster popover opened from inside the
overlay would have rendered *behind* it: `body.magopen .popover{ z-index:80; }` lifts it **only
while an expanded view is open** — left global it would also float over About / How to use /
the recording guide, which nothing asked for. And `escCascade()` closed `magModal` before
`popover`, orphaning it; the two are now swapped, because a popover over the overlay is the
innermost thing on screen. The CSS rule sits deliberately *below* the `.popover` block: a
`tests/dsp.test.js` contract reads the **first** `.popover{` in the stylesheet.

The hover cursor came along too — `magWrap` runs the same hit test the panes run in
`attachSgramCrosshair` and sets `help`, skipped while a drag owns the cursor (`attachZoom` is
bound to the same wrap). A click target the cursor doesn't announce is the defect M2.6d went
looking for.

**Gate, in proportion.** `tests/r5.test.js` 298 → **307** (source-read contracts for the new
bindings) and `tests/headless.js` 64 → **67** — `&mag=sga` folded into the **existing**
`sgchord=E` launch rather than adding one, since opening the modal cannot reflow the page
(there is no `body{overflow:hidden}` rule and headless runs `--hide-scrollbars`). Model-derived
attributes (`data-sgcomb`, `data-sgwin`) are asserted **equal** to pane A's; drawing-derived ones
(`data-sgclusters`, `data-sglabels`) only **non-zero**, because the 12 px label guard and the
mark x-stride measure the surface being drawn on and the expanded canvas is a different size.
No new suite, no new `verify.sh` step, no new Chrome launch.

## Q4b — the expanded view, truly expanded (2/2): the controls (2026-08-26, session 27)

The other half of the same recorded request: the expanded spectrogram should carry the card
head's *"Overlay, colors, Line style and the options in that row, and the Legibility Hold Fade
controls"*. Before this, opening the overlay meant losing every control that changes what the
overlay is showing — you could look closely at a prediction you could no longer adjust. One
commit (`990a5e7`), 83 lines added / 56 removed in `index.html`, the majority of which is four
control groups moving one indent level in.

**Move the live nodes; never copy them.** The four `.ctlgroup`s are wrapped in
`<div class="ctlmove" id="sgramCtlMove">` with a hidden `<span id="sgramCtlHome">` holding its
seat, and `syncMagCtls(key)` moves that wrapper into `#magCtls` (a new last child of
`.mag .mhead`) for `sga`/`sgb`, or back to the placeholder for anything else. The alternative —
cloning the cluster into the modal — needs the two copies kept in step forever, and every
`el()`-bound handler, every listener and every `syncSgHarmSel()` write would have to learn
there are two of each. Moving the originals means none of that code changes at all.
`syncMagCtls` early-returns when the wrapper is already in the right parent *and* position, so
the cold-boot `?mag=` hook and re-opening the same view are no-ops; `openMag()` calls it
**before** `drawMag()`, `closeMag()` calls it with `null`.

**`display:contents` is the mechanism.** At home the wrapper is layout-inert, so the groups
still lay out as direct children of `.controls`: the card head renders byte-identically — a
1440×4600 `?demo&open=all&sgnote=all&theme=bright` render has the same SHA-256 before and
after the change, which is the standard this project holds "no visual regression" to. At the
destination `#magCtls .ctlmove{display:flex}` turns the same node into a real wrapping row,
`.mag .mhead` gains `flex-wrap:wrap` with `#magCtls{flex:0 1 100%}`, and
`#magCtls:empty{display:none}` leaves the six non-spectrogram magnify views untouched.

**Q4b.2 needed no code, exactly as the estimate predicted.** All nine sgram handlers already
end in `requestDraw()`, and `drawAll()` tail-calls `drawMag()` — so a control changed inside
the overlay redraws the overlay. Nine source-read contracts now pin that, one per handler,
plus one on `drawAll`'s tail, so the wiring cannot rot silently.

**The two open decisions.** *(a) The exports do not travel* — `#sgramPngBtn` / `#sgramJsonBtn`
are not a `.ctlgroup`, the recorded split does not name them, and `exportSgramPNG` builds its
own canvas stack at a fixed size, so offering them beside the expanded picture would promise
"export what I am looking at" and deliver something else. **This one is the reviewer's
judgement, not a measurement, and is flagged to the user as such.** *(b) Folding the card while
its controls are away is a non-event*: `.card.collapsed .cardhead .controls{display:none}` only
hides nodes still in the card, and M2.6d's fold-toggle exemption list already covers every
moved control.

**Gate, in proportion.** `tests/r5.test.js` 307 → **324** (17 source-read contracts, all
mutation-checked and killed) and `tests/headless.js` 67 → **69** — a DOM-order pair folded into
the launches R5.3 already makes, asserting that at rest `#sgramCtlMove` precedes `#magCtls` in
the document and that with pane A expanded the very same node sits *inside* the receiver. No
new suite, no new `verify.sh` step, no new Chrome launch.


## Q5 — the strip answers both questions (2026-08-27, session 28, user report)

The user compared their own `SG.wav` and `Les_Paul.wav` and found the Les Paul sustaining
**≈1.6×** longer in the mids — and "At a glance" never said so. Their point is a product
point, not a bug report: sustain is one of the properties a guitarist actually *feels*, and a
summary that omits it while itemising spectral shape is answering half the question.

**The threshold was never the problem.** `proseCandidates()` already builds the sustain
sentence at `r >= 1.35`, so a 1.6× ratio cleared it comfortably. The strip simply printed
`cands[0]` — and of the ten ranked sentences, **six are spectral** and they carry the larger
multipliers (centroid `(r-1)*8`, warmth `(r-1)*4`, low end `(r-1)*3.5`) against the
time-domain ones (attack and sustain `(r-1)*2`, tightness `(r-1)*1.8`, dynamic range `d/4`).
A spectral finding therefore wins the single slot almost every time two guitars differ at all.

**Fixed by tagging, not by rescoring.** Every `cands.push({...})` now declares
`fam:"tone"` or `fam:"time"`, and `renderVerdict()` prints its leader and then
`cands.find(c => c.fam !== cands[0].fam)` — the strongest sentence from the *other* family,
if one cleared its own threshold. Rescoring was the obvious alternative and was rejected:
`proseCandidates()` is shared verbatim with the tone panel's prose (`cands.slice(0,4)`), so
re-weighting to promote sustain in the strip would silently reorder the detail paragraph too,
and every existing multiplier is a calibration nobody has a reason to disturb. The tag is
additive; no score, threshold or sentence changed. The invariant that made the strip
trustworthy in the first place — *one source, summary and detail cannot disagree* — is
exactly what the fix leans on.

A player asks two questions, "how does it sound" and "how does it feel". The strip now
answers both whenever the measurement supports both, and still says nothing it cannot
measure: with no time-domain candidate over threshold, the second sentence is simply absent.

**Gate, in proportion.** `tests/dsp.test.js` 187 → **193** — six source-read contracts on a
brace-matched slice of `proseCandidates` and `renderVerdict`: all ten pushes tagged, exactly
four in the `time` family, sustain among them **pinned by name** (the one the user missed),
its sentence printing the ratio a player would quote, and the two lines of family-aware
selection. All six mutation-checked the day they were written; one was strengthened after
review — the ratio assertion originally accepted a `×` from anywhere in the function, and now
reads a slice scoped to the sustain sentence. No new suite, no new `verify.sh` step, no new
Chrome launch. Verified in real Chrome besides: on the demo pair the strip now closes with
*"Demo — Warm's performance was captured with more dynamic range — 46.7 dB against 20.6 dB."*

## Q6 — every plot names both of its axes (2026-08-27, session 28, user request)

> *"without any testing can you make sure all the plots (spectrum, difference, the line plot
> in the EQ match card, spectogram, envelope) have their axes labeled properly."*

They had **units**, not labels. Each of the five printed a bare `Hz` at the end of its tick
row and a rotated `dB`/`Hz` up the left margin, and nothing named the quantity. On this app
that gap is real rather than pedantic: three different plots print `dB` on their y axis and
mean three different things by it — an absolute level, a **difference** between two levels,
and a filter's **gain**. The design brief is a laboratory instrument, and an instrument names
what it is measuring.

**One helper, so two plots cannot disagree about how an axis is named.**
`drawAxisTitles(ctx, w, h, P, xTitle, yTitle, xDrop, xRightText)` in block 3, immediately
above `drawAxes`. `P` is `PLOT` or `SGPLOT`, passed in rather than closed over, so the three
dynamic margins (`PLOT.mT` by vocabulary rows, `SGPLOT.mR` by comb, `SGPLOT.mT` by cluster
key) are read live at draw time like every other consumer. `drawAxes` gained a `yTitle`
argument and calls the helper itself; the spectrum passes `"Level (dB)"` and the EQ response
`"Gain (dB)"`. `drawDiffScene` draws its own grid and never calls `drawAxes`, so it calls the
helper directly with `"Difference (dB)"`, and so do `drawSpectrogramScene`
(`Time (s)` / `Frequency (Hz)`) and `drawEnvelopeScene` (`Time (s)` / `Level (dB)`).

**`PLOT.mB` 34 → 48 — the layout was the whole problem.** The x title has to sit *below* the
open-string names, which `drawStringAxis` writes at `PLOT.mT + pH + 20` with a 14 px click
rect: rows +18..+32 filled the old margin exactly. The title drops to +34 and the margin
grows to 48, costing 14 px of plot height on the four line plots (the 232 px Difference canvas
goes 164 → 150 px of plot). Cheap, and checked before it was made: every reader of `mB` —
scene builders, crosshairs, zoom hit-testing, the magnify overlay, the PNG exporters — derives
from the live object, and there is no hardcoded 34 anywhere. `SGPLOT.mB` **stays 34**: only
ticks live in it (rows ≈ +7..+20), so the spectrogram's title drops just +21 and fits.

**`xRightText` is "skip rather than smear" again.** The spectrogram already prints its zoom
note right-aligned on the x title's own row. The helper takes that text, measures it, and
skips the centred title if it would come within 10 px — the same rule the partial labels, the
harmonic labels, the string names, the ✦ marks and the cluster key all follow. On the demo
pair at `?zoom=sga:0.5,1.5` both print with room to spare; the guard is for a narrow pane or a
longer note. The line plots pass nothing — their zoom note goes into the top status chip.

**No test moved,** as instructed. Nothing in `tests/` asserted an axis unit string or
`PLOT.mB` beforehand, so the gate's counts are unchanged and no assertion was written or
weakened. Verified instead by reading all eight call sites, `node --check` on all five script
blocks, and a headless run of `?demo&open=all&strings=1&zoom=sga:0.5,1.5` with each of the
five plots cropped at full resolution and read — deliberately the two hardest cases included:
the spectrum with its open-string names sitting directly above the new title, and the zoomed
spectrogram with title and zoom note sharing a row.

### 2026-09-04 — M5 proposed: record directly into a slot (user request)
- **New milestone, unbuilt:** capture a take per guitar through a device picker
  and land it in the slot as if dropped as a file, decoded through the existing
  block-1 path at the take's own rate. Explicitly **not** M3's realtime FFT /
  max-hold; no live analysis of any kind. Detail in `docs/ROADMAP.md`
  `# M5 — Record directly into a slot`.
- **"Port" clarified at proposal time:** browsers expose input *devices*, not
  ports — interface ports surface as devices or channels, covered by the picker
  plus the existing channel/mid selection.
- Recording stays local (no network), consistent with the offline stance; mic
  permission needs a secure context, `file://` behaviour to be verified before
  building.

### 2026-09-04 — M5 built (user request: "build it")
- **Arming before capture:** `● Record…` (empty card) / `● Record` (loaded
  card's fileacts = the re-record path) opens an in-card arming panel with the
  shared input selector + Start/Cancel; Start grabs the mic with all
  processing disabled (`echoCancellation/noiseSuppression/autoGainControl`
  off — a measurement capture, not a call). One active recording; Cancel
  restores the card's previous mode, slot untouched.
- **Shared tail:** `loadFileIntoSlot` now ends in `finishSlotFromBuffer`, which
  the recorded take joins after `decodeAtNativeRate` at the mic track's own
  rate; errors share `slotLoadError`. `kind:"rec"` flows through snapshot save
  and every export unchanged (the saver stores `kind` generically).
- Verified: all five script blocks `node --check`, `tests/dsp.test.js`
  unchanged at 192/1 (the 1 is the known pre-existing EQ bound), plus a node
  harness executing the real `renderCard` arming/recording branches and
  `recDevOptions` out of `index.html` (`/tmp` scratch, shipped source
  untouched). Headless Chrome is blocked in this session (exit 134, sandboxed
  seatbelt — the ROADMAP diagnosis), so both-themes screenshots and a live
  mic pass are unverified and owed before release.

### 2026-09-04 — M5 refinements (user request)
- Record sits beside Open file with a red-circle icon; Start carries the same
  circle, Cancel/Stop carry ■. Permission first: the panel shows Allow
  microphone until granted (one throwaway stream unlocks labels + the channel
  offer, stopped at once, never analysed).
- Device + input-channel selectors, both remembered (gsSettings v4, defaulted
  when absent — no version bump, the gate pins v4). Channel N demands ≥N via
  `channelCount:{min}` and refuses honestly; ch 1/2 fold into the left/right
  path, above 2 lands mono. Counts are per-device and probed by briefly
  opening the device (`enumerateDevices` carries none — never a flat 2, and the
  probe asks `channelCount:{ideal:64}` so a quiet default open can't
  under-report, then degrades to the same open without it for browsers that
  reject the constraint (Safari) — both carrying the capture flags, so the
  probe reflects what Start will do); a null choice probes the system default
  under its real id, unknown lists Mix only. The picker opens on an explicit Default entry so the
  shown device and the captured one can't disagree. A failed probe names
  itself in the panel (`Channel list unavailable (OverconstrainedError)`),
  because a silent catch at the platform boundary helps nobody. Footer
  "Remembered" names Input.
- Play last take (arming panel, analysed mix) + an explicit ■ Stop beside
  every ▶ Play — Play already toggled into Stop, now both are visible.

### 2026-09-04 — M5 implementation reverted (user request: "not working, discard")
- The per-device channel probe never listed the user's 10-channel aggregate
  on Safari — panel stayed on Mix only through three iterations (assumed-2,
  open-to-query with ideal:64, degrading fallback). Root cause unproven from
  here (no mic-capable browser in the sandbox); rather than ship blind
  against the platform boundary, all M5 code was reverted out of `index.html`.
- The milestone spec in `docs/ROADMAP.md` is retained and parked, not deleted:
  the design (arming before capture, shared decode tail, persisted
  device+channel) still stands for a session with a live aggregate to test
  against. Recovery snapshot before the discard:
  `refs/tbh/recovery/before-discard/20260904T011041Z-45812`.

### 2026-09-04 — M5 rebuilt on raw PCM: observe the channel count, never ask for it (user request: "make this work for Safari and Chrome, across all platforms; one of my devices is an Aggregate Device with 10 input channels")
- **Second attempt, from a different premise.** The reverted implementation asked
  the platform two questions and believed both answers: `channelCount:{ideal:64}`
  on the open, `getSettings()`/`getCapabilities()` on the read. An unsupported
  constraint is silently ignored per spec, so *even `{exact:N}` can be accepted and
  not honoured*, and both fields can report a count the device never delivers. That
  is the whole failure. The rule this milestone leaves behind: **do not ask a
  question the platform is free to answer wrongly — arrange for the answer to be
  observable.**
- **The observation.** `probeDeviceChannels()` connects the stream to a 32-channel
  `ScriptProcessorNode` with `channelInterpretation = "discrete"`. Discrete
  up-mixing **zero-fills** channels the source did not supply, so a non-zero sample
  in channel *c* is proof that channel *c* arrived. After `REC_PROBE_MS` (700 ms)
  the count is `n = max(heard, claimed, 1)`.
- **`getCapabilities()` was dropped from that max on purpose.** `capabilities.max`
  is what the device *could* do; sizing the capture node by it makes `Mix` a mean
  over zero-filled channels — 10 real channels of 32 requested is −10 dB of
  nothing. `claimed` is `getSettings().channelCount` only, and it can only raise
  the count above what was heard, never above what the device stated.
- **Silence proves nothing.** A probe that heard no signal has learned nothing, so
  the panel says so and offers **↻ Re-check** instead of quietly claiming mono.
- **Raw PCM, not `MediaRecorder`.** The LTAS integrates to 20 kHz and prints dB re
  full-scale sine; a codec's own high-frequency decisions would be
  indistinguishable, in the plot, from the guitar's. A `ScriptProcessorNode` keeps
  Float32 blocks and the take is built as an `AudioBuffer` at the capture context's
  own rate. Reduced **online** — 10 ch × 48 kHz × 4 B is 1.9 MB/s — so a selected
  channel keeps one channel, and `Mix` keeps both at ≤ 2 channels and the mono mean
  above.
- **`ScriptProcessorNode` over `AudioWorkletNode`,** deprecation notwithstanding:
  `addModule()` must fetch a module and this app runs from `file://`, whose null
  origin cannot be relied on to allow that. The node routes to `destination`
  through a gain of 0 (it must reach the destination to fire; nothing is monitored
  back).
- **M5.3 needs no `decodeAtNativeRate` and no sniffer** — the one line the rewrite
  deletes from the original design. Those recover a rate from *file bytes*; a take
  is already PCM at a rate the context states. The house rule is unchanged and met
  more directly: the rate comes from the data and is never asked of the user. A
  rate outside 8–384 kHz is refused through `slotLoadError()`, the same door a bad
  file uses.
- **Enumeration is lazy, never from `boot()`.** `enumerateDevices()` wakes the OS
  audio service and raced the demo decode here; the first arm builds the list, and
  `devicechange` rebuilds it. Device + channel selections persist in `gsSettings`
  at **v4** — additive keys, and every existing reader ignores what it doesn't
  know, so no version bump.
- **Measured, and it is the browser: Chrome on macOS clamps every input device to
  2 channels.** Through real headless Chrome on this machine, a 16-channel
  BlackHole, three Pro Tools aggregate bridges (16/32/64) and the user's
  **10-channel Aggregate Device** all report `capabilities.channelCount
  {min:1,max:2}`, `settings.channelCount` 2, and deliver 2. That is Chromium's own
  `AudioManagerMac` input clamp; no constraint value moves any column. The panel
  states it when it observes ≤ 2 channels, and points at Safari as a
  **suggestion** — Safari is untested here, and only the user's own machine can
  settle whether their aggregate surfaces as 10 there. The probe is correct either
  way: it reports what arrived. *(Superseded the same day — the user ran the test and
  Safari clamps identically; see the entry below.)*
- Downstream, a take is a file: `finishSlotFromBuffer()` with `kind:"recording"`,
  `container:"Live input"`, `bitDepth:"32-bit float"`. One capture graph exists for
  the whole app (`recCap`); `recAbort(i)` runs at the head of `loadFileIntoSlot`,
  `applySnapshot` and `loadDemo`, and a discarded take bumps `loadSeq[i]` so a take
  that lands after a drop cannot overwrite it. No realtime analysis — the meter is
  a peak number. A live analyser is M3, which stays gated.
- Gate: `./tests/verify.sh` steps 2–7 green (r3 42, r4 60, m27 51, r5 324, headless
  **69**) and all four tamper guards green. Step 1 is the documented pre-existing
  red — `ok(mx < 1.0)` measuring 1.022 dB at `tests/dsp.test.js:547`, red on master
  since `ac65835` and untouched by this work.

### 2026-09-04 — Safari clamps too: the "try Safari" advice retired
- The user ran the M5 panel against their own **10-channel Aggregate Device** in
  Safari and it offered **2**. Two possibilities, and they are distinguishable: either
  WebKit clamps at the capture layer, or the probe under-counts. So rather than guess,
  a standalone diagnostic asked the question three ways — the answer could only come
  out one of two ways, and it came out clean.
- **Safari does not implement the `channelCount` constraint at all.** The field is
  absent from `getSettings()` *and* from `getCapabilities()` (settings carry only
  deviceId/echoCancellation/groupId/sampleRate/volume; capabilities the same plus
  ranges). `channelCount:{ideal:32}`, bare `32`, `{min:3}` and `{exact:N}` for
  N ∈ {2,3,4,6,8,10,16} **all resolve, none rejects**. That is the spec's own rule
  working against us: an unsupported constraint is ignored, even in `exact` form, so
  the hard ask that should have proved a clamp proves nothing. **This is the whole
  case for M5's observe-never-ask rule, stated by a browser rather than by us.**
- **The observation is unambiguous.** On one stream, two independent censuses: a
  `ChannelSplitterNode(32)` — whose `channelCount` 32, `channelCountMode "explicit"`
  and `channelInterpretation "discrete"` are **fixed by spec and not settable**, so it
  cannot be misconfigured — read out through one `AnalyserNode` per channel, and the
  app's own 32-channel `ScriptProcessorNode` (`inputBuffer.numberOfChannels` really was
  32 in WebKit). Both report **exactly two** non-zero channels, with identical peaks to
  six decimals: ch1 0.021538, ch2 0.000035, **ch 3–32 at hard zero**. Hard zero is the
  discrete-up-mix zero-fill signature — a real converter input reads dither, not `0.0`,
  for five seconds.
- **Two conclusions.** The probe is exonerated: two mechanisms that share no code agree
  to six decimals, so `ScriptProcessorNode` is not what loses the channels. And the
  platform is convicted on both engines: Chrome clamps in `AudioManagerMac`
  (2026-09-03), Safari clamps in its own capture layer, and on macOS **no browser hands
  a page channel 3**.
- **So the copy changed, in the app and in three documents.** Pointing at another
  browser was a promise the platform cannot keep. The panel now says what is true and
  what to do instead: *"on macOS both Chrome and Safari hand a page only the first two
  channels of an input device, whatever it carries — no setting lifts that. Put the
  input you want first in an Aggregate Device, or record it in a DAW and drop the file
  here."* No detection code changed — there was nothing wrong with it.
- The lesson M5 opened with is now earned twice over: **do not ask a question the
  platform is free to answer wrongly — arrange for the answer to be observable.** Here
  the platform did not even answer wrongly; it declined to answer, cheerfully, in the
  affirmative.

## 2026-09-04 — the channel picker offers all 32; the probe labels, it does not gate

- **User request:** *"how about we try just giving user an option for putting any of the 32
  channels without detecting."* Granted, and the M5 house rule survives it intact — because
  the rule was never "detect before offering", it was **"silence proves nothing"**.
- **The picker was making the claim it forbids.** `recChanOptions()` looped `1..n` from
  `probeDeviceChannels()`, so a probe that heard two channels *asserted* that channels 3–32
  are absent. The probe cannot know that. It listened for 700 ms; a player who wasn't
  strumming, or who strummed only the low string, measures `n = 2` on a device carrying ten.
  Capping the list on that reading is the same unjustified confidence M5.2a was written to
  avoid, pointed the other way.
- **What changed.** `Channel 1 … Channel 32` (`REC_MAX_CH`) always; the select is never
  `disabled`; a stored `recChannel` is clamped to `REC_MAX_CH` on load. The probe's number is
  now **labelling** — channels above `n` read `— not heard yet` — plus the note's advice to
  play something and re-check. Nothing about the probe itself changed; there was nothing wrong
  with it.
- **Two guards, so the freedom doesn't become a lie.** (1) `_startCapture()` sizes the
  `ScriptProcessorNode` to `max(known, claimed, sel)`, so the pick widens the graph and
  discrete up-mixing either delivers channel 7 or zero-fills it; the old silent downgrade to
  the mix is deleted, and the per-block read is `idx < n ? getChannelData(idx) : zeros` rather
  than `getChannelData(min(idx, n-1))` — a clamp there would have recorded the last channel
  under the requested channel's name. (2) `stopCapture()` **refuses a take whose every sample
  is 0.0** (`cap.heard`), saying *"Channel N came back as digital silence — this device didn't
  hand the page that channel, so nothing was saved."* `_takeBuffer()` only ever guarded
  `total === 0`; an all-zero buffer would have landed through `finishSlotFromBuffer()` and been
  analysed into a −∞ LTAS and a verdict about silence.
- **The measured consequence, stated rather than hidden.** On macOS both engines clamp input
  capture to 2 channels (2026-09-03/04, above), so on this platform every pick above 2 reaches
  that refusal. The panel says so before the user picks. That is the trade the user asked for
  and it is the right one: the app now refuses to *decide* which channels exist, and refuses to
  *pretend* a silent take is a recording. Detection guides; the take is the evidence.
- The recording card prints `channel 7`, not `channel 7 of 7`: `nch` is now partly a
  consequence of the pick, so quoting it as a device width would be inventing a number.

## 2026-09-04 — the picker lists what was heard again, and the panel says why that is short

- **User request:** *"lets get back to the previous method of populating channels that we can
  detect and write down a warning that on the browser the recording maybe possible on limited
  channels and devices."* This reverses the picker half of the entry above, hours after it
  landed, and the reversal is the better call — for a reason the earlier entry did not weigh.
- **Both entries are right about the epistemics and disagree about the product.** "Silence
  proves nothing" remains true: a 700 ms probe cannot prove channel 7 is absent. But the
  earlier entry answered that by offering 32 channels, and on every platform measured here 30
  of them come back as digital silence and land in `stopCapture()`'s refusal. A list of 32
  options where 30 fail is a promise the browser does not keep. **An unprovable claim is better
  said in words than encoded as 30 dead menu entries.**
- **What changed back.** `recChanOptions()` loops `1..n` again (`n` from
  `recState.chanByDevice`, defaulting to 1); the select is `disabled` until the probe has an
  answer; the note reverts to *"N input channels heard on this device. Quiet channels can be
  missed — play something and re-check."*; the status line prints `channel 3 of 6` again, safe
  because a capped picker guarantees `sel <= n`.
- **What the words now carry.** A second, always-present line in the arming panel:
  *"Recording in a browser is limited: only some input devices can be opened, and only a few of
  their channels reach the page. Measured here on macOS — both Chrome and Safari hand a page
  the first two channels of an input device, whatever it carries, and no setting lifts that. If
  the channel you want isn't listed, put that input first in an Aggregate Device, or record it
  in a DAW and drop the file here."* It is **unconditional**, not gated on `n <= 2`, because the
  claim is about the browser and not about this device. It names the measured half so a reader
  can tell a limit from a bug, and names the two routes that do work.
- **What was kept from the reversed entry**, because each costs nothing under a capped picker
  and each is a guard rather than a policy: `_startCapture()`'s `max(known, claimed, sel)`
  width (collapses to `max(known, claimed)` when `sel <= known`), the explicit
  `idx < n ? getChannelData(idx) : zeros` read, and `stopCapture()`'s refusal of an all-zero
  take. The silent downgrade-to-the-mix toast is **not** restored: recording the mix under a
  channel's name was always the wrong repair.
- **The hole the reversal reopened, and its fix.** With the list capped again, a `gsSettings`
  `recChannel` of 7 (the loader accepts 0–32, and one may be stored from the hours the app
  offered 32) would have no option to sit in: the select would show *All channels* while the
  state still said 7, and a `disabled` select gives the user no way to correct it.
  `clampRecChannel()` drops the pick to 0 whenever it exceeds the known count, called at every
  door into a known count — `ensureRecChannels()`'s success path, its `catch` path that assumes
  mono, and its early return when the count is already cached. Device *change* was already
  covered: that handler zeroes `recChannel` outright.
