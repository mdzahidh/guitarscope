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

## Milestones at a glance

Every milestone this app has, in build order, with where its detail lives. **Detail** is a
search string, per this file's anchor convention — grep it, don't trust a line number. Sections
marked *(CLAUDE.md)* have no task breakdown here: they predate this file and are recorded in the
CLAUDE.md status list and the SPEC.md changelog.

| # | What it is | State | Detail |
|---|---|---|---|
| **M1** | The instrument itself: drop two recordings, get Welch LTAS, band energies and a tone-character panel where every number is defensible. | ✅ done | *(CLAUDE.md status, SPEC.md)* |
| **M1.5** | Acoustic support, the glossary, and the first round of "say what you measured". | ✅ done | *(CLAUDE.md status)* |
| **M2** | Spectrogram, envelope overlay, onset ticks. | ✅ done | *(CLAUDE.md status)* |
| **M2.5** | Difference views, level-match, EQ-region lane, EQ match with device faces. | ✅ done | *(CLAUDE.md status)* |
| **M2.6a–i** | The UX pass: one global level-match, the strings axis, per-string harmonics, per-card exports, remembered settings. | ✅ done | *(CLAUDE.md status)* |
| **v1.0.0** | Release hardening — total PNG export, "How to use this app", instrument selector removed. | ✅ shipped (tag `v1.0.0`) | *(CLAUDE.md status, SPEC.md)* |
| **R1** | Rename GuitarScope → **Claude Rameau** in every user-visible string, snapshots still load. | ✅ done, gate 1 | `# R1 — Rename` |
| **R2** | The About modal — the app's own origin story, two doors into it. | ✅ done, gate 1 | `# R2 — About modal` |
| **R3** | ✦ **discovery moments**: mark where a shown harmonic lands on another open string, and explain it through its ratio. | ✅ done, gate 3 | `# R3 — ✦ discovery moments` |
| **R4** | **Harmonic ancestry** in the per-string popover — which interval each harmonic is, and where the string sits against its neighbour. | ✅ done, gate 4 | `# R4 — Harmonic ancestry` |
| **M2.7** | **Resolution follows attention** — zooming a spectrogram pane re-runs the STFT for that window instead of cropping. | ✅ done, gate 6 | `# M2.7 — Resolution follows attention` |
| **R5.0–R5.1a** | The **generative overlay**: the user names a note, the app draws the partials theory predicts across the measured image. | ✅ done, gate 7 | `### R5.0`, `### R5.1`, `### R5.1a` |
| **R5.2** | Open-chord picker — eight stocked shapes as fret arrays, so a shape moves with the tuning. | ✅ done | `### R5.2 — a chord, from a picker` |
| **R5.6** | Overlay legibility — partial labels, the scrim, hold-to-follow. | ✅ done | `### R5.6 — legibility` |
| **R5.3** | **Collision marks**: where the combs meet, marked and clickable, read back as a ratio. | ✅ done | `### R5.3 — collisions marked and clickable` |
| **Look pass** | Five perceptual colormaps, and track colors the colormap cannot make. | ✅ done | `### Look pass` |
| **R5.7** | Nothing overlaid by default; labels outside the plot; Triad colors that mean the chord. | ✅ done | `### R5.7 — nothing on by default` |
| **Q1** | Quality of life: A/B color keys, EQ "Reshape", solid-vs-dashed harmonics on the line plots with user-set hues. | ✅ done | `### Q1 — quality-of-life batch a/b/c` |
| **Q2** | Small changes: the shelf glyph that lied, defaults from real material, a key for the two stars. | ✅ done | `### Q2 — small changes a/b/c` |
| **R5.5** | **Near-floor disclosure on the LTAS Difference** — say where a large Δ is two views of the floor rather than a real difference. | ✅ done | `### R5.5 — near-floor disclosure` |
| **Q3** | Near-floor disclosure carried into the **Band Energy** table and the **At-a-glance** strip — one predicate, three cards. | ✅ done | `### Q3 — the same floor in three cards` |
| **Q4a** | The **expanded view, truly expanded** (1/2) — collision-mark clicks and Hold-Fade work in the magnify overlay. | ✅ done | `#### Q4a — the two interactions` |
| **Q4b** | The **expanded view, truly expanded** (2/2) — the overlay carries the sgram card head's Overlay / Colors / Legibility controls. | ✅ done | `#### Q4b — the controls in the expanded view` |
| **M5** | **Record directly into a slot** — capture a take per guitar through a device picker, landed through the existing pipeline; no realtime analysis. | ✅ built 2026-09-04 (raw-PCM rewrite of the reverted MediaRecorder attempt) | `# M5 — Record directly into a slot` |
| **R6** | **Interval consonance explainer** — joint period, comb alignment, Plomp–Levelt/Sethares roughness. Now also carries **R6.4**, the overlay's time bound (was R5.4). | ⏸ blocked: two `docs/THEORY.md` §2.5 numeric caveats are unresolved (R6.4 is not blocked) | `# R6 — Interval consonance explainer` |
| **Warped sgram difference** | Replace the removed pixel-wise spectrogram difference with an onset-warped / DTW one. | ⏸ deferred until after R6 | `### Deferred — warped spectrogram difference` |
| **M3** | Live input; still owes the task-based entry points deferred from M2. | 🚫 gated on explicit user go-ahead | `# Gated` |
| **M4** | Chain measure. | 🚫 gated on explicit user go-ahead | `# Gated` |
| **Tension landscape** | From `docs/STORY.md`; unscheduled. | 🚫 gated, unscheduled | `# Gated` |

**Partially done, precisely:** nothing in the table is half-built. R5 as a *milestone* is
"done except R5.5", because R5.4 left it for R6 on the user's instruction (2026-08-26) and
everything else in it is merged. R6 is the only entry with built material blocked behind a
question the user has to answer.

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

