# Handoff — M2.7 (resolution follows attention: refine the spectrogram on zoom)

*Task order for a delegated builder. One file per milestone; this one covers M2.7.1–M2.7.3.*

**How this file relates to the others.** `docs/ROADMAP.md` is the contract — working
discipline, per-task detail, done-when lines — and it outlives this handoff. This file
says only which tasks to build now, on which branch, against which gate, and what to
report back. Where the two disagree, ROADMAP wins and you should say so in the PR.

---

You are in `/Users/zhossain/src/guitarscope` — Claude Rameau, a single-file offline web
app. No build step, no server, no network, no dependencies. `index.html` is the only
shipped artifact.

Start from `master` (R1–R4 are merged there, and so is this milestone's gate) and work on
a new branch: `git checkout -b rameau-m27 master`. End by opening a PR into `master` —
but **only** once the gate below exits 0.

Read first, in this order: `CLAUDE.md`, `docs/ROADMAP.md` (the whole "Working discipline"
and "Review gates" sections, then the **M2.7 preamble** — it carries the measurements the
milestone rests on — and tasks M2.7.1–M2.7.3), then `docs/ARCHITECTURE.md`'s
"Spectrogram zoom (e), and what M2.7 changed about it" bullet, which already describes
the design you are building. **You write no educational copy in this task and there is no
new frozen block** — M2.7 is plumbing and one status string.

**The gate: `./tests/verify.sh`.** It is the definition of done and it is red right now,
on purpose — the contracts it checks describe the wiring you are about to build. Run it
before you start so you can see which lines are red, and between tasks so you can watch
them go green. Three rules about it:

- **`tests/` is read-only for you** — not one byte, in any file, including new ones. The
  gate fails on any diff under `tests/` against `master`, because a builder who can edit
  the gate can always pass it. If a contract looks wrong, leave it red and say so in the
  PR; the reviewer changes the test.
- **A gate step that cannot run is red.** If Chrome will not launch, or a suite errors
  before it asserts, that is a failure to report — never a wrapper, a stub, a synthetic
  output, or a `$CHROME` pointed somewhere convenient. Report the failure verbatim and
  stop; a real red is more useful than a manufactured green. (Chrome does render in this
  environment; you are launched with sandboxing disabled precisely so it can.)
- **Do not open the PR until it prints `gate passed` and exits 0.**

Its six steps: `tests/dsp.test.js` (shipped math, green — keep it that way),
`tests/r3.test.js` (green), `tests/r4.test.js` (green), **`tests/m27.test.js`
(23 pass / 23 fail today — those 23 are your job)**, `tests/headless.js` (**28 pass /
6 fail today** — same), then the tamper guards: `tests/` byte-identical to `master`, and
the two SHA-256-frozen copy blocks from R3 and R4 (do not touch either; nothing in M2.7
goes near them).

The docs half of `tests/m27.test.js` is **already green** — `docs/ARCHITECTURE.md` and
`SPEC.md` were corrected by the reviewer ahead of you, because M2.7 reverses a decision
those files record and that record is not a builder's to rewrite. Which brings us to the
first standing constraint: **do not edit `SPEC.md` or the `CLAUDE.md` status section.**

## What this milestone is

Today a spectrogram zoom is a **crop** of an already-rendered bitmap, so a deep zoom
interpolates rather than resolves. M2.7's principle is **resolution follows attention**:

- An **unzoomed** pane is untouched — same 2048-pt window, same 256-cell grid,
  **pixel-identical** to `master`. The gate asserts this against a real screenshot, and
  it is the single easiest thing to break. Nothing is recomputed until the user has
  asked for a closer look.
- A **zoomed** pane recomputes its visible span at a window chosen for that span.

## M2.7.1 — `sgramWindowFor()` in block 0

Pure, node-testable, no callers yet. Block 0 (the DSP block — pure functions only, node
imports this block by extraction), beside `spectrogramLog` (**line 2019**). The body is
specified in `docs/ROADMAP.md` and is not yours to redesign:

```js
function sgramWindowFor(spanSec, rate){
  const cap = 1 << Math.floor(Math.log2(Math.max(1, spanSec*rate/4)));
  let win = spanSec < 2 ? 8192 : 4096;
  return Math.max(2048, Math.min(win, cap));
}
```

Keep ROADMAP's comment block above it (it is the reasoning, and the numbers in it are
measured). The function is deliberately **non-monotone** in span — 0.3 s → 2048,
1.5 s → 8192, 10 s → 4096 — because the quarter-span cap outranks the ladder at short
spans. That is asserted; do not "fix" it.

