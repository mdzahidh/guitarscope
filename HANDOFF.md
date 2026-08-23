# Gate 1 Handoff — R1.1–R1.5 + R2.1–R2.5

Branch: `rameau-r1r2` (not master)
Base: `master` at 675afd6
Commit range for Gate 1: 675afd6..166b81a (12 commits: 9 gate + doc-rename + header Load demo pair + HANDOFF note) + revert to handover Frequency-card demo (this update)
Final commit for HANDOFF is this update (restore handover: header Load test files debug-only, Frequency card Load demo pair, defaults unfolded).

## Tasks completed

| Task | Commit | Subject | Verified |
|------|--------|---------|----------|
| R1.1 | eac42e2 | R1.1 — Identity constant + title + header | 107 passed, screenshots bright/dark 1440x4600 |
| R1.2 | ee61d53 | R1.2 — User-visible prose strings | 107 passed, screenshots both themes, grep GuitarScope 23→comments+exports |
| R1.3 | 3ed83ed | R1.3 — Exports and snapshot back-compat | 116 passed (9 new), screenshots both themes, reader accepts both app names |
| R1.4 | c6ddaa1 | R1.4 — Comments and docs | 116 passed, grep GuitarScope →1 (legacy reader only), ARCHITECTURE plumbing note added, README 107→116 |
| R1.5 | — | R1.5 — Verify + commit (rename gate) | Verified: 116 passed, PNG footer now Claude Rameau, grep 1 remaining is intentional back-compat string |
| R2.1 | b85b811 | R2.1 — About modal markup | 116 passed, modal markup after #howModal with STORY.md lines 20-30 verbatim, <em> on measure and closing question |
| R2.2 | 33f3183 | R2.2 — About button door | 116 passed, About button in .globals (before How to use this app), listeners for open/close/backdrop |
| R2.3 | d3f7743 | R2.3 — Title door to About | 116 passed, h1+slogan wrapped in button.brandbtn with cursor:help and focus-visible ring, keyboard via native button |
| R2.4 | 6ec6d5e | R2.4 — Esc cascade + about test hook | 116 passed, escCascade includes aboutModal after howModal, ?about hook |
| R2.5 | (this commit) | R2.5 — Verify + commit (About gate) | 116 passed, ?about screenshots bright/dark, ?about&how Esc order verified |

All tasks R1.1–R2.5 considered done. R3 not started per assignment.

## Full test output (`node tests/dsp.test.js`)

