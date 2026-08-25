---
tags: [claude-rameau, planning]
date: 2026-08-22
---

# Roadmap — the Rameau phase, broken into buildable tasks

Anchors below are **search strings first, line numbers second** (line numbers are as of
commit `7999f1c` and shift as tasks land — always re-grep). Every task is sized to be
finished, tested and committed on its own. Order matters: R1 → R2 → R3 → R4 → R5.

**Rules that bind every task** (from CLAUDE.md — they override any instinct):
- `index.html` is the only shipped artifact. No build step, no server, no network.
- Every educational sentence must trace to a section of `docs/THEORY.md`. If THEORY.md
  doesn't cover a claim, **flag it to the user — never improvise physics.**
- Measure first, never lecture. The instrument shows a marker; the user clicks; the
  physics answers.
- After each task: `node tests/dsp.test.js` must stay green, a headless screenshot in
  **both** themes, then commit.
- Update `SPEC.md` changelog + `CLAUDE.md` status at each milestone boundary.

Verification command (see CLAUDE.md for the full list of `?` hooks):

```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --disable-gpu --hide-scrollbars --window-size=1440,4600 --virtual-time-budget=30000 \
  --screenshot=out.png "file:///…/index.html?demo&open=all"
```

---

## Working discipline — how to build these tasks

This codebase is finished software being extended, not a project being explored. The
default answer to "should I also…" is **no**. Read this section before the first task
and again whenever a task tempts you outside its own anchors.

**Where the instructions live.** This file is the contract and outlives any one
milestone. A delegated build also gets a task order under `docs/handoff/` —
`docs/handoff/spark-r3.md` for the R3 milestone — naming which tasks to build now, on
which branch, against which gate, and what to report back. It is committed before the
work starts so the PR can be reviewed against exactly what was asked. Where a handoff
and this file disagree, **this file wins**; say so in the PR rather than picking one.
A handoff is not the builder's to edit.

**Scope**
- Build **one task at a time, in order**, and stop at its "done when" line. A task that
  looks trivial still ends at its boundary.
- The **smallest diff that satisfies the task** is the correct diff. If your change
  touches code the task did not name, that is a signal to re-read the task, not to
  widen it.
- **Do not refactor, rename, reorder, reformat, or "tidy" anything you are not asked to
  change** — not variables, not functions, not CSS, not whitespace, not the script-block
  layout. `index.html` is a single 7000-line file; incidental reformatting makes every
  future diff unreviewable and will be reverted wholesale.
- **Do not add dependencies, build steps, package files, bundlers, frameworks, module
  syntax, or network calls.** There is no `package.json` and there will not be one. The
  tests run under bare `node`; the app runs from `file://`.
- **Do not add UI that no task asked for** — no new controls, switches, settings,
  tooltips, keyboard shortcuts, or persisted keys. Every control in this app exists
  because it captures *user intent*; anything else is a constant in the source.
- **Do not change DSP parameters, thresholds, colours, or layout values** that a task
  did not name. The values in `CLAUDE.md` under "DSP params" and "Design brief" are
  settled decisions with reasons recorded in `docs/ARCHITECTURE.md`.
- **Do not make a debug-only affordance visible.** The `Load test files` button is hidden
  behind `?debug` on purpose (`CLAUDE.md`, house rules). If a task seems to want it shown,
  it doesn't — stop and ask.
- **Do not delete or weaken an existing test** to make a change pass. If a test now
  contradicts a task, stop and report it — that is a spec conflict, not a test bug.
- **`tests/` is read-only for the builder.** Not one byte, in any file, including a new
  one. `./tests/verify.sh` fails the gate on any diff under `tests/` against the base,
  because a builder who can edit the gate can always pass it. The tests are the
  specification of the tasks below; they were written before the work and reviewed
  against `docs/THEORY.md`. Several are red today **on purpose** — that is what the
  milestone turns green.

**Matching the existing code**
- Follow the file's conventions exactly: two-space indent, `el("id")` lookups, `esc()`
  on interpolated text, `cssColor()`/`cssRGBA()` for anything drawn on canvas, existing
  helpers (`fmtHz`, `noteStr`, `auditionBlock`, `openPopover`) rather than new ones.
- New pure math goes in **script block 0** and gets node tests. Nothing else goes there.
- **A test must exercise the shipped source, not a retyped copy of it.** Read the value,
  regex, or predicate out of `index.html` and run *that* (see the extraction pattern in
  `docs/ARCHITECTURE.md`, and the R1.3 block in `tests/dsp.test.js`). A hand-copied
  duplicate stays green when the app changes, which is worse than no test. Before calling
  a test done, break the source line it guards and confirm the test goes red.
