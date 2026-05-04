---
cr_id: CR-053
parent_ref: EPIC-013
parent_cleargate_id: EPIC-013
sprint_cleargate_id: SPRINT-25
carry_over: false
status: Draft
approved: false
created_at: 2026-05-04T19:00:00Z
updated_at: 2026-05-04T13:30:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
context_source: |
  At every SPRINT-23 + SPRINT-24 close, `cleargate init` (run during
  Gate-4 doc-refresh to cure live `/.claude/` mirror drift) accidentally
  wrote a `MANIFEST.json` to the user-repo root. Intended canonical
  location is `cleargate-planning/MANIFEST.json` (which IS tracked).

  SPRINT-23 close: orchestrator manually `rm`'d the root file.
  SPRINT-24 close: same again, plus added `/MANIFEST.json` to `.gitignore`
  as a stopgap (commit 5fd8b22).

  CR-053 fixes the root cause: the payload-copy logic in
  `cleargate-cli/src/init/copy-payload.ts` doesn't distinguish between
  files that should land at user-repo root vs files that should land
  inside `cleargate-planning/`. The npm payload includes
  `cleargate-planning/MANIFEST.json`; copyPayload walks `payloadDir`
  recursively and copies every file to `targetCwd/<relPath>` —
  but `MANIFEST.json` is at the payload root, not inside the
  `cleargate-planning/` subdir of the payload, so it lands at
  user-repo root.

  Investigation needed: does the npm payload have MANIFEST.json at
  payload-root OR inside `cleargate-planning/`? Either way the fix is
  small (~10 LOC: skip-list addition OR path-rewrite).
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-04T18:58:39Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-053
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-04T18:55:15Z
  sessions: []
---

# CR-053: cleargate init MANIFEST.json Root-Path Bug Fix

## 0.5 Open Questions

- **Question:** Skip-list addition OR path-rewrite?
  - **Recommended:** add to `SKIP_FILES` set if `MANIFEST.json` should NOT land in user repos at all (it's a build artifact of the meta-repo's prebuild). User-repos that consume cleargate via `cleargate init` don't need their own MANIFEST.json — it's a parity manifest for the meta-repo's payload-copy verification, not a runtime artifact.
  - **Human decision:** _populated during Brief review_

- **Question:** Should `.gitignore` `/MANIFEST.json` line be removed after the fix?
  - **Recommended:** YES. The stopgap was added in SPRINT-24 close commit 5fd8b22 with comment "SPRINT-25 candidate: fix init to not write the duplicate at user-repo root". After CR-053 ships, the `.gitignore` entry is dead weight (defends against a bug that no longer exists). Remove it; comment why in the commit message.
  - **Human decision:** _populated during Brief review_

- **Question:** Test scope?
  - **Recommended:** add 1 scenario to existing copy-payload tests (or create new file `cleargate-cli/test/init/copy-payload-manifest.red.node.test.ts`). Scenario: run `copyPayload` against a fixture payload that includes a root-level `MANIFEST.json`; assert the file is NOT created at `targetCwd/MANIFEST.json`.
  - **Human decision:** _populated during Brief review_

- **Question:** Investigation step — verify payload structure first?
  - **Recommended:** YES. First action for Dev: `find cleargate-cli/templates -name "MANIFEST.json"` to confirm payload structure. If MANIFEST is at `cleargate-cli/templates/cleargate-planning/MANIFEST.json` (inside the planning subdir), the bug is elsewhere. If at `cleargate-cli/templates/MANIFEST.json` (at payload root), the SKIP_FILES fix applies.
  - **Human decision:** _populated during Brief review_

- **Question:** Should CR-053 also remove `.cleargate/.install-manifest.json` from FIRST_INSTALL_ONLY?
  - **Recommended:** NO. That's a different file (per-install snapshot, written by init at runtime). Keep the FIRST_INSTALL_ONLY exemption for `.cleargate/scripts/*`, `.gitignore`, `FLASHCARD.md` per hotfix `f6dfe39`.
  - **Human decision:** _populated during Brief review_

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- `cleargate init` writes a root-level `MANIFEST.json` to user repos as a side-effect of payload-copy walking the npm payload root.
- `.gitignore` entry `/MANIFEST.json` (added SPRINT-24 close commit 5fd8b22) defends against this side-effect.