- **Done when:** `tests/m27.test.js`'s first section is green (13 assertions).

## M2.7.2 — `opts.minHopDiv`, then refine on zoom

### (a) the hop floor

`spectrogramLog` floors the hop at `win>>3` (**line 2029**). Right for a full-file pass,
wrong for a refined one — a 2 s view at 8192 would yield **86 columns**. Add
`opts.minHopDiv`, **default 8**, so every existing caller is byte-for-byte unchanged, and
have the refine pass **32**. `maxCols` still applies: `minHopDiv` floors the hop, it does
not override the column budget. The gate pins all of this numerically, including the
untouched default (`2048/342/1398/256` for a 10 s file).

### (b) the refine job

Where: `sgramModelFor()` (**line 4651**), or a helper beside it — the contract does not
force the code into that function's body, only into block 4.

- **Refine only when that pane carries an x-zoom.** `ZOOMS[zKey] && ZOOMS[zKey].x0 != null`
  is the test; `sgramZoomWin()` (**4644**) already merges the zoom over the pane's window.
  With no zoom there is nothing to refine and the pixel-identity promise above must hold
  exactly. This is the principle expressed in code, and skipping it is the most likely
  way to fail the gate.
- Also skip when `sgramWindowFor()` returns 2048 and the grid would not change — nothing
  to gain, a redraw to pay for.
- **Recompute over the visible sample range only**, not the whole file. On a 60 s file
  zoomed to 2 s, a full-file refine at 8192 lands back under `maxCols` and gives that
  2 s about 47 columns — worse than the crop it replaced. Slice the slot's samples to
  `[T0, T1]` (in *file* time — mind `view.d0`, which is display-time offset, negative in
  onset-aligned mode), and pass `{win, gridN: 512, minHopDiv: 32}`.
- **The slice has an origin, and the draw path assumes one at zero.**
  `drawSpectrogramScene` (**3562**) blits with
  `ctx.drawImage(image, xOfT(view.d0), iy, (dur/span)*pW, …)` — i.e. the image is assumed
  to start at file time 0. A sliced spectrogram starts at `T0`. Carry that origin on the
  returned object (e.g. `sg.t0`, absent ⇒ 0 for every existing caller) and add it in that
  one expression. This is the correctness bug this task is most likely to ship: check by
  eye that a zoomed pane's onset ticks still land on the onsets.
- **Read the samples the way the loader does** (**line 4301**): `slot.samples` and
  `slot.info.sampleRate`. There is no `mono`/`rate` on `tvis`.
- **`drawAll()` stays synchronous.** `spectrogramLog` is `async`; the draw path is not,
  and must not become so — the gate checks `drawAll()` awaits nothing and that neither
  `sgramModelFor` nor `buildSgramDiffModel` became `async`. Run the refine as a
  background job: keep drawing today's cropped coarse image, and when the job resolves,
  store it on the slot and call `drawAll()` again to swap it in.
- **Cache and discard by key.** Key on the whole request — `T0`, `T1`, `win`, `gridN`,
  plus the existing `dbMax|dbMin|off` image key. A second job for the same key must not
  start; a job that resolves after the zoom has moved on must be discarded, not drawn.
  Re-zooming inside one session is the case the headless gate cannot drive (`?zoom=`
  applies once at load), so it is checked by hand at review — get it right.
- **Keep the shared color scale.** The refined image must render through the same
  `scale.dbMax/dbMin` and level-match offset as before, or A and B stop being comparable.
- **View geometry still comes from the base spectrogram.** `sgramView(i)` derives the
  pane's time window from the file's own duration; only the image, its origin and the
  status text come from the refined one.
- **Pane D (difference) does not refine in this milestone.** It differences A and B cell
  by cell and needs both on one grid; that is not in scope here. It publishes the window
  it actually rendered, which is 2048.

- **Done when:** an unzoomed pane is pixel-identical to `master`, a zoomed pane resolves
  detail the crop could not, `drawAll()` is still synchronous, and the M2.7.2 sections of
  `tests/m27.test.js` are green.

## M2.7.3 — say what you did

Three surfaces, one number.

