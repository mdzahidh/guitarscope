# GuitarScope — working brief

Single-page, offline guitar spectrum comparison tool. Drop two recordings (same riff,
different guitars), get long-term average spectra, band energies, and a tone-character
panel where every number is scientifically defensible. Read SPEC.md for the full
commissioning prompt (verbatim — never edit that section) and the append-only decision
changelog. Read docs/ARCHITECTURE.md before touching DSP or rendering.

## Status

- **M1 + M1.5 + acoustic support + glossary: BUILT, awaiting user testing.** Do not start
  M2 (spectrogram/envelopes), M3 (live input), or M4 (chain measure) until the user has
  tested and said so.
- 41/41 DSP tests pass (`node tests/dsp.test.js`). Demo pair verified end-to-end against
  a numeric probe of the full pipeline.

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

- Open `index.html` in a browser. `?demo` auto-loads the built-in demo pair.
- `node tests/dsp.test.js` — full DSP suite. `node tests/make_samples.js` — regenerate WAVs.
- Headless screenshot (virtual time fast-forwards the Welch yields):
  `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new
  --disable-gpu --hide-scrollbars --window-size=1440,2900 --virtual-time-budget=30000
  --screenshot=out.png "file:///…/index.html?demo"`

## House rules

- **Sample rate is read from file bytes, never asked of the user.** Decode via
  OfflineAudioContext at the file's native rate; each file's own rate in its frequency
  math; refuse files whose rate can't be determined. "Facts come from the data, intent
  comes from the user" — instrument mode is a toggle, not detection.
- **Every visible number defensible.** Analysis params live in the footer; smoothing
  state is always printed on the plot; dB re full-scale sine everywhere; glossary terms
  link each label to its formula with current values.
- **Design brief:** laboratory instrument built by a luthier. Dark, one accent per
  guitar (A amber `#d9a35b`, B teal `#5eb3ab`), tabular numerals, no chartjunk/3D/glow,
  150–250 ms non-bouncy transitions. Spectrogram (M2) must be magma, never rainbow.
- **DSP params:** Welch LTAS 8192-pt Hann 50 % overlap; log grid 60 Hz–20 kHz (700 pts);
  metrics integrate 60 Hz–20 kHz only; octave smoothing off/1-12/1-6/1-3; peak detection
  always on 1/6-oct curve.
- Keep `tests/make_samples.js` synth math identical to the in-app demo synth when
  editing either.
- Update SPEC.md changelog, this file, and ARCHITECTURE.md at milestone boundaries and
  after significant decisions, unprompted. Commit at each working state.