**Verification, in proportion** (2026-08-26, the user's instruction: "*heavily simplify your
testing and verification strategies as you seem to take a very long time and effort*")

- **Pin numbers where launches are free.** Exact counts belong in the node suites
  (`tests/r5.test.js` and friends); a Chrome launch costs 4–5 minutes, so headless assertions
  should be **relational** — *B's pane equals A's*, *C's chord marks fewer than E's* — not
  equal to a constant. The mutation-catching power lives in the node suite either way.
- **Shrink the suite when the feature shrinks.** Deleting a draw pass deletes its assertions.
  A suite that only ever grows stops being read. R5.7 went 264 → 259 and that is the healthy
  direction.
- **Merge headless sections that share a page load.** Every distinct URL is a launch; four
  assertions off four launches beat four assertions off six.
- **Run the full gate once, at the end.** Not after each edit. Node suites are seconds — run
  those freely while building; `./tests/verify.sh` is the sign-off.
- **Mutation-check new assertions, but stop there.** Break the one line each new assertion
  claims to require; don't sweep the whole file. And prefer an assertion whose subject is the
  handler, not query-string text that also appears in prose and comments (the gate-3 lesson).
- **Screenshots are for the reviewer's eye, not for the gate.** One both-themes pass at the
  end of a milestone, not per task.

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

Branch `rameau-r1r2`, base `675afd6`, R1.1–R1.5 + R2.1–R2.5 built by Sonnet 1.2.
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

Branch `rameau-r3`, base `0c713b7`, R3.2–R3.5 built by Sonnet in the two prescribed
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
  *(Reversed by the user at the R5.1a boundary — PNGs now render the view as it stands, so
  a ✦ that is on screen is in the export. See R5.1a below.)*

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
exports carry no tracks. *(That last clause was reversed by the user at the R5.1a
boundary; the gate now asserts the opposite. See R5.1a below.)*

**PNG note, corrected here after reading the source:** `exportSgramPNG()` does *not* run the
`state.strings=false` dance — it never needed to, because the strings axis is a
frequency-plot thing and the spectrogram draws its own always-on right-edge markers
instead. So the overlay does not get stripped for free: `exportSgramPNG()` must save
`state.sgFrets`, blank it to six `null`s, and restore it in a `finally`, exactly as
`_cardPng()` does for `state.strings`. Stripping is the shipped precedent (no PNG carries
the strings axis or the harmonics), and it is what the gate asserts. It is also a taste
call the user may want to reverse — a picture of an overlay is arguably the point of
exporting it — so raise it at the milestone boundary rather than deciding silently.
**Raised, and the user reversed it** — R5.1a takes the blanking back out of all three
exporters and the gate asserts the inverse. The note is kept for the reasoning, not as
current behaviour.

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
prediction drawn on — is the user's call, not a silent one. **Answered:** *"i would like
any export of PNG to include the visualization."* Taken broadly — all three PNG paths, not
just the sgram — in R5.1a.

### R5.1a — the user's legibility pass — **BUILT** (session 20, reviewer)

Not a planned task: the user visually tested R5.1 and returned four items, which the
reviewer fixed directly (no delegation — the whole change is ~40 lines of `index.html`, and
three of the four are judgement calls about what a control communicates).

- **(a) hard to see** → halo 3 → 5 px, track 1.5 → 2.5 px, halo alpha 0.55 → 0.75, dash
  `[3,3]` → `[6,4]`, and `_stringColor` → new `_trackColor(si,alpha)` =
  `liftForDark(STRING_COLORS[si], 0.62)`. Diagnosed by census: a track is read against its
  own halo (94.8 % of its pixels), not the magma, so the lift target has to clear the
  **palette**, not the image. Per surface, not per theme — identical in Bright and Dark.
- **(b) pane too short** → `#sgramCanvasA/B/D` 230 → **372 px** (308 px of plot after
  `SGPLOT.mT+mB`), **288 px** under `@media (max-width:900px)`.
- **(c) selector not obvious** → options renamed `Harmonics 1–N`, `title=` on both selects,
  `#sgHarmSel` ships `disabled` and `syncSgHarmSel()` enables it from `state.sgFrets` at
  every door, plus `select:disabled{opacity:.4}` so the greying is visible.
- **(d) PNG should include the visualization** → **the taste call R5.1 raised, answered by
  the user and taken broadly.** All three PNG paths (`exportPNG`, `_cardPng`,
  `exportSgramPNG`) stop blanking `state.strings` / `state.stringHarmonics` /
  `state.sgFrets`. **PNG = the view; CSV/JSON = the data.** Anything in R5.2+ that adds a
  view-only mark should assume it will appear in a PNG.

**Gate**: `tests/r5.test.js` 76 → **102** — draw-pass widths (halo > track, track ≥ 2,
halo − track ≥ 2, so the sub-pixel edge cannot come back), the lift target read out of the
source and re-run through the shipped `liftForDark`, the pane-height rules, the `#sgHarmSel`
affordances and their three call sites, and the **inverted** exporter contract (no exporter
may assign to those state keys). Every one mutation-checked the day it was written; ten
mutations, ten caught.

### R5.2 — a chord, from a picker — **BUILT** (session 21)

Eight open chords as a table of `{name, frets[6]}`, `null` = muted:
`E [0,2,2,1,0,0]`, `Em [0,2,2,0,0,0]`, `A [null,0,2,2,2,0]`, `Am [null,0,2,2,1,0]`,
`C [null,3,2,0,1,0]`, `D [null,null,0,2,3,2]`, `Dm [null,null,0,2,3,1]`,
`G [3,2,0,0,0,3]`. They join `#sgNoteSel` under a second optgroup; pitches come from the
existing ET formula, colors from `_trackColor(key)`. 17 tracks where there should be 36 —
**the merge is visible before anything is marked**, which is the point.

*As built.* `SG_CHORDS` + `_sgChordName()` in block 4; the shapes are **fret offsets**, so a
chord moves with the tuning (`tuningMidi(...)[si] + fret`) instead of freezing in E standard.
No new draw code and no new state — `state.sgFrets` was always six slots and R5.1 just never
filled more than one, so `sgramModelFor()` hands `notePartials()` the same six-slot array and
each string keeps its own hue (`key` indexes what it was given). The change handler mutes all
six before assigning `ch.frets.slice()` — a copy, never the shipped table.

*Done when* — met: `?sgchord=<name>` exists as a gate-only hook (unpersisted, no UI, mutes
before it resolves so an unstocked name overlays nothing); `tests/r5.test.js` pins the stocked
fret table against the independently measured one, the fret-plus-open-midi arithmetic (with
the tuning variable captured by name, after a loose version survived mutation), the picker
built *from* `SG_CHORDS`, and the hook's wiring — 102 → **128**; `tests/headless.js` reads
`data-sgcomb` through real Chrome (E → 36, D at N=3 → 12, `Zz` → absent) and confirms a chord
marks more pixels than one string does — 40 → **45**.

### R5.6 — legibility: labels, a sheet, and hold-to-follow — **BUILT** (session 22, reviewer)

Not a planned task either: the user tested R5.2 and returned three items in one message —
label the harmonics ("something along the line of C2 × 2 = (C4)"), and two ideas for the
congestion a chord's 36 tracks make, both "with some tunable parameter (in the UI for
debugging)": (a) a translucent sheet between the spectrogram and the lines, (b) click-and-hold
a line to light its comb and dim the rest. **Numbered before R5.3 and built first**, because
R5.3's ✦ marks have to sit on top of whatever legibility scheme wins. *(The user's example
arithmetic was off by an octave — `C2 ×2` is `C3`; corrected in the label and in the reply.)*

- **R5.6b — the labels.** `partialLabel(p, a4)` in block 0: the fundamental is named alone
  (`E2` — "E2 ×1 = E2" is arithmetic, not information); every harmonic reads
  `E2 ×3 = B3` inside R3's locked tier (`COINCIDENCE_CENTS`) and `E2 ×5 ≈ G♯4` beyond it.
  The `≈` is the whole point: the 5th harmonic sits 14 ¢ below the tempered note it is
  named after (THEORY §1, §5), and an `=` there would teach the wrong lesson. Drawn
  highest-frequency first with M2.6c's rule — a label within 12 px of the one above it is
  **skipped, never smeared** — so a crowded pane thins its own labels. **This reverses
  R5.1's "no labels" rule**, which held only while a single string could be overlaid.
- **R5.6a — the sheet.** `state.sgScrim` (default 0.45, range 0–90 % in the card head, hook
  `?sgscrim=`): a translucent black fill over the plot rect, drawn *after* the image and
  *before* the tracks. **No comb, no sheet** — the measurement is never dimmed for its own
  sake, which is also what makes "a scrim with nothing overlaid never touches the picture"
  assertable.
