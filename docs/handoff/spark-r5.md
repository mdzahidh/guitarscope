# Handoff — R5.0 + R5.1 (harmonic tracks on the spectrogram: one note, drawn)

*Task order for a delegated builder. This file covers **R5.0** and **R5.1** only —
R5.2 (chords), R5.3 (collision marks) and R5.4 (time bounds) are **not** in scope and
must not be started.*

**How this file relates to the others.** `docs/ROADMAP.md` is the contract — working
discipline, per-task detail, done-when lines — and it outlives this handoff. This file
says only which tasks to build now, in which order, against which gate, and what to
report back. **Where the two disagree, ROADMAP wins** and you should say so in your
report.

---

You are in `/Users/zhossain/src/guitarscope` — Claude Rameau, a single-file offline web
app. No build step, no server, no network, no dependencies. `index.html` is the only
shipped artifact, and it holds five `<script>` blocks in a fixed order: **0** DSP (pure
functions, node-safe — the tests import this block by extraction), **1** audio decode,
**2** glossary/popovers, **3** canvas rendering, **4** app state/UI/exports. Which block
a thing goes in is part of every task below and is not negotiable: block 0 may not
reference anything defined later (`FMIN`, `FMAX` and the plot geometry live in block 3),
and the node suites will throw a `ReferenceError` if you break that rule.

Read first, in this order: `CLAUDE.md`, then `docs/ROADMAP.md` — the whole **"Working
discipline"** and **"Review gates"** sections, then the **R5 preamble** ("Decisions
already made" and "Measured before specified": those numbers decided this spec), then
tasks **R5.0** and **R5.1**. **You write no educational copy in this milestone and there
is no new frozen block** — R5.0/R5.1 are plumbing plus one status string. (R5.3's
collision copy will be written and SHA-frozen by the reviewer later; it is not your job
and it is not in this scope.)

## The gate: `./tests/verify.sh`

It is the definition of done, and it is **red right now, on purpose** — the contracts it
checks describe the wiring you are about to build. Run it once before you start so you
can see which lines are red, and after each task so you can watch them go green. Four
rules about it:

- **`tests/` is read-only for you** — not one byte, in any file, including new ones. The
  gate fails on any diff under `tests/` against `master`, because a builder who can edit
  the gate can always pass it. If a contract looks wrong, **leave it red and say so**;
  the reviewer changes the test, never you.
- **A gate step that cannot run is red.** If Chrome will not launch, or a suite errors
  before it asserts, that is a failure to report — never a wrapper, a stub, a synthetic
  output, or a `$CHROME` pointed somewhere convenient. Report the failure verbatim and
  stop; a real red is more useful than a manufactured green. (Chrome does render in this
  environment; you are launched with sandboxing disabled precisely so it can.)
- It takes a long time — the headless step drives real Chrome many times over. Do not
  chain it with anything and do not assume it hung.
- **Do not report the milestone done until it prints `gate passed` and exits 0.**

Its seven steps: `tests/dsp.test.js` (shipped math, green — keep it that way),
`tests/r3.test.js` (green — 42), `tests/r4.test.js` (green — 60), `tests/m27.test.js`
(green — 51), **`tests/r5.test.js` (8 pass / 67 fail today — those 67 are your job)**,
`tests/headless.js` (**34 pass / 5 fail today** — same), then the tamper guards: `tests/`
byte-identical to `master`, and the two SHA-256-frozen copy blocks from R3 and R4 (do not
touch either; nothing in R5.0/R5.1 goes near them).

While you work, run the fast suite on its own — `node tests/r5.test.js` — and read the
section headings: it prints its R5.0 math block first, then the R5.1 wiring contracts.
`node tests/headless.js` is the slow one; run it when the wiring is in.

## What this milestone is