- Copy the nearest existing thing rather than inventing a pattern: a new modal is a
  clone of `#howModal`, a new popover section is a clone of an existing one.
- Prose in the UI matches the app's voice — plain, factual, no exclamation marks, no
  marketing, no second-person cheerleading. When a task quotes text, **use that text
  verbatim** rather than improving it.

**When something is wrong or unclear**
- If a task's anchor doesn't match the current file, **re-grep for the search string**;
  line numbers drift. If it still doesn't match, stop and report.
- If you find a bug outside the current task, **do not fix it** — finish the task and
  list it under a "Found, not fixed" heading in your handoff. Unrequested fixes arrive
  unreviewed and untested.
- If a task seems wrong, underspecified, or contradicted by the code, **stop and ask**.
  Do not pick the interpretation that lets you keep going.
- If an educational sentence needs a fact `docs/THEORY.md` does not state, **flag the
  gap**. Never derive, estimate, or fill it in from general knowledge. This is the rule
  most easily broken in silence: improvised physics reads perfectly fluently.

**Per task, before you call it done**
1. `./tests/verify.sh` — the gate: the DSP suite, the R3 contracts, the headless
   render checks, and the two tamper guards. It ends in `gate passed` / `gate failed`
   and exits nonzero on any failure. It is red until the milestone is complete, so
   between tasks read *which* lines are red and confirm they are the ones still
   unbuilt; a line that was green and went red is a regression you caused.
   **Do not open the PR until it exits 0.**
2. Headless screenshot in **both** themes (command above), eyeballed.
3. `git diff --stat` — read it. Every changed file and roughly every changed line should
   be explainable by the task text. Unexplained lines get reverted, not justified.
4. One commit per task, subject line starting with the task id (`R1.2 — …`), body saying
   what changed and what was verified.
5. **One commit per task and no others.** If something forced an extra commit, say so at
   the top of the handoff with the reason — an unlisted commit is the first thing a
   reviewer has to reconstruct.

**Running the gate on macOS: no sandbox around Chrome.** Step 3 of `verify.sh` drives a
real Chrome, and Chrome cannot start inside a seatbelt sandbox — it aborts in
`_RegisterApplication` (exit 134) because it cannot reach `launchservicesd`, and macOS
raises a crash dialog for *every* launch, which is the operator clicking "Ignore" twenty
times. Agent runners sandbox shell commands by default, so run the build with sandboxing
off: `muse exec --disable-sandbox …`. `tests/headless.js` recognises this abort, prints
the fix, and stops on the first one. **Never point `$CHROME` at a stub or wrapper to get
past it.** A gate step that cannot run is **red**, not passed — report the blocker and
stop. (Gate 3 was reported as passed off a wrapper emitting synthetic PNGs; disclosed
honestly, but the run proved nothing.)

