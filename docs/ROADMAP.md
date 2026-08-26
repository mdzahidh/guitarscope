---
tags: [claude-rameau, planning]
date: 2026-08-22
---

# Roadmap — the Rameau phase, broken into buildable tasks

Anchors below are **search strings first, line numbers second** (line numbers are as of
commit `7999f1c` and shift as tasks land — always re-grep). Every task is sized to be
finished, tested and committed on its own. Order matters: R1 → R2 → R3 → R4 →
**M2.7** → R5 → R6. M2.7 is an instrument milestone, not a Rameau one; it sits in this
file because it is next and because R5 draws on the spectrogram it sharpens. R5 and R6
were renumbered when it was scheduled — the old R5 (consonance) is now **R6**.

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

# R4 — Harmonic ancestry in the per-string popover  ✅ built, gate 4 passed

The ✦ answers "these two strings are sounding the same note". R4 answers the question
that follows: **where does this string sit in its neighbour's sound?** Same door (the
open-string popover the Strings axis already opens), same discipline — measure first,
never lecture. Source: `docs/THEORY.md` §3.4 (the denominator rule), §1 (the series),
§3/§4 (just ratios), §5 (12-TET errors), §3.7 (the dynasty of fifths).

Extends `stringContentHtml()` — **line 6077**, script block 4, immediately above the
frozen ✦ copy. (This supersedes the "~5855" and "6012" anchors this task carried before
the gate landed and moved the line.)

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

### R4.1 — Interval + landing on each harmonic row — **BUILT** (`5780f50`)

- In `stringContentHtml()`'s `for(let hh=1;hh<=5;hh++)` loop, after each row, append
  `harmonicRowNoteHtml(si,hh)` (frozen). It emits a `<div class="pop-sub">` carrying what
  harmonic `hh` *is* as an interval ("an octave and a perfect fifth") and, when the
  harmonic lands on another open string, "✦ lands on the open 2nd string".
- The landing reuses `findCoincidences()` from R3.1 — the same ±6 ¢ window and the same
  detector as the mark on the plot, never a second one. Nothing to write; it is inside
  the frozen helper already.
- One new CSS rule, beside the other `.pop-*` rules (~line 482):
  `.pop-sub{ font-size:11px; color:var(--dim); margin:-1px 0 2px 16px; }`
- **Done when:** every shown harmonic row names its interval, the rows that land say so,
  and no other row layout changed.

### R4.2 — "Where this string sits" section — **BUILT** (`5780f50`)

- Insert `ancestrySectionHtml(si)` (frozen) into `stringContentHtml()`'s return, between
  the "How Claude Rameau places it" section and the "Current values" section.
- It picks the adjacent pair itself (string `si-1`/`si`, or `0`/`1` for the lowest
  string), reads `stringAncestry()` from block 0, and returns `""` when THEORY names no
  ratio for that gap — an empty string is a correct answer, not a bug to work around.
- **Done when:** the section renders for all six strings in all five stocked tunings.

### R4.3 — Headless door: `?pop=str<N>` — **BUILT** (`5780f50`)

- The canvas and the popover are unreachable from node, exactly as at R3.2. Extend the
  existing `?pop=` hook (**line 7496**, beside the `coin<N>` branch) with `str<N>`,
  N = 0–5 indexing `STRING_ORD` (0 = lowest), out of range = no popover.
- **Done when:** `?demo&pop=str3` pins the open-G popover open; `tests/headless.js`
  asserts on it and the gate stays red without it.

### R4.4 — The denominator rule, expandable — **BUILT** (`5780f50`)

- Append `denominatorRuleHtml()` (frozen) to `stringContentHtml()`'s return. It is a
  native `<details class="pop-more"><summary>…` — no JS, no state, no persistence.
- CSS beside the other `.pop-*` rules; the popover already has
  `overscroll-behavior:contain`, so a long open `<details>` scrolls without stealing the
  page (see the session-16 fix in `CLAUDE.md`).
- **Done when:** it opens and closes, and the popover still scrolls to its own bottom.

- Verify + commit per task, and run `./tests/verify.sh` to `gate passed` before the PR.

---

# M2.7 — Resolution follows attention (hi-res spectrogram on zoom)  ✅ built, gate 6 passed

