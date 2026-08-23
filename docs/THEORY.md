---
tags: [music, theory, physics, learning]
date: 2026-08-22
---

# Harmony & Physics — a running learning doc

Zahid's exploration of how guitar notes map to the physics of sound. Started 2026-08-22 from the realization that a major triad's 3rd and 5th are harmonics of the root. Related: [[music/profile|profile]].

## 1 · The raw material: the harmonic series

Pluck a string tuned to frequency f and it vibrates at f AND at 2f, 3f, 4f, 5f… simultaneously (the string subdivides into halves, thirds, quarters…). Every note you've ever played is a chord of these partials; their relative strengths are the *timbre*.

Using C as the root (octaves folded back into one octave — the ear treats ×2 as "the same note"):

| Harmonic | Ratio to root | Folded note | Interval | In tune w/ 12-TET? |
|---|---|---|---|---|
| 1 | 1/1 | C | unison | ✓ |
| 2 | 2/1 | C | octave | ✓ exact |
| 3 | 3/2 | G | perfect 5th | ✓ (+2¢) |
| 4 | 4/2 | C | octave | ✓ |
| 5 | 5/4 | E | major 3rd | ~ (−14¢, noticeably flat of fret) |
| 6 | 3/2 | G | 5th | ✓ |
| 7 | 7/4 | ≈Bb | "blues 7th" | ✗ (−31¢, between frets!) |
| 8 | 2/1 | C | octave | ✓ |
| 9 | 9/8 | D | major 2nd | ~ (+4¢) |
| 10 | 5/4 | E | major 3rd | ~ |
| 11 | 11/8 | ≈F# | ~tritone | ✗ (way off) |
| 12 | 3/2 | G | 5th | ✓ |
| 13 | 13/8 | ≈A-ish | ~minor 6th+ | ✗ (−59¢) |
| 15 | 15/8 | B | major 7th | ~ (−12¢) |

**The major triad is the harmonic series.** Harmonics 4:5:6 = C:E:G. When you play a major chord you're reconstructing, with separate strings, what a single string already does quietly by itself. The ear recognizes the pattern and fuses it — it even infers the shared fundamental (this is called *virtual pitch*). That's why major sounds "complete."

## 2 · Why simple ratios sound good (the physics of consonance)

Two notes played together are consonant when their *harmonic series line up*:

