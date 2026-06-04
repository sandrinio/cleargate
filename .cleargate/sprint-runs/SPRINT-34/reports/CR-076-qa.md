# CR-076 — QA Verification (orchestrator-performed)

CR-076 is mechanical config surgery (last CR, mostly Gate-4/build-verified). Orchestrator independent verification.

- **Verdict:** ✅ PASS
- **Commit:** `e7e402c` on cli `story/CR-076`.

## Checks
| Check | Result |
|---|---|
| Contract test `cr076-package-trim.node.test.ts` | 5/5 pass |
| tsup `sourcemap: false` (drops ~30MB maps from build) | ✓ (tsup.config.ts:31) |
| onSuccess template-copy → `dist/templates/` REMOVED (copyDirSync dead code removed) | ✓ |
| **INVERSION GUARD** — files[] keeps BOTH `templates` + `dist` (root templates is the live read-path; must NOT be dropped) | ✓ (`["dist","templates",...]`) |
| Read-path proof — `init.ts:140-145 resolveDefaultPayloadDir()` reads ROOT `templates/cleargate-planning` (not dist/templates) | ✓ |
| changelog-format sibling assertion (no `*.map`, single payload) added, not mutating CR-075's pack line | ✓ (Gate-4-guarded) |

## The inversion (load-bearing)
The CR's literal instruction ("drop `templates` from files[]") was INVERTED. The published bin (`dist/cli.js`) resolves `dirname/.. = package root → root templates/`. The droppable dup is `dist/templates/`, removed by killing the tsup onSuccess copy — NOT by editing files[]. Following the CR verbatim would have broken `cleargate init` in the field. Honored correctly.

## Gate-4 deferred (build-confirm)
`npm run build && npm pack --dry-run` must show: zero `*.map` entries, no `dist/templates/cleargate-planning`, single root payload, materially smaller unpacked size (was 53.4MB / 221 files). Plus a `cleargate init` smoke (templates resolve, `.install-manifest.json` written). This is the only verification gap — deferred to Gate-4 (dist rebuild), run before any owner publish.

## Regressions
None. cli-only; no outer changes.
