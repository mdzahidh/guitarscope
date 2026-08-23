#!/bin/sh
# The Rameau R3 gate. One command; exit 0 means the branch is reviewable.
#
# Run from the repo root:          ./tests/verify.sh
# Compare against another base:    BASE=origin/master ./tests/verify.sh
#
# Four things must hold:
#   1. the existing DSP suite is still green   - no regression in shipped math
#   2. tests/r3.test.js is green               - the R3 wiring contracts are met
#   3. tests/headless.js is green              - the mark really renders and opens
#   4. the gate itself was not edited          - tests/ untouched, the copy frozen
#
# (4) is what makes (1)-(3) mean anything: a builder who may edit the tests can
# always make them pass. The frozen copy block is educational prose already
# reviewed against docs/THEORY.md -- wiring it up is the task, rewriting it is not.

set -u
cd "$(dirname "$0")/.." || exit 1

BASE=${BASE:-master}
FROZEN_SHA=e4b277b2918a25367723636701fadb93a9520ef377c6c48f949cfdc2c789addf
fail=0

step() { printf '\n\033[1m== %s\033[0m\n' "$1"; }
verdict() {
  if [ "$1" -eq 0 ]; then printf '\033[32mPASS\033[0m  %s\n' "$2"
  else printf '\033[31mFAIL\033[0m  %s\n' "$2"; fail=1; fi
}

step "1/4  DSP suite (must stay green)"
node tests/dsp.test.js
verdict $? "tests/dsp.test.js"

step "2/4  R3 contracts"
node tests/r3.test.js
verdict $? "tests/r3.test.js"

step "3/4  headless render + popover"
node tests/headless.js
verdict $? "tests/headless.js"

step "4/4  the gate is intact"

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

# The popover copy between the two sentinel comments, byte for byte. It is also
# asserted inside tests/r3.test.js; repeated here so a reviewer can check the
# copy without a node run, and so the reason is stated where it is enforced.
got=$(awk '
  /---------- discovery moments: the .* popover \(R3\.4\) ----------/ {on=1}
  on {print}
  /---------- end .* popover copy ----------/ {if(on) exit}
' index.html | shasum -a 256 | cut -d' ' -f1)
if [ "$got" = "$FROZEN_SHA" ]; then
  verdict 0 "discovery-popover copy unchanged"
else
  printf 'expected %s\n     got %s\n' "$FROZEN_SHA" "$got"
  verdict 1 "discovery-popover copy unchanged"
fi

printf '\n'
if [ "$fail" -eq 0 ]; then
  printf '\033[32mgate passed\033[0m -- open the PR\n'
else
  printf '\033[31mgate failed\033[0m -- do not open the PR\n'
fi
exit $fail