**The overlay is a generative model.** Theory says which partials a note *should*
produce; the overlay draws that prediction across the measured spectrogram; the user sees
for themselves whether the energy is really there. Which notes were played is **intent**,
so the user tells the app through a control — the app never guesses, and there is no
chord auto-detection in this milestone or any later one.

R5.0 is the pure math with no UI at all. R5.1 is the first thing a person can look at:
pick one open string, see its harmonics 1–6 laid over the spectrogram.

---

## R5.0 — partial clustering in block 0 (pure, node-testable, no callers yet)

Everything here goes in **script block 0, immediately after `findCoincidences()`**
(`index.html:1475`, ending just before `const JUST_INTERVALS` at **1517**). Three
additions, specified in full in `docs/ROADMAP.md` § R5.0 — build them from that text:

1. `const TEMPERED_CENTS = 20;` beside `COINCIDENCE_CENTS` (**1446**).
2. `notePartials(midis, nHarm, a4)`.
3. `partialClusters(parts, tolCents)`, `tolCents` defaulting to `TEMPERED_CENTS`.

Five things the suite pins that are easy to get subtly wrong, so read them twice:

- **`partialClusters` measures spread against the group's *first* member, never against
  the previous one.** A chained neighbour gap would let a group creep arbitrarily wide.
- **A group is only returned when it holds two or more *distinct* `key`s** — two partials
  of the same note are not a collision.
- `f` is the **geometric mean** of the members (they are frequencies; the mean that
  matters is the one that is symmetric in cents).
- `spreadCents` is `0` exactly — **never `-0`** — when the members coincide.
- `tier` is `"locked"` when `spreadCents <= COINCIDENCE_CENTS`, else `"tempered"`.

**Leave `findCoincidences()` untouched.** R3's ✦ counts and R4's ancestry must come out
byte-identical; `tests/r3.test.js` (42) and `tests/r4.test.js` (60) stay green, and one
R5.0 assertion binds the two detectors: every landing `findCoincidences()` reports, across
all five stocked tunings for harmonics 1–N with N = 1…8, must appear inside some
`partialClusters()` group together with the open string it lands on. **One detector, never
a second copy** — if you find yourself re-deriving cents or octave folding, stop and reuse
`centsBetween` / `octaveFold`.

**No frequency clipping in block 0.** `FMIN`/`FMAX` are block-3 constants and an
assertion forbids them here; the draw pass clips to the pane instead.

- **Done when:** the R5.0 section of `node tests/r5.test.js` is green (the whole math
  block, ~40 assertions) and the r3/r4/dsp suites are unchanged. Commit.

---

## R5.1a — state, control, model, hooks (no drawing yet)

**State** — block 4, beside the other spectrogram state:

- `state.sgFrets = [null,null,null,null,null,null]` — the overlay's note set, one entry
  per string, `null` = not sounding, integer = fret (`0` = open). It is a fret array and
  not a string index because R5.2 adds chords onto the same shape with no migration.
- `state.sgHarm = 6` — harmonics 1–N, one integer, **not** N per-harmonic switches.

Neither is persisted: **no `gsSettings` key, no `saveSettings()` call, nothing in
`_settingsPayload` or `_cardStateFor`, nothing in any CSV/JSON export.** They are UI
intent, and exports are data-only. The gate asserts all of that by absence.

**Control** — a new `.ctlgroup` in `#sgramCard`'s `.cardhead` (`index.html:934`),
**before** the existing `Time axis` group (**944**), labelled `<span>Overlay</span>`:

- `<select id="sgNoteSel">` — first option `Off` (the default), then the six open strings
  of the **current tuning**, lowest first. Their labels must be **computed from the
  tuning**, not hard-coded: `tuningMidi(state.tuning, state.customOffset)` gives the MIDI
  numbers, `midiToFreq` + `noteInfo(...).name` gives the note name, `STRING_ORD`
  (**6152**) gives the "6th"/"5th"/… ordinal. Re-label them whenever the tuning or the
  custom offset changes — the two listeners at **7232** (`tuningSel`) and the
  `customOffsetEl` one immediately after it already call `syncVocabTuning()` for exactly
  this reason; add your sync call beside it.
