---
bug_id: BUG-060
parent_ref: EPIC-054
parent_cleargate_id: EPIC-054
sprint_cleargate_id: SPRINT-39
carry_over: false
status: Draft
severity: P2-Medium
reporter: architect (M3 milestone planning)
area: planning-layer
approved: false
ambiguity: 🟡 Medium
context_source: verified codebase grounding — measured 2026-08-28 during M3 milestone planning (SPRINT-39) with `command grep -rn "/Users/ssuladze" cleargate-cli/{src,test,scripts}`, cross-referenced against `cleargate-cli/scripts/run-default-tests.mjs:23-29`'s glob to separate default-tier from integration-tier hits. Surfaced while auditing BUG-043's amended §4, which named ONE of these sites; the census found four live ones. Filed as a separate item because the fix is a root-resolution idiom change, not a marker-regex change, and because scoping it into BUG-043 would have repaired 1 of 4.
created_at: 2026-08-28T00:00:00Z
updated_at: 2026-08-28T00:00:00Z
created_at_version: 9e46ce5
updated_at_version: 9e46ce5
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-08-28T10:38:16Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# BUG-060: Four cleargate-cli test files hardcode this machine's absolute repo path

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** A test in `cleargate-cli` resolves the meta-repo root the way the rest of
the suite does — relative to its own module location, with the `CLEARGATE_META_ROOT` override for
the cross-repo case. The suite is then runnable by a second developer, from a clone at any path,
and by any CI runner that is ever added.

**Actual Behavior:** Four test files contain the literal string
`/Users/ssuladze/Documents/Dev/ClearGate`. On any machine where the repo does not live at that
exact path, each one throws `ENOENT` at read time. Two of the four are in the **default** test
tier, so `npm --prefix cleargate-cli test` — the command every agent contract in this repo names —
cannot pass anywhere but this laptop. The suite currently reports green only because it has never
been executed off this machine; there is no CI in `cleargate-cli` (`.github/workflows` absent), so
nothing has ever contradicted it.

The failure is loud rather than silent, which is the one mitigating property: an ENOENT is not a
false green. But it converts "the suite is green" from a statement about the code into a statement
about the filesystem it happens to be sitting on.

## 2. Reproduction Protocol

1. Confirm the sites: run `command grep -rn "/Users/ssuladze" cleargate-cli/src cleargate-cli/test cleargate-cli/scripts` from the meta-repo root.
2. Observe four hits in executable code and two more inside doc comments.
3. Separate the tiers: `cleargate-cli/scripts/run-default-tests.mjs:24-28` globs `test/**/*.node.test.ts` and excludes `*.integration.node.test.ts`, so `test/lib/claude-md-surgery.node.test.ts` and `test/hooks/session-start.node.test.ts` run on `npm test` while the two `*.integration.node.test.ts` hits do not.
4. Move or clone the repository to any other absolute path — for example `git clone <repo> /tmp/cg && cd /tmp/cg`.
5. Run `npm --prefix cleargate-cli test` from the clone.
6. Observe `ENOENT: no such file or directory` from `test/lib/claude-md-surgery.node.test.ts` and `test/hooks/session-start.node.test.ts`. The failure is deterministic and needs no special environment.
7. Run the integration tier from the clone and observe the same failure from the other two files.

## 3. Evidence & Context

Census taken 2026-08-28 against `cleargate-cli` at `9e46ce5`:

```
test/hooks/session-start.node.test.ts:127
  const HOOK_PATH = path.resolve('/Users/ssuladze/Documents/Dev/ClearGate/.claude/hooks/session-start.sh');
test/lib/claude-md-surgery.node.test.ts:214
  '/Users/ssuladze/Documents/Dev/ClearGate/CLAUDE.md',
test/scripts/protocol-section-14.integration.node.test.ts:18
  const REPO_ROOT = path.resolve('/Users/ssuladze/Documents/Dev/ClearGate');
test/lib/agent-developer-section.integration.node.test.ts:21
  const REPO_ROOT = path.resolve('/Users/ssuladze/Documents/Dev/ClearGate');
```

Two further occurrences are inside doc comments and are harmless as written, but they teach the
same idiom to the next author: `test/scaffold/pre-commit-downstream-safe.node.test.ts:51-52` and
`test/scaffold/file-surface-gate-e2e.node.test.ts:55-56`. One archived file carries a fifth live
instance: `test/scripts/_archive/protocol-section-24.integration.node.test.ts:39`.

`test/lib/claude-md-surgery.node.test.ts:212` carries the comment *"Absolute path per
instructions — this test verifies the real file"*, which records that the hardcoding was
deliberate at the time and not an oversight. The intent — assert against the real repo file rather
than a fixture — is correct and must be preserved; only the resolution mechanism is wrong.

**The idiom that already exists in this repo and should be adopted.**
`test/wiki/bucket-registry-parity.red.node.test.ts:105-125` resolves the meta-repo root from the
module's own location with a `CLEARGATE_META_ROOT` environment branch for the cross-repo case, and
`test/scripts/template-claude-md.node.test.ts:17` does the same thing more simply
(`path.resolve(new URL(import.meta.url).pathname, '..','..','..','..')`). Neither hardcodes
anything. The fix is to make the four offenders use one of these, not to invent a new mechanism.