- C (f) and G (3/2 f): every 3rd harmonic of C lands exactly on every 2nd harmonic of G. Massive overlap → the mismatched partials are few → smoothness.
- Two notes a semitone apart: almost no partials align, and many pairs sit *close but not equal* → they beat against each other at rates the ear reads as roughness (Helmholtz's critical-band theory).

So "harmonizing" is literal: consonance = shared/aligned harmonics, dissonance = beating between near-miss harmonics. Simple ratio ⇒ more alignment ⇒ smoother.

## 2.5 · Roughness, precisely (added 2026-08-22)

**Definition.** Two pure tones f₁, f₂ superpose as cos(2πf₁t)+cos(2πf₂t) = 2·cos(πΔf·t)·cos(π(f₁+f₂)t): a carrier at the mean frequency, amplitude-modulated at Δf. Perception by Δf:
- Δf ≲ 15 Hz → audible slow **beating** (wah-wah loudness).
- Δf ≈ 15–~½ critical band, peak ~30–40 Hz → too fast to track: **roughness**, a gritty buzz. This is the sensation.
- Δf > critical band → the cochlea's mechanical filter bank (basilar membrane; bandwidth ≈ ERB, roughly 11–15% of center frequency) resolves the tones into separate channels → smooth again.
Roughness = amplitude modulation *inside one cochlear filter*. Physiological and computable (Plomp–Levelt 1965; Sethares' model sums over all partial pairs, weighted by amplitude product).

**Parameterized roughness curve (Sethares' model, added 2026-08-22 for Claude Rameau's consonance explainer).** For one pair of partials at frequencies f₁ ≤ f₂ with amplitudes a₁, a₂:

```
d(f₁, f₂, a₁, a₂) = min(a₁, a₂) · [ e^(−b₁·s·Δf) − e^(−b₂·s·Δf) ]
where  Δf = f₂ − f₁
       s  = d* / (s₁·f₁ + s₂)
       b₁ = 3.5,  b₂ = 5.75,  d* = 0.24,  s₁ = 0.021,  s₂ = 19
```

Total roughness of two complex tones = Σ d over **all** cross-pairs of their partials (self-pairs of one tone contribute a timbre's intrinsic roughness and are usually included too). Properties worth asserting in tests: d = 0 at Δf = 0 (unison); d peaks near Δf ≈ ¼ of the critical bandwidth at f₁ (~30–40 Hz in the guitar's mid-register) — the peak of the bracketed term sits at s·Δf = ln(b₂/b₁)/(b₂−b₁) ≈ 0.221; d → 0 as Δf exceeds the critical band. The `s` scaling encodes the frequency-dependent critical bandwidth (wider in Hz at higher f₁), which is what makes the same musical interval rougher in low register than high — the physics behind "power chords low, triads high." Amplitude convention: `min(a₁,a₂)` per Sethares (*Tuning, Timbre, Spectrum, Scale*, 1998 — the softer partner limits audible beating); the a₁·a₂ product is a common variant, fine if stated. Output is a relative (dimensionless) roughness — normalize the plotted curve to its own maximum and say so on the axis; do not present absolute units.

**The 15th-harmonic paradox (Zahid's question).** B is harmonic 15 of C — so why is B-against-C rough? Because for *complex* tones you compare the full harmonic combs, and alignment must be weighted by energy:
- C's comb: f, 2f, 3f… · B's comb: (15/8)f·{1,2,3…}. First coincidence: C's 15th = B's 8th. But string-harmonic amplitudes fall ~1/n — by harmonic 15 there's almost no power. The alignment exists *mathematically* and is *energetically irrelevant*.
- Meanwhile the strong low partials near-miss: at C4 (261.6 Hz), B4 = 490.5 Hz vs C's 2nd harmonic 523.2 Hz → Δ = 32.7 Hz — **exactly peak roughness**. B's 2nd partial (981) vs C's 4th (1046): Δ = 65 Hz, still inside the critical band at that register. The comb's high-energy region is full of near-misses parked in the maximum-grit zone.
- General law: for ratio p/q the first strong coincidence sits at harmonic p (of the lower note) — so **p·q (Tenney height) ranks dissonance**: octave 2, fifth 6, fourth 12, maj6 15, maj3 20, min3 30, maj2 72, maj7 120. The maj7 is the scale's roughest interval against the root *because* its first real overlap is pushed to the powerless tail while every strong tooth lands a semitone-ish from a strong neighbor.
- Semitone-class intervals are worst-case: a constant ~6% ratio offset keeps *every* partial pair within the ~11–15% critical band — the whole comb grinds at once.

**Register changes everything (Zahid's ×8 observation).** Fold B up three octaves and play literal 15f against f: now B's entire comb {15f, 30f, 45f…} is a *subset* of C's comb — exact coincidences everywhere, zero near-misses → it fuses, faint and consonant. The major 7th's grind is *created by octave-folding it down* into the register where its partials interleave with C's strong ones. Deep point: **sensory roughness is register-dependent; ratio-class ("interval") is an octave-equivalent abstraction that discards exactly what roughness depends on (absolute Δf between partials).** Tonal function (the leading-tone pull) lives at the abstract level; grit lives at the sensory level. Arrangers exploit this constantly — spread voicings put "dissonant" notes far apart to keep function without grit.

**Timbre corollary (Sethares).** Roughness depends on the partials, not the notation: pure sine waves are nearly roughness-free at any interval; heavily distorted guitar (dense partials + intermodulation) makes even a major 3rd grind — why power chords rule under gain, and why gamelan music, with inharmonic metallophone partials, evolved different "consonant" scales. Consonance is a property of *spectra*, and only by proxy of notes.

## 2.6 · "Consonant" and "simple ratio," defined properly (added 2026-08-22)

**Simple ratio** = p/q in lowest terms with small p·q. Graded, not binary — 2/1 (p·q=2) simplest, 3/2 (6), 4/3 (12), 5/4 (20)… 15/8 (120). Three equivalent pictures of why small p·q matters:
1. **Time domain — joint periodicity.** Two tones at f and (p/q)f have a combined waveform that repeats every q cycles of the lower tone (= p of the upper). 3/2 → composite repeats every 2 low-cycles: short, strongly periodic pattern. 15/8 → repeats only every 8 low-cycles: quasi-aperiodic churn. The auditory nerve phase-locks to waveform periodicity; short joint period → clean, unified neural code.
2. **Frequency domain — comb alignment.** Partials coincide exactly at multiples of the lcm: a fraction ~1/(p·q) of teeth align. Small p·q → many high-energy coincidences, few near-misses → low roughness (§2.5). Large p·q → alignment exiled to the amplitude tail, strong partials near-missing.
3. **Inference — common fundamental.** Both notes are harmonics (q-th and p-th) of an implied fundamental at f/q. Small q → that ancestor is close below and the brain's harmonicity template locks on (virtual pitch, fusion). Large q → implied root too remote; no fusion.

**Consonance** = the perceptual state those three produce. Operationally, three separable components:
- *Smoothness*: absence of roughness (no strong AM inside cochlear filters) — sensory, register- and timbre-dependent.
- *Fusion/harmonicity*: the combined spectrum resembles ONE harmonic series, so the ear binds it into a single object with a clear virtual pitch — why 4:5:6 sounds "resolved."
- *Familiarity/stability*: learned expectation that this sonority doesn't demand motion — cultural layer (medieval theorists classed the major 3rd as dissonant; jazz treats the maj7 chord as home).
Sensory consonance (first two) is physics; *musical* consonance (third) is trained. They usually agree because the training data was made by ears obeying the physics.

**Tolerance bands.** The ear accepts a few cents of mismatch — consonance minima are basins with width, not points. That width is why 12-TET's 2¢-off fifths pass perfectly, its 14¢-off thirds sit noticeably up the wall of the basin, and vibrato (deliberate oscillation around the minimum) sounds alive rather than out of tune.

## 3 · The major scale, note by note (Zahid's core question)

Just-intonation ratios for C major:

| Degree | Note | Ratio | Harmonic pedigree                                                 | Verdict on "harmonizes with root"                             |
| ------ | ---- | ----- | ----------------------------------------------------------------- | ------------------------------------------------------------- |
| 1      | C    | 1/1   | the root                                                          | —                                                             |
| 2      | D    | 9/8   | harmonic 9 = 3×3 (a 5th above the 5th)                            | YES — Zahid's intuition ✓ (but "grandchild": consonant via G) |
| 3      | E    | 5/4   | harmonic 5                                                        | YES — direct overtone                                         |
| 4      | F    | 4/3   | **NOT an overtone of C** — instead **C is the 3rd harmonic of F** | Inverse relation — Zahid's doubt ✓                            |
| 5      | G    | 3/2   | harmonic 3                                                        | YES — strongest non-octave                                    |
| 6      | A    | 5/3   | **not an overtone of C** — A is the major 3rd (5th harmonic) of F | Inverse-family — doubt ✓                                      |
| 7      | B    | 15/8  | harmonic 15 = 3×5 (major 3rd of the 5th)                          | YES-ish — distant direct overtone                             |

**The pattern:** every ratio is built only from primes 2, 3, 5 (octave, fifth, major third). The scale splits into two families:

- **Overtone family (2, 3, 5, 7):** derived *upward* from C — powers of 3 and 5. These rest on the root.
- **Undertone family (4, 6):** derived *downward* — F is the note that *contains C in its own harmonic series*, and A is F's major third. These notes don't rest on C; C rests on them.

This is not a technicality — it's audible and it IS functional harmony:
- G (overtone) sounds *supported by* C → dominant feels like tension that belongs to home.
- F (undertone) sounds like it *wants to be its own root* → subdominant's "pulling away" feel. Play C then F: F doesn't sit inside C; it tugs the tonal center toward itself.
- The amen cadence (F→C) and the V→I cadence are the two directions of the same physics.

**The tidiest derivation of the whole scale:** take the strongest relation (the 5th) once in each direction from C — giving F ← C → G — and build the harmonic-series triad (4:5:6) on each:
- F–A–C, C–E–G, G–B–D
Union = C D E F G A B. **The major scale is three interlocking major triads.** Nothing else needed. Every note is the 1, 3, or 5 of the tonic, dominant, or subdominant. (This also explains why I, IV, V harmonize "everything" in folk/blues/country: together they literally contain the scale.)

### The 2nd and 7th, honestly

Zahid guessed they harmonize — true with nuance:
- D (9/8) is two perfect 5ths up (C→G→D). Alone against C it's mildly dissonant (whole tone = adjacent-ish harmonics 8:9) but it *belongs* — the ear hears the lineage through G. Sus2 chords work because of this: clearly consonant-adjacent, but unresolved.
- B (15/8) is a 5th + a major 3rd (C→G→B). As harmonic 15 it's a real overtone but a weak/high one; against C alone it's the sharpest dissonance in the scale (semitone from the octave!). Its consonance is *contextual*: inside G's triad it's smooth; its adjacency to C is exactly the "leading tone" pull that makes V→I resolve.

Rule of thumb: **low harmonic number = consonant in isolation; higher composite numbers (9, 15) = consonant by inheritance, tense in isolation, and that tension is what makes music move.**

## 3.4 · Zahid's denominator rule (added 2026-08-22)

Zahid's own formulation, verified: for a scale note at ratio p/q (lowest terms) to the root —

- **q a power of 2** (1, 2, 4, 8…) ⇔ the note is an octave-folded harmonic of the root: it's harmonic p, dropped log₂(q) octaves. Scale check: 9/8, 5/4, 3/2, 15/8 ✓ — the overtone family.
- **q containing an odd factor** (the 3 in 4/3 and 5/3) ⇔ the note is NOT in the root's series. Both notes are instead harmonics of a **common fundamental at f/q**: the root is its q-th harmonic, the note its p-th. For the 4th: f/3 *is* low F — C is the 3rd harmonic of F. For the 6th: same ancestor F, with A as its 5th harmonic (F's major third).
- Refinement: the test is "power of two," not merely "even" (a denominator of 6 is even but hides a 3 — e.g. septimal 7/6). In the major scale the two happen to coincide.
- Numerator layer: if p is a power of 2 (4/3), the upper note IS the common fundamental octave-shifted — the 4th literally is the foreign root (why a bare 4th sounds like a suspension wanting to resolve to IV). If p has odd factors (5/3), the note is a member of the foreign family, not its root.
- Prime factors = family tree: every 3 = a fifth-step, every 5 = a major-third-step, 2s = octaves. **Denominator = ancestry test; numerator = which descendant.**

## 3.5 · The 6th, a closer look (added 2026-08-22)

The 6th (A in C) is the scale's most interesting citizen:

- **Consonant without being an overtone.** 5/3 is a very simple ratio — consonance only needs *aligned partials*, not membership in the root's series (every 3rd harmonic of A meets every 5th of C). Direction doesn't matter for smoothness; it matters for *gravity*. So A sounds sweet over C, yet doesn't rest on it.
- **Two rival derivations, 22 cents apart.** By stacked fifths C→G→D→A: 27/16 (906¢, "Pythagorean 6th"). As F's major third: 5/3 (884¢). The gap is the syntonic comma (81/80) — the 6th is the scale's most tuning-ambiguous note. ET splits the difference at 900¢. (String players intonate it differently depending on harmonic context; a fretted guitar can't.)
- **Home chord: IV only.** In the three-triad construction, each note lives in specific triads: C→I,IV · D→V · E→I · F→IV · G→I,V · A→**IV only** · B→V. So in I-IV-V accompaniment, the moment a melody lands on the 6th, the harmony *must* be on IV (or treat A as a color tone). The 6th is the subdominant family's calling card — hearing A over a C context is what "IV-ness" sounds like.
- **The shadow tonic.** A is the root of vi (A minor), the relative minor — the same seven notes reorganized around the 6th degree. The deceptive cadence V→vi works because vi shares two notes with I (C, E) but re-roots them on A: home's furniture, different house. Sad reprises of happy songs = pivot the same material to the 6th.

## 3.6 · The narrative layer (added 2026-08-22)

Zahid's goal: musical intuition as *story*. Validated framing — the scale's seven notes form three castes, matching the three generating triads:

- 🏠 **Tonic family (1, 3, 5)** — at rest. Home's furniture; phrases can end here.
- 🧭 **Dominant family (7, 2, +5)** = members of the V chord — tension pointing **homeward** (centripetal). 7 is the doorknob (leading tone, rises to 1); 2 falls to 1 or rises to 3.
- 🌄 **Subdominant family (4, 6, +1)** = members of the IV chord — tension pointing **away** (centrifugal). 4 leans down to 3 or asserts F; 6 falls wistfully to 5.

Correction to first draft of the intuition: 2 and 7 are home-*blooded* but not at rest — allegiance ≠ stability. Both castes are tension; direction differs.

**Stepwise resolution table (most of melody-writing):** 2→1 or 3 · 4→3 · 6→5 · 7→8.

**The archetype:** I → IV → V → I = home → departure → crisis-pointing-home → homecoming. The hero's journey in ratios; why it carries thousands of songs.

**Pivot stones:** C lives in I and IV; G lives in I and V — dual citizens a storyteller stands on while choosing the tale's direction.

One-line version: *4 and 6 pull away toward the parent; 2 and 7 pull back toward home; only 1, 3, 5 rest — music is the art of scheduling those pulls.*

![[major-scale-narrative.svg]]
*The narrative in one picture: dynasty of fifths (top) + gravity map of the three triad-families (bottom). Source: `assets/major-scale-narrative.svg`.*

## 3.7 · The lineage of fifths and the Tonnetz (added 2026-08-22)

Zahid's tree intuition (away-world F = parent, home C = child, return-engine G = child-of-home via V) — verified and extended:

- **The parent relation chains.** "X's 3rd harmonic = Y" generates a dynasty: F → C → G → D → A → E → B. Those seven nodes ARE the C major scale (Pythagorean derivation). Home sits second from the top: one ancestor (F), five descendants.
- Generation distance tracks tension against home: D grandchild, A great-grandchild, B most remote (the restless leading tone).
- Flat-ward modulation = toward ancestors (relaxing/darkening); sharp-ward = toward descendants (brightening/energizing). Octave equivalence closes the chain into the **circle of fifths** — now derived, not memorized.
- **Caveat → next structure:** the pure chain yields Pythagorean E (81/64); the ear prefers the direct 5th harmonic E (5/4); gap = syntonic comma (22¢). There are really TWO parent-relations (×3 fifths, ×5 major thirds). Two axes → the **Tonnetz** lattice (Euler 1739): fifths horizontal, thirds diagonal; every triad = a triangle; progressions = paths; smooth progressions share triangle edges (C→Am), jarring ones teleport. The fifths-tree is the Tonnetz's spine.
- [ ] TODO: render a proper Tonnetz + dynasty-tree SVG wall chart.

## 4 · Minor

Natural minor (A minor = C major's notes, from A): ratios from A: 1, 9/8, 6/5, 4/3, 3/2, 8/5, 9/5.

- **Minor 3rd = 6/5** — the gap between harmonics 5 and 6. Still a simple ratio (consonant), but crucially the minor triad is **10:12:15** as a stack — it is NOT a segment of one harmonic series. A major triad (4:5:6) points at a single virtual fundamental; a minor triad's implied fundamental is distant and ambiguous. Same smoothness, less "pointing home" → the darker, unresolved color isn't cultural, it's arithmetic.
- Elegant symmetry: the minor triad is the major triad *mirrored* (major = 5th split as M3+m3 from the bottom; minor = the same two thirds in reverse order). Riemann's "undertone" theory formalizes this: minor is major seen in a mirror, which rhymes with the overtone/undertone split inside the major scale itself (§3).
- Harmonic/melodic minor are patches: natural minor's 7th (9/5, a whole tone below the octave) doesn't lead; raising it back to a leading tone (harmonic minor) reinstates the V→I physics at the cost of the exotic aug-2nd gap.

## 5 · The guitar's compromise: equal temperament

Frets are spaced by 2^(1/12) ≈ 1.0595 per semitone — every ratio above is *approximated* so that all 12 keys work identically:

| Interval | Just ratio | 12-TET error |
|---|---|---|
| Octave | 2/1 | 0¢ exact |
| 5th | 3/2 | −2¢ (inaudible) |
| 4th | 4/3 | +2¢ |
| Major 3rd | 5/4 | **+14¢ sharp** (very audible) |
| Minor 3rd | 6/5 | **−16¢ flat** |
| Major 6th | 5/3 | +16¢ |

Consequences Zahid already lives with:
- **Natural harmonics vs fretted notes:** the fret-5/7/12 harmonics are the *true* series (they're the physics; frets are the compromise). The 7th-fret harmonic (3rd harmonic) is 2¢ off its fretted twin — fine. But the 4th-fret harmonic (5th harmonic, pure major 3rd) is 14¢ flat of the fretted major 3rd. Tuning by 5th/7th-fret harmonics chains pure 5ths and drifts — why tuner > harmonic-tuning for a tempered instrument.
- **Distorted power chords omit the 3rd** because distortion generates intermodulation between all partials — the 14¢-off tempered 3rd turns to mud under gain; the near-pure 5th stays solid. Root+5th = the two notes ET renders almost justly.
- Harmonic 7 (the 7/4 "blues seventh") lives *between* frets — bends and slides toward it are the blues reaching for a note the fret system doesn't own.

## 6 · Fretboard ↔ harmonics map

```
Node position:   12th fret   7th & 19th   5th & 24th   ~3.9th (4th) & 9th & 16th
Harmonic:        2nd (oct)   3rd (5th)    4th (2 oct)  5th (maj 3rd, pure −14¢)
String divides:  1/2         1/3          1/4          1/5
```

Fret spacing itself is the geometric series L·2^(−n/12) — the physical picture of "every semitone = same *ratio*, not same distance," which is also why capos and Eb tuning change nothing about any of the above: harmony is ratios, and ratios ride along.

---

## Appendix A · Rameau, the physicist of harmony (added 2026-08-22)

**Jean-Philippe Rameau (1683–1764)** — French Baroque composer (operas: *Hippolyte et Aricie*, *Les Indes galantes*; brilliant harpsichord music) who, at 39, published the *Traité de l'harmonie* (1722) and effectively founded music theory as a science. Why he matters to this document:

- **He derived harmony from physics.** Building on Joseph Sauveur's brand-new acoustics (Sauveur had just measured overtones and coined "harmonics"), Rameau grounded chords in the *corps sonore* — the resonating body: a vibrating string sounds its 12th (3rd harmonic) and 17th (5th harmonic), therefore the major triad is *given by nature*, not by convention. Exactly the argument this doc rebuilt from harmonic combs.
- **The fundamental bass (basse fondamentale):** his revolutionary claim that a progression is governed by the succession of chord *roots* — an implied bass line of fundamentals, moving preferentially by fifths. That's our dynasty-of-fifths lineage, stated in 1722.
- **Inversions:** he recognized C-E-G, E-G-C, G-C-E as *the same chord* — obvious now, radical then. Identity lives in the root and its harmonic pedigree, not in voicing. (Same abstraction as our octave-folding.)
- **Tonic / dominant / subdominant:** he named the three functions and their gravity — the home/engine/away-world triangle of §3.6 is Rameau's *tonique–dominante–sous-dominante* with modern physics under it.
- **His famous struggle:** minor. The overtone series gives major for free; Rameau spent decades on shaky derivations of the minor triad (co-vibration, undertone speculations later formalized-ish by Riemann). Our §4 (10:12:15, no single-series home) is the modern resolution of the exact problem that tormented him.
- **The scientific culture:** d'Alembert popularized his system (*Élémens de musique*, 1752); he feuded publicly with Rousseau over harmony-vs-melody. Rameau insisted "music is a physico-mathematical science" — and was mocked for it by the literary set. This document is, in spirit, Team Rameau.

One-line take: Rameau is what happens when a working musician demands *why* — he found the overtone series under the triad 300 years before FFTs, and every "functional harmony" chart since is his footnote.

## Learnings log

- **2026-08-22 (night)** — Roughness defined precisely (§2.5): AM inside one cochlear filter, peak ~30–40 Hz; resolved the 15th-harmonic paradox (alignment must be energy-weighted — first coincidence at harmonic 15 is powerless while strong partials near-miss at Δ=32.7 Hz for B4/C5); Tenney height p·q ranks dissonance; register-dependence (B three octaves up = pure subset of C's comb = consonant — the maj7's grind is created by octave-folding); Sethares timbre-dependence.
- **2026-08-22 (evening)** — Narrative layer established (§3.6): three castes (tonic rest / dominant homeward-pull / subdominant away-pull), resolution table, I-IV-V as hero's journey. Refined Zahid's "everyone else stays home": 2 & 7 are home-family but restless — allegiance ≠ stability.
- **2026-08-22 (later still)** — Zahid derived the denominator rule himself from rational frequency forms: q = power of 2 ⇔ overtone of root; odd factor in q ⇔ shared ancestor at f/q (the undertone family). Refined "even" → "power of two"; added the numerator layer (p = 2^k ⇒ the note IS the foreign root). §3.4.
- **2026-08-22 (later)** — Deep-dive on the 6th: consonant (5/3) without being an overtone — alignment ≠ ancestry; the syntonic-comma ambiguity (27/16 vs 5/3); lives ONLY in the IV triad among I-IV-V, making it the "sound of IV"; and it's the relative-minor root (vi = shadow tonic, deceptive cadence).
- **2026-08-22** — Started the doc. Confirmed: major triad = harmonics 4:5:6; 2nd = harmonic 9 (3×3), major 7th = harmonic 15 (3×5) — "harmonize by inheritance." The 4th and 6th are the inverse family: C is a harmonic *of F*; A is F's third — the physical root of subdominant "pull." Major scale = union of the 4:5:6 triads on F, C, G. Minor 3rd = 6/5 (consonant) but minor triad 10:12:15 has no single-series home → darker. ET fudges 3rds by ±14–16¢ (why power chords under gain, why harmonic-tuning drifts).

## Open questions / next threads

- [ ] Hear it: A/B a just-intonation major 3rd vs the fretted one (GuitarScope could measure the beating!)
- [ ] Pentatonic minor/major through this lens (spoiler: it deletes both "problem" semitones)
- [ ] Why does the tritone resolve outward? (7th-chord physics)
- [ ] South Asian classical: ragas use just-ish intervals and 22 shrutis — connect to the harmonic families