- `<select id="sgHarmSel">` — `1–4 / 1–6 / 1–8`, with `1–6` carrying `selected`. Those
  are **en dashes**, not hyphens; an HTML entity will not satisfy the contract.
- Picking a string writes that one fret as `0` and the other five `null`; picking `Off`
  writes six `null`s. Changing either select redraws (`requestDraw()`), and **must not**
  call `saveSettings()`.

**Model** — `sgramModelFor(i, scale)` (**4672**) gains `comb`: the flat `notePartials(…)`
array for `state.sgFrets` at `state.sgHarm` harmonics, or `null` when no string is
selected. No clipping in the model. Two hard constraints:

- **It must not perturb M2.7's refine plumbing.** Neither of the two cache keys in that
  function may mention `sgFrets` or `sgHarm` — the overlay is chrome drawn over the
  image, and re-running an 8192-pt STFT because someone picked a different string would be
  a real regression. The gate asserts both keys stay clean.
- The pane's **status chip** (`statusText`, **4735**) gains the overlay in words when it
  is on: the selected note and the harmonic range, e.g. `… · E2 · harmonics 1–6`. The
  literal `harmonics 1–` (en dash) is what the contract asserts; naming the note is
  ROADMAP's done-when line.

**Hooks** — the canvas is unreachable from node, exactly as at R3.2, R4.3 and M2.7.3:

- `?sgnote=<0-5>` and `?sgharm=<n>`, read at load beside `?tol=` (**7615**), **never
  persisted** — no settings key, no `saveSettings()` within either handler, no UI beyond
  the two selects above. Follow the shipped idiom (`const X=location.search.match(...)`).
- Each **sgram pane canvas** (A and B) carries `data-sgcomb="<count>"` — the number of
  partials in that pane's overlay model, i.e. `comb.length` — and **drops the attribute
  when the overlay is off**, at the same site that sets it. The no-sources cleanup path
  that already calls `removeAttribute("data-sgcomb"…)`'s sibling for `data-sgwin`
  (**4884**) must clear this one too. An attribute, not UI: never styled, never on
  screen, never in an export.

**PNG export** — `exportSgramPNG()` (**6642**) must save `state.sgFrets`, blank it to six
`null`s for the render, and **restore it in a `finally`**, exactly as `_cardPng()` already
does for `state.strings`. Stripping UI state from exports is the shipped precedent and the
gate asserts it. (The reviewer has flagged it to the user as a taste call — if they
reverse it, that is a later edit to source *and* contract, not yours to pre-empt.)

- **Done when:** `?demo&open=all&sgnote=0` reports `data-sgcomb="6"` on both panes and
  `?demo&open=all&sgnote=0&sgharm=3` reports `3`; with no `?sgnote` the attribute is
  absent; the chip names the note and the harmonic range; the R5.1 state/control/model/hook sections of
  `tests/r5.test.js` are green. Commit.

---

## R5.1b — draw the tracks

