---
cr_id: CR-092
parent_ref: EPIC-009
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Completed
approved: true
area: cleargate-cli
context_source: verified codebase grounding (reproduced the silent ingest no-op; npm delivery audit N2/N3) + recorded direct approval 2026-07-28
created_at: 2026-07-28T00:00:00Z
updated_at: 2026-07-28T00:00:00Z
created_at_version: 0.20.0
updated_at_version: 0.20.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-07-28T14:15:44Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-092
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-07-28T14:15:43Z
  sessions: []
---

# CR-092: resolve the project root by walking up; stop shipping ClearGate's own internals

## 0.5 Open Questions

- **Question:** Should `init` and `uninstall` also walk up to find a project root?
- **Recommended:** No. `init` scaffolds the directory you are standing in; walking up would make it silently adopt a parent project instead of creating a new one. `uninstall` must remove the scaffold you pointed it at.
- **Human decision:** Both excluded; every other command walks up.

- **Question:** Is a bare `.cleargate/` directory sufficient evidence of a project root?
- **Recommended:** No. The hooks create `.cleargate/hook-log/` and `.cleargate/sprint-runs/` wherever they run, so a directory can accumulate a `.cleargate/` it never earned — observed in this repo at `cleargate-cli/.cleargate/`, which held exactly those two and made the resolver stop short of the real root. Require `config.yml` or `delivery/`.
- **Human decision:** Marker-gated.

- **Question:** Move `pg` out of runtime dependencies?
- **Recommended:** No — reversed after investigation. tsup already marks `dependencies` external, so `pg` was never in the bundle (that is precisely why `typescript`, a devDependency, *was*). It costs install footprint only, and `admin bootstrap-root` is a documented, non-hidden command that needs it. Removing it would break a shipped feature to save 443 KB of `node_modules`.
- **Human decision:** Kept, recorded as a known issue.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- Forget that `process.cwd()` is the project root. It is the project root only when the user happens to stand at the top of the repo. Claude Code's Bash tool carries its cwd across calls, so an agent that `cd`s once poisons every later command.
- Forget that a `.cleargate/` directory proves a project. The hooks scatter `hook-log/` and `sprint-runs/` into whatever directory they run in.
- Forget that the shipped `CLAUDE.md` block is generic guidance. It carried ClearGate's own engineering policy — naming `mcp/`, `cleargate-cli/`, `admin/` and forbidding vitest — into every user's repo, six lines after promising not to touch their test runner.
- Forget that the payload is scaffold-only. It shipped ~120 KB of ClearGate's CR-named regression tests for its own scripts.

**New Logic (The New Truth):**

- `resolveProjectRoot(startDir)` walks up for a `.cleargate/` containing `config.yml` or `delivery/`, returning `startDir` unchanged when none is found. Applied at 29 call sites across 18 command modules; `init` and `uninstall` excluded by design.
- The `CLAUDE.md` bounded block states only the boundary rule that applies to a user: adapters and PM-tool credentials live server-side on the MCP server. The test-runner paragraph is gone.
- `.cleargate/scripts/test/**` is excluded from the payload copy **and** from `MANIFEST.json`. Those two must move together: the manifest is generated from canonical *before* the copy runs, so excluding only the copy would make `upgrade` report 9 missing files to every user on every run.

## 2. Blast Radius & Invalidation

