---
epic_id: EPIC-061
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: cleargate-cli,framework/hygiene,distribution
status: Completed
approved: true
ambiguity: 🟢 Low
context_source: |
  Direct user direction 2026-11-07, following a README accuracy pass and a survey of the
  cleargate-cli repo. User: "i suppose we need to clean this up and order the whole repo in an
  intuitive and correct way". Distribution model added the same day: "all i want to ship is the
  software factory. github should have this all and npm should have only what is being installed
  in user's repo" → Option A (factory repo public as sandrinio/cleargate). Proposal gate waived:
  direct request with sharp intent, grounded in an in-session codebase survey (see §4).
proposal_gate_waiver: true
owner: sandrinio
target_date: null
created_at: 2026-11-07T00:00:00Z
updated_at: 2026-11-07T17:40:25Z
created_at_version: 0.27.0
updated_at_version: dbad31f8-dirty
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-07T17:40:25Z
  transition: ready-for-decomposition
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id EPIC-061
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-07T12:17:44Z
  sessions: []
---

# EPIC-061: cleargate-cli Hygiene, Layout & Public Release

## 0. AI Coding Agent Handoff
*(This section is strictly for downstream AI execution agents. It contains zero business fluff.)*

```xml
<agent_context>
  <objective>Restructure cleargate-cli so its layout follows its domains and its working tree holds only source, and its docs and metadata are accurate. Then ship it the way the owner wants: npm carries only the installer, runtime and one copy of the installed payload, and the factory's source becomes the public GitHub repo sandrinio/cleargate. No command changes behaviour, and no host's installed result changes.</objective>
  <architecture_rules>
    <rule>Zero behaviour change. For every story, typecheck is clean and the full `npm test` adds no failing test beyond the failure list recorded at the epic's base commit (§3 Test ratchet).</rule>
    <rule>Payload identity. S1–S4 keep `templates/cleargate-planning/**` byte-identical to the epic's base commit. S10 removes that flat copy. From S10 on, the identity check is the tree that `init --host claude`, `--host codex` and `--host all` produce in a scratch repo, which must match the pre-S10 baseline.</rule>
    <rule>No moves inside `scaffold/**`. EPIC-058 owns that layout (core + hosts/claude + hosts/codex).</rule>
    <rule>Moves use `git mv` so history follows the file. One story = one commit on a `story/<ID>` branch in the cleargate-cli repo (Cross-Cutting Rule 10).</rule>
    <rule>`test/helpers/scaffold-roots.ts` is read by the BUG-085 drift check. Keep its path or update every caller in the same commit.</rule>
    <rule>Meta-repo files that hard-code cleargate-cli paths are updated in the same story that moves the path (list in §4).</rule>
    <rule>Outward-facing steps in S11 (GitHub renames, visibility flip, npm publish) run only on an explicit owner go given at that moment. A story's approval does not cover them.</rule>
    <rule>node:test only (`*.node.test.ts`). No vitest.</rule>
  </architecture_rules>
  <target_files>
    <file path="cleargate-cli/.gitignore" action="modify" />
    <file path="cleargate-cli/.cleargate/sprint-runs/_off-sprint/.script-incidents/**" action="delete (untrack)" />
    <file path="cleargate-cli/scripts/**" action="modify (regroup + delete one-shots)" />
    <file path="cleargate-cli/templates/synthesis/**" action="move into src/wiki" />
    <file path="cleargate-cli/src/lib/**" action="move (domain split)" />
    <file path="cleargate-cli/src/util/gate-mode.ts" action="move" />
    <file path="cleargate-cli/src/init/**" action="move (into install domain)" />
    <file path="cleargate-cli/src/commands/**" action="modify (group into subfolders)" />
    <file path="cleargate-cli/src/commands/fixtures/**" action="move to test/fixtures" />
    <file path="cleargate-cli/test/**" action="modify (mirror src)" />
    <file path="cleargate-cli/src/commands/bootstrap-root.ts" action="move to mcp repo" />
    <file path="cleargate-cli/src/commands/init.ts" action="modify (read split-view payload)" />
    <file path="cleargate-cli/src/lib/install-view.ts" action="modify (single payload root)" />
    <file path="cleargate-cli/scripts/copy-planning-payload.mjs" action="modify (stop composing flat payload)" />
    <file path="cleargate-cli/package.json" action="modify (files, description, keywords, pg, script paths)" />
    <file path="cleargate-cli/README.md" action="modify (becomes the factory README)" />
    <file path="cleargate-cli/CONTRIBUTING.md" action="create" />
    <file path="cleargate-cli/SECURITY.md" action="create" />
    <file path="cleargate-cli/.github/workflows/ci.yml" action="create" />
    <file path="README.md" action="modify (meta-repo: becomes the factory-floor README)" />
    <file path="cleargate-planning/**" action="delete (meta-repo frozen snapshot)" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
cleargate-cli has 612 commits across 41 sprints and has never had a layout pass:
- A 49-entry `src/lib/` grab-bag spans six domains, and wiki code is split across four places.
- `scripts/` mixes build, guard and finished one-shot scripts. `templates/` mixes tracked source with two build outputs.
- Stray artifacts sit in the tree, and 53 test-run incident files are committed.
- There is no CI, and the README lists commands that don't exist.

It also isn't shipped the way the owner wants. The only public GitHub repo, `sandrinio/cleargate`, holds the factory's planning record but not its source. The source is in the private `cleargate-cli`. npm ships the installed payload twice, as `templates/scaffold/` (1.3 MB) and `templates/cleargate-planning/` (1.1 MB), and pulls in `pg` for one operator command.

**Success Metrics (North Star):**
- A standalone clone of cleargate-cli (no meta-repo around it) passes `npm test` with zero failures, and the run writes nothing outside the cli checkout.
- `git status --porcelain` is empty after `npm run build && npm test` on a clean checkout. No generated or runtime file shows up.
- `src/lib/` and `src/util/` no longer exist. Every `src/` file lives in a named domain or feature folder.
- Every unit test lives at the `test/` path that mirrors its subject's `src/` path.
- Every command registered in `src/cli.ts` (minus hidden ones) appears in `README.md`, enforced by a test.
- The npm tarball contains exactly one copy of the installed payload and no `pg` dependency. `init` installs the same tree for every host as before.
- No file reads the meta-repo's frozen `cleargate-planning/` snapshot, and the snapshot is deleted.
- `github.com/sandrinio/cleargate` is public and serves the factory's source, and gitleaks is clean at the flip commit. The planning record stays public as `sandrinio/cleargate-factory-floor`.

## 2. Scope Boundaries

Order of execution: S12 → S1 + S7 → S5 → S2 → S3 → S4 → S6 → S10 → S8 → S9 → S11. S12 was added on 2026-11-07, after approval; see §3 Suite portability. S1 is below story size, so it ships in one story with S7: CI's `npm ci` needs the lockfile S1 tracks.

**✅ IN-SCOPE (Build This)**
- [x] **S12 Self-contained test suite.** *(Done 2026-11-07: [[STORY-061-01]] + [[STORY-061-02]], cli merge `02c1d8b`.)* Make `npm test` pass in a standalone clone and stop it writing outside the cli checkout. This is a prerequisite for S7, because CI runs in a standalone clone, and for S11, because a public repo's suite must pass for anyone who clones it.
  - Repoint canonical reads to `scaffold/` through `test/helpers/scaffold-roots.ts` `canonicalPath()`. These are the meta-repo's live `.cleargate/{scripts,templates,knowledge}`, `.claude/**` and `CLAUDE.md` copies, which the [[BUG-085]] drift check keeps byte-identical to `scaffold/`.
  - Tests whose subject *is* the meta-repo, the "live-side" reads STORY-058-02 left in place (live == canonical, the meta-repo's `CLAUDE.md`/`README.md`, the mcp OpenAPI snapshot), skip with a stated reason when the meta-repo or the `mcp/` sibling is absent.
  - `test/commands/push-hierarchy.node.test.ts:476` runs the real `backfill_hierarchy.mjs` against the meta-repo's delivery corpus. In a scratch run it rewrote 50 work items, 10 of them with the template placeholder `"EPIC-NNN | STORY-NNN-NN"`. Make it run against a tmpdir fixture.
  - Fold in [[BUG-060]] (tests that hard-code an absolute machine path).
- [x] **S1 Hygiene.** *(Done 2026-11-07: [[STORY-061-03]], cli merge `5cbad8d`.)*
  - `.gitignore`: add `*.tgz`, `/cleargate-cli/` (nested mis-pathed build output), and `.cleargate/` runtime dirs.
  - Untrack the 53 `.cleargate/sprint-runs/_off-sprint/.script-incidents/*` files.
  - Delete the untracked `cleargate-0.25.0.tgz` and the nested `cleargate-cli/cleargate-cli/dist/`.
  - Track `package-lock.json`, which is currently ignored, so CI installs are reproducible.
- [ ] **S2 Scripts & templates.**
  - Regroup `scripts/` into `scripts/build/` (payload compose, codex payload, manifest, changelog diff, verify-pack), `scripts/guards/` (`check-no-*`) and `scripts/test/` (`run-default-tests`, `clean-room/`).
  - Delete the 5 unreferenced one-shot scripts from the vitest migration: `codemod-vitest-to-node-test`, `fix-syntax-errors`, `revert-bad-conversions`, `convert-manual-fix`, and `postprocess-expect` with `postprocess-expect-shim.txt`.
  - Evaluate the 4 scripts referenced only by red tests: `migrate-024-citations`, `migrate-status-to-completed`, `backfill-sprint-reports`, `smoke-push-sprint-artifacts`.
  - Move `templates/synthesis/` next to its only consumers in `src/wiki/synthesis/`, with a build copy step, so `templates/` holds only generated output.
- [ ] **S3 `src/` domain split.**
  - Dissolve `src/lib/`, `src/util/` and `src/init/` into the domain folders in §4.
  - Consolidate wiki code (`src/lib/wiki/`, `src/lib/wiki-config.ts`, `src/lib/wiki-comments-render.ts`) into `src/wiki/`.
  - Group command families into subfolders (`commands/wiki/`, `commands/sync/`, `commands/admin/`).
  - Move `src/commands/fixtures/` to `test/fixtures/`.
  - Mechanical: about 190 importing files, done with a codemod.
- [ ] **S4 `test/` mirror.**
  - Re-home tests so `test/` mirrors the new `src/`.
  - Rename CR-numbered top-level tests (`cr075-standalone-contract`, `cr076-package-trim`) by subject.
- [ ] **S5 Accurate README & metadata.**
  - Make `cleargate-cli/README.md` the factory README. Start from the meta-repo's verified 2026-11-06 README, with banner assets, and fold in the CLI reference (real command list, `--from-source` pointing at `scaffold/`).
  - Update `package.json` description and keywords to the "gated software factory" positioning.
  - Add a test asserting the README command list matches the registered, non-hidden commands.
- [ ] **S6 Move `bootstrap-root` to the mcp repo (Q2).** `src/commands/bootstrap-root.ts` is the CLI's only `pg` importer. It writes the root admin straight into the MCP server's Postgres, so it moves into `mcp/` as an operator script, and `pg` leaves the CLI's dependencies. `admin login` and the `./admin-api` client stay: the member `join` flow (`src/auth/acquire.ts`, `src/auth/identity-flow.ts`) and the admin console import them.
- [x] **S7 CI.** *(Done 2026-11-07: [[STORY-061-03]], cli merge `5cbad8d`. Ubuntu only; add a macOS job after S11.)* Add a GitHub Actions workflow on every PR and push to `main` that runs typecheck, `npm test`, `verify-pack` and a gitleaks scan.
- [ ] **S8 Retire the meta-repo's frozen `cleargate-planning/` snapshot (Q3).** Repoint the current readers to `cleargate-cli/scaffold`, then delete the snapshot. Readers:
  - the `scaffold-lint` default (`src/commands/scaffold-lint.ts:57`);
  - `scripts/migrate-024-citations.mjs`;
  - the three STORY-058-02 guard-allowlisted cli tests;
  - 16 outer shell tests under `.cleargate/scripts/test/`;
  - `.cleargate/scripts/prep_doc_refresh.mjs` and `prep_qa_context.mjs`.
- [ ] **S9 Public-release prep (Q1).**
  - *(The `.gitleaks.toml` allowlist shipped early in [[STORY-061-03]].)* The history scan is already done: gitleaks, 2026-11-07, all 612 commits, 2 findings. Both are fake test fixtures at `test/commands/mcp-serve-service-token.red.node.test.ts:149,459`. Allowlist them in `.gitleaks.toml` so the CI scan is green.
  - Add `CONTRIBUTING.md`: setup, node:test, story-branch convention, how canonical scaffold reaches the payload.
  - Add `SECURITY.md`: how to report a vulnerability.
  - Re-run the scan at HEAD immediately before S11.
- [ ] **S10 One payload on npm (Q1).**
  - Make `init` read the per-host split view `templates/scaffold/` (`src/commands/init.ts:148`), as `upgrade`, `host` and `doctor` already do (`src/lib/install-view.ts:66,81`).
  - Stop composing and shipping `templates/cleargate-planning/`.
  - About 102 files reference the flat path: 18 in src, 76 in tests, 8 in scripts.
  - Done when the tarball loses that copy (88 files, about 1.1 MB unpacked) and the installed trees match the pre-S10 baseline for every host.
- [ ] **S11 Go public: the factory repo becomes `sandrinio/cleargate` (Q1 → Option A).**
  - Replace the meta-repo `README.md` with a short factory-floor README: what this repo is (ClearGate built with itself) and a link to the product.
  - Update `CLAUDE.md`'s repo/deploy table and the git remotes.
  - `package.json` `repository`, `homepage` and `bugs` already point at `github.com/sandrinio/cleargate`. They become correct after step 3 below, so no edit is needed.
  - Owner-gated external steps, in this order:
    1. Rename `sandrinio/cleargate` → `sandrinio/cleargate-factory-floor`.
    2. Flip `sandrinio/cleargate-cli` to public.
    3. Rename `sandrinio/cleargate-cli` → `sandrinio/cleargate`.
    4. Update the local `origin` URLs in both checkouts.
    5. Publish an npm release so the npm page shows the new README.

**❌ OUT-OF-SCOPE (Do NOT Build This)**
- Any change to command behaviour, flags, output or exit codes. S10 changes where `init` reads its payload from, not what it installs.
- Any move inside `scaffold/**` (EPIC-058).
- Fixing the *cause* of the incident files ([[BUG-109]]). This epic only stops them being committed.
- Rewriting git history. The scan found no real secrets.
- Making the MCP server or admin console public. They stay private as the optional team service (default from the 2026-11-07 discussion; the owner can override).
- Changes to `admin/`, and any change to `mcp/` beyond receiving `bootstrap-root` (S6).

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Execution mode | Off-sprint (owner decision 2026-11-07, Q4). No sprint plan, SDR or sprint close. Stories run one at a time, each on its own `story/<ID>` branch in the cli repo's main checkout, and each is QA-verified and merged before the next starts. |
| Merge contention | S3/S4 rewrite imports in about 190 files. Start them only when no other cleargate-cli branch is in flight. |
| Gate protection | [[BUG-053]]: cleargate-cli commits are ungated. Until S7 lands, QA-Verify must run the full suite itself; Dev's run is not enough for S3/S4. |
| Payload identity | S1–S4: `templates/cleargate-planning/**` hashes match the base commit (`scripts/verify-pack.mjs` + hash diff). S10: `init` output trees for claude, codex and all match the pre-S10 baseline in scratch repos. |
| Rename sequencing | GitHub redirects a renamed repo's old URL only until a new repo takes that name. Step 1 (meta → `cleargate-factory-floor`) must finish before step 3 (cli → `cleargate`). After step 3, old `sandrinio/cleargate` links resolve to the factory, which is the intent, and the meta-repo's remote must point at `cleargate-factory-floor`. |
| Outward-facing actions | Renames, the visibility flip and npm publish are hard to reverse and public. Each runs only on an explicit owner go given at that moment. |
| Suite portability | Measured 2026-11-07 at `89f0230` in scratch clones. Standalone: 3,667 tests, 394 fail and 28 cancelled across 64 files, all from reads above the cli root. Nested inside a meta-repo clone: 3,674 tests, 3 fail (the `mcp/` sibling snapshot and a `tsx` binary at the meta-repo root), and the run rewrote 50 meta-repo work items. Typecheck and build are clean in both. `prepublishOnly` runs `npm test`, so today a release only passes from inside the meta-repo. |
| Test ratchet | No ratchet file exists: `test-baseline.json` was deleted in the 2026-05-31 planning-only split. The baseline is the list of failing tests from a full `npm test` in a fresh clone at the epic's base commit (`89f0230`), recorded in STORY-061-01. No story may add a failure to that list. |

## Existing Surfaces

- **Surface:** `cleargate-cli/scripts/copy-planning-payload.mjs:34-36` composes `scaffold/` into the flat `templates/cleargate-planning/` and the split view `templates/scaffold/`. S2 regroups it; S10 drops the flat output.
- **Surface:** `cleargate-cli/src/lib/install-view.ts:66,81` already resolves the split view for `upgrade`, `host` and `doctor`. S10 extends the same path to `init` (`cleargate-cli/src/commands/init.ts:148`).
- **Surface:** `cleargate-cli/scripts/verify-pack.mjs:28` verifies the tarball against the scaffold roots. It is the payload-identity check for S1–S4.
- **Surface:** `cleargate-cli/test/helpers/scaffold-roots.ts` is the canonical scaffold-roots helper used by the [[BUG-085]] drift check.
- **Surface:** `cleargate-cli/src/commands/bootstrap-root.ts` is the sole `pg` importer.
- **Surface:** `cleargate-cli/src/wiki/synthesis/{active-sprint,open-gates,product-state,roadmap}.ts` are the only readers of `templates/synthesis/`.
- **Surface:** `README.md` (meta-repo, rewritten and verified 2026-11-06) is the source for the S5 factory README.
- **Coverage of this epic's scope:** partial. These are the surfaces being reorganised. No existing tooling performs a layout migration, so the S3 codemod is net-new and throwaway.

## Prior work

- [[EPIC-058]]: prerequisite and boundary. It owns the `scaffold/` layout and introduced the split-view payload that S10 makes the only one.
- [[BUG-085]]: prerequisite. Its drift check reads `test/helpers/scaffold-roots.ts`.
- [[CR-099]]: overlap, done. It already untracked the stray live hook. This epic does the same for the cli repo's committed runtime output.
- [[EPIC-043]]: closest precedent. Framework hygiene epic, but it covered docs and plumbing, not the cli directory layout.
- [[BUG-060]]: folded into S12.
- [[CR-075]]: precedent, done. It made default-tier `npm test` pass in a bare clone, with monorepo-dependent tests split into `test:integration`. That contract has regressed to 394 standalone failures (flashcard 2026-09-27). S12 restores it, and S7's CI keeps it from regressing again.
- [[EPIC-056]]: overlap, approved but 🟡 and unscheduled. Its first in-scope item, `ci.yml` for cleargate-cli, is S7. S7 delivers that slice; EPIC-056 keeps the mcp and admin workflows and branch protection. S7 updates EPIC-056 to record this when it merges.
- [[STORY-058-02]]: precedent. It added `test/helpers/scaffold-roots.ts` and repointed the canonical half of the cli tests. It deliberately left the live-side `META_ROOT` reads, which S12 now handles.
- [[BUG-109]] and [[BUG-107]]: cause of the committed incident files and the runtime-output dirt. S1 ignores the output; the cause stays with them.
- [[BUG-053]]: cleargate-cli commits are ungated. S7 partially addresses it.
- [[BUG-091]], [[BUG-092]], [[BUG-093]], [[BUG-095]]: adjacent `init`/`upgrade` bugs. Expect conflicts with S3 and S10.
- [[PROPOSAL-074]]: adds a `scaffold/hosts/*` entry. Unaffected by the layout work. S10's single split-view payload is the shape it would ship in.

## Why not simpler?

- **Smallest existing surface that could carry this epic:** a single hygiene CR covering S1, S5 and S6. That cleans the visible mess but leaves the layout and distribution as they are.
- **Why isn't extension / parameterization / config sufficient?** The owner asked for two structural outcomes: an intuitive layout, and "github has it all, npm has only what's installed". The `src/lib/` grab-bag, the four-way wiki split, the mixed `templates/` and `scripts/`, the duplicate payload and the private source repo can't be fixed by config or an ignore rule. Each one has to move. The order still ships the cheap, high-value stories (S1, S7, S5) first.

## 4. Technical Grounding (The "Shadow Spec")

**Target layout (S2–S4, S10).** Names may be refined when the stories are drafted. Everything else stays in place.

```text
cleargate-cli/                 (→ public as sandrinio/cleargate in S11)
├── src/
│   ├── cli.ts
│   ├── commands/            ← one file per command; families grouped:
│   │   ├── wiki/            ←   build · ingest · query · lint · contradict · audit-status
│   │   ├── sync/            ←   push · pull · sync · sync-log · sync-work-items · conflicts
│   │   └── admin/           ←   admin-login (bootstrap-root leaves in S6)
│   ├── frontmatter/         ← lib/frontmatter-{locator,yaml,merge,cache}, stamp-frontmatter
│   ├── work-items/          ← lib/work-item-{id,type}, readiness-predicates, active-criteria,
│   │                           lifecycle-reconcile, parent-rollup, intake
│   ├── install/             ← src/init/* + lib/manifest*, merge-helper, merge-ui, drift-check,
│   │                           scaffold-*, claude-md-surgery, settings-json-surgery, install-view
│   ├── sync/                ← lib/mcp-client, membership, identity, conflict-detector,
│   │                           comments-cache, sync-log, lib/sync/work-items
│   ├── telemetry/           ← lib/ledger, ledger-reader, pricing, session-load-delta, script-incident
│   ├── shared/              ← lib/project-root, cli-package-root, script-paths, sha256, slug,
│   │                           prompts, editor, banners, changelog, codebase-version, util/gate-mode
│   ├── wiki/                ← + lib/wiki/contradict, wiki-config, wiki-comments-render, synthesis templates
│   ├── hosts/  auth/  admin-api/  dashboard/  hooks/     (unchanged)
├── scaffold/                ← unchanged (EPIC-058)
├── scripts/{build,guards,test}/
├── templates/scaffold/      ← the one generated payload (gitignored, shipped)
├── test/                    ← mirrors src/; fixtures/, helpers/, e2e/, integration/ at top
├── assets/                  ← banner + logos (from the meta-repo, S5)
├── README.md · CONTRIBUTING.md · SECURITY.md · CHANGELOG.md · LICENSE
└── .github/workflows/ci.yml
```

**Affected Files:**
- `cleargate-cli/.gitignore`: missing `*.tgz`, `/cleargate-cli/` and `.cleargate/` runtime rules. It currently ignores `package-lock.json`.
- `cleargate-cli/.cleargate/sprint-runs/_off-sprint/.script-incidents/*`: 53 tracked files, added by STORY-043-04, -05 and -09 qa-red commits (2026-06-01).
- `cleargate-cli/src/lib/*` (49 entries), `src/util/gate-mode.ts`, `src/init/*` (7 files): dissolved into domain folders.
- `cleargate-cli/src/commands/*.ts` (36 files), and `src/commands/fixtures/SPRINT-99-v{1,2}.md` (read by `test/commands/{state-unit,state,story}.node.test.ts`).
- `cleargate-cli/scripts/*` (21 entries) and `cleargate-cli/package.json` `scripts` (the paths change).
- `cleargate-cli/templates/synthesis/*.md` (4 files): source misplaced among build output.
- `cleargate-cli/test/**` (530 files), including the top-level `cr075-standalone-contract.node.test.ts` and `cr076-package-trim.node.test.ts`.
- `cleargate-cli/src/commands/init.ts:148` and `src/lib/install-view.ts:66,81`, plus about 102 files referencing `cleargate-planning` (18 src, 76 test, 8 scripts) for S10.
- `cleargate-cli/src/commands/bootstrap-root.ts` (→ `mcp/`) and `package.json` `dependencies.pg`.
- `cleargate-cli/test/commands/mcp-serve-service-token.red.node.test.ts:149,459`: gitleaks false positives, to be allowlisted.
- `cleargate-cli/README.md`, `package.json` (`description`, `keywords`, `files`).
- Meta-repo: `README.md`, `assets/**`, `CLAUDE.md` (repo/deploy table), and `cleargate-planning/**` (deleted in S8).
- Meta-repo files that hard-code cleargate-cli paths and must move in lockstep:
  - `.cleargate/scripts/prep_qa_context.mjs`
  - `.cleargate/scripts/prep_doc_refresh.mjs`
  - `.cleargate/scripts/lib/work-item-id.mjs`
  - `.cleargate/scripts/test/{test_prep_qa_context,test_pre_gate_lane_aware,test_file_surface}.sh`
  - `.cleargate/scripts/test/cr078_init.test.sh`
  - `.claude/agents/{qa,devops}.md`. These are live copies; their canonical sources are under `scaffold/hosts/claude/`.

**Data Changes:**
- None.

## 5. Acceptance Criteria

```gherkin
Feature: cleargate-cli hygiene, layout & public release

  Scenario: A standalone clone builds, passes and stays clean
    Given a fresh clone of cleargate-cli on main, with no meta-repo around it
    When I run "npm ci && npm run build && npm test"
    Then npm test exits 0
    And "git status --porcelain" prints nothing
    And no file outside the clone is modified

  Scenario: Source lives in domain folders
    Given S3 has merged
    Then src/lib/ and src/util/ do not exist
    And no file under src/ imports from a path containing "/lib/" or "/util/"

  Scenario: npm ships one payload and installs the same thing
    Given installed-tree hashes recorded from "init --host claude", "--host codex" and "--host all" before S10
    When S10 has merged and "npm pack" runs
    Then the tarball contains no templates/cleargate-planning/ directory and no pg dependency
    And init for each host produces trees whose hashes match the recorded baseline

  Scenario: README stays in sync with the CLI
    Given S5 has merged
    When a non-hidden command is registered in src/cli.ts but missing from README.md
    Then the README-sync test fails and names the missing command

  Scenario: CI rejects a broken or leaking change
    Given S7 and S9 have merged
    When a pull request introduces a typecheck error or a string matching a gitleaks rule
    Then the CI workflow fails and the PR shows a failing check
```

## 6. AI Interrogation Loop (Human Input Required)
*(AI Planning Engine: List edge cases, contradictions, or missing details found while drafting. The Epic stays 🔴 until the Human answers all of these.)*

## Decisions log (resolved interrogation, owner 2026-11-07)

- **Q1 Distribution model.** Owner: "all i want to ship is the software factory. github should have this all and npm should have only what is being installed in user's repo." Then chose **Option A**: the factory repo goes public as `sandrinio/cleargate`, and the meta-repo stays public under a new name. Integrated as S9, S10 and S11.
  - Meta-repo name: `cleargate-factory-floor` (owner, 2026-11-07). It replaces the earlier default `cleargate-factory-floor`.
  - MCP server and admin console stay private by default.
  - Correction recorded: the CLI has only two admin commands, `login` and `bootstrap-root`. The `./admin-api` client is used by `join` and the admin console, so it stays on npm.
- **Q2 `pg` dependency:** option (b). Move `bootstrap-root` into the mcp repo. Integrated as S6.
- **Q3 Old snapshot:** yes, retire the frozen `cleargate-planning/` snapshot. Integrated as S8.
- **Q4 Scheduling:** neither sprint option. The whole epic runs off-sprint. Integrated in §3 Execution mode.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Coding Agent):
- [x] `approved: true` is set in the YAML frontmatter.
- [x] The `<agent_context>` block is complete and validated.
- [x] §4 Technical Grounding contains 100% real, verified file paths.
- [x] §6 AI Interrogation Loop is empty (all human answers integrated into the spec).
- [x] 0 "TBDs" exist in the document.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered.
