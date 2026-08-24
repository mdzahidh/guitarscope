# Handoff — Rameau R3 (discovery moments)

*Task order for a delegated builder. One file per milestone; this one covers R3.2–R3.5.*

**How this file relates to the others.** `docs/ROADMAP.md` is the contract — working
discipline, per-task detail, done-when lines — and it outlives this handoff. This file
says only which tasks to build now, on which branch, against which gate, and what to
report back. Where the two disagree, ROADMAP wins and you should say so.

---

You are in `/Users/zhossain/src/guitarscope` — Claude Rameau, a single-file offline web
app. No build step, no server, no network, no dependencies. `index.html` is the only
shipped artifact.

Start from `master` (R1+R2 are merged there) and work on a new branch: `git checkout -b
rameau-r3 master`. End by opening a PR into `master` — but **only** once the gate below
exits 0.

Read first, in this order: `CLAUDE.md`, `docs/ROADMAP.md` (the whole "Working discipline"
and "Review gates" sections, then tasks R3.2–R3.5), `docs/STORY.md`. `docs/THEORY.md` is
reference only — you will not need to write any physics copy in this task, because it is
already written (see below).

**The gate: `./tests/verify.sh`.** It is the definition of done and it is red right now,
on purpose — the contracts it checks describe the wiring you are about to build. Run it
before you start so you can see which lines are red, and between tasks so you can see
them go green. Two rules about it:

- **`tests/` is read-only for you** — not one byte, in any file, including new ones. The
  gate fails on any diff under `tests/` against `master`, because a builder who can edit
  the gate can always pass it. If a contract looks wrong, leave it red and say so in the
  PR; the reviewer changes the test.
- **Do not open the PR until it prints `gate passed` and exits 0.**

## Your job: R3.2, R3.3, R3.5 — and the *wiring only* of R3.4

R3 puts a quiet ✦ on the frequency plots wherever a displayed harmonic of one string
lands on another open string's fundamental. Two of the four pieces already exist and are
committed; do not rewrite either.

**Already built — treat as fixed API:**

1. `findCoincidences(marks, tolCents)` in script block 0 (commit `9b9858f`), alongside
   `COINCIDENCE_CENTS = 6`, `centsBetween`, `gcdInt`, `octaveFold`, `HARMONIC_INTERVALS`.
   Feed it the output of `stringAxisMarkers()` (index.html ~4418). Returns, sorted by
   frequency:

   ```js
   { f, cents, harm,
     from: {si, midi, f},   // the string whose harmonic it is
     onto: {si, midi, f},   // the open string it lands on
     ratio:{n,d}, reduced:{n,d}, octaves, interval }
   ```

2. `coincidenceContentHtml(hit)` in script block 4 (commit `48925b8`), between the
   sentinel comments `// ---------- discovery moments: the ✦ popover (R3.4) ----------`
   and `// ---------- end ✦ popover copy ----------`, currently inert. It and its helpers
   (`OCT_WORD`, `HARM_NODES`, `TEMPER_NOTE`, `fmtHzFine`, `fmtCents`) are **frozen**:
   every sentence is sourced to `docs/THEORY.md` and pinned by tests that extract this
   block from `index.html` by those sentinels. Do not edit the prose, the helpers, the
   sentinels, or the tests that read them. If you believe a sentence is wrong, stop and
   say so rather than changing it.

### R3.2 — wire the constant + the `?tol=` hook

- Add `tolCents: COINCIDENCE_CENTS` to the `state` object (~4038).
- Add a test hook beside the others (~7195–7240, same `location.search.match` idiom, same
  `// test hook` comment style): `?tol=<n>`, integer or decimal, **clamped to 0–50**.
- **No UI control, no persistence, no `gsSettings` key, no `saveSettings()` call.** The
  threshold is physics, not user intent — ±6 ¢ is settled and not up for re-litigation.
- Extend the **existing** `?pop=<glosskey>` hook to also accept **`?pop=coin<N>`**: pin
  the Nth coincidence's popover open, N indexing the sorted `findCoincidences()` result,
  out of range = nothing opens. Reuse the hook's existing deferral — it already waits
  until the analysis has drawn before opening — and call the `openCoincidencePopover()`
  you add in R3.4 (so the `coin` branch lands with R3.4 if that reads more naturally;
  the gate only cares that it works by the end). The canvas is unreachable from node, so
  this hook is the only way the gate can confirm the frozen R3.4 copy renders inside the
  real popover chrome. `tests/headless.js` asserts on `?pop=coin0`.
- Commit this on its own: `Coincidence tolerance: state.tolCents + ?tol= test hook`.

### R3.3 — draw the ✦

- Both line-plot model builders call `stringAxisMarkers()` — spectrum at ~4471, difference
  at ~4661. Add `coincidences: findCoincidences(stringAxisMarkers(), state.tolCents)` to
  each, and pass `model.coincidences` into `drawStringAxis()` as a new fifth argument at
  its two call sites (~3267, ~3312).
- In `drawStringAxis` (~2990) add a fourth pass, after the existing three:
  - one small ✦ per coincidence at `xOfF(hit.f, w)`, near the **top** of the plot area
    (just inside `PLOT.mT` — `PLOT.mT` is dynamic, never cache it);
  - quiet weight, `cssColor("mut")` or similar — **never a guitar color**: the mark
    belongs to neither string;
  - skip anything outside `XV.f0`/`XV.f1`, exactly like the passes above it;
  - overlap guard: if two ✦ would land within ~12 px, draw one (same `lastX` idiom as the
    label pass).
