# GuitarScope — working brief

Single-page, offline guitar spectrum comparison tool. Drop two recordings (same riff,
different guitars), get long-term average spectra, band energies, and a tone-character
panel where every number is scientifically defensible. Read SPEC.md for the full
commissioning prompt (verbatim — never edit that section) and the append-only decision
changelog. Read docs/ARCHITECTURE.md before touching DSP or rendering.

## Status

- **M1 + M1.5 + acoustic support + glossary + M2 (spectrogram, envelope overlay, onset
  ticks) + M2.5 (spectrogram difference/level-match/string markers, EQ-region lane,
  EQ match with device faces) + M2.5 follow-ups (spectrogram time-axis alignment,
  plot magnify, EQ-vocabulary rows in Band Energy, single-guitar mode, recording guide,
  Bright/Dark themes with Bright default) + interactive zoom on the four line plots
  (box-select, shift-pan, ctrl/⌘-wheel, reset): BUILT, awaiting user testing.** All built
  on explicit user request 2026-08-19. Do not start M3 (live input) or M4 (chain measure)
  until the user has tested and said so.
- **Next discussion queued:** frequency-vocabulary annotation lanes (user request (b),
  2026-08-19) — guitar-POV default vocabularies for solo vs band/mix contexts. Discuss
  first, do not build until the user decides.
- 100/100 DSP tests pass (`node tests/dsp.test.js`). Demo pair verified end-to-end
  against a numeric probe of the full pipeline; M2/M2.5 views verified by headless
  `?demo` screenshots (all four EQ device faces inspected; both themes, single-guitar
  and magnify views inspected); zoom verified on all four plots + magnify overlay plus
  a pixel-regression compare against the prior commit.

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

- Open `index.html` in a browser. `?demo` auto-loads the built-in demo pair
  (`?demo=a`/`=b` loads one side only). Other test hooks: `?theme=bright|dark`,
  `?sgalign=file|onset`, `?mag=<viewkey>`, `?guide`, `?diff` (difference pane on),
  `?zoom=key:x0,x1[,y0,y1]` (key = spec|diff|env|eqresp; data units).
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
- **Design brief:** laboratory instrument built by a luthier. Two themes, **Bright
  (cream) is the default**, Dark is the original look; one accent per guitar per theme
  (Dark: A amber `#d9a35b`, B teal `#5eb3ab`; Bright: A `#a8690f`, B `#17786e`).
  Tabular numerals, no chartjunk/3D/glow, 150–250 ms non-bouncy transitions.
  All plot chrome routes through CSS vars (`cssColor`/`cssRGBA`); **data colormaps
  never theme** — the magma spectrogram (never rainbow) and the diverging amber/teal
  difference stay dark scope-screens in both themes (see ARCHITECTURE.md).
- **DSP params:** Welch LTAS 8192-pt Hann 50 % overlap; log grid 60 Hz–20 kHz (700 pts);
  metrics integrate 60 Hz–20 kHz only; octave smoothing off/1-12/1-6/1-3; peak detection
  always on 1/6-oct curve. Spectrogram 2048-pt Hann, 256 log cells 60 Hz–20 kHz,
  **max-pooled per cell** (never mean — see ARCHITECTURE.md), shared A/B color scale,
  level-match off by default (toggle folds the spectrum lmOffset into pane B + scale);
  difference pane onset-aligned, diverging amber/teal, p98 scale; individual panes get
  a Free / File-time / First-onset time-axis choice; envelope overlay
  aligned at each file's first onset. EQ match: least-squares fit of RBJ
  analog-magnitude band models against the **1/6-oct-smoothed** difference (never the
  raw comb) on 140 log points; device trim absorbs the broadband level gap; the EQ-region
  lane is colloquial annotation only — the M1 shaded bands still drive all numbers.
  Line-plot zoom is **display-only** (`ZOOMS{}` in data units, baked in by the model
  builders, shared with the magnify overlay): metrics/band table/tone panel never read
  it, and the active window is always printed in the plot's status chip.
- Keep `tests/make_samples.js` synth math identical to the in-app demo synth when
  editing either.
- Update SPEC.md changelog, this file, and ARCHITECTURE.md at milestone boundaries and
  after significant decisions, unprompted. Commit at each working state.