**The trap that must not be walked into.** The obvious repair is to guard each read with
`skip: !existsSync(root)`. That converts a red into a **skip**, and a skipped assertion reads as
coverage. This repo has already been bitten by exactly that (FLASHCARD 2026-08-27
`#test-harness #gate #danger`, STORY-054-04 P6). Any fix must therefore assert three numbers on
the affected files — `pass N` AND `fail 0` AND `skipped 0` — not merely "green".

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `cleargate-cli/test/lib/claude-md-surgery.node.test.ts` (`:211-218`, default tier)
- `cleargate-cli/test/hooks/session-start.node.test.ts` (`:127`, default tier)
- `cleargate-cli/test/scripts/protocol-section-14.integration.node.test.ts` (`:18`, integration tier)
- `cleargate-cli/test/lib/agent-developer-section.integration.node.test.ts` (`:21`, integration tier)
- `cleargate-cli/test/scaffold/pre-commit-downstream-safe.node.test.ts` (`:51-52`, doc comment only)
- `cleargate-cli/test/scaffold/file-surface-gate-e2e.node.test.ts` (`:55-56`, doc comment only)

**Read for the idiom, do not modify:**
- `cleargate-cli/test/wiki/bucket-registry-parity.red.node.test.ts:105-125` — `CLEARGATE_META_ROOT` branch.
- `cleargate-cli/test/scripts/template-claude-md.node.test.ts:17` — module-relative `REPO_ROOT`.

**Explicitly NOT in scope:**
- `cleargate-cli/test/scripts/_archive/**` — archived, excluded from both tiers by intent. Note it; do not repair it.
- Adding CI to `cleargate-cli`. That is the reason this defect went unnoticed, but it is a separate decision with its own cost.
- Any change to what these tests assert. The subject of each assertion is correct; only the path resolution is wrong.

## Task Breakdown

- [ ] Extract the meta-root resolution used at `bucket-registry-parity.red.node.test.ts:105-125` into a shared test helper, or confirm the simpler `template-claude-md.node.test.ts:17` form is sufficient for all four sites -> R1
- [ ] Replace the literal path in `test/lib/claude-md-surgery.node.test.ts:214` with the resolved root, preserving the "verifies the real file" intent -> R2
- [ ] Replace the literal path in `test/hooks/session-start.node.test.ts:127` -> R2
- [ ] Replace the literal paths in the two `*.integration.node.test.ts` sites -> R2
- [ ] Rewrite the two doc-comment occurrences so the recipe they teach is path-independent -> R3
- [ ] Add a grep guard that fails if any executable line under `cleargate-cli/test/**` (excluding `_archive/`) contains an absolute `/Users/` path -> R4
- [ ] Verify from a clone at a different absolute path: default tier and integration tier both report pass N / fail 0 / skipped 0 -> R5

## 5. Verification Protocol (The Failing Test)

**Command:** `npm --prefix cleargate-cli test`, run from a clone of the repository at an absolute
path other than `/Users/ssuladze/Documents/Dev/ClearGate`.

The locking test must fail before the fix:

- A grep guard over `cleargate-cli/test/**/*.node.test.ts`, excluding `_archive/`, asserting zero executable lines containing `/Users/`. It fails today with four hits and passes after the fix.
- The four repaired files, run from a relocated clone, must report `pass N` **and** `fail 0` **and** `skipped 0`. A run reporting `fail 0` with a non-zero skip count is a failed fix, not a passing one.
- The default-tier suite run from this machine must be unchanged: same test count, same pass count.

## Prior work

- [[BUG-043]] — its amended `## 4. Execution Sandbox` named `claude-md-surgery.node.test.ts:211-218` as a portability defect worth noting separately. This is that item, widened by census from one site to four.
- [[STORY-054-04]] — established the `CLEARGATE_META_ROOT` cross-repo root idiom this fix should adopt, and the pass/fail/skip triple-assertion rule that stops the fix from degrading into a silent skip.
- [[BUG-053]] — `cleargate-cli` has zero installed git hooks, so nothing catches a hardcoded path at commit time. Same root cause for why this survived: no gate on that repo.
- [[BUG-046]] — the other cross-repo root-resolution defect in this sprint. Different mechanism, same class.

## Context Source

> Discovery audit. Populated from measured grounding during M3 milestone planning.

**context_source:** Measured 2026-08-28 during SPRINT-39 M3 milestone planning while auditing
BUG-043's amended `## 4. Execution Sandbox`. The amendment named one site; a repo-wide census
found four in executable code plus two in doc comments and one in `_archive/`. Tier separation
derived from `cleargate-cli/scripts/run-default-tests.mjs:24-28`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [ ] `approved: true` is set in the YAML frontmatter.

**Held at 🟡 deliberately.** Four of five criteria are met literally. The fifth is unmet by
construction — this item was filed by an Architect during milestone planning and has had no human
approval pass. One open decision is carried for that pass: whether the shared meta-root helper
should be extracted now (cleaner, touches five files) or each site fixed in place (smaller, leaves
the idiom duplicated four ways). Both are defensible; the item does not decide it.