- Push a clickable rect into `hits` carrying the hit object itself, e.g.
  `hits.push({x,y,w,h, coincidence:hit})`. Carrying the object, not an index, avoids
  re-resolving against an array that is rebuilt on every draw. The `help` cursor then
  comes for free — `attachCrosshair` (~4754) tests every rect in the array.
- It draws only when `state.strings` is on and the relevant harmonic is enabled. You get
  that for nothing: `stringAxisMarkers()` returns `[]` with strings off and omits
  unchecked harmonics. Do not add a second condition.
- PNG exports force `state.strings=false`, so ✦ never reaches an export. That is correct.
  Do not undo it.

### R3.4 — wiring only

- Add `openCoincidencePopover(hit, anchor)` next to `openStringPopover` (~6072), built the
  same way:

  ```js
  popover.innerHTML = coincidenceContentHtml(hit)
                    + auditionBlock(hit.f*Math.pow(2,-1/6), hit.f*Math.pow(2,1/6));
  popover.classList.add("open");
  placePopover(anchor);
  ```
- Dispatch from `attachHitClicks` (~7034), beside the existing line:

  ```js
  if(hh.coincidence) openCoincidencePopover(hh.coincidence, anchor);
  else if(hh.string!=null) openStringPopover(hh.string,anchor);
  else openPopover(hh.term,anchor);
  ```
- Mirror whatever `closePopover()` (~6083) does for the string popover, if you set any
  dataset key. Playback must stop on close like everywhere else.
- Write **no new user-facing sentences.** If something reads awkwardly inside the real
  popover chrome, report it; do not fix it in the copy.

### R3.5 — verify + commit

- **`./tests/verify.sh` must print `gate passed` and exit 0.** That single command runs:
  `node tests/dsp.test.js` (the shipped-math baseline — must stay green, and no existing
  assertion may be edited to make it so); `node tests/r3.test.js` (block-0 math, already
  green, plus the R3.2/R3.3/R3.4 wiring contracts read out of `index.html`'s own source);
  `node tests/headless.js` (drives real Chrome, compares two builds of the same page
  differing in one query parameter); and two tamper guards — `tests/` byte-identical to
  `master`, and the frozen copy block matching its SHA-256.
- `tests/headless.js` writes its PNGs to a temp directory and prints the path. If a pixel
  assertion fails, look at them before changing code: it tells you the blob count, size
  and position it saw.
- Also capture by hand, for the handoff, with the documented recipe (the quotes around the
  URL are load-bearing — a bare `&` backgrounds the command):

  ```
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
    --disable-gpu --hide-scrollbars --window-size=1440,2900 --virtual-time-budget=30000 \
    --screenshot=out.png "file:///Users/zhossain/src/guitarscope/index.html?demo&strings=1&harmonics=1&open=all"
  ```
  Both themes (`&theme=bright`, `&theme=dark`), plus one with a ✦ popover open
  (`&pop=coin0`) so the pre-landed copy is seen inside real popover chrome (width, the two
  glossary buttons, the audition block below it).
- **What to expect on screen, measured:** in E standard with harmonics 2–5 shown, ±6 ¢
  finds **three** coincidences — E2·h3 on open B3 (−1.955 ¢), E2·h4 on open E4 (exactly
  0 ¢), A2·h3 on open E4 (−1.955 ¢) — but the last two sit within a whisker of 330 Hz and
  the ~12 px overlap guard collapses them, so **two ✦ are visible per plot**, near 247 Hz
  and near 330 Hz. At `&tol=0` only the exact octave survives: **one ✦**, near 330 Hz.
  `&tol=25` and even `&tol=50` look **identical to the default** — no near-miss exists to
  admit, in any stocked tuning. That is expected, it is asserted, and it is the reason the
  threshold is a constant rather than a slider. Do not "fix" it.
- Commit: `Discovery moments: ✦ marks harmonic/fundamental coincidences (±6¢)`.

## Standing constraints — these override any instinct to improve things

1. **Do not edit `SPEC.md` or the `CLAUDE.md` status section.** Commit per task as
   specified, but leave the changelog and status entries to the reviewer at each gate —
   per-task doc edits churn the files used to orient.
2. **Two `docs/THEORY.md` §2.5 figures are under review and must not appear in any copy:**
   the "peaks near ¼ of the critical bandwidth" framing and "~30–40 Hz in the guitar's
   mid-register". (Not expected to come up here — you are writing no copy.)
3. Smallest diff that satisfies the task. No unrequested refactors, no new UI, no new
   dependencies, no reformatting of untouched lines. Flag anything that tempts you rather
   than improvising.
4. Update each task's status line in `docs/ROADMAP.md` as it lands. That file, not this
   handoff, is the contract.
5. Commit at each working state, in the order above (R3.2 separately; R3.3+R3.4+R3.5 may
   share the final commit). This handoff file itself is not yours to edit — if it is
   wrong, say so in the PR.

**Gate 2 note:** the roadmap places a review gate after R3.1 + R3.2. It has been
discharged in advance — the reviewer authored and mutation-tested both R3.1 and the R3.4
copy, which is what the gate was protecting. Commit R3.2 on its own as specified, then
continue straight into R3.3. Stop and report at the end of R3.5 (gate 3).

**Report back** (in the PR body): the commit range, the **full `./tests/verify.sh` output
verbatim** including the final `gate passed` line, the paths of the screenshots, and
anything you flagged instead of fixing under a "Found, not fixed" heading.
