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
