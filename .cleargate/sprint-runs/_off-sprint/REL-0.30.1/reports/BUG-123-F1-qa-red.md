# BUG-123 F1 QA-Red
QA-RED: WRITTEN
RED_TESTS: test/wiki/decisions-excerpt-punctuation.red.node.test.ts (worktree /Users/ssuladze/Documents/Dev/cg-wt/u3, uncommitted)
BASELINE_FAIL: 5 (4 TS, 1 oracle); 2 guards pass on HEAD

Red on HEAD (08f5935), reason: <=12-word branch strips only `.`:
- TS `;` -> `mu,;`; `,` -> `queue,;`; `:` -> `queue:;`; `.;` -> `queue.,;`
- Oracle/printed: printed line `[[EPIC-51]] Keep the old queue,; [[EPIC-51]] Keep the old queue` (no dedupe). The printed-line assert comes first; facts.decisions and --compare asserts follow.
Green on HEAD (guards): >12-word `;` at word 12 ends `…` with no `,…`; jq present.
Note: the oracle excerpt() is used only as the dedupe key, so the oracle side is pinned via dedupe of `queue;` vs `queue` on one item (needs `sub(/[.,:;]+$/, "", t)` in the <=12 branch, and `;` added in the long branch).
