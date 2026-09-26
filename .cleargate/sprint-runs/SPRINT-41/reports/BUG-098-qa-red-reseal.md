# BUG-098 — QA-Red TPV Re-Seal Report

role: qa

```
QA-RED: WRITTEN
STORY: BUG-098
RESEAL_SHA: ca18c7346f5fb77184f9ef15cfad39f41e1e7061
PATCH_SHA256: 6485674b31cc0b38c4ba588651562bcc4f76c30540020f005391128f8e5eed4e
RED_COUNT: 24 red + 3 anchors (default tier, +27 unchanged), +1 integration red
ANCHORS: D6, P2, DD2 (default tier); gate-unit 27/27 total at C4; M2 parity pair 0/5 + 0/15 (flipped red by design, unchanged)
```

## 1. Preflight

- `<cw>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-098/cleargate-cli`, prior HEAD `2ea4832` (`git status --porcelain` clean, verified before patching).
- Patch: `.cleargate/sprint-runs/SPRINT-41/reports/BUG-098-tpv-reseal.patch` — `shasum -a 256` = `6485674b31cc0b38c4ba588651562bcc4f76c30540020f005391128f8e5eed4e`, exact match.
- `git apply --check` clean. Applied. Modified-file list == staged-file list == the TPV's 12-file allow-list, all under `test/` — no `src/`, `scaffold/`, or `scripts/` file touched:
  - `test/commands/doctor-fence.red.node.test.ts`
  - `test/commands/gate-unit.node.test.ts`
  - `test/commands/sprint-archive.node.test.ts`
  - `test/commands/sprint-frontmatter-fence.red.node.test.ts`
  - `test/e2e/sprint-allow-drift-fresh-install.red.integration.node.test.ts`
  - `test/lib/frontmatter-merge.node.test.ts`
  - `test/lib/intake.node.test.ts`
  - `test/lib/lifecycle-reconcile-fence.red.node.test.ts`
  - `test/lib/slug.node.test.ts`
  - `test/scripts/scripts-fence-bug098.red.node.test.ts`
  - `test/wiki/audit-status.node.test.ts`
  - `test/wiki/contradict.node.test.ts`
  - Total: `12 files changed, 340 insertions(+), 101 deletions(-)` (untouched: `test/lib/frontmatter-yaml-splice.red.node.test.ts` — H1–H4 need no re-seal edits, reconfirmed unchanged below).

## 2. Per-file counts vs TPV expected (solo `npm run test:file`, counted via `command grep -aE "^ℹ (tests|pass|fail|skipped) "`)

| File | Measured (tests/pass/fail) | Reds/anchors | Match |
|---|---|---|---|
| `test/lib/frontmatter-yaml-splice.red.node.test.ts` (unpatched) | 4 / 0 / 4 | 4 red (H1–H4) | yes |
| `test/commands/sprint-frontmatter-fence.red.node.test.ts` | 5 / 0 / 5 | 5 red (S1–S5) | yes |
| `test/commands/sprint-archive.node.test.ts` | 18 / 17 / 1 | 1 red (S6), 17 pre-existing | yes |
| `test/lib/lifecycle-reconcile-fence.red.node.test.ts` | 2 / 0 / 2 | 2 red (L1, L2) | yes |
| `test/commands/gate-unit.node.test.ts` | 27 / 25 / 2 | 2 red (R1, R2), 25 pre-existing — 27 total at C4 | yes |
| `test/commands/doctor-fence.red.node.test.ts` | 3 / 1 / 2 | 2 red (D4, D5), 1 anchor (D6) | yes |
| `test/lib/slug.node.test.ts` | 14 / 12 / 2 | 2 red (SL1, SL2), 12 pre-existing | yes |
| `test/lib/frontmatter-merge.node.test.ts` | 8 / 7 / 1 | 1 red (FM1), 7 pre-existing | yes |
| `test/wiki/contradict.node.test.ts` | 28 / 27 / 1 | 1 red (C1), 27 pre-existing | yes |
| `test/wiki/audit-status.node.test.ts` | 14 / 13 / 1 | 1 red (W1), 13 pre-existing | yes |
| `test/lib/intake.node.test.ts` | 9 / 8 / 1 | 1 red (I1), 8 pre-existing | yes |
| `test/scripts/scripts-fence-bug098.red.node.test.ts` | 4 / 2 / 2 | 2 red (P1, DD1), 2 anchors (P2, DD2) | yes |
| `test/e2e/sprint-allow-drift-fresh-install.red.integration.node.test.ts` | 1 / 0 / 1 | 1 red (integration) | yes |

**Default-tier red sum:** 4+5+1+2+2+2+2+1+1+1+1+2 = **24**. **Anchor sum:** D6 + P2 + DD2 = **3**. **24 + 3 = 27**, matching the TPV's `COUNTS_AFTER_RESEAL: default +27` exactly. **Integration: +1**, matching.

### M2 parity pair (compare mode, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, read-only)

