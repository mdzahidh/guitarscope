#!/bin/sh
# The Rameau gate (R3, R4, then M2.7). One command; exit 0 means the branch is reviewable.
#
# Run from the repo root:          ./tests/verify.sh
# Compare against another base:    BASE=origin/master ./tests/verify.sh
#
# Six things must hold:
#   1. the existing DSP suite is still green   - no regression in shipped math
#   2. tests/r3.test.js is green               - the R3 wiring contracts are met
#   3. tests/r4.test.js is green               - the R4 wiring contracts are met
#   4. tests/m27.test.js is green              - the M2.7 wiring contracts are met
#   5. tests/headless.js is green              - it really renders and opens
#   6. the gate itself was not edited          - tests/ untouched, both copies frozen
#
# (6) is what makes (1)-(5) mean anything: a builder who may edit the tests can
# always make them pass. The frozen copy blocks are educational prose already
# reviewed against docs/THEORY.md -- wiring them up is the task, rewriting them is not.

set -u
cd "$(dirname "$0")/.." || exit 1

BASE=${BASE:-master}
FROZEN_SHA=e4b277b2918a25367723636701fadb93a9520ef377c6c48f949cfdc2c789addf
FROZEN_SHA_R4=c0c6c57eba876fa23f3e600efb4f471d6d5c033fbf34b025632b64cda127d799
fail=0

step() { printf '\n\033[1m== %s\033[0m\n' "$1"; }
verdict() {
  if [ "$1" -eq 0 ]; then printf '\033[32mPASS\033[0m  %s\n' "$2"
  else printf '\033[31mFAIL\033[0m  %s\n' "$2"; fail=1; fi
}

step "1/6  DSP suite (must stay green)"
node tests/dsp.test.js
verdict $? "tests/dsp.test.js"

step "2/6  R3 contracts"
node tests/r3.test.js
verdict $? "tests/r3.test.js"

step "3/6  R4 contracts"
node tests/r4.test.js
verdict $? "tests/r4.test.js"

step "4/6  M2.7 contracts"
node tests/m27.test.js
verdict $? "tests/m27.test.js"

step "5/6  headless render + popover"
node tests/headless.js
verdict $? "tests/headless.js"

step "6/6  the gate is intact"

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

printf '\n'
if [ "$fail" -eq 0 ]; then
  printf '\033[32mgate passed\033[0m -- open the PR\n'
else
  printf '\033[31mgate failed\033[0m -- do not open the PR\n'
fi
exit $fail