**New Logic (The New Truth):**
- `cleargate init` never writes `MANIFEST.json` to user-repo root. The file is excluded via `SKIP_FILES` (or rerouted) in copy-payload.ts.
- `.gitignore` is reverted to remove the dead-weight line.
- A regression test guards against this bug class going forward.

## 2. Blast Radius & Invalidation

- [ ] **`cleargate-cli/src/init/copy-payload.ts`** — add `MANIFEST.json` to `SKIP_FILES` set (or apply path-rewrite logic). ~5 LOC.
- [ ] **`cleargate-cli/test/init/copy-payload-manifest.red.node.test.ts`** — NEW. 1 scenario: fixture payload with root-level MANIFEST.json; assert not copied.
- [ ] **`/.gitignore`** — remove the `/MANIFEST.json` line (added SPRINT-24 close commit 5fd8b22). Explain in commit message.
- [ ] **No SKILL.md edit** — internal init logic; doesn't surface to agents.
- [ ] **No canonical scaffold change** — copy-payload.ts is `cleargate-cli/src/`, not `cleargate-planning/`.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/init/copy-payload.ts` L49 `SKIP_FILES = new Set<string>(['CLAUDE.md'])` — entry point for the fix.
- **Surface:** `cleargate-cli/src/init/copy-payload.ts` L65-78 `FIRST_INSTALL_ONLY` — different mechanism (no-overwrite for user-owned files); not the right place for MANIFEST.json fix.
- **Surface:** `.gitignore` L48 (current) — root-level `MANIFEST.json` stopgap line to remove.
- **Surface:** `cleargate-cli/scripts/copy-planning-payload.mjs` — prebuild script that creates the payload; verify it doesn't put `cleargate-planning/MANIFEST.json` at payload root.
- **Why this CR extends rather than rebuilds:** `cleargate-cli/src/init/copy-payload.ts` has well-tested logic; CR-053 adds 1 entry to an existing skip-list. Minimal blast radius.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/src/init/copy-payload.ts` — SKIP_FILES addition

**Add:**
- `cleargate-cli/test/init/copy-payload-manifest.red.node.test.ts` — 1 regression scenario

**Delete:**
- `/.gitignore` line `/MANIFEST.json` (added SPRINT-24 close)

**Out of scope:**
- Fixing other potential payload-copy issues
- Refactoring SKIP_FILES vs FIRST_INSTALL_ONLY relationship
- npm payload structure changes

## 4. Verification Protocol

**Acceptance:**
1. `cleargate-cli/src/init/copy-payload.ts` SKIP_FILES contains `'MANIFEST.json'` (or equivalent path-rewrite logic in the copy loop).
2. NEW `copy-payload-manifest.red.node.test.ts` passes 1 scenario: fixture with root-level MANIFEST.json → not copied to targetCwd.
3. `/.gitignore` no longer contains `/MANIFEST.json` line.
4. Smoke test: `rm -f /tmp/cg-init-test && mkdir -p /tmp/cg-init-test && cd /tmp/cg-init-test && cleargate init` (or in-repo via doctor) → no `MANIFEST.json` at the test root after init.
5. SPRINT-25's own Gate-4 close runs `cleargate init` for live mirror cure; post-init, no `MANIFEST.json` at user-repo root.
6. `cd cleargate-cli && npm run typecheck && npm test` exits 0.

**Test Commands:**
- `cd cleargate-cli && npm test -- test/init/copy-payload-manifest.red.node.test.ts`
- (manual smoke) Run `cleargate init` in a fresh tmpdir; verify `MANIFEST.json` absent.

**Pre-commit:** `cd cleargate-cli && npm run typecheck && npm test`. Never `--no-verify`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Yellow — Awaiting Brief approval**

- [x] §0.5 Open Questions surfaced (5 questions, all with recommended defaults).
- [x] §3 Execution Sandbox lists files to touch.
- [x] §4 Verification Protocol has testable acceptance.
- [ ] Human approves §0.5 defaults.
- [ ] Lane assigned at SDR (preliminary: standard — small but multi-file: src + test + .gitignore).

---
