# Handoff — Rameau R4 (harmonic ancestry in the per-string popover)

*Task order for a delegated builder. One file per milestone; this one covers R4.1–R4.4.*

**How this file relates to the others.** `docs/ROADMAP.md` is the contract — working
discipline, per-task detail, done-when lines — and it outlives this handoff. This file
says only which tasks to build now, on which branch, against which gate, and what to
report back. Where the two disagree, ROADMAP wins and you should say so.

---

You are in `/Users/zhossain/src/guitarscope` — Claude Rameau, a single-file offline web
app. No build step, no server, no network, no dependencies. `index.html` is the only
shipped artifact.

Start from `master` (R1, R2 and R3 are merged there) and work on a new branch:
`git checkout -b rameau-r4 master`. End by opening a PR into `master` — but **only** once
the gate below exits 0.

Read first, in this order: `CLAUDE.md`, `docs/ROADMAP.md` (the whole "Working discipline"
and "Review gates" sections, then the R4 preamble and tasks R4.1–R4.4), `docs/STORY.md`.
`docs/THEORY.md` is reference only — **you will write no physics copy in this task**,
because all of it is already written, reviewed against THEORY, and frozen (see below).

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
  environment; the builder is launched with sandboxing disabled precisely so it can.)
- **Do not open the PR until it prints `gate passed` and exits 0.**

Its five steps: `tests/dsp.test.js` (shipped math, green — keep it that way),
`tests/r3.test.js` (green), `tests/r4.test.js` (**49 pass / 11 fail today** — those 11 are
your job), `tests/headless.js` (**22 pass / 5 fail today** — same), then the tamper guards:
`tests/` byte-identical to `master`, and **two** SHA-256-frozen copy blocks.

## Your job: the wiring of R4.1–R4.4

R4 answers the question the ✦ raises. The ✦ says "these two strings are sounding the same
note"; R4 says **where this string sits inside its neighbour's sound** — as a harmonic, as
a ratio, and what equal temperament does to that ratio. Same door: the open-string popover
the Strings axis already opens.

**Two halves already exist on `master` and are inert. Do not rewrite either.**

1. **Block 0 (DSP, node-safe)** — `JUST_INTERVALS` (line 1514), `isPow2` (1527),
   `stringAncestry(rootMidi, noteMidi, a4)` (1538). Pure, node-tested, green.
2. **Block 4, the frozen copy** — everything between
   `// ---------- harmonic ancestry copy (R4) ----------` (**line 6197**) and
   `// ---------- end ancestry copy ----------` (**line 6345**):
   `ANCESTRY_TEMPER`, `_cap`, `harmonicIntervalPhrase(h)`, `landingFor(si,h)`,
   `harmonicRowNoteHtml(si,hh)`, `ancestrySectionHtml(si)`, `denominatorRuleHtml()`.

That block is educational prose whose every claim traces to `docs/THEORY.md`, and it is
SHA-256 frozen by both `tests/verify.sh` and `tests/r4.test.js` — **changing one character
of it, including a comment or whitespace, fails the gate.** Your work is to call these
functions from the right places and style what they emit. The whole diff should be on the
order of thirty lines.

Note the reuse discipline that is already inside the frozen code: `landingFor()` calls
R3's reviewed `findCoincidences()` with the same `state.tolCents`, so a row and the ✦ on
the plot can never disagree. Do not add a second detector anywhere.

### R4.1 — Interval + landing on each harmonic row

`stringContentHtml(si)` is at **line 6077**, script block 4, immediately above the frozen
✦ copy. Its `for(let hh=1;hh<=5;hh++)` loop (**6086**) builds one `.pop-val` row per
harmonic into `rows`.

- Append `harmonicRowNoteHtml(si,hh)` to `rows` directly after each row it annotates. It
  returns `""` for `hh===1`, so call it unconditionally — no guard needed.
