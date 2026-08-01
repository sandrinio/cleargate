---
bug_id: BUG-040
parent_ref: EPIC-021
parent_cleargate_id: EPIC-021
sprint_cleargate_id: null
carry_over: false
status: Completed
severity: P1-High
reporter: sandrinio
approved: true
approved_at: 2026-08-02T00:00:00Z
approved_by: sandrinio
area: cli/init,security/gitignore
context_source: |
  Found 2026-08-02 while verifying the cleargate@0.21.0 publish from a packed
  install rather than from the source tree. `cleargate init` in a clean repo
  produced no root `.gitignore` at all. The payload carries one
  (`cleargate-planning/.gitignore`), CR-072 expanded it in SPRINT-30 and closed
  Completed on the strength of that file being correct — but npm-packlist
  strips any file named `.gitignore` from a tarball unconditionally, so the
  file has never existed in a published artifact. CR-090 already documented
  the strip (`cleargate-cli/src/commands/init.ts:424-426`, and the 2026-07-28
  flashcard) and worked around it for `.cleargate/`-internal paths only,
  deliberately declining to inject the payload's generic patterns into a
  user's root ignore. Nothing was left owning the root file, and CR-072 was
  authored afterwards against the stripped file without that being noticed.

  Verified direct approval: owner requested this bug be drafted and fixed in
  the same instruction (2026-08-02), after being shown the packed-install
  evidence.
created_at: 2026-08-02T00:00:00Z
updated_at: 2026-08-02T00:00:00Z
created_at_version: cleargate@0.21.0
updated_at_version: cleargate@0.22.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-08-01T22:50:46Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-040
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-08-01T22:50:46Z
  sessions: []
---

# BUG-040: `cleargate init` writes no root `.gitignore`, so ClearGate's own worktrees and the project's secrets are left untracked

### Open Questions

- **Question:** Should `init` seed generic project patterns (`node_modules/`, `.env`) into the root ignore, or restrict itself strictly to ClearGate-owned paths (`.worktrees/`)?
- **Recommended:** Both, but in two separately-governed regions. ClearGate-owned paths go in a bounded, always-rewritten block (ClearGate owns them forever). The generic starter patterns are written **once, only when no root `.gitignore` exists at all**, outside the block, and are the user's property thereafter — `init` never re-adds or reconciles them. This satisfies CR-090's objection, which was specifically about *injecting* generic patterns into a file the user already maintains.
- **Human decision:** Approved 2026-08-02 — draft and fix in one pass.

- **Question:** Should the seed carry the payload's unanchored build-output patterns (`dist/`, `build/`, `.venv/`)?
- **Recommended:** No. These are exactly the patterns CR-090 warned would "silently start ignoring a user's own committed build output". A planning framework has no basis for deciding whether a given repo commits `dist/`. Seed only the near-universal, low-controversy set.
- **Human decision:** Approved 2026-08-02 — proceed as recommended.

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** After `cleargate init` in a repository, ClearGate's own root-level runtime artifacts — chiefly `.worktrees/`, where the five-agent loop creates per-story git worktrees — are ignored by git. On a repository that has no ignore rules at all, `init` additionally leaves behind a usable starter `.gitignore` so that a routine `git add -A` does not commit dependencies or credentials.

**Actual Behavior:** `cleargate init` creates no root `.gitignore` under any circumstance. It creates only `.cleargate/.gitignore`, whose patterns are relative to `.cleargate/` and therefore cannot cover `.worktrees/` or anything else at the repository root.

Two distinct consequences, both confirmed against a packed install of `cleargate@0.21.0`:

1. **ClearGate's own artifact is untracked.** `.worktrees/` appears as `?? .worktrees/` in `git status` for the entire duration of every sprint. On `git add -A`, git stages `.worktrees/STORY-NNN-NN` as an **embedded git repository** (a gitlink), emitting the `advice.addEmbeddedRepo` hint. Committing that writes a gitlink to a directory that sprint teardown then deletes.

2. **The project's own dependencies and secrets are unignored.** In a repo with no pre-existing ignore rules, `node_modules/` and `.env` are untracked-and-visible after init. The payload's `.gitignore` covers both; it reaches nobody.

The second consequence is the one observed in the wild. `/Users/ssuladze/Documents/Dev/cg-dogfood-demo/.gitignore` is a single hand-written line — `node_modules/` — added after the fact because init supplied nothing.

## 2. Reproduction Protocol