- [x] Invalidate/Update Story: [[STORY-009-03]] — `init` is now explicitly the one command that does NOT resolve upward; that exemption is load-bearing and must not be "tidied away".
- [x] Invalidate/Update Story: [[STORY-009-02]] — manifest generation gains an exclusion; entry count 76 → 67.
- [x] Database schema impacts? **No.**
- Behaviour change: a command run from a subdirectory now acts on the parent project instead of failing or no-opping. This is the fix, but it is a behaviour change for anyone who relied on the old cwd-literal semantics.
- Test fallout, fixed here: `test/cli.node.test.ts` asserted "no scripts installed in this repo" by inheriting the test process's cwd (`cleargate-cli/`). That stopped being true once commands walk up — `cleargate-cli` is nested inside the real ClearGate meta-repo, so the walk finds the parent project and its scripts DO exist. Those three tests now run in an isolated temp dir instead of depending on the ambient layout.
- Existing installs keep the retired test scripts until their next `cleargate upgrade`, where the CR-088 orphan prune removes them.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/commands/wiki-ingest.ts` — computed `path.join(cwd, '.cleargate', 'delivery')` and rejected anything outside it, then `exit(2)`. The observed silent failure.
- **Surface:** `cleargate-cli/src/commands/gate.ts` — four handlers, each deriving cwd independently via `cli?.cwd ?? process.cwd()`; the readiness-gates path resolved from it.
- **Surface:** `cleargate-cli/src/commands/init.ts` and `cleargate-cli/src/commands/uninstall.ts` — the two deliberately left on literal `process.cwd()`.
- **Surface:** `cleargate-planning/CLAUDE.md` — the bounded block shipped to every user; the PM-tool and test-runner paragraphs.
- **Surface:** `cleargate-cli/scripts/build-manifest.ts` — `TIER_RULES`, which already excluded `sprint-runs/`, `wiki/`, and `hook-log/`; extended with `scripts/test/`.
- **Surface:** `cleargate-cli/scripts/copy-planning-payload.mjs` — `EXCLUDE_DIRS` from CR-089/CR-090; extended to match.
- **Surface:** `cleargate-cli/test/scripts/ci-no-pm-sdk.integration.node.test.ts` — Scenario 8 pins the bounded block's content and cross-copy identity; the rewrite was shaped to satisfy it rather than around it.
- **Why this CR extends rather than rebuilds:** the exclusion mechanism, the bounded-block surgery, and the per-command cwd seam all already existed. This adds one resolver and two exclusion entries.

## Prior work

- [[CR-090]] — delivery hygiene; established `EXCLUDE_DIRS` and the pack verifier this CR extends.
- [[CR-089]] — payload telemetry hygiene; the first exclusion.
- [[CR-088]] — upgrade prune; what cleans the retired test scripts out of existing installs.
- [[CR-091]] — unbundling; same session, established that `dependencies` are external and devDependencies are not.
- [[EPIC-027]] — the PM-tool boundary whose paragraph is genericized here.
- [[EPIC-028]] — the single-test-runner policy removed from the shipped block (it remains ClearGate's own internal rule).

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/src/commands/*.ts` (18 modules, 29 sites)
- `cleargate-cli/scripts/build-manifest.ts`
- `cleargate-cli/scripts/copy-planning-payload.mjs`
- `cleargate-cli/test/cli.node.test.ts`
- `cleargate-cli/CHANGELOG.md`
- `cleargate-planning/CLAUDE.md` and the mirrored meta-repo root `CLAUDE.md`

**Add:**
- `cleargate-cli/src/lib/project-root.ts`
- `cleargate-cli/test/lib/project-root.node.test.ts`

## 4. Verification Protocol

**Command/Test:** `npm test` — 2244 pass / 0 fail / 1 skipped. `npm run typecheck` clean. `npx tsx --test test/scripts/ci-no-pm-sdk.integration.node.test.ts` — 14/14, confirming the rewritten bounded block still satisfies Scenario 8 (contains the boundary rule, cross-references `cleargate-protocol.md`, ≤200 words at 92, and both copies byte-identical).

**The original failure, retested with the built binary from `cleargate-cli/` (a subdirectory of the real project):**
- before — `wiki ingest <abs path>` → `not under .cleargate/delivery/`, exit 0; `gate check` → `readiness-gates.md not found at cleargate-cli/.cleargate/knowledge/`
- after — `wiki ingest` → `update crs/CR-091.md`; `gate check` → `✅ cr.ready-to-apply passed (8 criteria)`

**Payload:** `verify-pack` OK — 108 files, payload 73, version 0.20.0. Tarball 421.5 kB packed / 1.5 MB unpacked (from 443.4 kB / 117 files). `scripts/test/` absent from the tarball; zero internal-policy hits (`EPIC-027`, `EPIC-028`, `vitest is fully eliminated`, `mcp/, cleargate-cli/, admin/`) in the shipped `CLAUDE.md`.

---

## Context Source

**context_source:** verified codebase grounding — the ingest no-op was reproduced directly (`wiki ingest` with an absolute path from a subdirectory printing "not under .cleargate/delivery/" and exiting 0), and the initial diagnosis was corrected mid-work: the session's own repro was a *nested* stray `.cleargate/` in `cleargate-cli/`, not the generic subdirectory case, which is why the resolver is marker-gated rather than presence-gated. N2/N3 come from the 5-dimension npm delivery audit. Direct owner approval recorded 2026-07-28 ("ship it", for the batched plan).

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Ready for Execution**

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.