- **The plot chip.** `statusText` in `sgramModelFor` (**4666**) prints
  `tv.sg.win+"-pt Hann · max per log cell"`. When a refined image is in use it must print
  the **refined** window. One line, no new surface.
- **The footer.** `renderFooter()` (**~5641**) states the base window; it must also say
  that a zoom refines it. One clause, no new control, and it keeps naming the base — the
  footer describes the analysis, the chip describes the pane.
- **The gate door.** The canvas is unreachable from node, exactly as at R3.2 and R4.3.
  Set **`data-sgwin`** on `#sgramCanvasA` / `B` / `D` to the window actually rendered in
  that pane, so `tests/headless.js` can read it out of `--dump-dom`. An attribute, not
  UI: it must never be styled, never appear on screen, and never reach an export.
- **`?refine=0`.** One new query hook, beside `?tol=` (**line 7537**): read at load,
  `0|1`, **never persisted** — no `gsSettings` key, no `gsRefine`, no UI. The gate needs
  it because every node-level contract here can be satisfied by a build that sets an
  attribute and never redraws; only a pixel compare of the same view with the refine on
  and off separates a recompute from a label.

- **Done when:** `?demo&open=all&zoom=sga:1,2.4` reports `data-sgwin="8192"` on pane A
  and `2048` on the untouched pane B, `?demo&open=all&zoom=sga:0.5,4.5` reports `4096`
  on pane A, the visible chip agrees with the attribute in each case, and
  `tests/headless.js` is green.

## Verifying by eye

Run `./tests/verify.sh` to `gate passed`, then capture screenshots by hand with the
documented recipe (the quotes around the URL are load-bearing — a bare `&` backgrounds
the command; and note both demo files are **5.52 s** long, so every zoom span must fit
inside that):

```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --disable-gpu --hide-scrollbars --window-size=1440,4600 --virtual-time-budget=30000 \
  --screenshot=out.png "file:///Users/zhossain/src/guitarscope/index.html?demo&open=all&zoom=sga:1,2.4"
```

Capture at least: unzoomed (both themes), `zoom=sga:1,2.4`, `zoom=sga:0.5,4.5`, and one
frequency-only zoom (`zoom=sga:1,2.4` vs a `y`-only window per the `?zoom=` syntax in
`CLAUDE.md`). Look for: harmonics that were a smear at 2048 reading as separate lines;
onset ticks still landing on the onsets (the slice-origin trap above); the chip naming
the window the pane really used; pane B unchanged beside a refined pane A.

**One measured flake, so you do not chase it:** roughly one headless launch in six exits
before the app has drawn anything — `--virtual-time-budget` fast-forwards timers, not
audio decodes. Identical at 30 s and 90 s of budget. If a screenshot comes back looking
like the empty app, take it again; `tests/headless.js` already retries internally.

## Standing constraints — these override any instinct to improve things

1. **Do not edit `SPEC.md` or the `CLAUDE.md` status section.** They are already correct
   for this milestone. Commit per task as specified, but leave changelog and status
   entries to the reviewer.
2. **Do not touch the two frozen copy blocks** (R3's ✦ popover, R4's ancestry copy) or
   anything under `tests/`. Both are SHA-guarded and neither is involved in M2.7.
3. **The unzoomed render is a promise, not a nice-to-have.** If you cannot make a change
   without perturbing it, that is a design problem to report, not a pixel to accept.
4. Smallest diff that satisfies the task. No unrequested refactors, no new UI, no new
   dependencies, no reformatting of untouched lines, no new persisted settings. Flag
   anything that tempts you rather than improvising.
5. Update each task's status line in `docs/ROADMAP.md` as it lands. That file, not this
   handoff, is the contract.
6. Commit at each working state. Suggested: M2.7.1 alone (pure function, node-green
   immediately), M2.7.2a (`minHopDiv`) alone, M2.7.2b (the refine job), M2.7.3 last.
   This handoff file itself is not yours to edit — if it is wrong, say so in the PR.
7. **Do not start R5.** It is blocked on the reviewer resolving two numeric caveats in
   `docs/THEORY.md` §2.5.

**Report back** (in the PR body): the commit range, the **full `./tests/verify.sh` output
verbatim** including the final `gate passed` line, the paths of the screenshots, the
worst-case refine timing you measured, and anything you flagged instead of fixing under a
"Found, not fixed" heading.