1. Install the published package into an empty directory: `npm install cleargate@0.21.0`.
2. Create a fresh repository beside it and enter it: `git init target && cd target`.
3. Run `../node_modules/.bin/cleargate init` and let it complete.
4. Observe that no root `.gitignore` exists: `ls -la .gitignore` reports "No such file or directory", while `.cleargate/.gitignore` does exist.
5. Confirm the file is absent from the artifact, not merely skipped: `find ../node_modules/cleargate -iname '*gitignore*'` returns zero results.
6. For consequence 1, in any repo with at least one commit run `git worktree add .worktrees/STORY-001-01 -b story/001-01`, then `git status --short` → `?? .worktrees/`, and `git add -A` → stages `.worktrees/STORY-001-01` with the embedded-repository hint.

Edge conditions that must keep working after the fix: a repo that **already has** a root `.gitignore` (its content must survive byte-for-byte outside the ClearGate block); a **re-init** over a repo already carrying the block (block rewritten in place, not duplicated); and a user who **edits** the seeded generic patterns (never reverted, because they live outside the block).

## 3. Evidence & Context

Packed-install verification, `cleargate@0.21.0`:

```
── binary version:
0.21.0
── .gitignore-ish files in the PUBLISHED package:
(no output — zero matches)
── target root contents after `cleargate init`:
.claude  .cleargate  .git  .mcp.json  CLAUDE.md
── any .gitignore anywhere in target:
  ./.cleargate/.gitignore
```

The stripping is already documented in the source, in the comment that introduced the `.cleargate/`-scoped workaround — `cleargate-cli/src/commands/init.ts:424-426`:

```
// The payload carries a root `.gitignore` with these rules, but npm-packlist
// strips any file named `.gitignore` from a published tarball unconditionally
// — so it has NEVER reached an npm-installed repo, in any released version.
```

`.gitignore` is listed in `FIRST_INSTALL_ONLY` (`cleargate-cli/src/init/copy-payload.ts:79-83`), not in `SKIP_FILES` — so the copier would happily seed it. It cannot seed a file that npm removed from the tarball.

Worktree behaviour, reproduced directly:

```
── git status --short:
?? .worktrees/
── git add -A then staged files:
hint: See "git help submodule" for more information.
hint: Disable this message with "git config set advice.addEmbeddedRepo false"
.worktrees/STORY-001-01
```

Observed end state in the dogfood repo — the whole file:

```
node_modules/
```

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `cleargate-cli/src/commands/init.ts` — add root-`.gitignore` management beside the existing Step 5c that writes `.cleargate/.gitignore` (CR-090). Same generate-don't-ship strategy.
- `cleargate-cli/templates/cleargate-planning/.gitignore` and `cleargate-planning/.gitignore` — annotate as non-shipping so no future change is authored against them on the same false premise that produced CR-072.

**Do not modify:** `src/init/copy-payload.ts` skip sets (the payload path is unusable for this filename by construction, so re-plumbing it is wasted work); the CR-090 `.cleargate/.gitignore` body (it is correct and must not be duplicated into the root block).

Blast radius is confined to `init`. No other command reads or writes a root `.gitignore`. The risk to guard is the inverse of the bug: clobbering ignore rules a user already depends on. The bounded-block contract already used for `CLAUDE.md` injection is the mitigation.

## 5. Verification Protocol (The Failing Test)

**Command:** `npm --prefix cleargate-cli test -- test/commands/init-root-gitignore.node.test.ts`

The test must assert, against a temp repo:
- no pre-existing `.gitignore` → file created, contains the ClearGate block with `.worktrees/`, and contains `node_modules/` and `.env`;
- pre-existing `.gitignore` with user content → user content preserved byte-for-byte, block appended;
- second `init` → block rewritten in place, not duplicated (exactly one start marker);
- user edits inside the seeded generic region, then re-init → edits survive (the block is the only managed region);
- the seed does **not** contain `dist/`, `build/`, or `.venv/`.

Plus the existing full suite green: `npm --prefix cleargate-cli test`.

---

## Prior work

> Duplicate-check evidence, enforced by the `prior-work-recorded` readiness predicate.

`cleargate wiki query` returned **none found** for root-`.gitignore` delivery. Adjacent items located by direct archive grep, none of which cover this defect:

- [[CR-090]] — established that npm strips `.gitignore` and introduced the generated `.cleargate/.gitignore`. Scoped to `.cleargate/`-internal paths by explicit decision; left the root file unowned.
- [[CR-072]] — expanded the payload's root `.gitignore`. This bug is the reason that work never reached a user.
- [[CR-096]] — payload hygiene for files that ship but should not. This is the mirror case: a file that should ship but cannot.
- [[EPIC-014]] — only archive hit for "root .gitignore"; concerns execution-v2 worktree polish, not delivery.

## Context Source

**context_source:** Verified codebase grounding (packed-install verification of `cleargate@0.21.0`, plus `init.ts:424-426` and `copy-payload.ts:79-83`) + recorded direct approval from the owner on 2026-08-02.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text.*

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
