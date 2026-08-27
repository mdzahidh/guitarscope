# Claude Rameau

> *"Yes — but why does it sound that way?"*

An offline spectrum-comparison tool for guitars. Drop in two recordings of the same
riff played on different instruments and it gives you long-term average spectra, band
energies, a difference plot, spectrograms, envelopes, a matched-EQ suggestion, and a
tone-character panel — with every number traceable to the formula that produced it.

It is one HTML file. There is no build step, no server, and no network access of any
kind.

## Private by design — nothing you drop in ever leaves your browser

**Your recordings are analysed right where they sit: in your own browser, on your own
machine.** Nothing is uploaded, and there is nothing to upload it to — no backend, no
API, no analytics, no CDN, no fonts or scripts fetched from anywhere. Claude Rameau is
a pure client-side page, so the audio you drop in never touches a network at all.

That's not a policy you have to take on trust. It's the architecture:

- **One file, no dependencies.** Read `index.html` and you have read the whole program.
- **Works with the network off.** Pull the plug, open it from `file://`, and everything
  — including the demo pair, which is synthesised in the page — still works.
- **Nothing is stored anywhere but your own browser.** Your tuning, theme and colour
  choices live in `localStorage`; exports (PNG, CSV, JSON) are written straight to your
  downloads folder.

## Open it

```
open index.html
```

Any modern browser, straight off the filesystem. Nothing to install.

Curious before you record anything? Open it and press **Load demo pair** — the app
synthesises two guitars (bright and warm, at different sample rates) in the page and
runs the full analysis on them.

## Use it

1. **Drop in your recordings.** One file onto slot A, another onto slot B. WAV, AIFF,
   FLAC, MP3 or M4A. The sample rate is read from the file's own bytes, so there is
   nothing to configure. One file on its own is fine — you get the full single-guitar
   analysis, minus the comparison views.
2. **Set the tuning you actually played.** The open-string axis and the anatomy regions
   derive from it.
3. **Leave Level-match on while comparing.** It cancels the broadband loudness gap
   between takes, so what you see is tone rather than output.

Then read down the page. Anything you don't recognise is clickable — labels, region
names, the dots on the plots — and opens what it measures with your numbers already
substituted into the formula.

**How you record matters more than anything in this app.** Change only the guitar:
same player, same part, same signal chain, same room, same gain staging. The in-app
*How to record* guide covers it.

## What it measures

- **Long-term average spectrum** — Welch, 8192-point Hann, 50 % overlap, resampled to a
  700-point log grid from 60 Hz to 20 kHz. Octave smoothing is selectable (off, 1/12,
  1/6, 1/3) and the active setting is always printed on the plot.
- **Band energies** over the region vocabulary you choose (EQ speak, guitar anatomy,
  solo EQ, or band mix), with the boundaries drawn on the plot itself.
- **Spectrograms** — 2048-point Hann, 256 log-spaced cells, max-pooled per cell, on a
  shared colour scale so the two panes are directly comparable.
- **Envelopes**, aligned at each file's first detected onset.
- **EQ match** — a least-squares fit of standard analog band models against the smoothed
  difference curve, rendered on the face of a real device.
- **Tone character** — ten measures (brightness, warmth, fullness, spectral tilt,
  harmonic richness, even/odd balance, attack, tightness, sustain, dynamic range), each
  laid out on a labelled left-to-right axis with its definition attached.

Levels are dB relative to a full-scale sine throughout. Analysis parameters are printed
in the page footer.

## Repository

| path | what it is |
|---|---|
| `index.html` | the entire application — the only shipped artifact |
| `tests/dsp.test.js` | DSP suite; extracts the DSP block from `index.html` and runs it under node |
| `tests/make_samples.js` | regenerates `samples/*.wav` |
| `samples/` | two demo recordings for drag-and-drop |
| `SPEC.md` | the original commissioning prompt, verbatim, plus an append-only decision log |
| `docs/ARCHITECTURE.md` | DSP pipeline, parameter rationale, browser quirks, dead ends |
| `docs/STORY.md` | where the name and the app came from |
| `docs/THEORY.md` | the verified physics behind the educational features |
| `docs/ROADMAP.md` | what's being built next, in buildable pieces, and the rules for building them |
| `LICENSE` | MIT |

## Tests

```
node tests/dsp.test.js      # 116 assertions, no framework; exit 1 on failure
node tests/make_samples.js  # regenerate the demo WAVs
```

No dependencies. `tests/dsp.test.js` reads `index.html` directly, so the tests always
run against the shipped code rather than a copy of it.

## Test hooks

Appending a query string drives the app for screenshots and manual checks:

| hook | effect |
|---|---|
| `?demo` | load the synthesised demo pair (`?demo=a` / `=b` for one side) |
| `?theme=bright\|dark` | force a theme |
| `?open=all` | unfold every collapsed panel — needed for full-page captures |
| `?strings=1` | show the open-string axis |
| `?vocab=eq\|anatomy\|solo\|mix` | pick the region vocabulary |
| `?debug` | reveal the hidden demo-loading button |

`CLAUDE.md` lists the rest, including the zoom, magnify and popover hooks.

## License

MIT — see [LICENSE](LICENSE).

## The name

Jean-Philippe Rameau derived harmony from the overtone series in 1722, insisting that
music theory was physics. His brother was named Claude — as is the AI this was built
with. The **About** panel in the app tells the rest of it, including why a question
about two guitars turned into this.