**Merged to master 2026-08-24** — delegated build `c6ab4f9` (builder commit `3272e23`,
from `docs/handoff/spark-m27.md`), reviewer fixes `f96e806`. `./tests/verify.sh` prints
`gate passed`: dsp 171, r3 42, r4 60, **m27 51**, headless 34, plus all three tamper
verdicts (`tests/` untouched, both frozen copy SHAs). The builder made **no ROADMAP
edits**; the statuses below are the reviewer's.

Not a Rameau task and not education — an **instrument** improvement, filed here because
it is next and because R5 (harmonic tracks) draws on the spectrogram this milestone
sharpens. No `docs/THEORY.md` tracing, **no frozen copy block**: there is no educational
prose in it. That makes it an unusually clean delegation — it is all plumbing.

**The problem.** The spectrogram is computed once per file at 2048-pt (43 ms at 48 kHz)
and zoom **crops the rendered bitmap**; it never recomputes. So a deep zoom blurs instead
of resolving, and at 2048 the three lowest open-string pairs cannot be told apart at all.
Measured here with the app's own `spectrogramLog`, two equal tones, "resolved" = two grid
maxima with a >3 dB dip between them:

| pair | Δf | 2048 (43 ms) | 4096 (85 ms) | 8192 (171 ms) |
|---|---|---|---|---|
| E2–A2 | 27.6 Hz | no | **yes** (7 dB) | yes (33 dB) |
| A2–D3 | 36.8 Hz | no | **yes** (11 dB) | yes (41 dB) |
| D3–G3 | 49.2 Hz | no | **yes** (25 dB) | yes (63 dB) |
| G3–B3 | 50.9 Hz | yes (3 dB) | yes (36 dB) | yes (53 dB) |
| B3–E4 | 82.7 Hz | yes (14 dB) | yes (46 dB) | yes (71 dB) |

The grid is not the limit: 256 vs 512 log cells changes none of those verdicts. The
**window** is. And compute is not the constraint either — recomputing only the visible
span costs 8–122 ms per file (below), against a 2048 full-file pass at 43–62 ms.

**The principle: resolution follows attention.** The unzoomed view stays exactly as it
ships — same window, same grid, pixel-identical, which doubles as a free regression test.
A zoom is a request to look closely, so a zoom recomputes.

**Dropped from the original sketch: the multi-resolution low-band splice.** Rendering the
low band at a long window and the rest at a short one onto one grid means two different
hops, two different time alignments, a visible seam at the crossover, and two windows to
print in one pane's status chip. The zoom ladder already puts 4096/8192 exactly where the
user is looking, with **one true window per view** — which is the version that keeps
"every visible number defensible".

**What this reverses.** `docs/ARCHITECTURE.md` (~line 366) and `SPEC.md` (~line 325)
currently record crop-not-recompute as the deliberate choice, on the grounds that
recomputing "would change the analysis parameters mid-view and break 'every visible
number defensible' (the footer states one FFT size)". The objection is answerable rather
than wrong, and M2.7.3 is the answer: the pane already prints its own window in
`statusText`, so a refined view states its own parameters. **Both documents must be
brought into line by the same PR** — leaving them contradicting the code is a gate-level
failure of the house rule, not a tidy-up. They are corrected differently:
`docs/ARCHITECTURE.md` is a living description, so its "Spectrogram zoom (e) is a crop,
not a recompute" bullet is **rewritten**; `SPEC.md` is an **append-only** changelog, so
its `(e)` entry stays exactly as it is as the historical record and M2.7 **appends** a new
entry that supersedes it and says so. `tests/m27.test.js` checks both.

### M2.7.1 — `sgramWindowFor()` in block 0 — **BUILT** (`3272e23`)

Pure, node-testable, no callers yet. Block 0, beside `spectrogramLog`.