| File | Measured | Expected |
|---|---|---|
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` | 5 tests, 0 pass, 5 fail | 0/5 (flipped red by design) |
| `test/commands/init-host-parity.red.integration.node.test.ts` | 15 tests, 0 pass, 15 fail | 0/15 (flipped red by design) |

`find /private/tmp/cg-s41-m2-init-baseline -newer <pre-run marker>` returned nothing after both runs — the baseline was read-only, never captured or modified.

## 3. Red-for-the-right-reason evidence

Swept every captured log for wiring/syntax signatures (`Cannot find module`, `is not a function`, `is not defined`, `ERR_MODULE_NOT_FOUND`, `TSError`, `Unexpected token`, `ReferenceError`) across all 13 default+integration files. The only hit is `test/lib/frontmatter-yaml-splice.red.node.test.ts` (`TypeError: frontmatterYaml is not a function`) — by design, per the original QA-Red report: H1–H4 pin a contract export that the Developer has not yet added, not a wiring gap. Every other file fails on a plain `AssertionError`.

Spot-checked per the dispatch's named risk areas:
- **S3 / S5 malformed-framing halves** (`sprint-frontmatter-fence.red.node.test.ts`): S3 (`stampSprintClose`) fails `AssertionError: preamble must be byte-identical` — the stamped block is planted in front of `<instructions>` instead of behind the located fence. S5 (malformed YAML behind `<instructions>` + allowDrift) fails `AssertionError: a malformed frontmatter behind <instructions> must never be rewritten or shadowed by a phantom` — same phantom-plant signature. Both are the FW-A17-amended `framingError` case, not a stale S1-style diff.
- **DD1** (`dedupe_frontmatter.mjs`): `AssertionError: expected a rewrite of the duplicate, got stdout:` — the base script still reports "0 rewritten, 1 skipped" on an instructions-led duplicate-key file.
- **C1** (`contradict.node.test.ts`): `AssertionError: the located frontmatter must gain last_contradict_sha` — asserts the stamp lands in the real (located) block, not that a blank line appears after the closer; this is the H1m-mutant-killing shape from the TPV.
- **The `<instructions>`-contains-key expect-false cases** (I1): failure text is `AssertionError: expected no R10 warning once the instructions-led prior file is found; got: warn: no Linear issues match label 'cleargate:proposal'…` — the decoy `remote-authored` marker living only inside `<instructions>` still triggers the whole-file-scan false positive at base, as FW-A17 item 1 describes.
- **S1's `raw.slice(span.end)` comparison**: confirmed in source — `test/commands/sprint-frontmatter-fence.red.node.test.ts:101/108` define the before/after preamble helpers as `raw.slice(0, span!.start)` / `raw.slice(span!.end)` (span-anchored, not a fixed-tail-length compare). S1's captured failure shows the full inserted phantom block (`---\ncontext_source: "lifecycle waiver: …"\n---\n\n<instructions>\n…`) diffed against the untouched original — exactly the byte-identical-preamble check the amendment requires.
- **D4/D5** (`doctor-fence.red.node.test.ts`): `AssertionError: expected the retired-field advisory counting 1 file, got:` (D4) and `AssertionError: runPricing must not exit on a readable instructions-led item; stderr: … file has no frontmatter: …EPIC-901.md` (D5) — both the offset-0-regex-miss and offset-0-sniff-exit signatures named in the TPV.

No hit in any of the 13 files came from a missing import, bad constructor/mock, thrown `TypeError`/`SyntaxError` (other than the by-design splice case), or a spawn failure.

## 4. Typecheck

`npm run typecheck` (`tsc --noEmit`) in `<cw>`: clean, exit 0 — checked after applying the patch.

## 5. Commit

```
$ git -C <cw> show --stat HEAD
commit ca18c7346f5fb77184f9ef15cfad39f41e1e7061
Author: sandrinio <sandrinio@users.noreply.github.com>
Date:   Sat Sep 26 21:07:54 2026 +0400

    qa-red(BUG-098): TPV re-seal — apply BUG-098-tpv-reseal.patch (sha256 6485674b…ed4e); counts unchanged (24 red + 3 anchors, +1 integration)

    Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
    Claude-Session: https://claude.ai/code/session_015Qz4eVKM8btGEYJaieiHkG

 test/commands/doctor-fence.red.node.test.ts        | 49 ++++++++++-
 test/commands/gate-unit.node.test.ts               | 36 ++++++--
 test/commands/sprint-archive.node.test.ts          | 26 ++++--
 .../sprint-frontmatter-fence.red.node.test.ts      | 96 ++++++++++++++++++----
 ...rift-fresh-install.red.integration.node.test.ts |  6 +-
 test/lib/frontmatter-merge.node.test.ts            |  9 +-
 test/lib/intake.node.test.ts                       | 37 ++++++++-
 .../lib/lifecycle-reconcile-fence.red.node.test.ts | 69 ++++++++--------
 test/lib/slug.node.test.ts                         | 25 +++++-
 test/scripts/scripts-fence-bug098.red.node.test.ts | 45 +++++++---
 test/wiki/audit-status.node.test.ts                | 24 +++---
 test/wiki/contradict.node.test.ts                  | 19 +++--
 12 files changed, 340 insertions(+), 101 deletions(-)
```

`git -C <cw> status --porcelain`: clean after commit. `git -C <ow> status --porcelain`: clean (no outer commit needed — this re-seal is TS-tests only, same as the original QA-Red).

## Deviations from TPV's expected counts

None. Every measured count (per-file solo, the 27-total default-tier sum, the 3-anchor set, the +1 integration red, and the 0/5 + 0/15 parity pair) matched the TPV report exactly on the first run.

**Observation (not a deviation, not flashcard-worthy on its own):** this contract branch is pre-BUG-096, so the M2 parity pair's `runInitScenario` calls leak `/tmp/cg-s41-fix-*` / `/tmp/cg-s41-payload-*` dirs on every run — already named in the TPV's own "Leak hygiene" note for the build phase. With multiple concurrent lanes exercising the same harness machine-wide, I could not safely attribute specific leaked dirs to only my two runs without a pre-existing directory-listing snapshot (I only marked a time boundary), so I left `/tmp` untouched rather than risk deleting another lane's live artifacts.

## Script Incidents

None. All invocations were `npm run test:file` / `npm run typecheck` inside `<cw>`, not through `run_script.sh` (not a `.cleargate/scripts` invocation), and none failed.

```yaml
flashcards_flagged: []
```