- It emits one `<div class="pop-sub">`: what harmonic `hh` is as an interval ("An octave
  and a perfect fifth."), plus, when that harmonic lands on another open string,
  "✦ Lands on the open 1st string" — and, if the harmonic is currently switched off,
  "— switch it on to mark it".
- One new CSS rule, beside the other `.pop-*` rules (`.pop-vals` is at **line 481**,
  `.pop-val` at **482**):
  `.pop-sub{ font-size:11px; color:var(--dim); margin:-1px 0 2px 16px; }`
  The gate asserts the rule exists, carries a `font-size`, and takes its color from
  `var(--dim)` — the theme, never a literal.
- **Done when:** every shown harmonic row names its interval, the rows that land say so,
  and no other row layout changed.

### R4.2 — "Where this string sits" section

- Insert `ancestrySectionHtml(si)` into `stringContentHtml()`'s returned string, **between**
  the `How Claude Rameau places it` section (**line 6107**) and the
  `Current values — harmonics toggle their guides` section (**6109**). The gate checks that
  ordering literally, so the concatenation order in the `return` is what matters.
  (If you anchor on text: `Current values` alone occurs three times in `index.html` —
  use `Current values — harmonics`.)
- It picks the adjacent pair itself (string `si-1`/`si`, or `0`/`1` for the lowest
  string), reads `stringAncestry()` from block 0, and returns `""` when THEORY names no
  ratio for that gap. **An empty string is a correct answer, not a bug to work around** —
  do not add a fallback, and do not widen the interval table.
- **Done when:** the section renders for all six strings in all five stocked tunings.

**What it should say, measured** — open 4th string in E standard (`?pop=str3`): a
"Where this string sits" heading, "harmonic 3 of the open 3rd string", the ratio `4/3`,
a shared ancestor at `48.9 Hz` (G1), and "2 ¢ wide of a true 4/3". If your build renders
those, R4.2 is right.

### R4.3 — Headless door: `?pop=str<N>`

The canvas and the popover are unreachable from node, exactly as at R3.2, so the tests
need a query hook.

- Extend the existing `?pop=` hook — **line 7496**, in the `tryOpen()` closure, beside the
  `coin<N>` branch — with `str<N>`: N = 0–5 indexing `STRING_ORD` (0 = the lowest string),
  parsed from the query, **out of range opens nothing**. Call
  `openStringPopover(n, {left:c-40, right:c+40, top:80, bottom:100})`, the same anchor rect
  the neighbouring branches use.
- Keep it a test hook: no UI, nothing persisted, no `gsSettings` key — same standing as
  `coin<N>` and `?tol=`.
- **Done when:** `?demo&strings=1&harmonics=1&pop=str3` pins the open-G popover open and
  `tests/headless.js`'s new section goes green.

### R4.4 — The denominator rule, expandable

- Append `denominatorRuleHtml()` to the end of `stringContentHtml()`'s return. It is a
  native `<details class="pop-more"><summary>Why the denominator decides</summary>…` —
  **no JS toggle, no state key, nothing persisted.** The gate explicitly fails on a
  `popMore` / `state.popMore` / `gsPopMore` anywhere in the file: `<details>` already does
  this, and it prints open when the browser prints the page.
- CSS beside the other `.pop-*` rules; the gate only requires that `.pop-more` is styled.
  The popover already has `overscroll-behavior:contain`, so a long open `<details>`
  scrolls to its own bottom without stealing the page (session-16 fix, `CLAUDE.md`).
- **Done when:** it opens and closes, and the popover still scrolls to its own bottom.

## Verifying by eye

Run `./tests/verify.sh` to `gate passed`, then capture screenshots by hand with the
documented recipe (the quotes around the URL are load-bearing — a bare `&` backgrounds
the command):

```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --disable-gpu --hide-scrollbars --window-size=1440,2900 --virtual-time-budget=30000 \
  --screenshot=out.png "file:///Users/zhossain/src/guitarscope/index.html?demo&strings=1&harmonics=1&pop=str3"
```

Both themes (`&theme=bright`, `&theme=dark`), plus `&pop=str0` (the low E — its 4th
harmonic at 329.6 Hz lands on the open 1st string, so that row must say so) and one string
whose ancestry section may be empty, so you can see that an empty section degrades
cleanly. Look for: the popover still fits its chrome, the `.pop-sub` lines read as notes
under their rows rather than as new rows, and the `<details>` closed by default.

## Standing constraints — these override any instinct to improve things

1. **Do not edit `SPEC.md` or the `CLAUDE.md` status section.** Commit per task as
   specified, but leave the changelog and status entries to the reviewer — per-task doc
   edits churn the files used to orient.
2. **Two `docs/THEORY.md` §2.5 figures are under review and must not appear in any copy:**
   the "peaks near ¼ of the critical bandwidth" framing and "~30–40 Hz in the guitar's
   mid-register". Both `tests/r4.test.js` and `tests/headless.js` assert they stay out of
   the whole page. (You are writing no copy, so this should not come up — it is here
   because it is a hard line.)
3. Smallest diff that satisfies the task. No unrequested refactors, no new UI, no new
   dependencies, no reformatting of untouched lines. Flag anything that tempts you rather
   than improvising.
4. Update each task's status line in `docs/ROADMAP.md` as it lands. That file, not this
   handoff, is the contract.
5. Commit at each working state. Suggested: R4.1 + R4.2 together (they touch the same
   function), R4.3 on its own (it is the test door), R4.4 last. This handoff file itself
   is not yours to edit — if it is wrong, say so in the PR.
6. **Do not start R5.** It is blocked on the reviewer resolving two numeric caveats in
   `docs/THEORY.md` §2.5.

**Gate note:** the roadmap runs R4 as a single stack — low risk, because it reuses the
already-reviewed detector and the already-reviewed prose. Stop and report at the end of
R4.4.

**Report back** (in the PR body): the commit range, the **full `./tests/verify.sh` output
verbatim** including the final `gate passed` line, the paths of the screenshots, and
anything you flagged instead of fixing under a "Found, not fixed" heading.