```js
// The window for a refined (zoomed) spectrogram view.
//   - 2048 is the shipped default and the floor: 43 ms at 48 kHz, two-tone
//     limit ~47 Hz, which cannot separate E2 from A2 (27.6 Hz apart).
//   - A zoom is a request to look closely, so refine to 4096 (two-tone ~23 Hz:
//     every open-string pair in every stocked tuning separates).
//   - Below a 2 s view, go to 8192 (~12 Hz) - the user is inside one event and
//     time smear no longer costs them anything they were reading.
//   - Never let the window exceed a quarter of the visible span: a window
//     longer than the view measures mostly what is off-screen.
function sgramWindowFor(spanSec, rate){
  const cap = 1 << Math.floor(Math.log2(Math.max(1, spanSec*rate/4)));
  let win = spanSec < 2 ? 8192 : 4096;
  return Math.max(2048, Math.min(win, cap));
}
```

**Why the ladder stops at 8192.** Separating arbitrary *semitones* down at 250 Hz would
need a window past 32768 (0.68 s) — explicitly not a goal, and time smear that long
destroys what a spectrogram is for. Pairs inside the ✦ tolerance (±6 ¢) are unresolvable
at **any** practical window; the app teaches those through R3's mark, not through pixels.

- **Done when:** `tests/m27.test.js` passes its math section — `(10,48000)→4096`,
  `(1.5,48000)→8192`, `(0.3,48000)→2048` (cap 3600 floors to 2048), never above 8192,
  never below 2048, and the cap tested on its own. The function is deliberately
  **non-monotone** in span (0.3 s → 2048, 1.5 s → 8192, 10 s → 4096); that is the cap
  doing its job, not a bug to smooth out. ✅

### M2.7.2 — Refine on zoom — **BUILT** (`3272e23`, reworked by the reviewer in `f96e806`)

`spectrogramLog` today floors the hop at `win>>3`, which is right for a full-file pass and
badly wrong for a refined one — a 2 s view at 8192 would yield **86 columns**. Add
`opts.minHopDiv` (default **8**, so every existing caller is byte-for-byte unchanged);
the refine pass passes **32**:

| view | win | `win>>3` | `win>>5` | refine cost, one file |
|---|---|---|---|---|
| 30 s (freq-only zoom) | 4096 | 1399 | 1399 | 122 ms |
| 10 s | 4096 | 930 | 1396 | 77 ms |
| 5 s | 4096 | 461 | 1396 | 38 ms |
| 2 s | 8192 | **86** | **344** | 16 ms |
| 1 s | 8192 | **39** | **156** | 8 ms |

- Where: `sgramModelFor()` (**~line 4652**). Note it is **synchronous**, called from
  `drawAll()`, while `spectrogramLog` is `async`. Do **not** make the draw path async.
  Run the refine as a **background job**: keep drawing today's cropped coarse image, and
  when the refine resolves, store it on the slot and call `drawAll()` again to swap it in.
- Recompute over **only the visible sample range** of `sgramZoomWin(key,…)`, with
  `win = sgramWindowFor(span, rate)`, `gridN: 512`, `minHopDiv: 32`.
- Cache per slot keyed by the whole request — zoom window, `win`, `gridN`, and the
  existing `dbMax|dbMin|off` image key. A second job for the same key must not start;
  a stale job that resolves after the zoom moved on must be discarded, not drawn.
- A **frequency-only** zoom still refines: span is the full duration, so ≥2 s → 4096 and
  `gridN` 512. That is the 122 ms row and the worst case in the table.
- If `sgramWindowFor` returns 2048 **and** `gridN` would not change, skip the job
  entirely — there is nothing to gain and a redraw to pay for.