- **R5.6c — hold to follow.** `attachSgFocus(i)`: mousedown asks `_sgTrackAt()` which track
  is under the cursor (the same `notePartials()` question the model asks, mapped through the
  pane's zoom window, 8 px), sets `state.sgFocus` to that **string**, and the draw pass gives
  every other comb `1 − state.sgDim` alpha (default 0.85, range 0–95 %, hook `?sgdim=`) and
  drops its labels with it. A drag of more than 3 px hands off to the zoom box, so following
  a comb never costs a gesture; mouseup/mouseleave clear. `?sgfocus=<0-5>` holds a comb
  without a mouse.

*As built.* The two ranges ship `disabled` and `syncSgHarmSel()` enables them at every door
into `state.sgFrets` — the R5.1a affordance rule, applied to the new controls; it also clears
a `state.sgFocus` whose string has stopped sounding. None of the three keys is persisted or
exported (they are view state, like `sgFrets`), and none is part of the M2.7 refine cache key.
The status chip gains `· hold a track to follow it` while nothing is held.

*Done when* — met: the pane publishes `data-sglabels` (how many tracks it could name) and
`data-sgfocus` (which comb it is holding), because the canvas is unreachable from node;
`tests/r5.test.js` 128 → **180** (label arithmetic against independently computed note
names, the `=`/`≈` boundary at `COINCIDENCE_CENTS`, the draw-pass ordering that puts the
sheet under the tracks, the skip-don't-smear guard, the alpha that a held comb keeps and an
unheld one loses, and the inverted contracts: no exporter and no settings writer may touch
the three keys); `tests/headless.js` 45 → **56**, reading real pixels through Chrome — a
scrim with no overlay is byte-identical to no scrim, `sgdim=0` vs `sgdim=95` differ by 741 px,
and an out-of-range `?sgfocus=` leaves the picture exactly as it was. All 31 + 11 new
assertions mutation-checked the day they were written.

*Harness note.* Two long-standing M2.7 assertions went red during this build and were **not**
an R5.6 regression: the decode/draw race missed 7 launches in 8 on an *unmodified* checkout
while a runaway indexer held 99 % CPU, and 0 in 8 once it settled. `domDrawn`/`shotDrawn` now
say which launch they succeeded on and shout when the whole retry budget went by undrawn, so
the next loaded machine is diagnosable instead of looking like an unwired attribute.

### R5.3 — collisions marked and clickable — **BUILT** (session 22, reviewer)

The user's first item, held back until R5.6 settled how a crowded overlay reads: a chord is
where several harmonic series interleave, and the marks say **where two of them arrive at the
same pitch**. One ✦ per `partialClusters()` cluster, never one per pair — three strings meeting
at one frequency is one event, not three.

- **The maths.** `clusterRatio(cluster)` in block 0 reads a landing backwards. Every member
  reaches the meeting at `f = f_i × h_i`, so the fundamentals go as `1/h_i`: invert the harmonic
  numbers, clear the fractions with their lcm, and the chord states itself in whole numbers.
  (The lcm construction is already in lowest terms — `gcd(L/h_i) = L/lcm(h_i) = 1` — so only the
  *folded* set, after octave duplicates are dropped, needs a second reduction.) One member per
  string, taken at its **lowest** colliding harmonic; the higher ones are that same arrival
  doubled. `CHORD_RATIO_NAMES` names only the ratios THEORY fixes (4:5:6 major, 10:12:15 minor,
  and the five plain intervals); anything else returns a null name and the copy **says nothing
  rather than improvising**.
- **The mark.** A fourth-and-a-half pass in `drawSpectrogramScene` (after the tracks, before the
  colorbar), guarded on `model.clusters` and clipped to the plot rect. Drawn as a path — R3's
  `starPath()`, R = 8 — never the ✦ glyph, for the session-15 chevron reason. The landing belongs
  to neither string, so it takes **no guitar accent and no themed ink**: a 4 px black halo at
  0.8 α under a fixed light cream `rgba(247,242,232)`, because the mark sits on the magma, which
  is dark in both themes. **Filled** inside R3's locked tier, **hollow** (2 px stroke) when
  temperament leaves a near miss. Marks obey R5.6c's focus fade — a held comb keeps its own
  meetings at full strength and the rest go to `1 − sgDim`.
- **Spread along time, per the user's suggestion.** Cluster frequency sets `y`; `x` is spread
  evenly across the pane between 14 px insets and carries no meaning, which is why the status
  chip names the click rather than a time. The string labels' vertical 18 px guard is the wrong
  guard here — two landings a quarter-octave apart sit half a pane apart horizontally — so the
  thinner runs on the axis that actually smears: an **x-stride** that keeps every mark while the
  spacing clears a mark's own width and strides past some once a dense chord packs them tighter.
  Same house rule, measured on the right axis: skip rather than smear.
- **The click.** `sgHits[i]` per pane, fed by the draw pass and wired through the existing
  `attachHitClicks`; the crosshair hover sets the `help` cursor on a mark (M2.6d's affordance
  rule) except while a drag owns the cursor. `openClusterPopover()` is the same door as a
  spectrum coincidence. The copy is the **third frozen block** (`// ---------- collision
  clusters: the ✦ popover (R5.3) ----------` … `end collision copy`, SHA `1da64ae2…`): a
  musician's-ear paragraph, the physics read backwards into the ratio, R4's ancestry vocabulary
  for a two-string meeting (a power of two underneath means one string lives *inside* the other;
  an odd factor means both are children of a note further down), an equal-temperament paragraph
  that differs by tier, and the measured values. Beating is stated in Hz and called *beating*
  under 15 Hz, *roughness* above it (THEORY §2).

*As built.* `sgramModelFor()` calls `partialClusters(comb, TEMPERED_CENTS)` — the same primitive
the R5.0 maths tests cover, at the wider tier, because a fretted chord in equal temperament misses
just intonation by up to ~16 ¢ and a meeting the ear fuses is still a meeting. Clusters carry
their own `tier`, so the mark says which kind it is **without a second detector**. Nothing new is
persisted or exported. The status chip gains `· click a mark where strings meet`.

*Done when* — met: the pane publishes `data-sgclusters`, and it reports **marks drawn**, not
clusters found (the stride drops some), because the canvas is unreachable from node;
`?pop=clu<N>` pins the Nth cluster's popover for capture. `tests/r5.test.js` 180 → **232** —
`clusterRatio()` against hand-computed landings, the fold rule (an octave doubling folds, 2:5 is
left unnamed), the tier split, the frozen copy rendering on real math, the draw pass's guard and
order, and the inverted contracts. `tests/headless.js` 56 → **64**, through real Chrome: overlay
off → no attribute and no marks; `sgharm=1` → 6 partials and **no** marks, because a chord's open
strings are never the same pitch; `sgchord=E` → 11 marks per pane out of 36 partials; `sgchord=C`
→ **8**, so the count follows the chord rather than the tuning; and a pixel census of star-sized
near-cream blobs (the literal appears nowhere else in the app) confirms **22 drawn = 2 × 11
counted**, falling to 10 when one comb is held at `sgdim=95`. All 52 + 8 new assertions
mutation-checked the day they were written.

### Look pass — five colormaps, and a line the colormap cannot make ✅ BUILT (session 23, `555db8c`)

Not a planned task. The user, after testing R5.2/R5.3/R5.6, asked for a **quick experiment**,
explicitly light on rigour: "*lets make quick changes without too much rigorous testing to
experiment with first to nail the color before we do anything complicated*" — (a) perceptual
colormaps for the spectrogram, parula and viridis named; (b) track colors **outside** the
colormap, "*e.g. "black" in the parula would work great and we wouldn't need any halo or other
effects that makes the lines look much thicker and ugly*", plus dash options with a finer
default.

*As built.* Block 0 gains `CMAP_HEX`/`CMAP_NAMES`/`cmapTable()`/`cmapColor()` — five 256×3
perceptual tables (magma default and byte-identical, inferno/viridis/cividis from matplotlib
3.10.1, parula from OpenCV), inflated lazily and memoized, with `_CMAPS` pre-seeded from the
existing `MAGMA` so `magmaColor` survives by name for `tests/dsp.test.js`. Block 4 gains
`SG_TRACKS` (String hues / Black / White / Cyan / Magenta) and `SG_DASHES` (fine `[1,3]` default,
dot, dash, solid), three selects in one `Colors` group, and `state.sgCmap`/`sgTrack`/`sgDash` —
view state like `sgFrets`: unpersisted, unexported, and only the colormap enters the image cache
key. **The halo became a property of the color choice** rather than a rule: `halo = !tk.rgb`,
so a fixed hue draws one 1.4 px stroke and String hues keep R5.1a's halo. R5.1a's census stands;
its unexamined premise (track hues inside the map's gamut) does not.

*Done when* — met: `?sgcmap=`/`?sgtrack=`/`?sgdash=` hooks and `data-sgcmap`/`data-sgtrack`
attributes; the status chip names the map; track/dash selects ship disabled until a comb exists.
`tests/r5.test.js` 232 → **264**, including a CIE L* monotonicity check computed in-test over all
five tables (perceptual is measured, not asserted) and the assertion that no line-style key
reaches the refine cache. All new assertions mutation-checked; two initially missed and were
strengthened. **No new headless assertion, deliberately** — the user asked for a quick pass, a
launch costs 4–5 minutes, and the rot risk here is source-shaped rather than pixel-shaped.

### R5.7 — nothing on by default, and colors that mean the chord ✅ BUILT (session 24, reviewer)

Not a planned task either. After testing the look pass the user asked for six changes plus
one about process: don't show open strings by default; a `None` default and an **All open
strings** entry in the note select; a **1st harmonic only** entry beside the existing limits;
harmonic labels **outside** the plot on the right, along the vertical axis; **Dashes** as the
default line style; a **Triad** color option (root/third/fifth, harmonics sharing their note's
color) with three pickers, pre-populated with the most perceptually distinct set against
parula; **String hues** demoted from a color to a checkbox modifier, default off; Cyan and
Magenta removed. Plus: "*heavily simplify your testing and verification strategies*."

*As built.* The always-on right-edge pass is **deleted**, not switched off (`drawStringMarkers`,
its call site, `markers: tuningMarkers()`) — R5.1's overlay answers the same question on demand.
`SGPLOT.mR` is dynamic (`SG_MR_BASE 98` → `SG_MR_LABELS 150` when `model.comb` is non-empty,
assigned before `pW`), and each partial's label sits at `SGPLOT.mL + pW` behind a short leader
tick in the track's color, the label itself in `cssRGBA("ink-rgb", 0.82)` — chrome themes, data
doesn't — keeping R5.6's 12 px skip-rather-than-smear guard. `SG_TRACKS` is now
`{white, black, triad}`; `triadDegrees(midis)` in block 0 returns one slot per string
(`null` silent, `0` root / `1` third / `2` fifth) so harmonics inherit their note's color and a
six-string chord reads as three voices. `state.sgHue` (default off) mixes any base color toward
`_trackHueRgb(si)` and is now the **only** thing that draws a halo (`halo = !!model.hue`).
Default dash back to `[6,4]`. New hooks `?sgnote=all`, `?sghue=0|1`,
`?sgtriad=RRGGBB,RRGGBB,RRGGBB`; `?sgtrack=` validates `white|black|triad`.

*Done when* — met. The triad defaults are **measured, not chosen by eye**, the same discipline
as the colormaps: minimum pairwise CIE-Lab ΔE among the three is 145.7 (gate demands > 90) and
each one's minimum ΔE to any of parula's 256 entries is > 40. `tests/r5.test.js` 264 → **259**
and `tests/headless.js` stayed **64** — the suite shrank on purpose; see "Verification, in
proportion" above. Note for anyone touching the headless pixel checks: a pane with a comb
reserves a wider right margin, so an overlay-on vs overlay-off compare re-lays-out the whole
image and can only prove *that* something changed. Compare comb against comb.

### Q1 — quality-of-life batch a/b/c ✅ BUILT (session 25, reviewer)

Not a planned task: three reading-the-plot items the user asked to lump into a sub-milestone.
(a) every analysis card reminds the user which color is A and which is B, and the EQ card's
"Target" becomes **Reshape** — named for the guitar in the player's hands, and drawn in that
guitar's accent. (b) on the two frequency line plots an open string is **solid** and its
harmonics **dashed** in the same hue, that hue is user-settable per string in the open-string
popover and **persisted**, and the popover now offers harmonics **2–8** with the documentation
extended to match. (c) those harmonics are labeled on the line plots.

*As built.* `AB_KEY_CARDS` + `syncAbKeys()` insert a `.abkey` strip as a **sibling after
`.cardhead`** — inside it, M2.6d's fold-on-head-click would fire on every chip. `buildEqModels()`
emits `colorFit: COLORS[fit.src]` and `legendTarget:"reshape …"`; no fit math moved.
`state.stringColors` is read by `_stringHex(si)`, so `_stringColor` and `_trackHueRgb` inherit the
override from one place; `gsSettings` goes v3 → **v4** (v1–v3 still load, each slot hex-validated).
`HARM_MAX = 8` / `HARM_SLOTS` size the grid, the payload and every loop. Labels are
`partialLabel(m, state.a4)` — the spectrogram's wording, so the views cannot disagree — rotated
−90° at the bottom axis, skipped within 11 px.

*Two things to know before touching this.* **The widening to 8 harmonics cannot change R3's ✦
set**: harmonic 5 is 27.86 semitones up (8 → 36) and the widest open-string span in any stocked
tuning is 26, so nothing above the 4th can land on an open string. And **the label orientation is
a deliberate deviation** from both the brief ("towards the bottom") and R5.7's horizontal
right-margin labels: forty-two verticals on a log axis would skip horizontal text almost
everywhere. This reverses R5.1's "no labels" for the line plots only.

*Done when* — met. 16 source-read assertions appended to `tests/dsp.test.js` (171 → **187**), no
new suite and no new `verify.sh` step. Three of them survived mutation and were strengthened: the
`drawStringAxis` slice is now **brace-matched** (the next top-level `function` is thousands of
characters away), the label-skip assertion pins the guard expression, and the `_stringHex`
assertion reads that function's first return. R3 and R4's frozen copy blocks were **re-frozen by
their author** (`HARM_NODES` gained 6–8 from THEORY §6.1; `harmonicRowNoteHtml`'s gate went h>5 →
h>8), each new SHA commented in `tests/verify.sh`.

### Q2 — small changes a/b/c ✅ BUILT (session 26, reviewer)

Three more items from the user's own testing. (a) In the EQ-match device faces, **LO SHELF and
HI SHELF drew the same mark** — the user asked whether "high shelf" meant *cutting* the highs.
It does not: low/high names **which side of the corner frequency** the shelf acts on, and the
**sign of the fitted gain** sets boost or cut. The glyph was floating both curves on the cell's
vertical centre, which makes a low-shelf cut and a high-shelf boost geometrically identical, so
`drawEqShapeGlyph` now strokes a faint 0-dB reference (`cssRGBA("ink-rgb",.16)`) and anchors each
shelf's flat half on it, the other half stepping `dy = up ? -5 : 5`. (b) Defaults from real
material: `CMAP_NAMES` reordered to **parula, viridis, cividis, magma, inferno** with parula the
default; scrim 0.45 → **0.10**; hold-fade 0.85 → **0.80**; **Bright yellow** and **Bright red**
added to `SG_TRACKS`; the Triad default is the user's stated **white / bright yellow / bright
red**; and String hues **tints** at a 0.30 mix rather than replacing at 0.62. (c) The two
collision marks now carry a **key above the plot**.

*Two things to know before touching this.* The key's top margin is dynamic
(`SG_MT_BASE 30 → SG_MT_KEY 52`, set at the head of `drawSpectrogramScene` **before** `pH` is
derived) and is keyed off `model.clusters` — a **pane-invariant** field. `SGPLOT` is a
module-level singleton that `attachSgramCrosshair` and `_sgTrackAt` read live, so a margin keyed
off anything per-pane (`fWin`, a zoom window) would measure one pane's geometry against another
pane's pixels. And the Triad palette is now a **stated** choice, not R5.7's measured one: min
pairwise ΔE is still 97.0, but parula *ends* in bright yellow (`#f9fb0e`), so the third's track
measures ΔE 2.8 against the hottest cells of the default colormap. R5.7's `minBg > 40` floor was
replaced by a contract pinning the stated palette, with the cost written into the test's comment
rather than quietly dropped.

*Done when* — met. `tests/r5.test.js` 259 → **267**; no new suite, no new `verify.sh` step, no new
headless launch, no frozen copy block moved (the key is drawn on canvas, outside the R5.3
sentinels). All new assertions mutation-checked.

### R5.5 — near-floor disclosure on the LTAS Difference — BUILT (session 26)

The LTAS Difference is a log-ratio per bin; the Band Energy share is a linear power
integral. A 0 % share above 10 kHz alongside a large per-bin Δ in the same band is
not a contradiction — it is two views of the floor. The house rule is to keep the raw
Δ honest and to disclose where it is inaudible rather than to warp the number.

*Built as specified, with three recorded deviations.* When both curves are near the floor,
draw that segment of the Difference line at 40 % alpha, dashed `[4,4]`, and add a
status-chip footnote `dashed = both near floor (≈ inaudible)` — see session-21
recommendation for thresholds (`max dispDb < -60 dBFS` or `< peak − 45 dB`) and for
the deferred alternative (A-weighted or sone/ERB specific-loudness integrated Δ).
Keep the numeric `+X.X dB` at the crosshair; the Band Energy % remains the audibility view.

*Done when* `tests/r5.test.js` asserts the dashed style only where the dual-floor
predicate holds, the footnote appears only when any segment is dashed, and the
headless LTAS Difference still renders the raw Δ (no value rewritten). — **met.**

**What shipped.** Block 0, immediately above the NODE-TEST BOUNDARY, gains
`NEARFLOOR_ABS_DB = -60`, `NEARFLOOR_REL_DB = 45`, `NEARFLOOR_MIN_RUN = 4`,
`nearFloorDb(a,b)` and `nearFloorMask(a,b)` — pure, node-tested, no drawing. The floor is
the **looser** of the two tests (`Math.max`), so a hot recording is judged against its own
peak and a quiet one against full scale; the peak is taken across **both** curves, and a bin
is marked only when **both** curves sit under it. `buildDiffModel()` publishes `nearFloor`
(a `Uint8Array`) and `nNearFloor`; all four consumers inherit it (`drawAll`, the magnify
overlay, the crosshair, `exportDiffPNG` — PNG = the view). `drawDiffScene()` walks the curve
in runs of equal near-floor state, each run overlapping its neighbour by one point so there
is no seam. `diffCanvas` carries `data-nearfloor="<count>"` when any point is marked, since
node cannot read a canvas.

**Deviations from the spec above, all deliberate.**
1. **The footnote prints the measured floor**, not the static string — `dashed = both below
   -60 dB (≈ inaudible)`. House rule: every visible number defensible. A stated threshold is
   a measurement; `near floor` alone is an unexplained verdict.
2. **The fill dims too** (0.20 → 0.06 alpha), not only the line. The spec named the line, but
   the sign-split fill is what shouts *big difference here*; leaving it at full alpha would
   have contradicted the dashing beside it.
3. **`NEARFLOOR_MIN_RUN = 4`** — added after visual testing, which showed single-bin dips
   drawing as 1-px light streaks through the solid fill around 10–13 kHz. A lone bin under
   the floor between audible neighbours is a **notch in an audible region**, not a floor
   region, so the despeckle lives in the predicate rather than the renderer and stays
   node-testable. The log grid runs ≈84 points/octave, so 4 points ≈ half a semitone.
   On the demo pair `data-nearfloor` went 61 → 58 and the streaks are gone.

**Back-compat.** With no near-floor points `runs === [[0,N,0]]` and the render is
byte-identical to the pre-R5.5 single-path fill and solid line — every existing headless
pixel assertion stays valid, which is why R5.5 needed no new headless launch.

*Verification, in proportion.* `tests/r5.test.js` 267 → **284** (6 pure-math + 11 source-read
wiring contracts), all mutation-checked in one batched driver — 14 single-anchor mutations,
each killing exactly its target, including two assertions that first passed vacuously and
were strengthened. No new suite, no new `verify.sh` step, no new Chrome launch.

### Q3 — the same floor in three cards ✅ BUILT (session 26, reviewer)

R5.5 disclosed the floor on the Difference plot only. The user then read the *other* two cards
and found the same paradox stated twice more:

> "what about the \"Band Energy\" card, e.g. in one case the String Zing, and Air has 0% energy
> but difference is +6.7 dB?"

> "when we are summarizing things \"AT A GLANCE\" we need to be careful about the differences
> when they are audible … the String Zing part is ~0% energy, but the difference (likely within
> the silence) is 6.7 dB and the At a glance says … *Their widest spectral gap is String zing
> (5–10 kHz), where SG runs 6.7 dB hotter* … which sounds misleading"

Both are the same defect as R5.5 and get the same answer — **keep the number, disclose the
floor** — plus one printing fix that was half the paradox on its own.

**a. `fmtPct` no longer says a small share is zero.** A high band on an electric guitar really
can hold 0.04 % of the energy; `"0.0 %"` claims *absent*, which is a different and false claim.
Below 0.05 % it now prints `< 0.1 %`. Central, because all six callers are shares of energy.

**b. One predicate, never two.** `nearFloorBands()` (block 4, directly above the band table)
calls R5.5's own `nearFloorMask()` / `nearFloorDb()` on `displayedDb(0)`/`displayedDb(1)` — the
*settled* curves, not `dispDb`, which may be mid-animation — and returns `{floorDb, onFloor}`.
A band counts as floor only when **every** grid point inside it is masked: one audible point
inside the band makes the band audible. Both the Band Energy table and the verdict's region
scan call that one helper, so the two cards cannot disagree about which bands are silence.

**c. The table discloses per row.** A floored Δ cell takes `.delta-floor` (dim, `opacity:.45`)
instead of its A/B color, carries a `title=` naming the measured floor, and the footnote gains
one sentence printing that floor. `data-nearfloor-rows` is set only when some row is floored —
**absent, not `"0"`**, the same convention as the Difference canvas's `data-nearfloor`. The Δ
itself is untouched; an inverted assertion enforces that no delta is rewritten after the
predicate is consulted.

**d. The strip never headlines a silence.** `biggestRegionDelta()` now splits its candidates:
a floored band competes only with floored bands, so it can never win by being the loudest
silence. The headline reads "Their widest **audible** spectral gap is …", and a floored band
that out-measures it gets **its own sentence** — *"Air (10–20 kHz) shows a wider 7.0 dB Δ, but
both takes sit below −47 dB there — a difference of silences, not a tone difference."* Disclose,
never hide, and never rewrite.

**One honest cost, flagged rather than buried.** The mask lives on the *display* curve
(smoothed, level-matched); the band table integrates *raw* Welch power. Binding them makes the
table's disclosure inherit the plot's smoothing setting. That is the deliberate trade — one
floor across the app beats domain purity, because a user comparing two cards is comparing
claims, not domains. Its one consequence is fixed: `setSmooth()` now re-renders the verdict and
the band table, which it previously did not.

**Verification, in proportion.** The demo pair has **no** near-floor region at shipped
thresholds, so both paths were proved through real Chrome against a scratch copy of the page
with `NEARFLOOR_ABS_DB` lowered to −47: `data-nearfloor-rows="2"`, four `delta-floor` cells,
and the strip printing an audible headline *and* the floored disclosure in one paragraph.
`tests/r5.test.js` 284 → **298**, all 14 mutation-checked in one batched driver; one mutation
was inert because `indexOf("function nearFloorBands")` still matches `nearFloorBandsZ` — the
`setSmoothUI` trap again — so every body lookup in the section now includes the `(`. No new
suite, no new `verify.sh` step, no new Chrome launch.

### Q4 — the expanded view, truly expanded 📝 RECORDED (session 26) — not started

The user, after testing Q3 (2026-08-26), verbatim:

> "one UI improvement we will do as part of next milestone before M6, just record now, no need
> to implement - in the expanded view of the spectrogram, the clicking of the collision markers,
> and Hold-Fade should also work interactively. That view should have the same set of controls
> and options as the smaller view just now truly expanded view."

They wrote "M6"; the project's next milestone is **R6**, so this is scheduled **before R6** —
and R6.1–R6.3 are blocked on the `docs/THEORY.md` §2.5 caveats anyway, which makes Q4 the
natural next build.

**What the magnify overlay is today.** `openMag(key)` (index.html:5366) puts one `MAG_VIEWS`
entry on a single shared `#magCanvas` (markup at index.html:1272, handle at 4637) and
`drawMag()` re-renders it. The `sga`/`sgb` entries call `drawSpectrogramScene(ctx,w,h,m)` —
**with no hits array**, so no click targets are collected at all. Of the pane's three
interactions, exactly one is wired to the overlay: `attachZoom(magWrap, magCanvas, …)`
(index.html:8324). That is precisely why zoom already works there and the other two do not.

**Why the clicks and the hold are dead, concretely.** `sgHits` is a **two-element,
pane-indexed** array (`const sgHits=[[],[]]`, index.html:4852), refilled per pane by
`drawSpectrogramScene`'s fifth argument (4852, 5288–5310). `attachHitClicks(canvas,hitsArr)`
(8225) is bound only to `sgramCanvases[0]`/`[1]` (8243–8246), and `attachSgFocus(i)` (5495) only
at 8317. Nothing binds either to `magCanvas`, and nothing gives the overlay a hits array to
fill. The R5.3 popover (`openClusterPopover`) and R5.6c's `_sgTrackAt()` are otherwise
geometry-agnostic — they read a canvas rect and `SGPLOT` — so both should be reusable rather
than duplicated.

**Split into two sub-milestones (2026-08-26, the user's own division).** Asked for the
relative complexity and whether both could run inside R5 before R6, the user fixed the
order: *"I only meant, having the following as the minimal as a first submilestone — a/
click on the collision marker and showing popout; b. click and hold a frequency line to
fade other frequency lines and only highlight the frequency i am hold on to and its comb
(the same feature in the spectrogram regular view). and then having as a separate sub
milestone — i/ Overlay, colors, Line style and the options in that row, and the Legibility
Hold Fade controls in the expanded view."* So **Q4a is the interactions, Q4b is the
controls**, in that order, both before R6. Costed at roughly **1 unit vs 3–4**: Q4a is
~40 lines of plumbing with two one-line ordering traps; Q4b is ~50 JS + ~15 CSS and is
mostly taste — layout of a head that has never wrapped, and what happens to controls that
are away from their card.

---

#### Q4a — the two interactions ✅ BUILT (session 27)

The whole of the user's (a) and (b). No controls move; the overlay is driven by the small
pane's controls exactly as it is today.

- **Q4a.1** — Give the overlay its own hit array (a third slot, or a small `{hits, pane}`
  record keyed by `magKey`) and pass it into `drawSpectrogramScene` from the `sga`/`sgb`
  `MAG_VIEWS` entries. Keep `sgHits` pane-indexed; do **not** let the overlay write into a
  pane's slot, or the pane's own targets go stale behind the modal.
- **Q4a.2** — Bind `attachHitClicks(magCanvas, <that array>)`. This is the user's (a).
- **Q4a.3** — Bind an `attachSgFocus`-equivalent for the overlay. This is the user's (b).
  `attachSgFocus` currently closes over a pane index `i` for both the canvas and the model;
  it needs the index split from the canvas so the same code serves both surfaces.
  `_sgTrackAt(i,x,y,w,h)` already takes the surface's own width and height and reads
  `SGPLOT` live, so the differently-sized overlay canvas is not a math problem; and
  `state.sgFocus` is global, so a focus taken in the overlay redraws the panes behind it
  for free.
- **Q4a.4** — Mirror `data-sgclusters` / `data-sgfocus` / `data-sglabels` onto `magCanvas`
  (absent rather than `"0"`, the house convention) so the gate can see any of this. The
  pane loop sets them at index.html:5302–5314; both callers should share one helper rather
  than carry a near-duplicate block.

**Two ordering traps, both one-liners once seen** (found while costing this, 2026-08-26 —
neither is visible from the pane code):

- **`.popover` is `z-index:60` (index.html:485) and `.modal` is `z-index:75`
  (index.html:607).** A cluster popover opened from inside the overlay renders *behind* the
  modal — the feature reads as a dead click while working perfectly. Needs a deliberate
  call: raise the popover above modals generally, or only while a mag view is open.
- **`escCascade()` closes `magModal` before `popover`** (index.html:7968–7970). With a
  popover open over the overlay, Esc dismisses the whole expanded view and orphans the
  popover on the page behind it. The cascade has to close the popover first when both are
  open.

**Verification, in proportion.** Source-read contracts in `tests/r5.test.js` for the new
bindings (in the spirit of the existing R5.1/R5.3 wiring assertions), plus `?mag=sga`
folded into an **existing** headless launch reading the mirrored `data-*`. No new suite,
no new `verify.sh` step, no new Chrome launch.

**How it landed (session 27, reviewer; `4db0965` · `c1753b1` · `544ec34` · `09e8591`).**
111 lines of `index.html`, gate green at 67 headless assertions. Four notes worth keeping:

- **Q4a.1/Q4a.4 shrank into one idea.** The overlay got its own `magHits`, and the pane
  loop's seven `setAttribute`/`removeAttribute` pairs became **`sgSyncData(canvas, model,
  nLabels, hits)`** with `sgClearData(canvas)` beside it — the pane and the expanded view
  of that same pane now report through *one* function, because two near-duplicates are
  exactly how they would come to disagree about what they are showing. `drawMag()` empties
  `magHits` and calls `sgClearData(magCanvas)` before dispatching, so the six non-sgram
  views leave the overlay canvas carrying no spectrogram claims at all.
- **Q4a.3 split the surface from the pane.** `attachSgFocus(i)` became
  `attachSgFocus(wrap, canvas, pane)` where `pane` is a **thunk** — the overlay answers
  "whichever pane is expanded right now" (`magKey==="sga"?0:magKey==="sgb"?1:null`) and
  returns `null` when the expanded view is not a spectrogram, so the hold is simply not
  offered. No math changed: `_sgTrackAt` already took the surface's own width and height.
- **Both ordering traps were real, and both cost one line.** `body.magopen .popover{
  z-index:80 }` lifts a popover over the modal **only while an expanded view is open** —
  left global it would also float over About/How/the recording guide, which nothing asked
  for; and `escCascade()` now takes `popover` before `magModal`, since the popover is the
  innermost thing on screen. The CSS rule sits deliberately *below* the `.popover` block:
  a `tests/dsp.test.js` contract reads the **first** `.popover{` in the stylesheet.
- **The headless launch was folded, not added.** The existing `sgchord=E` launch carries
  `&mag=sga`; model-derived attributes (`data-sgcomb`, `data-sgwin`) are asserted **equal**
  to pane A's, drawing-derived ones (`data-sgclusters`, `data-sglabels`) only **non-zero** —
  the label guard and the mark stride measure the surface being drawn on, and the expanded
  canvas is a different size. `tests/r5.test.js` 298 → **307**, `tests/headless.js` 64 → **67**.

---

#### Q4b — the controls in the expanded view ✅ BUILT (session 27)

The user's (i): "*Overlay, colors, Line style and the options in that row, and the
Legibility Hold Fade controls in the expanded view*" — i.e. the sgram card head's four
`.ctlgroup`s (index.html:974–1030): Overlay note + harmonic limit (`#sgNoteSel` /
`#sgHarmSel`), Colors (`#sgCmapSel` / `#sgTrackSel` / `#sgDashSel` / `#sgHueChk` / the
three Triad pickers), Legibility (`#sgScrimRange` / `#sgDimRange`), and the time-alignment
segment (`#sgAlignSeg`).

- **Q4b.1** — Cheapest honest route is to **move the live nodes** into the modal head on
  open and back on close — one set of controls, one `sync*` path, no second copy to drift —
  rather than cloning them and mirroring state. Restoring exact position on close needs a
  placeholder node; several controls ship `disabled` and are enabled only by
  `syncSgHarmSel()`, so that function must keep reaching them wherever they live.
- **Q4b.2** — Redraw on every one of those changes while the modal is open. Near-free:
  `drawAll()` already tail-calls `drawMag()` (index.html:5330), so this is checking that
  each handler routes through `drawAll`/`requestDraw`, not new code.

**Open decisions (taste, not plumbing — settle with the user, don't improvise).** Does the
exports group (`#sgramPngBtn` / `#sgramJsonBtn`) travel with them? What happens if the
sgram card is folded while its controls are away? `.mag .mhead` is a two-item,
non-wrapping baseline row today (index.html:690–693) and has never held a control cluster.
And the source `.cardhead` is itself a fold toggle (M2.6d), so anything moved in or out of
it must not trip that. The `?mag=` hook runs during init (index.html:8420), so the
node-moving order has to hold on a cold boot too.

**Verification, in proportion.** Source-read contracts only, plus one DOM read in the
existing `?mag=sga` launch asserting the controls are reachable from inside the modal. No
new suite, no new `verify.sh` step, no new Chrome launch.

**How it landed (session 27, reviewer; `990a5e7`).** 83 lines added / 56 removed in
`index.html`, of which the great majority is the four groups moving one indent level in.
Gate green: `tests/r5.test.js` 307 → **324**, `tests/headless.js` 67 → **69**.

- **Q4b.1 shipped exactly as specified — the nodes move, nothing is cloned.** One wrapper
  `<div class="ctlmove" id="sgramCtlMove">` holds all four groups; one placeholder
  `<span id="sgramCtlHome" hidden>` marks where it stands; `syncMagCtls(key)` moves it into
  `#magCtls` (a new last child of `.mag .mhead`) for `sga`/`sgb` and `insertBefore`s it
  back at the placeholder for everything else. Because the elements are *the same
  elements*, every `el()` handle, every listener and every `syncSgHarmSel()` write keeps
  landing wherever the cluster is standing — there is no second copy, so there is nothing
  to keep in step. `syncMagCtls` is idempotent (it early-returns when the wrapper is
  already in the right parent *and* the right position), so the cold-boot `?mag=` hook and
  a re-open of the same view are both no-ops. An inverted contract (`!/cloneNode/`) keeps
  it that way.
- **`display:contents` is what makes it free at home.** The wrapper is
  `.ctlmove{display:contents}`, so in the card head the four `.ctlgroup`s lay out as
  direct children of `.controls` exactly as before — proved rather than eyeballed: a
  1440×4600 render of `?demo&open=all&sgnote=all&theme=bright` has the **same SHA-256**
  before and after the change. Inside the modal, `#magCtls .ctlmove{display:flex}` turns
  the same node into a real wrapping row, `.mag .mhead` gains `flex-wrap:wrap` with
  `#magCtls{flex:0 1 100%}` so the cluster takes its own line under the title, and
  `#magCtls:empty{display:none}` means the six non-spectrogram magnify views are
  pixel-untouched (checked at `?mag=spec`).
- **Q4b.2 needed no code, which was the prediction.** All nine sgram handlers already end
  in `requestDraw()`, and `drawAll()` tail-calls `drawMag()` — so a control changed inside
  the overlay redraws the overlay. Nine source-read contracts now pin that, one per
  handler, plus one on `drawAll`'s tail.
- **The two open decisions, settled — and the first one is a judgement call, not a
  measurement.** *(a) The exports do **not** travel.* `#sgramPngBtn` / `#sgramJsonBtn` are
  not a `.ctlgroup`, the recorded split does not name them, and `exportSgramPNG` builds its
  own canvas stack at a fixed size — offering them beside the expanded picture would
  promise "export what I am looking at" and hand back something else. They stay in the card
  head, after the placeholder, and a contract pins that ordering. *(b) Folded-while-away is
  a non-event*: `.card.collapsed .cardhead .controls{display:none}` (index.html:242) only
  hides nodes that are still in the card, and M2.6d's fold-toggle exemption list already
  covers every moved control, so nothing new can trip the fold.

---

**Traps recorded in advance (both sub-milestones).**

- `SGPLOT` is a **module-level singleton** (index.html:3937) whose `mR` and `mT` are set at the
  head of every `drawSpectrogramScene` call (3947, 3953) and read *live* by
  `attachSgramCrosshair` / `_sgTrackAt`. Both margins key off pane-invariant fields
  (`model.comb`, `model.clusters`), which is why this is safe today — Q4 must not introduce a
  margin that depends on the canvas being drawn, or the overlay's geometry will be measured
  against a pane's pixels.
- The overlay canvas is a different size from the pane, so hit rectangles are only valid for
  the surface that produced them. Hit-testing must always use the rect of the canvas the mouse
  is over.
- R5.6c's focus drag hand-off (>3 px hands to the zoom box) must keep working in the overlay,
  where `attachZoom` is already bound (index.html:8324) — the two listeners have to cooperate
  exactly as they do on the pane.

### Deferred — warped spectrogram difference (not in R5; after R6)

M2.5's `sgramCanvasD` / `buildSgramDiffModel` / `drawSgramDiffScene` / `attachSgramDiffCrosshair`
was a naive pixel-wise `sgramDifference()` subtraction at shared file time. It assumed the two
files play the same section at the same time and with the same tempo — a false premise the
user called out on 2026-08-25. The pane was removed in that session (index.html 290 lines;
CSS kept inert for the gate); `sgramDifference(sgA,t0A,sgB,t0B,dbOffsetB)` in block 0 is pure
math and was kept for reuse. A replacement is deferred until after R6: an **onset-warped /
beat-aligned / DTW** difference that warps one spectrogram's time axis onto the other's
onset/beat grid before subtracting, with the LTAS Difference (`diffCanvas`) — which needs no
warping — left as the comparison that survives today.

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
- **R6.4 — bound the overlay in time** *(was R5.4; moved here by the user, 2026-08-26)*.
  Restrict the harmonic overlay to a selected time span rather than the full pane width,
  composing with M2.7's zoom refinement. It was always "deliberately last" — the user asked to
  ignore time-span until the rest worked — and R5.5 is what gates a public release, so R5 closes
  without it. Not blocked on the §2.5 caveats: this one is plumbing, not physics, and can be
  built ahead of R6.1–R6.3 if the caveats stay open.
- **Blocked on the user resolving the two §2.5 numeric caveats** (the "~30–40 Hz in the
  guitar's mid-register" figure and the ERB-vs-Bark critical-band inconsistency) before
  any of those numbers appear in copy.

---

# M5 — Record directly into a slot

*(Not M3. M3 is **live input** — a running analyser fed by the microphone, with the
task-based entry points deferred from M2. M5 is far smaller and does not unblock it: press
record, get a take, and hand that take to the pipeline that already exists. Nothing is
analysed while the meter runs.)*

**Built 2026-09-04**, as a second attempt. The first attempt — `MediaRecorder`-based — was
reverted the same day; see "The first attempt, and why it was replaced" at the end of this
section.

The whole milestone is one sentence: **a recorded take must be indistinguishable, downstream,
from a dropped file.** Everything below follows from that. It lands through
`finishSlotFromBuffer()`, so every view, export, snapshot and metric that works for a file
works for a take with no further code.

### M5.1 — device picker. BUILT.

- A `● Record…` button on each empty slot (`● Record` once a slot is full — the take
  replaces what is there, like a second drop would).
- The panel is **permission-first**: the device `<select>` is empty until the user arms
  recording, because `enumerateDevices()` returns unlabelled stubs before a `getUserMedia()`
  grant. Arming is what fills it.
- Two selectors, shared by both slots and remembered in `gsSettings` (**still v4** — the two
  keys are additive and every existing reader ignores what it doesn't know, so no bump):
  the input **device** and the input **channel** (`Mix`, or one channel by number).
- Enumeration is **lazy — never from `boot()`**. `enumerateDevices()` wakes the OS audio
  service, and on this machine that raced the demo decode. The first arm builds the list;
  `refreshRecDevices()` rebuilds it on `devicechange`.

### M5.2 — capture. BUILT.

- `getUserMedia` with `echoCancellation:false, noiseSuppression:false, autoGainControl:false`.
  This is a measurement instrument; the three processors are all designed to alter the
  spectrum of what they hear.
- **Raw PCM, explicitly not `MediaRecorder`.** A `ScriptProcessorNode` copies Float32 blocks
  out of the graph and keeps them. The LTAS integrates to 20 kHz and prints dB re full-scale
  sine; a lossy codec's own high-frequency decisions would be indistinguishable, in the plot,
  from the guitar's.
- **No realtime analysis.** The meter is a peak number, not a spectrum. M3 is where a live
  analyser belongs.
- **One capture graph for the whole app** (`recCap`). Recording into B while A is recording
  is not a state this app has to represent; the second arm aborts the first.
- `recAbort(i)` runs at the head of `loadFileIntoSlot`, `applySnapshot` and `loadDemo`, and a
  discarded take bumps `loadSeq[i]` — a take that lands after a drop has been superseded and
  must not overwrite it.
- **Reduced online, not at the end.** 10 channels × 48 kHz × 4 bytes is 1.9 MB/s; a ten-minute
  take of a 10-channel device would otherwise be over a gigabyte of retained Float32. So a
  selected channel keeps one channel, and `Mix` keeps both when the device gives one or two and
  the mono mean when it gives more.

### M5.2a — how many channels? Observe, never ask. BUILT.

This is what sank the first attempt, so it is written down at length.

`getSettings().channelCount` and `getCapabilities().channelCount.max` are **not answers**.
An unsupported constraint is silently ignored per spec, so even `{exact:N}` can be accepted
and then not honoured, and both fields can report a number the device never delivers.
`createMediaStreamSource(stream).channelCount` is not ground truth either — that node has no
inputs, so the spec default of 2 is what it reports no matter what is upstream.

The mechanism that *is* ground truth: connect the stream to a **32-channel
`ScriptProcessorNode` with `channelInterpretation = "discrete"`**. Discrete up-mixing
**zero-fills** channels the source did not supply. So a non-zero sample in channel *c* is
proof that channel *c* was delivered — no API is being asked anything. `probeDeviceChannels()`
listens for `REC_PROBE_MS` and takes

```
n = max(heard, claimed, 1)
```

where `claimed` is `getSettings().channelCount` **only**. The capabilities read was dropped
deliberately: `capabilities.max` is what the device *could* do, and sizing the capture node by
it makes `Mix` a mean over zero-filled channels — 10 real channels out of 32 requested is
−10 dB of nothing.

`ScriptProcessorNode`, not `AudioWorkletNode`: `addModule()` needs to fetch a module, and a
`file://` page has a null origin that cannot be relied on to allow that. The app runs from
`file://`. The node must reach `destination` to fire at all, so it routes through a gain of 0
— nothing is monitored back to the speakers.

**Silence proves nothing.** A probe that heard nothing has learned nothing, so the panel says
so and offers **↻ Re-check** rather than quietly claiming mono.

### M5.2b — the probe describes, it does not gate. BUILT 2026-09-04 (user request).

*"How about we try just giving user an option for putting any of the 32 channels without
detecting."* — and the reasoning behind M5.2a says yes. **Silence proves nothing cuts both
ways.** M5.2a used it to refuse to *claim* channels; the picker was still capping its list at
`n`, which is the same unjustified claim in the other direction: a player who wasn't strumming
during the 700 ms window measures `n = 2` on a device carrying ten channels, and the app then
hid eight channels that exist.

So the ceiling is gone. `recChanOptions()` emits `Channel 1 … Channel 32` (`REC_MAX_CH`)
whatever the probe found, the select is never `disabled`, and the probe's result survives as
**labelling**: channels above `n` read `Channel 7 — not heard yet`, the note says every channel
stays selectable, and a stored `recChannel` is clamped to `REC_MAX_CH` on load.

Two changes keep that from becoming a lie:

- **The pick is part of the graph's width.** `_startCapture()` sizes the
  `ScriptProcessorNode` to `max(known, claimed, sel)` (clamped to `REC_MAX_CH`), and the
  old silent downgrade — `if(use>nch){ use=0; toast("Channel N isn't there — recording the
  mix.") }` — is deleted. Asking for channel 7 now records channel 7 or the zero-fill in its
  place; it never records the mix under channel 7's name, and it never records channel 2
  wearing channel 7's label (the old `Math.min(sel-1, n-1)` would have done exactly that once
  high channels became selectable — it now reads out zeros instead).
- **An all-zero take is refused.** `cap.heard` is set by the first non-zero sample kept;
  `stopCapture()` discards a take that never saw one, with *"Channel N came back as digital
  silence — this device didn't hand the page that channel, so nothing was saved."* This is the
  same fact M5.2a's probe rests on — discrete up-mixing zero-fills what never arrived — used to
  guard the take rather than to size the graph. It matters immediately: on macOS **both**
  engines clamp to 2 channels, so on this platform every pick above 2 lands here.

The recording card's status line prints `channel 7`, not `channel 7 of 7` — `nch` was then
partly a consequence of the user's pick, so quoting it as a device width would have been
inventing a number. **M5.2c below reverses the picker half of this section and restores that
`of nch`; the two guards and the deleted downgrade survive.**

### M5.2c — the list is what was heard; the shortfall is a sentence. BUILT 2026-09-04 (user request).

*"Lets get back to the previous method of populating channels that we can detect and write down
a warning that on the browser the recording maybe possible on limited channels and devices."* —
the same day, reversing M5.2b's picker.

M5.2b's epistemics stand and its product call does not. A 700 ms probe still cannot prove
channel 7 is absent; but on every platform measured here 30 of M5.2b's 32 options come back as
digital silence and land in `stopCapture()`'s refusal, so the list promised what the browser
does not deliver. **An unprovable claim is better said in words than encoded as 30 dead menu
entries.**

Reverted: `recChanOptions()` loops `1..n` (`recState.chanByDevice`, default 1); the select is
`disabled` until the probe answers; the note reads *"N input channels heard on this device.
Quiet channels can be missed — play something and re-check."*; the status line prints
`channel 3 of 6` again, safe because a capped picker guarantees `sel <= n`.

Added: a second `.recnote.recwarn` line, **always present** — a browser opens only some input
devices and hands the page only a few of their channels; macOS Chrome and Safari both stop at
the first two whatever the device carries; if the wanted channel isn't listed, put that input
first in an Aggregate Device or track it in a DAW and drop the file. Unconditional rather than
gated on `n <= 2`, because the claim is about the browser and not about the device in the list.

Kept from M5.2b — guards, not policy, and each free under a capped picker: `_startCapture()`'s
`max(known, claimed, sel)` width, the `idx < n ? getChannelData(idx) : zeros` read, and the
all-zero refusal. The silent downgrade-to-the-mix toast stays deleted.

New: **`clampRecChannel()`**. A capped list can go stale against a remembered pick — the
settings loader accepts `recChannel` 0–32, and one may be stored from the hours the app offered
32 — leaving the select on *All channels* while state says 7, with no way for the user to
correct a `disabled` select. It drops the pick to 0 whenever it exceeds the known count, called
at every door into that count: `ensureRecChannels()`'s success path, its `catch` that assumes
mono, and its early return on a cached count. Device *change* was already covered.

### M5.3 — land as a take. BUILT.

The `AudioBuffer` is built **while the capture context is still alive**, at that context's own
sample rate, and handed to `finishSlotFromBuffer()` with
`kind:"recording", container:"Live input", bitDepth:"32-bit float"`.

**No `decodeAtNativeRate` and no sniffer** — that is the one line this rewrite deletes from
the original M5.3. Those exist to recover a rate from *file bytes*; a take is already PCM at a
rate the context states. The house rule is unchanged and satisfied more directly: the rate
still comes from the data, and is never asked of the user. A rate outside 8–384 kHz is refused
through `slotLoadError()`, the same door a bad file uses.

### Scope notes (do not re-litigate)

- **There is no port or interface to choose.** A browser exposes input *devices*; the
  aggregate/interface/port layer is the OS's, and is what the device list already reflects.
- **Rate is data, not a control.** The capture context's rate is read, printed and used; it is
  not offered as a setting.
- **Local only.** A recording is Float32 in memory, it lands in a slot, and nothing about it
  reaches the network — the app has none.
- `file://` **is a secure context**, so `getUserMedia` is available with no server. Verified by
  driving the real browser, not by reading the spec.

### Chrome on macOS clamps every input device to 2 channels

Measured 2026-09-04 through real headless Chrome, on this machine:

| Device | `capabilities.channelCount` | `settings.channelCount` | delivered |
|---|---|---|---|
| BlackHole 16ch | `{min:1,max:2}` | 2 | 2 |
| Pro Tools Aggregate I/O (16) | `{min:1,max:2}` | 2 | 2 |
| Pro Tools Aggregate I/O (32) | `{min:1,max:2}` | 2 | 2 |
| Pro Tools Aggregate I/O (64) | `{min:1,max:2}` | 2 | 2 |
| **Aggregate Device (10 in)** | `{min:1,max:2}` | 2 | 2 |

This is Chromium's own `AudioManagerMac` input clamp, not a constraint we can lift — no
`channelCount` value, ideal or exact, changes any column.

**Safari clamps too — measured 2026-09-04 on the user's own Aggregate Device.** WebKit
implements no `channelCount` constraint at all: the field is absent from `getSettings()` and
from `getCapabilities()`, and `channelCount:{exact:N}` **never rejects** for any N from 2 to
16 (an unsupported constraint is ignored per spec, so the hard ask that should have proved a
clamp resolves happily). Only observation settles it, and two independent censuses on one
stream agree to six decimals: a spec-fixed 32-way `ChannelSplitterNode` and the probe's own
32-channel `ScriptProcessorNode` both find exactly two non-zero channels, 3–32 at **hard
zero** — the discrete-up-mix zero-fill signature, not a quiet input (a real converter input
reads dither, not `0.0`, for five seconds). That agreement also clears the probe: WebKit
handles 32 discrete channels correctly.

So the panel no longer points at another browser. When it observes ≤ 2 channels it says the
platform is the limit and gives the route that works — put the wanted input first in an
Aggregate Device, or track it in a DAW and drop the file.

The probe is right either way — it reports what arrived. The clamp is a fact about the
browser, and the app states it rather than pretending the device is mono.

### The first attempt, and why it was replaced (reverted 2026-09-04)

The first implementation asked `getUserMedia` for `channelCount:{ideal:64}`, read
`getSettings()` back, believed it, and encoded with `MediaRecorder`. It failed twice over: the
answer it trusted was wrong, and the format it produced was lossy in exactly the band the app
measures.

The lesson, which is why this section is so long: **do not ask a question the platform is free
to answer wrongly — arrange for the answer to be observable.** The zero-fill probe is that
arrangement.

The reverted work is recoverable at `refs/tbh/recovery/before-discard/20260904T011041Z-45812`.

---

# Gated — do not start without explicit user go-ahead

- **M3 — live input.** Still owes the task-based entry points deferred from M2.
- **M4 — chain measure.**
- **Tension landscape** (STORY.md) — unscheduled.