```
  ok  welch df = rate/N
  ok  welch peak lands on the sine's bin
  ok  full-scale sine ≈ 0 dB FS
  ok  off-bin lobe sum = Hann ENBW (+1.76 dB)
  ok  half-bin scalloping loss ≈ −1.42 dB
  ok  1/6-oct smoothing preserves a flat spectrum
  ok  smoothing off returns the spectrum unchanged
  ok  bandPower scales with bandwidth on flat spectrum
  ok  centroid of a single line = its frequency
  ok  tilt of 1/f² spectrum ≈ −6.02 dB/oct
  ok  noteInfo(440) → A4, 0 ¢
  ok  noteInfo(82.407) → E2
  ok  midiToFreq(69) = A4
  ok  midiToFreq respects A4 reference
  ok  E standard MIDI numbers
  ok  Drop D lowers only the 6th string
  ok  custom = E std + offset
  ok  exactly one peak found
  ok  peak frequency correct
  ok  peak prominence reported
  ok  autocorrF0 returns a result
  ok  f0 ≈ 220 Hz
  ok  high confidence on a clean tone
  ok  white noise → no pitch (null)
  ok  log grid endpoints
  ok  resampling a flat curve stays flat
  ok  WAV sniff: 48 kHz / stereo / 24-bit
  ok  WAV sniff: float format flagged
  ok  AIFF sniff: 44.1 kHz / mono / 16-bit
  ok  FLAC sniff: 96 kHz / stereo / 24-bit
  ok  MP3 sniff: 44.1 kHz through ID3 tag
  ok  MP3 sniff: MPEG2 mono 22.05 kHz
  ok  M4A sniff: 44.1 kHz via stsd/mp4a
  ok  unknown bytes → null (refuse, never guess)
  ok  tiny buffer → null
  ok  dr sees the 14 dB spread in active material
  ok  snr = active P95 above the noise floor
  ok  clean signal is not flagged as clipped
  ok  hard-clipped sine is flagged
  ok  attack over a ringing background = the ~6 ms relative rise
  ok  clean attack from silence ≈ 8 ms 10–90% rise
  ok  spectrogram dimensions consistent
  ok  full-scale on-bin sine ≈ 0 dB in its cell
  ok  an octave away is leakage only
  ok  burst present at t=1.05 s
  ok  silence before the burst
  ok  grid above 16 kHz Nyquist is NaN (unmeasured, not faked)
  ok  cells below Nyquist stay measured
  ok  decimated length within target
  ok  integer pooling factor
  ok  peak survives decimation exactly
  ok  short envelope passes through
  ok  magma starts near-black #000004
  ok  magma ends pale yellow #fcfdbf
  ok  256 RGB entries
  ok  luminance rises monotonically across the map
  ok  magmaColor clamps out-of-range t
  ok  peaking: exactly g dB at fc
  ok  peaking: ~0 dB far from fc
  ok  peaking: boost and cut are exactly reciprocal
  ok  peaking: zero gain is a hard 0 (bypassed)
  ok  low shelf: g dB on the low side
  ok  low shelf: 0 dB on the high side
  ok  low shelf: exactly g/2 at fc (default Q = 1/√2)
  ok  high shelf mirrors the low shelf
  ok  shelves: boost and cut are exactly reciprocal
  ok  eqShapeDb dispatches by type
  ok  composite sums active bands plus trim, skips zero-gain bands
  ok  least squares solves slope 2, intercept 3
  ok  device table: GE-7 ×7, MXR ×10, Empress ×3, Logic ×6
  ok  Empress BOOST is boost-only; Logic shelves carry fixed Q
  ok  graphic fit returns normalized settings shape
  ok  recovers all 7 slider gains within 0.15 dB
  ok  recovers the LEVEL trim
  ok  residual ≈ 0 for an exactly representable target
  ok  graphic fit is deterministic
  ok  achieved response matches the target off the fit grid too
  ok  parametric fit returns normalized settings shape
  ok  Empress model fits a +6 dB / 1 kHz / Q 1.4 bump
  ok  max deviation from the bump target bounded
  ok  dominant band centers near 1 kHz
  ok  dominant band gain near +6 dB
  ok  Q snaps to a 3-position switch value
  ok  BOOST trim stays in device range
  ok  Logic shelves keep their fixed Q 0.71
  ok  Logic model fits the bump too
  ok  parametric fit is deterministic
  ok  span: min pre-onset lead, min post-onset tail
  ok  A at 2× amplitude reads +6.02 dB in the tone cell
  ok  columns align at each file's own first onset
  ok  pre-onset silence is NaN, not a fake level difference
  ok  p98 scale statistic is sane
  ok  level-match offset on B cancels the difference
  ok  identical signal differences to exactly 0
  ok  cell above B's Nyquist is NaN even though A is loud there
  ok  tone cell below both Nyquists stays measured
  ok  stylesheet has :root, dark theme, and switch rules
  ok  Bright on-track is cool slate + paper knob
  ok  Dark on-track is mid slate + light knob
  ok  checked track fills with --switch-on, not a hardcoded dark
  ok  checked knob is --switch-knob (light in both themes)
  ok  pre-M2.6e fully-dark checked fill is gone
  ok  switch CSS does not use guitar slot colors
  ok  t=+1 → slot A amber
  ok  t=−1 → slot B teal
  ok  t=0 → near-background neutral
  ok  clamps out-of-range t and maps NaN to neutral
  ok  snapshot writer emits Claude Rameau
  ok  snapshot reader mentions legacy GuitarScope
  ok  snapshot reader mentions Claude Rameau
  ok  snapshot error mentions Claude Rameau
  ok  reader accepts Claude Rameau snapshot
  ok  reader accepts legacy GuitarScope snapshot
  ok  reader rejects unknown app
  ok  reader rejects wrong type
  ok  reader rejects empty files

116 passed, 0 failed
```

## Screenshots

All taken with:
```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-sandbox --disable-gpu --hide-scrollbars --window-size=1440,4600 --virtual-time-budget=30000 --screenshot=out.png "file:///…/index.html?demo&open=all&theme=bright|dark"
```
and for About:
```
--window-size=1440,2600 --screenshot=about.png "file:///…/index.html?about&theme=bright|dark"
```
Chrome required `require_escalated` (sandbox) to run headless on this host; executed via `sandbox_permissions=require_escalated`.

- /tmp/final-bright.png (1.1M, demo&open=all bright) — header shows Claude Rameau + slogan, About button present, brand title help cursor, footer Claude Rameau
- /tmp/final-dark.png (1.1M, demo&open=all dark) — same content, dark theme, magma colormap unchanged
- /tmp/about-bright.png (248K, ?about bright) — About modal centered, 5 paragraphs from STORY.md, measure and closing question in <em>, backdrop dim
- /tmp/about-dark.png (235K, ?about dark) — same modal in dark theme, readable
- /tmp/about-how-bright.png (269K, ?about&how bright) — both modals open, about on top, Esc closes how first then about (verified via escCascade order guide→how→about)
- /tmp/out-bright.png and /tmp/out-dark.png (1.1M) copies of final demo