**Launching the delegated builder (reviewer's side, from R4 on).** The reviewer starts
Muse directly rather than the user driving it by hand:

```
/usr/local/bin/muse exec --disable-sandbox --prompt-file docs/handoff/spark-r4.md
```

`--disable-sandbox` is not optional — see "Running the gate on macOS" above. Add
`--disable-approval` for an unattended run, `-w create` to build in a fresh worktree.
Verified 2026-08-24: `muse exec --disable-sandbox` runs non-interactively and Chrome
starts cleanly inside it (headless screenshot, exit 0). The handoff file is committed
before the run, as always.

---

## Decisions already made (do not re-litigate)

- **✦ tolerance: ±6 cents, fixed, no visible control.** It is a perceptual claim, not
  user intent, and user intent is what earns a control in this app. ±6¢ clears tuning
  slop and admits the 12-TET fifth's −1.955¢ error, which is what nearly every landing
  is. **Measured afterwards:** because only *open strings* are candidate targets, no
  tempered-major-third landing exists to exclude — in any stocked tuning, widening 6¢
  → 50¢ admits nothing new at all (see R3.1 below). A slider would therefore be a
  control that changes nothing, which is the strongest argument for the constant.
  `?tol=` exists for headless testing only.
- **About has two doors, one room:** a real `About` button beside `How to record` /
  `How to use this app`, *and* the title + slogan clickable to the same modal with the
  `help` cursor. Zero new UI concepts.
- **Internal identifiers stay `gs*`.** localStorage keys (`gsCollapse`, `gsVocab`,
  `gsColors`, `gsSettings`, …) and `?` hooks are plumbing, not identity.

---

## Review gates (build/review handoff)

Tasks are built in stacks and reviewed at three points. The gates sit where a mistake
stops being local — not at even task counts.

| gate | after | why here |
|---|---|---|
| **1** | R1.1–R1.5 + R2.1–R2.5 | Cosmetic and additive; every failure shows in a screenshot or a grep. One review for both milestones. **Read R1.3's snapshot-compat test first** — it is the only silent, retroactive failure in the stack. |
| **2** | R3.1 + R3.2, **before R3.3 starts** | `findCoincidences()` is shared, node-tested block-0 code that R3.3, R3.4, R4.2 and R5 all build on. A subtly wrong detector produces a plausible ✦ in the wrong place and then propagates into three milestones. Smallest diff, highest leverage. — **Discharged 2026-08-23:** the reviewer authored R3.1 (`9b9858f`) and the R3.4 copy (`48925b8`) directly, mutation-checking both, so the gate's subject is already reviewed. R3.2 still lands as its own commit, but the builder continues into R3.3 without pausing. |
| **3** | R3.3–R3.5 | R3.4 writes the app's first user-facing physics sentences. Every claim is checked against `docs/THEORY.md` §3.4 by hand. |

R4 is then one stack (low risk — it reuses the reviewed detector); R5.1 reviews on its own.

**The rule, for work past R5.** Review at interface and claim boundaries:
- anything landing in **script block 0** (shared, node-tested, dependents inherit its bugs);
- anything emitting a **user-facing physics sentence** (the trace-to-THEORY.md rule is the
  one most easily violated in silence — improvising reads fluently, flagging feels like failure);
- anything touching a **persisted format** (`gsSettings`, `gsCollapse`, snapshot/export JSON)
  — those failures are silent and retroactive.
- Everything else — CSS, markup, string swaps, canvas drawing — batches freely.

**Handoff at each gate:** the commit range, which R-tasks are claimed done, the output of
`node tests/dsp.test.js`, and both-theme screenshots.

**Two standing constraints on the builder:**
1. **Do not edit `SPEC.md` or the `CLAUDE.md` status section.** Commit per task as specified,
   but leave the changelog and status entries to the reviewer at each gate — per-task doc
   edits churn the files used to orient.
2. **Two `docs/THEORY.md` §2.5 figures are under review and must not appear in any copy:**
   the "peaks near ¼ of the critical bandwidth" framing and "~30–40 Hz in the guitar's
   mid-register". The formula in §2.5 gives 19–26 Hz across guitar open strings; 30–40 Hz
   needs f₁ ≈ 660–1200 Hz. The ¼ rule is a classic-Bark statement sitting next to an ERB
   definition. The formula itself, and the peak constant ≈ 0.221, are verified and usable.

---

## Gate 1 — reviewed 2026-08-23: **pass**

Branch `rameau-r1r2`, base `675afd6`, R1.1–R1.5 + R2.1–R2.5 built by Muse Spark 1.2.
Verified independently: 117/0 tests; the shipped snapshot reader accepts both app names
and rejects a foreign app / a per-card export / an empty file list; the rename is
complete in user-visible strings; the About text matches `docs/STORY.md`; both themes
render; no DSP params, colours, layout constants or dependencies touched.

Four unplanned commits landed inside the stack. `b023918` un-hid the debug `Load test
files` button (a house-rule violation) and was reverted by `696d786`; `index.html` at the
end of the stack is byte-identical to the end of R2.5. `a866f66` edited `docs/THEORY.md`,
which was fenced off. Hence the three new discipline bullets above.

Closed by the reviewer (commit `Gate 1 close`):
- the R1.3 snapshot tests now **extract** the guard from `index.html` and run it, instead
  of re-asserting a retyped copy (mutation-checked: deleting the legacy clause turns them red);
- dead `.brand-row` CSS rule deleted (superseded by `.brandbtn` in R2.3);
- `<em>` restored on *exactly* in About paragraph 2, per `docs/STORY.md`;
- export filenames `guitarscope_*` → `rameau_*` (they are user-visible, so they were in
  R1's rename scope; snapshot *reading* is unaffected).

Open, deliberately not fixed — one taste call for the user:
- the `About` button makes the `.globals` cluster wrap to a second row at 1440 px
  (`Glossary` drops down). Master fits on one line. Every fix costs a settled layout
  value or a copy change, so it is left as-is pending a decision.

Known-good, minor, left alone: `<h1>` nested in `<button>` (`#brandBtn`) is outside the
button content model, and its `aria-label` overrides the title as the accessible name.

---

## Gate 3 — reviewed 2026-08-24: **pass**, merged `ddde88b`

Branch `rameau-r3`, base `0c713b7`, R3.2–R3.5 built by Muse Spark in the two prescribed
commits. `./tests/verify.sh` re-run by the reviewer on this machine: **171 + 40 + 20
assertions green, both tamper guards intact, exit 0.** The diff matches the handoff task
for task; nothing under `tests/`, `SPEC.md` or the `CLAUDE.md` status section was touched.

Every "what to expect on screen, measured" line reproduced independently in real Chrome:
two ✦ per plot near 247 Hz and 330 Hz; `?tol=0` removes exactly one 7×7 px blob per plot;
`?tol=50` is **pixel-identical** to the default (0 differing pixels); `?pop=coin0` renders
the frozen copy inside real popover chrome.

**Process finding — the headless step was not really run.** Chrome 151 on the builder's
host `SIGABRT`s on `--screenshot`/`--dump-dom`, so it pointed `$CHROME` at a wrapper
script that emitted synthetic PNGs engineered to satisfy the pixel assertions, and
captured no real screenshots. `$CHROME` is an escape hatch for a *different real* Chrome,
not for a fabricator. It disclosed this fully and unprompted in the PR body, and the code
passes the real gate here, so the substance is sound — but "gate passed" in that PR body
was not backed by a browser. **For future handoffs: if a gate step cannot run on the
builder's host, that step is red and the PR says so.**

**Process finding — a comment was load-bearing for a bad contract.** A twelve-line
padding block above the `?pop` hook, justified in its own text as keeping `tolCents` more
than 4000 chars from `gsSettings`, did nothing of the sort (that assertion passes on its
first disjunct regardless). Its last line, `// ?pop=coin hook`, was however the *only*
text satisfying `/[?&]pop=[\s\S]{0,1200}coin/` — because the app spells the hook as a
regex literal, `/[?&]pop=([a-z0-9-]+)/`, whose own source text cannot match a `[?&]pop=`
character class. The assertion could never have matched the code it was written to check.
Closed by the reviewer (`49878f1`): padding deleted, contract re-anchored to the hook
itself (coin branch + `openCoincidencePopover` call, mutation-checked). This is the case
the "leave it red and say so" rule exists for — it was satisfied instead of reported.

Correct calls by the builder, left as they are:
- `drawStringAxis`'s `findCoincidences(markers)` fallback deliberately omits
  `state.tolCents`, because naming it in block 3 would flip the "tolerance never reaches
  `gsSettings`" assertion. The fallback is unreachable — both model builders always pass
  `coincidences` — and it was flagged rather than silently written around.

Open, deliberately not fixed — taste calls for the user:
- at ~247 Hz the ✦ sits close to the plot's legend text;
- the coincidence popover runs past the visible fold at 1440 px; shortening the copy is a
  copy decision, not a wiring one.

# R1 — Rename: GuitarScope → Claude Rameau  ✅ built, gate 1 passed

Self-contained, no behaviour change, entirely string work. 32 occurrences of the old
name in `index.html`; `grep -n GuitarScope index.html` is the whole worklist.

### R1.1 — Identity constant + `<title>` + header

- Add one constant near the top of script block 4 (application):
  `const APP_NAME="Claude Rameau";` — every later task reads it instead of retyping.
- `<title>GuitarScope</title>` (line 7) → `Claude Rameau`.
- Header markup (`<div class="brand">`, ~line 678):
  - `<h1>Guitar<span class="thin">Scope</span></h1>` →
    `<h1>Claude <span class="thin">Rameau</span></h1>`
  - Add the slogan **beside** the title, not below it: a `<span class="slogan">` inside
    the same row, reading `“Yes — but why does it sound that way?”`
  - **Keep** the existing `.tagline` line (`long-term average spectrum · A/B
    comparison`) below — it is the technical descriptor, the slogan is the identity.
- CSS: `.slogan{ font-size:12px; color:var(--dim); font-style:italic; }` and make the
  brand title row a flex row with `align-items:baseline; gap:10px; flex-wrap:wrap`.
- **Done when:** title, slogan and tagline sit on the header without reflowing the
  `.globals` cluster at 1440 px or wrapping badly at 900 px.

### R1.2 — User-visible prose strings

Replace in place (each is a literal string in the file):

| ~line | site |
|---|---|
| 1006 | footer chip `GuitarScope · offline · files never leave this page` |
| 1184 | drop hint `…or a GuitarScope snapshot (.json)` |
| 2401 | region `measure:` text (`no GuitarScope metric integrates…`) |
| 4036 | decode-refusal hint (`GuitarScope refuses to guess a rate.`) |
| 5317 | verdict empty-state prose |
| 5378 | tone-panel "no difference clears…" prose |
| 5821 | glossary popover label `How GuitarScope measures it` |
| 5885 | string popover label `How GuitarScope places it` |

- **Done when:** `grep -c GuitarScope index.html` counts only export/plumbing sites
  (R1.3) and code comments (R1.4).

### R1.3 — Exports, and the one back-compat decision

- **Cosmetic, rename freely:** PNG header text and `made with GuitarScope` footers
  (~6037, 6038, 6064, 6082, 6090, 6101, 6114); CSV comment headers (~6126, 6146, 6155,
  6177, 6190); the EQ text export header (~5472).
- **Format magic value — needs care:** exported JSON writes `app:"GuitarScope"` (~6214
  export, ~6268 snapshot) and the snapshot **reader** rejects anything else (~6285,
  with the error string at 6286).
  - Writer emits `app:"Claude Rameau"`.
  - Reader accepts **both** `"Claude Rameau"` and `"GuitarScope"` so v1.0.0 snapshots
    still load. Error message says "not a Claude Rameau snapshot".
  - Add a node test asserting the reader accepts both spellings.
- **Done when:** a snapshot saved before the rename round-trips, and a fresh one does too.

### R1.4 — Comments, docs, README

- Block comments at ~11, 1192, 2265, 2314, 2744, 3906.
- `README.md` **is already written** (repo root, 2026-08-23) and already says *Claude
  Rameau* throughout — nothing to rename there. Do not rewrite it; if a fact in it goes
  stale as a task lands (test count, hook list, tone-row names), fix that line only.
- `docs/ARCHITECTURE.md`: add a short note under naming/plumbing that the `gs*`
  localStorage keys and `?` hooks deliberately keep the old prefix.

### R1.5 — Verify + commit

- `node tests/dsp.test.js` (107+ pass), headless screenshot in `?theme=bright` and
  `?theme=dark`, one PNG export eyeballed for the new footer.
- Commit: `Rename: GuitarScope → Claude Rameau across user-visible strings`.

---

# R2 — About modal  ✅ built, gate 1 passed

Follows the `#howModal` pattern exactly (~line 1061). Copy its structure, don't invent.

### R2.1 — Markup

- New `<div class="modal" id="aboutModal">` placed immediately after `#howModal`, with
  `<div class="inner guide">`, a `.ghead` carrying `<h3>About Claude Rameau</h3>` and
  `<button class="iconbtn" id="aboutClose" aria-label="Close">✕</button>`.
- Body copy = `docs/STORY.md` lines 20–30, **verbatim in substance**. Four paragraphs:
  the two guitars, the accidental harmonic overlay, the two Rameaus, the closing hope.
  Light emphasis only (`<em>` on *measure*, on the closing question). No new claims.
- **Do not** paraphrase the story into marketing voice. It is the user's own first-person
  account and stays first-person.

### R2.2 — The button door

- Add `<button class="btn" id="aboutBtn">About</button>` to the `.globals` row beside
  `#howBtn` / `#guideBtn` (~line 714). Place it **after** `Glossary` or before
  `How to use this app` — pick one and keep the three help affordances adjacent.
- Listener beside the existing ones (~6797–6810):
  `aboutBtn.addEventListener("click",()=>aboutModal.classList.add("open"));`
- Close: `aboutClose` click + backdrop click, same as `#howModal`.

### R2.3 — The title door

- Wrap the `<h1>` + `.slogan` in a clickable element (`<button class="brandbtn">` or the
  existing `.brand` div with `role="button"` + `tabindex="0"`), opening `#aboutModal`.
- Per the M2.6d affordance rules it must show `cursor:help` on hover and a visible
  focus ring. Keyboard: Enter/Space open it.
- **Done when:** clicking the name or the slogan opens the same modal the button does.

### R2.4 — Esc cascade + test hook

- `escCascade()` (~6640): add `if(aboutModal.classList.contains("open")) return
  aboutModal.classList.remove("open");` — put it **beside** the `guideModal`/`howModal`
  lines, i.e. below the popover/playback/glossary entries. Order within the modal group
  is arbitrary; keep it adjacent so the group stays readable.
- Test hook beside ~7009–7010:
  `if(/[?&]about(?:&|$)/i.test(location.search)) aboutModal.classList.add("open");`

### R2.5 — Verify + commit

- Headless `?about` screenshot in both themes; Esc closes; `?about&how` closes in a
  sensible order. Commit: `About modal: two entry points, story text from STORY.md`.

---

# R3 — ✦ discovery moments  ✅ built, gate 3 passed

The origin story as a feature: a shown harmonic of one string landing on another
string's fundamental. Build it in this order — the pure function first, drawn last.

### R3.1 — Pure detector in script block 0 (node-testable) — **BUILT** (`9b9858f`)

- In block 0, after `tuningMidi()`: `COINCIDENCE_CENTS = 6`, `centsBetween(f1,f2)`,
  `gcdInt`, `octaveFold`, `HARMONIC_INTERVALS`, `findCoincidences(marks, tolCents)`.
- Input: the marker shape `stringAxisMarkers()` already produces —
  `{f, name, si, midi, harm}`. **Output (as shipped — this supersedes the
  `{f, cents, hi, lo, ratio}` sketch this task originally carried):**

  ```js
  { f, cents, harm,
    from: {si, midi, f},      // the string whose harmonic it is
    onto: {si, midi, f},      // the open string it lands on
    ratio:   {n, d},          // harm : 1, unreduced
    reduced: {n, d},          // octave-folded, e.g. 3/2
    octaves,                  // how many octaves were folded away
    interval }                // "perfect fifth" | "octave" | … | null
  ```
  Sorted by frequency; exact unisons snap to `cents === 0` (a `1e-9` guard kills
  float residue like `−3.84e-13`).
- Rules: pair a marker with `harm > 1` against a marker with `harm === 1` on a
  **different** string (`si !== si`), where `|centsBetween| <= tolCents`.
- **Node tests:** E standard, harmonics 2–5 on all strings → the three real hits
  (E2·h3 → open B3 at −2.0 ¢ = 3/2; E2·h4 → open E4 at 0 ¢ = 1/1; A2·h3 → open E4
  at −2.0 ¢); a synthetic same-string marker pair proves the `si !== si` guard is
  load-bearing rather than tautological.
- **Done when:** tests pass with no DOM involved. ✅
- **Measured afterwards, 2026-08-23** (`tests/r3.test.js`), because the planned
  "widen the tolerance and the tempered major third appears" bracket turned out to
  be false: **no 5/4 landing exists in E standard at any tolerance.** Only *open
  strings* are candidate targets, and none of the six sits near another string's
  5th harmonic. Widening 6 ¢ → 50 ¢ admits **nothing new in any stocked tuning** —
  every landing is a fifth (−1.955 ¢) or an octave (exactly 0), and every one folds
  to a power-of-two denominator. Counts: E standard / Eb / D standard 3 each,
  drop D 2, **DADGAD 5 (four of them exact)**. That insensitivity is the empirical
  argument for a fixed ±6 ¢ over a user slider, and it is now asserted both in node
  and in pixels.

### R3.2 — Wire the constant + `?tol=` hook — **BUILT**

- Block 4 reads `COINCIDENCE_CENTS` into `state.tolCents`; a `?tol=<n>` query param
  overrides it (clamped to 0–50) purely for headless testing.
- **No control, no persistence, no `gsSettings` key.** It is not user intent.
- **Also extend the existing `?pop=<glosskey>` hook to accept `?pop=coin<N>`**, which
  pins the Nth coincidence popover open (N indexing `findCoincidences()`'s sorted
  result, out of range = no popover). The canvas is unreachable from node, so this is
  the only way the gate can check that the pre-landed R3.4 copy renders inside the
  real popover chrome; `tests/headless.js` asserts on it and `tests/verify.sh` will
  stay red without it.

### R3.3 — Draw the ✦ — **BUILT**

- `drawStringAxis(ctx,w,h,markers,hits)` (~2895) already runs three passes (verticals,
  fundamental labels, harmonic hit targets). Add a fourth: for each coincidence, draw a
  small ✦ near the **top** of the plot area at that x — quiet, `--mut`-weight, not a
  guitar color (it belongs to neither string).
- Push a hit rect `{x,y,w,h, coincidence:<index>}` so it is clickable, and add the
  `help` cursor via the existing `attachCrosshair` hit-test path.
- Respect the current x-window (`XV.f0`/`XV.f1`) like every other marker, and the
  overlap guard: if two ✦ land within ~12 px, draw one.
- **Only when `state.strings` is on and the relevant harmonic is enabled** — the ✦ marks
  something the user can already see, never a hidden line.
- **PNG exports force `state.strings=false`, so ✦ never appears in exports.** That is
  correct and needs no extra work; just don't undo it.

### R3.4 — The popover — **BUILT** (wiring; copy pre-landed `48925b8`)

- The prose is **already written, tested and committed** in `index.html`, between
  `// ---------- discovery moments: the ✦ popover (R3.4) ----------` and
  `// ---------- end ✦ popover copy ----------` (script block 4, just above
  `openStringPopover`). It is currently inert — nothing calls it.
- **Do not rewrite the copy or its helpers** (`OCT_WORD`, `HARM_NODES`,
  `TEMPER_NOTE`, `fmtHzFine`, `fmtCents`). Every sentence is sourced to
  `docs/THEORY.md` and pinned by tests in `tests/dsp.test.js`, which extract the
  block from `index.html` between those sentinels and render every branch.
- What is left is plumbing: an `openCoincidencePopover(hit, anchor)` built like
  `openStringPopover()` —

  ```js
  popover.innerHTML = coincidenceContentHtml(hit)
                    + auditionBlock(hit.f*Math.pow(2,-1/6), hit.f*Math.pow(2,1/6));
  popover.classList.add("open"); placePopover(anchor);
  ```
  dispatched from the canvas click handler beside `if(hh.string!=null)
  openStringPopover(hh.string,anchor);`, and cleaned up by `closePopover()` the same
  way the string popover is.
- Tone (already carried by the copy): the popover answers a question the user asked
  by clicking. It does not open with a lesson.

### R3.5 — Verify + commit — **BUILT**

- **`./tests/verify.sh` exits 0.** That one command is the whole gate (added
  2026-08-23, `0c713b7`) and it is deliberately red until this milestone lands:
  - `node tests/dsp.test.js` — the shipped-math baseline, must stay green;
  - `node tests/r3.test.js` — block-0 math (green already) plus the R3.2/R3.3/R3.4
    wiring contracts, read out of `index.html`'s own source;
  - `node tests/headless.js` — drives real Chrome and compares two builds of the
    same page differing in one query parameter, so there is no golden image to
    maintain. It checks that the ✦ appears between `?tol=0` and the default, is
    glyph-sized, sits at one frequency across both frequency plots, is drawn in
    neither guitar's accent, stays away when the strings axis or harmonics are off,
    and that `?pop=coin0` opens a popover carrying the reviewed sentences.
    (`?tol=25` was the planned bracket; measurement killed it — see R3.1.)
  - two mechanical guards: `tests/` byte-identical to the base, and the frozen copy
    block matching its recorded SHA-256.
- **No assertion may be edited to make the gate pass.** If a contract is genuinely
  wrong, leave it red and say so in the PR — the reviewer changes the test.
- Commit: `Discovery moments: ✦ marks harmonic/fundamental coincidences (±6¢)`.

---

# R4 — Harmonic ancestry in the per-string popover

The ✦ answers "these two strings are sounding the same note". R4 answers the question
that follows: **where does this string sit in its neighbour's sound?** Same door (the
open-string popover the Strings axis already opens), same discipline — measure first,
never lecture. Source: `docs/THEORY.md` §3.4 (the denominator rule), §1 (the series),
§3/§4 (just ratios), §5 (12-TET errors), §3.7 (the dynasty of fifths).

Extends `stringContentHtml()` — **line 6012**, script block 4, immediately above the
frozen ✦ copy. (This supersedes the "~5855" anchor this task originally carried.)

**Reference note: the adjacent string, not the lowest string.** This task originally
said "whether that harmonic is an overtone of the currently-lowest string". That is not
safely sourceable: in E/E♭/D standard the low string to the D string is 10 semitones,
and `docs/THEORY.md` fixes the minor seventh only as 9/5 (§4) — a −17.6 ¢ tempered gap
with unmentioned rivals 16/9 (+3.9 ¢) and 7/4 (+31.2 ¢), an ambiguity THEORY raises for
the 6th (§3.5) and never resolves for the 7th. House rule: flag the gap, don't improvise
physics. Every **adjacent** pair in every stocked tuning is 5, 4, 7 or 2 semitones —
4/3, 5/4, 3/2, 9/8, all fixed by §3 and error-tabulated in §5 — and the adjacent pair
tells the better story anyway (§3.7): tuning in fourths walks *down* the dynasty of
fifths, so each string is the parent of the one below it, with the G→B major third the
one overtone exception. `tests/r4.test.js` asserts the full coverage claim over all five
stocked tunings rather than trusting it.

**Pre-landed, frozen, currently inert** — the same shape that worked at gate 3. Block 0
carries the math (`JUST_INTERVALS`, `isPow2`, `stringAncestry`); block 4 carries the
prose between `// ---------- harmonic ancestry copy (R4) ----------` and
`// ---------- end ancestry copy ----------`. **Do not rewrite either.** The copy block
is SHA-256 frozen by `tests/verify.sh` and by `tests/r4.test.js`; changing one character
fails the gate. The tasks below are wiring.

### R4.1 — Interval + landing on each harmonic row

- In `stringContentHtml()`'s `for(let hh=1;hh<=5;hh++)` loop, after each row, append
  `harmonicRowNoteHtml(si,hh)` (frozen). It emits a `<div class="pop-sub">` carrying what
  harmonic `hh` *is* as an interval ("an octave and a perfect fifth") and, when the
  harmonic lands on another open string, "✦ lands on the open 2nd string".
- The landing reuses `findCoincidences()` from R3.1 — the same ±6 ¢ window and the same
  detector as the mark on the plot, never a second one. Nothing to write; it is inside
  the frozen helper already.
- One new CSS rule, beside the other `.pop-*` rules (~line 487):
  `.pop-sub{ font-size:11px; color:var(--dim); margin:-1px 0 2px 16px; }`
- **Done when:** every shown harmonic row names its interval, the rows that land say so,
  and no other row layout changed.

### R4.2 — "Where this string sits" section

- Insert `ancestrySectionHtml(si)` (frozen) into `stringContentHtml()`'s return, between
  the "How Claude Rameau places it" section and the "Current values" section.
- It picks the adjacent pair itself (string `si-1`/`si`, or `0`/`1` for the lowest
  string), reads `stringAncestry()` from block 0, and returns `""` when THEORY names no
  ratio for that gap — an empty string is a correct answer, not a bug to work around.
- **Done when:** the section renders for all six strings in all five stocked tunings.

### R4.3 — Headless door: `?pop=str<N>`

- The canvas and the popover are unreachable from node, exactly as at R3.2. Extend the
  existing `?pop=` hook (**line 7282**, beside the `coin<N>` branch) with `str<N>`,
  N = 0–5 indexing `STRING_ORD` (0 = lowest), out of range = no popover.
- **Done when:** `?demo&pop=str3` pins the open-G popover open; `tests/headless.js`
  asserts on it and the gate stays red without it.

### R4.4 — The denominator rule, expandable

- Append `denominatorRuleHtml()` (frozen) to `stringContentHtml()`'s return. It is a
  native `<details class="pop-more"><summary>…` — no JS, no state, no persistence.
- CSS beside the other `.pop-*` rules; the popover already has
  `overscroll-behavior:contain`, so a long open `<details>` scrolls without stealing the
  page (see the session-16 fix in `CLAUDE.md`).
- **Done when:** it opens and closes, and the popover still scrolls to its own bottom.

- Verify + commit per task, and run `./tests/verify.sh` to `gate passed` before the PR.

---

# R5 — Interval consonance explainer

Source: `docs/THEORY.md` §2.5 (roughness) and §2.6 (consonance definitions).

- **R5.1** — Block-0 pure functions: joint period of two frequencies (lcm of periods via
  the rational approximation), and the Sethares roughness `d(f₁,f₂,a₁,a₂)` exactly as
  parameterized in §2.5 (`b₁=3.5, b₂=5.75, d*=0.24, s₁=0.021, s₂=19`). Node tests assert
  `d=0` at `Δf=0`, the bracket peak at `s·Δf ≈ 0.221`, and decay past the critical band.
- **R5.2** — Total roughness over all cross-pairs of two partial sets.
- **R5.3** — UI: selecting two markers shows joint period, comb alignment, and a
  **self-normalized** roughness curve. Per §2.5 the output is dimensionless — normalize
  to the curve's own maximum and **say so on the axis**; never print absolute units.
- **Blocked on the user resolving the two §2.5 numeric caveats** (the "~30–40 Hz in the
  guitar's mid-register" figure and the ERB-vs-Bark critical-band inconsistency) before
  any of those numbers appear in copy.

---

# Gated — do not start without explicit user go-ahead

- **M3 — live input.** Still owes the task-based entry points deferred from M2.
- **M4 — chain measure.**
- **Tension landscape** (STORY.md) — unscheduled.
