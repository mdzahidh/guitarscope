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

## Decisions already made (do not re-litigate)

- **✦ tolerance: ±6 cents, fixed, no visible control.** It is a perceptual claim, not
  user intent, and user intent is what earns a control in this app. ±6¢ clears tuning
  slop and the 12-TET fifth-chain error (~2¢) while excluding the tempered major
  third's 13.7¢ near-miss — that exclusion is deliberate, the ET third becomes its own
  teachable moment later. `?tol=` exists for headless testing only.
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
| **2** | R3.1 + R3.2, **before R3.3 starts** | `findCoincidences()` is shared, node-tested block-0 code that R3.3, R3.4, R4.2 and R5 all build on. A subtly wrong detector produces a plausible ✦ in the wrong place and then propagates into three milestones. Smallest diff, highest leverage. |
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

# R1 — Rename: GuitarScope → Claude Rameau

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
- `README.md` **does not exist** in the repo despite being named in the rename scope —
  either create a short one (what the app is, how to open it, how to run tests) or tell
  the user it was missing. Do not silently skip it.
- `docs/ARCHITECTURE.md`: add a short note under naming/plumbing that the `gs*`
  localStorage keys and `?` hooks deliberately keep the old prefix.

### R1.5 — Verify + commit

- `node tests/dsp.test.js` (107+ pass), headless screenshot in `?theme=bright` and
  `?theme=dark`, one PNG export eyeballed for the new footer.
- Commit: `Rename: GuitarScope → Claude Rameau across user-visible strings`.

---

# R2 — About modal

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

# R3 — ✦ discovery moments

The origin story as a feature: a shown harmonic of one string landing on another
string's fundamental. Build it in this order — the pure function first, drawn last.

### R3.1 — Pure detector in script block 0 (node-testable)

- Add to block 0 (DSP, node-safe — tests extract this block):

  ```js
  const COINCIDENCE_CENTS = 6; // fixed perceptual threshold; see docs/ROADMAP.md
  function centsBetween(f1, f2){ return 1200 * Math.log2(f2 / f1); }
  function findCoincidences(marks, tolCents){ … }
  ```
- Input: the marker list shape already produced by `stringAxisMarkers()` —
  `{f, name, si, midi, harm}`. Output: `[{f, cents, hi:{si,harm}, lo:{si,harm}, ratio}]`.
- Rules: pair a marker with `harm > 1` against a marker with `harm === 1` on a
  **different** string (`si !== si`), where `|centsBetween| <= tolCents`. Report the
  ratio as the harmonic number over the interval's small-integer denominator (e.g. E2's
  3rd harmonic on B3 → 3:1 over the octave-reduced 3:2).
- **Node tests (add to `tests/dsp.test.js`):** E standard, harmonics 2–5 on all strings
  → assert the known hits (6th-string 3rd harmonic vs 2nd-string fundamental, etc.);
  assert the tempered major third (~13.7¢) is **excluded** at tol = 6; assert it is
  included at tol = 15; assert exact-unison pairs report 0 cents.
- **Done when:** tests pass with no DOM involved.

### R3.2 — Wire the constant + `?tol=` hook

- Block 4 reads `COINCIDENCE_CENTS` into `state.tolCents`; a `?tol=<n>` query param
  overrides it (clamped to 0–50) purely for headless testing.
- **No control, no persistence, no `gsSettings` key.** It is not user intent.

### R3.3 — Draw the ✦

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

### R3.4 — The popover

- Dispatch in the canvas click handler beside `if(hh.string!=null)` (~6844).
- Content, built like `stringContentHtml()`: name both notes and both strings, print the
  measured cents offset, give the ratio, and explain **why** in one sentence sourced to
  `docs/THEORY.md` §3.4 (denominator rule) — small denominators mean the two combs share
  many partials.
- Include the existing `auditionBlock()` so the user can hear the coincidence.
- Tone: the popover answers a question the user asked by clicking. It does not open with
  a lesson.

### R3.5 — Verify + commit

- Headless: `?demo&strings=1&harmonics=1&open=all` in both themes; `?tol=0` (no ✦) and
  `?tol=25` (many) as bracket checks; `?tol=6` default screenshot.
- Commit: `Discovery moments: ✦ marks harmonic/fundamental coincidences (±6¢)`.

---

# R4 — Harmonic ancestry in the per-string popover

Extends `stringContentHtml()` (~5855). Source: `docs/THEORY.md` §3.4.

- **R4.1** — For each harmonic row 2–5 already listed, add its ratio to the string's
  fundamental and the note it lands on (both already computed; just surface the ratio).
- **R4.2** — Add a short "family" line: whether that harmonic is an overtone of the
  currently-lowest string, or shares an ancestor with it. Reuse `findCoincidences()`
  from R3.1 rather than writing a second detector.
- **R4.3** — One expandable sentence on the denominator rule, quoting THEORY.md §3.4.
- Verify + commit per task.

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
