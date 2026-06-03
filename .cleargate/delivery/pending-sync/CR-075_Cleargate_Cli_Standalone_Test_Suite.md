---
cr_id: CR-075
parent_ref: EPIC-043
parent_cleargate_id: EPIC-043
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
area: framework/hygiene
context_source: |
  SPRINT-33 EXECUTION-LOG findings (cross-repo test coupling logged during 043-02
  and 043-09: "cleargate-cli's test suite is cross-repo-coupled to the outer
  ../.cleargate/scripts/ — not standalone-runnable from an arbitrary location")
  PLUS concrete new evidence from the 2026-06-02 cleargate@0.14.0 publish run: a
  full `npm test` from the canonical main checkout returned 86/2428 failing — the
  failures categorised as (a) missing PG18/Redis8 infra, (b) monorepo/workspace
  coupling (`npm pack --workspace=cleargate-cli` errors; gate tests exit 127 =
  command not found at a monorepo-relative path), (c) ~4 Node-25 harness quirks
  (`it`/`require is not defined`; env was Node 25 vs target Node 24 LTS). None were
  EPIC-043 code regressions. Owner-directed filing 2026-06-02 ("file the findings
  as work items" — both accepted). Routes to EPIC-043 per the tech-debt-findings
  memory directive.
created_at: 2026-06-02T00:00:00Z
updated_at: 2026-06-03T00:00:00Z
created_at_version: cleargate@0.14.0
updated_at_version: cleargate@0.14.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-06-02T10:12:49Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-075
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-06-03T17:08:06Z
  sessions: []
---

# CR-075: Make the cleargate-cli test suite standalone-runnable (decouple from monorepo workspace + infra assumptions)

## 0.5 Open Questions

- **Question:** How should the suite be decoupled — split into tiers (a default standalone-safe `npm test` + an opt-in `npm run test:integration` for the infra/monorepo-coupled tests), or keep one suite and add skip-when-absent guards that no-op the infra/monorepo cases?
- **Recommended:** Tiered. A default `npm test` that runs green on a bare standalone clone (no monorepo parent, no Docker) is the honest contract for a published package; the infra/monorepo-coupled tests move behind an explicit `test:integration` script. Skip-guards alone hide coverage loss as green.
- **Human decision:** Accepted 2026-06-03 (owner: accept all) — adopt the Recommended tiered split (default `npm test` standalone-green; infra/monorepo tests behind `test:integration`).

- **Question:** The `changelog-format` test shells `npm pack --workspace=cleargate-cli` — replace with an in-package `npm pack` (run from cwd) so it works in the standalone repo?
- **Recommended:** Yes. Post-split there is no `cleargate-cli` workspace; the `--workspace=` form is a monorepo artifact and errors. Plain `npm pack` in the package root is equivalent.
- **Human decision:** Accepted 2026-06-03 (owner: accept all) — replace the `--workspace=` form with in-package `npm pack`.

- **Question:** Node version — the ~4 `it`/`require is not defined` failures only appeared under Node 25 (target is Node 24 LTS). Pin via `.nvmrc`/CI and treat the Node-25 harness drift as a separate sub-task?
- **Recommended:** Add `.nvmrc` = 24 + a CI matrix note; file the Node-25 harness incompatibility as a follow-up rather than blocking this CR on it.
- **Human decision:** Accepted 2026-06-03 (owner: accept all) — pin `.nvmrc`=24 + CI note; Node-25 harness drift filed as a non-blocking follow-up.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- The cleargate-cli test suite is NOT standalone-runnable. It silently assumes it sits at `<monorepo-root>/cleargate-cli/`: tests resolve `REPO_ROOT = path.resolve(__dirname, '..','..')` to reach the OUTER repo, reference `../.cleargate/scripts/*`, shell `npm pack --workspace=cleargate-cli`, and assume a live Postgres 18 + Redis 8. Run from anywhere else (a standalone clone, a `.worktrees/` depth, or with infra down) the suite throws `ERR_MODULE_NOT_FOUND` / exit 127 / connection errors and reads as "hundreds of failures."
- Stop interpreting a red full `npm test` as a release blocker without first classifying infra-vs-coupling-vs-real. The 2026-06-02 run was 86/2428 red with ZERO real code regressions.

**New Logic (The New Truth):**
- A default `npm test` is GREEN from a bare standalone checkout of `sandrinio/cleargate-cli` with no monorepo parent and no Docker running. That is the publishable contract.
- Tests that genuinely need infra or the monorepo move to an explicit, named opt-in tier (`npm run test:integration`) — coverage is preserved and visible, not silently skipped.
- Path resolution and packaging assertions use package-local mechanisms (cwd-relative, in-package `npm pack`), not monorepo-workspace flags.

## 2. Blast Radius & Invalidation

- [ ] Update tests under `cleargate-cli/test/**` that resolve outer-repo paths or shell `--workspace=cleargate-cli`.
- [ ] Update `cleargate-cli/package.json` `scripts.test` (+ add `scripts.test:integration`).
- [ ] Re-baseline the test ratchet — `test-baseline.json` / `knownFailures` must reflect the new standalone tier (the ratchet currently counts failures against the coupled suite). Shares surface with the test-ratchet machinery.
- [ ] **Overlap flag:** the `changelog-format` "Tarball includes CHANGELOG" assertion is also touched by **CR-076** (package-bloat) — coordinate so the two CRs don't both rewrite the same `npm pack` assertion.
- [ ] Database schema impacts? No — no `mcp/`, `admin/`, or DB surface; this is test-harness + package-script config only.

## Existing Surfaces

> L1 reuse audit. Paths verified 2026-06-02 against the cleargate-cli main checkout.

- **Surface:** `cleargate-cli/test/changelog-format.node.test.ts` — the "Tarball includes CHANGELOG" scenario runs `execSync('npm pack --workspace=cleargate-cli --dry-run')`, which errors post-split (no such workspace); the other 3 CHANGELOG scenarios pass standalone.
- **Surface:** `cleargate-cli/test/commands/gate-v2.node.test.ts` — `gate qa/arch — v1/v2 path` assertions exit `127` (command/script not found at the assumed monorepo-relative path) before the gate logic runs.
- **Surface:** the `REPO_ROOT = path.resolve(__dirname, '..','..')` idiom used across `test/**` (e.g. `test/**/readme-qa-doc-truth-043-06.red.node.test.ts:65-71`) — resolves to the OUTER repo, so tests only pass when cleargate-cli is nested in the monorepo.
- **Surface:** `.cleargate/scripts/test_ratchet.mjs` + `test-baseline.json` — the failure-ratchet that must be re-baselined to the standalone tier.
- **Why this CR extends rather than rebuilds:** the test suite already exists and passes per-story under the monorepo layout; this CR makes it location- and infra-independent (tiering + cwd-relative resolution), it does not author new test coverage.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/test/**` (path resolution + `--workspace=` removal + tier tagging)
- `cleargate-cli/package.json` (`scripts.test`, new `scripts.test:integration`)
- `cleargate-cli/.nvmrc` (new — pin Node 24)
- (re-baseline, edit if needed) `test-baseline.json` via `.cleargate/scripts/test_ratchet.mjs`

## 4. Verification Protocol

**Command/Test:**
- From a FRESH standalone clone of `sandrinio/cleargate-cli` (no monorepo parent, Docker stopped, Node 24): `npm ci && npm test` exits 0.
- `npm run test:integration` is the ONLY script that requires PG18/Redis8 and/or the monorepo layout; it is documented as such.
- `grep -rn "workspace=cleargate-cli" cleargate-cli/test` returns nothing.
- Regression: under the monorepo layout, the integration tier still passes (no coverage lost in the split).

---

## Context Source

> Discovery audit. Populated from SPRINT-33 findings, the 2026-06-02 publish-run evidence, and recorded owner direction.

**context_source:** SPRINT-33 EXECUTION-LOG cross-repo-coupling findings (043-02, 043-09) + 2026-06-02 cleargate@0.14.0 publish run (`npm test` 86/2428 red, categorised infra/coupling/Node-25, zero real regressions) + owner-directed filing 2026-06-02. See [[project_framework_sprint_crossrepo_execution]].

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Gate-1 approved (owner accepted all recommendations 2026-06-03)**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity. — *No downstream Epic/Story depends on this leaf hygiene fix; the only cross-item coupling is the shared `npm pack` tarball assertion, flagged in §2 (CR-076). Nothing to revert.*
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter. — *Approved 2026-06-03 (owner: accept all); all three §0.5 decisions recorded.*
- [x] Existing Surfaces cites at least one source-tree path the CR extends.
