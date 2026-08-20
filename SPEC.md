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
