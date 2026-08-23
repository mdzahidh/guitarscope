---
tags: [music, claude-rameau, project]
date: 2026-08-22
---

# Claude Rameau — context pack for Claude Code sessions

Drop-in briefing for the app repo. **How to use:** copy this file into the repo as `docs/STORY.md`, copy [[music/notes/harmony-physics|harmony-physics.md]] in as `docs/THEORY.md`, then add to the repo's `CLAUDE.md`:

> Read `docs/STORY.md` (identity, About text, product direction) and `docs/THEORY.md` (the physics/math source material for all educational features) before working on user-facing copy, educational features, or naming.

## Identity

- **Name:** Claude Rameau
- **Slogan (next to the title):** *"Yes — but why does it sound that way?"*
- Named for Jean-Philippe Rameau (1683–1764), who derived harmony from the overtone series in 1722 — and for Claude (Rameau's organist brother, and the AI that helped build this). Diderot's *Rameau's Nephew* is about Claude's son: the family that stood next to genius, working the same material.

## The About section (draft — Zahid's story, his framing)

**About Claude Rameau**

This app began as a simple question about two guitars.

I own a Les Paul and an SG with the same pickups, the same strings, the same tuning — everything identical except their bodies. I wanted to *measure* what my ears claimed to hear. So I built a spectrum analyzer with an AI collaborator, and while adding a small feature — overlaying each string's fundamental and harmonics on the spectrum — I noticed something I wasn't looking for: one string's harmonic landed *exactly* on another string's fundamental. Not close. Exact.

Pulling that thread led to the discovery that the 3rd and 5th notes of a major chord are literally harmonics of the root — that a chord is what one string is already quietly doing by itself. Then further: why some notes rest and others pull, why a scale is three interlocking families, why the physics of a vibrating string contains most of what we call music theory. None of it was invented. It was all sitting there, in the ratios, waiting — the same bedrock Pythagoras hit with a monochord, Rameau hit with a harpsichord in 1722, and I hit with an FFT and a Les Paul.

The app is named for Jean-Philippe Rameau, the composer who first insisted harmony was physics — and for Claude, the AI I built it with. Rameau's brother was also named Claude; the family made a tradition of standing beside the material and asking questions of it.

That's what this tool is for. It will show you the difference between two guitars. But its real hope is that somewhere in the overlays, you'll see a harmonic land exactly where it shouldn't be a coincidence — and ask the only question that matters: *yes, but why does it sound that way?*

## Product direction (the educational thread)

The origin story IS the feature spec: the string-harmonics overlay accidentally taught the harmonic series. Extend that pattern — measurement views that quietly teach:

- **Harmonic ancestry view:** click any peak → show which string/harmonic it is, its ratio to the root, and its "family" (overtone of root / shares an ancestor). The denominator rule, interactive.
- **Consonance explainer:** hover an interval between two peaks → joint waveform period, comb alignment, predicted roughness (Plomp–Levelt), with the "why" in one sentence + expandable math.
- **Discovery moments:** when the analyzer detects a harmonic of one string coinciding with another string's fundamental, mark it subtly (✦) — recreate Zahid's original trigger for every user.
- **Glossary popovers** (already spec'd): musician meaning / scientific definition / this app's formula.
- **Tension landscape:** optional overlay rendering the dissonance curve as literal terrain under the spectrum.
- Tone: never lecture-first. Measure first; let curiosity click the ✦.

## Source material

`docs/THEORY.md` (harmony-physics.md) contains the verified math: harmonic series table, roughness/§2.5 (incl. the 15th-harmonic paradox and register-dependence), consonance definitions/§2.6, the denominator rule/§3.4, narrative castes/§3.6, dynasty of fifths + Tonnetz/§3.7, Rameau appendix. Use it as ground truth for all educational copy — don't re-derive from scratch.