One new pass in **`drawSpectrogramScene()`** (**3577**), placed **after**
`drawStringMarkers(ctx, pW, pH, model.markers, yOfF);` (**3660** — note the *identical*
line at **3815** belongs to `drawSgramDiffScene`, which gets no overlay in this milestone;
the pane scene's call is the one followed by the `// colorbar: the exact magma → dB
mapping the image used` comment) and **before** the colorbar. Clip it to the plot rect.

Per partial in `model.comb`, a horizontal line across the full plot width at `yOfF(f)`,
skipped when it falls outside the pane's frequency window:

- a **3 px `rgba(0,0,0,0.55)` halo** first, then the line itself at 1.5 px in
  `_stringColor(p.key)` — `key` is the partial's string index, which is exactly what
  `_stringColor(si, alpha)` at **6155** takes (block 4; block 3 already calls into block 4
  elsewhere, so this is established precedent, not a layering violation);
- **solid** for `harm === 1`, `setLineDash([3,3])` for every harmonic above it;
- **no labels, no text of any kind** in this pass — the plot has no room and the
  always-on right-edge string markers give the reference. `fillText` inside the pass is
  asserted absent.

The black halo is deliberate and is **not** a theme color: the magma image is dark at the
floor and bright at the ridges, so neither a light nor a dark stroke alone survives both.
The spectrogram is a data surface, and **data colormaps never theme** (CLAUDE.md).
`_stringColor` is likewise the shipped **data** palette — never a guitar accent, never a
CSS var.

- **Done when:** `node tests/r5.test.js` is **75 passed, 0 failed**, `node
  tests/headless.js` is green (the overlay changes real pixels, and six harmonics mark
  more of the pane than two), and `./tests/verify.sh` prints `gate passed`. Commit.

## Verifying by eye

The gate is necessary, not sufficient. Capture screenshots by hand with the documented
recipe (the quotes around the URL are load-bearing — a bare `&` backgrounds the command):

```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --disable-gpu --hide-scrollbars --window-size=1440,4600 --virtual-time-budget=30000 \
  --screenshot=out.png "file:///Users/zhossain/src/guitarscope/index.html?demo&open=all&sgnote=0"
```

Capture at least: the overlay off; `sgnote=0` and `sgnote=5`; `sgnote=0&sgharm=8`; one of
those in **both** themes (`&theme=bright`, `&theme=dark`). Look for: the fundamental
reading as solid and the harmonics as dashed; the hue matching the string's own color in
the frequency plot; the lines legible over both the dark floor and the bright ridges;
tracks landing **on** the measured energy for the demo pair, not beside it — that last one
is the whole feature, and a systematic offset means a frequency-mapping bug, not a taste
problem.

**One measured flake, so you do not chase it:** roughly one headless launch in six exits
before the app has drawn anything — `--virtual-time-budget` fast-forwards timers, not
audio decodes. If a screenshot comes back looking like the empty app, take it again;
`tests/headless.js` already retries internally.

## Standing constraints — these override any instinct to improve things

1. **Do not edit `SPEC.md` or the `CLAUDE.md` status section.** Commit per task as
   specified, but leave changelog and status entries to the reviewer.
2. **Do not touch anything under `tests/`**, or the two frozen copy blocks (R3's ✦
   popover, R4's ancestry copy). All three are guarded, and none is involved in R5.
3. **`findCoincidences()` and every M2.7 refine path are byte-frozen in effect** — the ✦
   counts, the ancestry numbers and the unzoomed spectrogram must all come out exactly as
   they are on `master`.
4. Smallest diff that satisfies the task. No unrequested refactors, no new UI beyond the
   two selects, no new dependencies, no reformatting of untouched lines, no new persisted
   settings. Flag anything that tempts you rather than improvising.
5. **Every educational sentence must trace to `docs/THEORY.md`.** R5.1 ships exactly one
   new user-visible string (the chip's overlay text). Do not add explanatory prose,
   tooltips or legends — if you think something needs explaining, say so and leave it.
6. Update each task's status line in `docs/ROADMAP.md` as it lands. That file, not this
   handoff, is the contract. This handoff itself is not yours to edit — if it is wrong,
   say so in your report.
7. Commit at each working state: R5.0, then R5.1a, then R5.1b.
8. **Do not start R5.2, R5.3 or R5.4**, and do not start R6 — it is blocked on the
   reviewer resolving two numeric caveats in `docs/THEORY.md` §2.5.

**Report back:** the commit range, the **full `./tests/verify.sh` output verbatim**
including the final `gate passed` line, the paths of the screenshots you captured, and
anything you flagged instead of fixing under a **"Found, not fixed"** heading.
