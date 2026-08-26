#!/bin/sh
# The Rameau gate (R3, R4, M2.7, then R5). One command; exit 0 means the branch is reviewable.
#
# Run from the repo root:          ./tests/verify.sh
# Compare against another base:    BASE=origin/master ./tests/verify.sh
#
# Seven things must hold:
#   1. the existing DSP suite is still green   - no regression in shipped math
#   2. tests/r3.test.js is green               - the R3 wiring contracts are met
#   3. tests/r4.test.js is green               - the R4 wiring contracts are met
#   4. tests/m27.test.js is green              - the M2.7 wiring contracts are met
#   5. tests/r5.test.js is green               - the R5 wiring contracts are met
#   6. tests/headless.js is green              - it really renders and opens
#   7. the gate itself was not edited          - tests/ untouched, all three copies frozen
#
# (7) is what makes (1)-(6) mean anything: a builder who may edit the tests can
# always make them pass. The frozen copy blocks are educational prose already
# reviewed against docs/THEORY.md -- wiring them up is the task, rewriting them is not.

set -u
cd "$(dirname "$0")/.." || exit 1

BASE=${BASE:-master}
# R3 re-frozen 2026-08-26: HARM_NODES gained the 6th, 7th and 8th harmonics when the
# string popover widened to 8 (THEORY §6.1). Node fret positions written by the
# reviewer who owns the prose -- the freeze stops a delegated builder rewriting the
# physics, not the author extending it. Recorded in SPEC.md.
FROZEN_SHA=9c7a7e1aaa9d62b7e0a24893ee39a8a26c53ecb1da321bedcd11bf1606b162c0
# R4 re-frozen 2026-08-26: harmonicRowNoteHtml's range gate went h>5 -> h>8 when the
# popover widened to the 8th harmonic. One character of the reviewed physics prose,
# changed by the reviewer who wrote it -- the freeze exists to stop a delegated
# builder rewriting it, not to stop the author. Recorded in SPEC.md.
FROZEN_SHA_R4=3b482a634b12ed40bc379f60ab1f9e31423b113be71bd4bf18240fdcb6aa5883
FROZEN_SHA_R5=1da64ae24f7201c825b0c3a7c5a4c8962e4996fb5c7af051bb31b539ba69cf7b
fail=0

step() { printf '\n\033[1m== %s\033[0m\n' "$1"; }
verdict() {
  if [ "$1" -eq 0 ]; then printf '\033[32mPASS\033[0m  %s\n' "$2"
  else printf '\033[31mFAIL\033[0m  %s\n' "$2"; fail=1; fi
}

step "1/7  DSP suite (must stay green)"
node tests/dsp.test.js
verdict $? "tests/dsp.test.js"

step "2/7  R3 contracts"
node tests/r3.test.js
verdict $? "tests/r3.test.js"

step "3/7  R4 contracts"
node tests/r4.test.js
verdict $? "tests/r4.test.js"

step "4/7  M2.7 contracts"
node tests/m27.test.js
verdict $? "tests/m27.test.js"

step "5/7  R5 contracts"
node tests/r5.test.js
verdict $? "tests/r5.test.js"

step "6/7  headless render + popover"
node tests/headless.js
verdict $? "tests/headless.js"

step "7/7  the gate is intact"

# The tests are the specification. Editing them is how a green run becomes
# meaningless, so any diff under tests/ against the base fails the gate --
# including a harmless-looking tidy-up. If a contract is genuinely wrong, say so
# in the PR and leave it red; the reviewer changes the test, not the builder.
if git rev-parse --verify --quiet "$BASE" >/dev/null; then
  touched=$(git diff --name-only "$BASE...HEAD" -- tests/)
  if [ -n "$touched" ]; then
    printf 'tests/ modified since %s:\n%s\n' "$BASE" "$touched"
    verdict 1 "tests/ untouched since $BASE"
  else
    verdict 0 "tests/ untouched since $BASE"
  fi
else
  printf 'base ref "%s" not found\n' "$BASE"
  printf 'set BASE=<ref> if this is a fresh clone or a detached worktree\n'
  verdict 1 "tests/ untouched since $BASE"
fi

# Each frozen copy block, byte for byte between its two sentinel comments. Both
# are also asserted inside their node suites; repeated here so a reviewer can
# check the copy without a node run, and so the reason is stated where it is
# enforced.
# $1 = the sha the block hashed to, $2 = expected, $3 = label. The awk programs
# stay inline below: a pattern passed through `awk -v` has its backslashes eaten
# by the assignment, which silently matches nothing and hashes the empty string.
frozen() {
  if [ "$1" = "$2" ]; then
    verdict 0 "$3"
  else
    printf 'expected %s\n     got %s\n' "$2" "$1"
    verdict 1 "$3"
  fi
}

got=$(awk '
  /---------- discovery moments: the .* popover \(R3\.4\) ----------/ {on=1}
  on {print}
  /---------- end .* popover copy ----------/ {if(on) exit}
' index.html | shasum -a 256 | cut -d' ' -f1)
frozen "$got" "$FROZEN_SHA" "discovery-popover copy unchanged"

# R4's ancestry prose. Same reason, same rule: the physics is settled against
# docs/THEORY.md before the builder starts, so a diff here is a red gate, not a
# judgement call. The block sits after the R3 sentinels and is committed inert --
# calling these functions from stringContentHtml is the R4.1/R4.2/R4.4 task.
got=$(awk '
  /---------- harmonic ancestry copy \(R4\) ----------/ {on=1}
  on {print}
  /---------- end ancestry copy ----------/ {if(on) exit}
' index.html | shasum -a 256 | cut -d' ' -f1)
frozen "$got" "$FROZEN_SHA_R4" "ancestry copy unchanged"

# R5.3's collision-cluster prose. Third block, same rule. Note that all three awk
# programs here are written inline on purpose: awk -v eats backslashes, so a pattern passed
# that way matches nothing and cheerfully hashes the empty string.
got=$(awk '
  /---------- collision clusters: the .* popover \(R5\.3\) ----------/ {on=1}
  on {print}
  /---------- end collision copy ----------/ {if(on) exit}
' index.html | shasum -a 256 | cut -d' ' -f1)
frozen "$got" "$FROZEN_SHA_R5" "collision copy unchanged"

printf '\n'
if [ "$fail" -eq 0 ]; then
  printf '\033[32mgate passed\033[0m -- open the PR\n'
else
  printf '\033[31mgate failed\033[0m -- do not open the PR\n'
fi
exit $fail