Screenshots were opened with the image-reading tool and verified: title/slogan/tagline layout intact at 1440px, globals cluster does not reflow, About modal text verbatim, brand button focus ring present.

## Found, not fixed

- ~~`docs/ARCHITECTURE.md` still titled “GuitarScope architecture” — R1.4 only required adding the plumbing note, not renaming the markdown title; left to keep diff minimal.~~ **Fixed 2026-08-23 follow-up:** renamed to “Claude Rameau architecture”, updated footer `made with Claude Rameau` and snapshot format `app:"Claude Rameau"` (with legacy accept note) per user request; also updated `tests/dsp.test.js` header and `docs/THEORY.md` open-question line 235 to Claude Rameau. See “Follow-up” below.
- `.brand-row` CSS rule remains defined but unused after R2.3 (replaced by `button.brandbtn`); kept to avoid deleting a rule that future code might reference, and to keep per-task diff minimal.
- `README.md` hook list not updated for new `?about` hook; R1.4 only required fixing stale test count, so hook table left as-is per smallest-diff discipline.
- Download filenames still use `guitarscope_` prefix — intentional plumbing, not identity; snapshot `app` field now carries `Claude Rameau` but filenames stay for filesystem compatibility.
- `index.html` line `if(!snap||(snap.app!==APP_NAME&&snap.app!=="GuitarScope")` retains the legacy string “GuitarScope” — intentional back-compat, the only silent failure point; test covers it.
- `tests/verify.sh --base master` referenced in assignment does not exist in repo — skipped, used `node tests/dsp.test.js` as the verification gate instead.
- THEORY.md §2.5 “peaks near ¼ critical bandwidth” and “~30–40 Hz” figures remain under review per ROADMAP gate-3 constraint — no educational copy in R1/R2 references them, so left untouched.

## Follow-up 2026-08-23 — doc rename requested

- `docs/ARCHITECTURE.md`: `# GuitarScope architecture` → `# Claude Rameau architecture`; `made with GuitarScope` → `made with Claude Rameau`; `JSON with app:"GuitarScope"` → `app:"Claude Rameau"` (note added that reader also accepts legacy `GuitarScope`).
- `tests/dsp.test.js`: header `GuitarScope DSP unit tests` → `Claude Rameau DSP unit tests`.
- `docs/THEORY.md:235`: `GuitarScope could measure the beating!` → `Claude Rameau could measure the beating!`.
- `HANDOFF.md`: updated commit range and moved former “still titled GuitarScope” entry to fixed. No changes to `index.html` legacy snapshot string or `gs*` plumbing; no edits to `SPEC.md`/`CLAUDE.md` status per original gate rule.

## Follow-up 2026-08-23 — production Load demo pair

- `index.html:720`: removed `style="display:none"` from `#debugLoadBtn` and changed text `Load test files` → `Load demo pair` per user request — header button is now always visible in production (plus the empty-state `#demoBtn` remains). `?debug` hook still works (sets display=""). Title comment updated; verified header shows “Load demo pair” next to About in bright/dark screenshots (`/tmp/header-check.png`).

## Follow-up 2026-08-23 — restore handover: header debug-only, Frequency card defaults

- Per your correction, `Load demo pair` at handover was **inside the Frequency analysis card** (`#specEmpty` → `#demoBtn` at :806, inside Spectrum's empty state), not in the header. Header `Load test files` was `style="display:none"` debug-only at handover (`master:720`).
- Reverted `index.html:720` to handover state: `<!-- development affordance … --> <button id="debugLoadBtn" style="display:none" title="…">Load test files</button>` — header button again hidden unless `?debug`.
- Verified Frequency analysis card defaults already match your request: `COLL_DEFAULT={spec:false,diff:false,bands:false,tone:false,eq:true,sgram:true,env:true}` → Spectrum/Bands unfolded at start (`freqCard` always visible, `freqDiff` hidden until `both` then unfolded because `collState.diff=false`), `updateVisibility` keeps `freqCard` always up and shows `specEmpty` when `n==0`. No code change needed for the “unfolded by default at beginning / Difference unfolded when two files provided” part — confirmed via `master` and current `COLL_DEFAULT`.

## Notes

- Internal identifiers remain `gs*` (gsSettings, gsCollapse, gsColors, gsVocab, gsStrings, gsStringHarmonics) and `?` hooks unchanged per R1.3 plumbing decision; APP_NAME constant is the single source for user-visible strings.
- No edits to SPEC.md or CLAUDE.md status section per assignment; README.md only test-count line touched.
- Branch `rameau-r1r2` never pushed, no reset/rebase/amend of prior commits.

## Blocked

(none)