- **The magnify overlay comes along for free, and must be kept that way.** `MAG_VIEWS.sga/sgb`
  call the very same `sgramModelFor(i, sgramScale())`, `attachZoom(magWrap, …)` writes the
  very same `ZOOMS[key]`, and `setZoom()` is `ZOOMS[key]=z; drawAll()` whose tail call is
  `drawMag()` — so a refine that lives inside `sgramModelFor` reaches the overlay by
  construction, and the background job's `drawAll()` redraws an open overlay when it lands.
  Two things preserve that and both are already required above: the refine must be reached
  from **inside the model builder** (not bolted onto `drawAll`'s pane loop), and its cache
  must live **on the slot** (not on the pane canvas) — the overlay can be open while the
  spectrogram card is folded, in which case the model is built only from the mag path.
  The overlay is where the 1400-column budget actually pays off, so this is the view the
  milestone most benefits. Note what stays fixed: the window follows the **time span**, not
  the canvas width, so magnifying without zooming shows the same window, larger.
- **Done when:** an unzoomed pane is pixel-identical to `master` (headless asserts this),
  a zoomed pane resolves detail the crop could not, and `drawAll()` is still synchronous. ✅

### M2.7.3 — Say what you did — **BUILT** (`3272e23`)

- `statusText` in `sgramModelFor` already prints `tv.sg.win+"-pt Hann · max per log cell"`.
  When a **refined** image is in use it must print the refined window, not the base one —
  this is a one-line change, not a new surface.
- The footer analysis-params line states the base window; it must also state that zoom
  refines it. One clause, no new control.
- **Gate door (the one new hook this milestone owes).** The canvas is unreachable from
  node, exactly as at R3.2 and R4.3. Set `data-sgwin` on `#sgramCanvasA`/`B`/`D` to the
  window actually rendered in that pane, so `tests/headless.js` can read it out of
  `--dump-dom`. An attribute, not UI; it never appears on screen or in an export.
- **Done when:** `?demo&zoom=sga:1,3` reports 8192 on pane A and 2048 on the untouched
  pane B, and the visible chip agrees with the attribute. ✅

### M2.7.4 — Reviewer additions (`f96e806`) — **BUILT**

Not in the handoff; found in review of the delegated build and written by the reviewer,
source **and** contract (`tests/m27.test.js` grew the section *“the hover readout reads
the analysis the pane drew”*, and its `?refine=0` contract was repaired).

- **The hover readout must read the analysis the pane drew.** A refined slice carries its
  own `sg.t0`; the crosshair was still sampling the base pass under a refined picture, so
  the number under the cursor could disagree with the pixel beneath it — exactly the
  “every visible number defensible” rule. The pane now publishes what it drew as
  `s._sgShown`, and `attachSgramCrosshair` offsets by that slice's `t0`.
- **One refine per gesture, not one per frame.** A pan or a wheel zoom fired a refine job
  on every intermediate window; the request is now debounced
  (`SG_REFINE_SETTLE_MS = 120`) around a single `want` object, and a job whose window is
  no longer wanted when it returns is dropped instead of overwriting a newer one.
- **`?refine=0` is a real hook.** The shipped handler was being satisfied by a decoy
  string in the source; the contract now reads the handler's shape, and was
  mutation-checked like every other source-reading assertion.
- **Pane D states its window from the data it rendered**, not from a constant.
- **Done when:** the gate is green and the crosshair, the status chip and `data-sgwin`
  all name the same analysis. ✅

### Verified by hand (reviewer, 2026-08-24)

The magnify overlay refines too, as M2.7.2 requires: at `?demo&open=all&zoom=sga:1.0,2.4&mag=sga`
the overlay prints **8192-pt Hann** in both themes with visibly crisper partials, while the
pane nobody zoomed still reports `data-sgwin="2048"`. One capture in six shows the base
window instead — that is the known headless race (the refine had not landed before the
virtual-time budget expired), not a defect: by design the pane draws the base pass until the
finer one arrives. Proven with a scratch copy of `index.html` publishing `_sgShown` as a DOM
attribute. **Nothing asserts the overlay's window in the gate** — the race makes a naive
assertion flaky, and a non-flaky one is still owed.

### Settled by the user, 2026-08-25 — magnifying alone does not buy resolution

Asked whether opening a pane in the magnify overlay should refine it even when nothing is
zoomed, the user said **no: the span decides, not the pixels.** "Resolution follows
attention" measures attention as the *time window you selected*, not the canvas it happens
to be painted on. So the rule stands as built — an unzoomed pane reports `data-sgwin="2048"`
and stays pixel-identical to v1.0.0 wherever it is drawn, and zooming **inside** the overlay
refines exactly as it does in the card. Do not revisit this in R5.

- Verify + commit per task, and run `./tests/verify.sh` to `gate passed` before the PR.
  The gate grows a **sixth step** (`tests/m27.test.js`); the two frozen-copy SHAs and the
  read-only-`tests/` guard are unchanged, and this milestone adds no third frozen block.

---

# R5 — Harmonic tracks on the spectrogram

R3 marks where two strings meet on the *frequency* plots and R4 explains the ancestry in
words. R5 puts the same knowledge on the **time** axis.

**The user's framing, 2026-08-25 — the overlay is a generative model.** Theory says which
partials a note *should* produce; the overlay draws that prediction across the measured
spectrogram; the user sees for themselves whether the energy is really there. "Explaining
the measurement through a generative model type concept." That is the same house rule the
app already lives by, pointed at a new surface: *facts come from the data, intent comes
from the user* — which notes were played is **intent**, so the user tells the app, and the
app never guesses.

The core value, in the user's words: *"a user can intuitively understand which string and
its harmonics are activated at what time."* Proper use assumes the recording has segments
of a single chord, or one to a few notes. Expect the common case to be **one segment at a
time — one note up to one chord.**

## Decisions already made (do not re-litigate)

- **The spectrogram overlay has its own state, separate from the frequency plots'**
  (`state.stringHarmonics`, the M2.6g 6×4 grid). Explicit user instruction, first
  sentence of the R5 brief. The two views answer different questions and must be
  settable independently.
- **The two questions the previous draft left open are answered.**
  1. *One string at a time, or free-form overlay?* — **Neither, as posed.** The unit is a
     **note set**: R5.1 ships single open strings, R5.2 ships the eight open chords. It is
     one control, one state shape, and it grows without migration.
  2. *Does "audition a single harmonic" jump the queue?* — **No.** It is independent of
     the tracks and it does not serve the generative-model idea; leave it unscheduled.
- **Visible control = a chord/note dropdown. Internal representation = `frets[6]`,**
  `null` meaning "not sounding", integer meaning fret number (`0` = open). A fret grid, if
  it is ever wanted, becomes a new view onto existing state rather than a migration.
- **No chord auto-detection, ever.** Not a capability gap — a house rule.
- **Harmonic count is one integer, "harmonics 1–N",** not N per-harmonic switches. The
  frequency plot's switches are about individual partials; the spectrogram overlay is
  about the comb *as one object*. Default 6, which is the count the user named.
- **Tracks carry the note's hue, stroked over a black halo.** The magma image is dark at
  the floor and bright at the ridges, so neither a light nor a dark stroke alone survives
  both; a 3 px `rgba(0,0,0,0.55)` halo under a 1.5 px hue does. Black is legitimate here
  and a theme color is not — the spectrogram is a data surface and **data colormaps never
  theme** (CLAUDE.md). Hue also keeps the overlay consistent with `STRING_COLORS`, the
  data palette the frequency plot's harmonics already use.
- **Two tiers of coincidence, `COINCIDENCE_CENTS` (6 ¢) and `TEMPERED_CENTS` (20 ¢).** See
  the measurement below; this **reverses** the shipped comment at `index.html` ≈1436 which
  calls the 14 ¢ tempered third "a near-miss, not a landing". That reversal is deliberate,
  is scoped to chord overlays, and must be appended to SPEC.md — R3's ✦ on the frequency
  plots keeps the 6 ¢ rule and stays byte-identical.

## Measured before specified (reviewer, 2026-08-25)

Three scratch computations over the eight open chords in E standard, harmonics 1–6, using
the app's own ET formula. They decided the spec; keep them in mind before changing it.

**1. Chord collisions are trimodal, and ±6 ¢ misses every third.** Across all eight
chords, every cross-note pair within 50 ¢ falls in one of three buckets, with **nothing at
all between 16 ¢ and 50 ¢**:

| offset | what it is | pairs in E major |
|---|---|---|
| 0.0 ¢ | octaves and unisons | 10 |
| ±2.0 ¢ | fifths and fourths | 8 |
| +13.7 ¢ / −15.6 ¢ | major / minor thirds | 4 |

E major has 22 pairs inside 50 ¢ and 18 inside 6 ¢; the four it misses are exactly the G♯
collisions — the note that makes the chord major. That is docs/THEORY.md §5's table
appearing directly in the measurement. Because the population has a 17–50 ¢ dead zone, a
second cutoff anywhere in 17–50 ¢ classifies identically, so **20 ¢ is as empirically inert
a choice as 6 ¢ was** — which is why it is a constant and not a slider, exactly as R3's was.

**2. The density objection was a miscount.** Counting *partials* suggested ~30 lines on a
166 px plot; the right count is **distinct drawn tracks**, and the collisions collapse them
— which is the lesson, not an obstacle:

| chord | partials (h = 1–6) | distinct tracks ≥ 2 px apart | clusters | span used |
|---|---|---|---|---|
| E | 36 | 17 | 11 | 91 px of 166 |
| C | 30 | 15 | 8 | 78 px |
| D | 24 | 14 | 7 | 78 px |
| G | 36 | 17 | 10 | 91 px |

~5 px per track is tight but drawable, and 6–11 glyphs is manageable — especially spread
along the **time** axis, as the user proposed, rather than fighting for frequency space.

**3. Most chord collisions are invisible to today's detector.** `findCoincidences()` only
reports a harmonic landing on an *open string's fundamental*. Clusters with no fundamental
in them: **E 8 of 11, C 6 of 8, G 7 of 10, Am 4 of 6.** Examples it cannot see today:
`C3×5 ≈ E3×4 ≈ E4×2` at 657.5 Hz (the 4:5 major third itself), `B2×4 ≈ B3×2 ≈ E3×3 ≈ E2×6`
at 494.2 Hz (four partials, one line), `G3×5 ≈ B3×4` at 983.9 Hz. **That is the whole case
for R5.0.**

## Build order

R5.0–R5.1 is the first visually testable deliverable and is what this session builds.
R5.2 is where the user's case (b) — a chord, with collisions — becomes visible.

### R5.0 — partial clustering in block 0 (node-testable, no UI) — **BUILT** (`3befbfc`)

`findCoincidences()` answers a **directional** question ("does a harmonic of one string
land on another's open fundamental") because R3's frozen popover copy is phrased that way.
Chords need a **direction-free** one ("which partials of these notes share a frequency"),
with no fundamental required on either side. That is a different question, not a second
copy of the same one — the shared primitives (`centsBetween`, `octaveFold`,
`HARMONIC_INTERVALS`, the tolerance constants) stay single, and a gate assertion binds the
two so they can never disagree.

**Leave `findCoincidences()` untouched.** R3's ✦ counts and R4's ancestry must come out
byte-identical; the gate asserts it (r3 42, r4 60, unchanged).

Add to script block 0, immediately after `findCoincidences()`:

- `const TEMPERED_CENTS = 20;` beside `COINCIDENCE_CENTS`.
- `notePartials(midis, nHarm, a4)` — `midis` is an array whose entries are MIDI numbers or
  `null` (not sounding). Returns one flat array of
  `{key, midi, harm, f}`, `key` = the index in `midis`, `harm` = 1…`nHarm`,
  `f = midiToFreq(midi, a4) * harm`, in `midis` order then ascending `harm`. Skips `null`
  entries. Fretting needs no new function: a fretted pitch is `openMidi + fret`.
  **No frequency clipping here** — `FMIN`/`FMAX` live in script block 3, and block 0 must
  stay free of them; the draw pass clips to the pane instead. (Inert in practice: with
  N ≤ 8 the highest stocked partial is E4×8 ≈ 2637 Hz and the lowest fundamental is
  D2 ≈ 73.4 Hz, both inside the plot.)
- `partialClusters(parts, tolCents)` — sort by frequency ascending, then **walk upward**:
  open a group at the lowest partial not yet in one and keep absorbing the next partial
  while it stays within `tolCents` of the group's **first** member (so `tolCents` caps the
  group's total spread, not a chained neighbour gap). `tolCents` defaults to
  `TEMPERED_CENTS`. Return only groups holding partials from **two or more distinct
  `key`s**, sorted ascending by `f`, each shaped
  `{f, members:[…sorted by f], notes, spreadCents, tier}` — `f` the geometric mean of the
  members, `notes` the count of distinct keys, `spreadCents` the cents from the lowest
  member to the highest (0 exactly when they coincide, never `-0`), and `tier` `"locked"`
  when `spreadCents <= COINCIDENCE_CENTS`, else `"tempered"`.

**Done when** `tests/r5.test.js` passes its R5.0 block, including the consistency
assertion that binds the two detectors: across **all five stocked tunings** with the six
open strings and harmonics 1–N for N = 1…8, **every** landing `findCoincidences()` reports
(96 of them) appears inside some `partialClusters()` group — the group must contain both
the reported harmonic (`key === c.from.si`, `harm === c.harm`) and the open string it lands
on (`key === c.onto.si`, `harm === 1`). Measured here before it was specified: 96 landings,
0 missing. This is what stops the greedy walk from splitting a real landing across a group
boundary without anyone noticing.

### R5.1 — one note, drawn (the first thing the user can look at) — **BUILT** (`154eec9` state/control/model/hooks, `0da9427` draw + reviewer `key` fix)

**State** (block 4, beside the other spectrogram state):

- `state.sgFrets = [null,null,null,null,null,null]` — the overlay's note set.
- `state.sgHarm = 6` — harmonics 1–N.
- Neither is persisted and neither enters `gsSettings` in R5.1; that is a v4 decision to
  take once the shape has been used. Neither ever enters an export (they are UI state, and
  exports are data-only).

**Control** — a new `.ctlgroup` in `#sgramCard`'s `.cardhead`, before `Time axis`:
`<span>Overlay</span>` and a `<select id="sgNoteSel">` whose options are `Off` (default)
plus the six open strings named from the current tuning (low first), and a
`<select id="sgHarmSel">` offering `1–4 / 1–6 / 1–8`, default `1–6`. Picking a string
writes that one fret as `0` and the rest `null`. Both selects re-label on a tuning change
(`syncVocabTuning()` is the existing precedent for tuning-reactive labels).

**Model** — `sgramModelFor()` gains `comb`: the flat `notePartials(...)` array for
`state.sgFrets` (one entry per partial, in the order block 0 returns them), or `null` when
no string is selected. **No clipping in the model** — the draw pass clips to the pane, so
`comb.length` is the count of partials the overlay asked for and is exactly what
`data-sgcomb` publishes. Nothing about the STFT changes; this is chrome, and it must not
perturb M2.7's refine key (the two cache keys mention neither `sgFrets` nor `sgHarm`).

**Draw** — a new pass in `drawSpectrogramScene()` **after** `drawStringMarkers()` (line
≈3660) and **before** the colorbar, clipped to the plot rect: per partial, a full-width
horizontal at `yOfF(f)` — 3 px `rgba(0,0,0,0.55)` halo, then 1.5 px in
`_stringColor(key)`, **solid** for `harm === 1` and `setLineDash([3,3])` above it. No
labels: the existing right-edge string markers give the reference, and the plot has no
room. The pane's status chip gains the overlay in words, e.g. `E2 · harmonics 1–6`.

**Hooks** (the canvas is unreachable from node, same reasoning as `data-sgwin`):
`?sgnote=<0-5>` and `?sgharm=<n>`, unpersisted, gate-only; and each sgram pane canvas
carries `data-sgcomb="<count>"` — the number of partial tracks in that pane's overlay
model — absent when the overlay is off.

**Done when** `?demo&sgnote=0` draws six tracks on both panes, `data-sgcomb="6"`, the chip
names the note, `?sgnote` absent leaves every pane pixel-identical to today, and PNG
exports carry no tracks.

**PNG note, corrected here after reading the source:** `exportSgramPNG()` does *not* run the
`state.strings=false` dance — it never needed to, because the strings axis is a
frequency-plot thing and the spectrogram draws its own always-on right-edge markers
instead. So the overlay does not get stripped for free: `exportSgramPNG()` must save
`state.sgFrets`, blank it to six `null`s, and restore it in a `finally`, exactly as
`_cardPng()` does for `state.strings`. Stripping is the shipped precedent (no PNG carries
the strings axis or the harmonics), and it is what the gate asserts. It is also a taste
call the user may want to reverse — a picture of an overlay is arguably the point of
exporting it — so raise it at the milestone boundary rather than deciding silently.

**Verified here (reviewer), not taken from the builder's report** — five node suites green
(dsp 171, r3 42, r4 60, m27 51, **r5 76**) and headless **40/0**. Beyond the gate:

- **The `key` defect, found and fixed in review.** The builder handed `notePartials()` the
  one selected note (`[midi]`), so every partial came back `key === 0` and every string
  would have painted in `STRING_COLORS[0]`. `sgramModelFor()` now builds a **six-slot**
  `sgMidis` array (nulls skipped) — `key` is the index into the array `notePartials()` was
  handed, and `key` is what picks the hue. The 76th r5 assertion closes the gap that let it
  through; it was mutation-checked against two spellings of the bug (`[midi]` and
  `[sgMidis[sgSi]]`) before landing.
- **Proved in pixels, not by eye.** A census of the magnify screenshots (ΔRGB ≤ 24) gives
  low E → red 4158 / pink 2986, high E → red 0 / pink 7062, overlay off → red 0: each
  string paints only its own hue, 8 harmonics mark more than 6, and Bright is identical to
  Dark (the overlay is **data** color, never themed).
- **Proved the model lands on the measurement.** The demo pair is exactly the six open
  strings (`tests/make_samples.js:38`), so at `?zoom=sga:0.05,0.6,70,700` the six track
  rows were located with the overlay on, then luminance was read at those rows in the
  overlay-**off** image against ±10/±14 px neighbours: all six (y = 222, 278, 345, 433,
  555, 766) are local maxima. The prediction sits on the energy.
- **Clip checked** at `?zoom=sga:0.6,1.4,150,700` in Bright: tracks stop at the plot rect,
  no halo bleed into the axes or the right-edge markers, and the chip reads
  `8192-pt Hann … E2 · harmonics 1–6` — the overlay composes with M2.7's refine.

**Taste call raised with the user at this boundary, as this task said to:** sgram PNG
exports strip the overlay (`exportSgramPNG()` blanks `state.sgFrets` in a `finally`),
following the shipped data-only precedent. Reversing it — exporting the picture *with* its
prediction drawn on — is the user's call, not a silent one.

### R5.2 — a chord, from a picker

Eight open chords as a table of `{name, frets[6]}`, `null` = muted:
`E [0,2,2,1,0,0]`, `Em [0,2,2,0,0,0]`, `A [null,0,2,2,2,0]`, `Am [null,0,2,2,1,0]`,
`C [null,3,2,0,1,0]`, `D [null,null,0,2,3,2]`, `Dm [null,null,0,2,3,1]`,
`G [3,2,0,0,0,3]`. They join `#sgNoteSel` under a second optgroup; pitches come from the
existing ET formula, colors from `_stringColor(key)`. 17 tracks where there should be 36 —
**the merge is visible before anything is marked**, which is the point.

### R5.3 — collisions marked and clickable

One ✦ per `partialClusters()` cluster, not per pair; the two tiers drawn distinguishably
(the locked tier as R3 draws it, the tempered tier hollow); distributed along the **time**
axis rather than stacked in frequency, per the user's suggestion — including the extreme
left and right edges of the span when crowded. Click opens a frozen copy block explaining
the cluster as a ratio in R4's ancestry vocabulary. Copy traces to docs/THEORY.md §1
(4:5:6 is the major triad), §3.4 (the denominator rule), §4 (10:12:15 for the minor), §5
(the tempered third is 14 ¢ sharp — which is *why* that tier exists and is drawn
differently). **Reviewer writes that copy and freezes it by sentinel + SHA; the builder
wires it.**

### R5.4 — bound it in time

Restrict the overlay to a selected time span rather than the full pane width, composing
with M2.7's zoom refinement. Deliberately last: the user asked to ignore time-span until
the rest works.

### Deliberately not in R5

Barre and movable chords; arbitrary note entry; auto-detection; per-track numeric decay
readouts; auditioning a single harmonic.

---

# R6 — Interval consonance explainer

*(was R5 before M2.7 and harmonic tracks were scheduled; unchanged in content.)*

Source: `docs/THEORY.md` §2.5 (roughness) and §2.6 (consonance definitions).

- **R6.1** — Block-0 pure functions: joint period of two frequencies (lcm of periods via
  the rational approximation), and the Sethares roughness `d(f₁,f₂,a₁,a₂)` exactly as
  parameterized in §2.5 (`b₁=3.5, b₂=5.75, d*=0.24, s₁=0.021, s₂=19`). Node tests assert
  `d=0` at `Δf=0`, the bracket peak at `s·Δf ≈ 0.221`, and decay past the critical band.
- **R6.2** — Total roughness over all cross-pairs of two partial sets.
- **R6.3** — UI: selecting two markers shows joint period, comb alignment, and a
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
