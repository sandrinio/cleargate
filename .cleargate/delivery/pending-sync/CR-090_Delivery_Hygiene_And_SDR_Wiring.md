---
cr_id: CR-090
parent_ref: EPIC-009
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Completed
approved: true
area: cleargate-cli
context_source: verified codebase grounding (5-dimension npm delivery audit, 21 findings confirmed / 10 verified safe-to-apply) + recorded direct approval 2026-07-28
created_at: 2026-07-28T00:00:00Z
updated_at: 2026-07-28T00:00:00Z
created_at_version: 0.18.0
updated_at_version: 0.18.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-07-28T11:36:08Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-090
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-07-28T11:36:08Z
  sessions: []
---

# CR-090: npm delivery hygiene + Sprint Design Review wave-plan wiring

## 0.5 Open Questions

- **Question:** The payload `.gitignore` never reaches an npm install because npm strips files of that name. Ship it under a different name, or generate it at init time?
- **Recommended:** Generate it, scoped to `.cleargate/`. Renaming the payload file re-opens the hook-log exposure (the nested `.gitignore` is the only thing keeping 240 KB of logs out of the tarball), and the payload's root ignore carries generic `dist/` / `build/` / `.venv/` patterns that would silently start ignoring a user's own committed build output.
- **Human decision:** Accepted 2026-07-28 — generate `.cleargate/.gitignore`; exclude `hook-log/` explicitly in the copier so nothing depends on the accident.

- **Question:** How far to trim the bundle for this release?
- **Recommended:** Drop the dead CJS twin now (zero source change, −47%); defer the inlined TypeScript compiler (90% of the package) to its own CR, since a naive `external: ['typescript']` hoists the reference to module top level and kills every command at load.
- **Human decision:** Accepted 2026-07-28 — CJS twin now, compiler deferred.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- Forget that shipping a `.gitignore` in the payload protects anything downstream. **npm-packlist strips any file named `.gitignore` unconditionally**, so the scaffold's ignore rules have never reached an npm-installed repo in any released version.
- Forget that the package has a usable root entry point. `main` / `module` / `exports["."]` pointed at a 10.5 MB CJS build that nothing imports; `bin` targets `dist/cli.js` directly and `dist/cli.d.ts` is a 13-byte `export {}`. The advertised root import typed nothing and executed the CLI on require.
- Forget that `npm publish` is safe here without a guard. `dist/` and `templates/` are gitignored, so a clean clone packs to 8 files with no `dist/` and npm exits 0.
- Forget that §A.4 of the sprint-execution skill describes a complete SDR. It never mentioned `waves.json`, `architect-reader`, or `architect-synth` — and §C.0 requires `waves.json` to exist.

**New Logic (The New Truth):**

- `cleargate init` **generates** `.cleargate/.gitignore` covering `.participant.json`, `hook-log/`, the sync/conflict caches, and dashboard snapshots. Scoped to `.cleargate/` so it cannot alter the user's root ignore policy. Not first-install-only — repos upgrading from an earlier version need it too.
- `.cleargate/hook-log` is an explicit `EXCLUDE_DIRS` entry in the payload copier, alongside `.cleargate/sprint-runs` (CR-089). Nothing depends on npm's incidental `.gitignore` handling any more.
- The package publishes no root entry point. `files` negates `dist/cli.cjs`, `dist/cli.d.cts`, and `dist/auth`; `./admin-api` and `./lib/ledger` are unchanged.
- `prepublishOnly` runs test → typecheck → build → `scripts/verify-pack.mjs` (build last, because `npm test` rewrites MANIFEST.json). The verifier asserts the `bin` target and every `exports` subpath are in the tarball, the payload is intact, `dist/MANIFEST.json` matches the version, and no telemetry / hook logs / `.env` / `.npmrc` slipped in.
- §A.4 specifies both SDR paths — single dispatch at N ≤ 2, `architect-reader` fan-out → `architect-synth` above that — names the Orchestrator as dispatch owner (the Architect has no `Task` tool), and ends with a `test -f <sprintDir>/plans/waves.json` post-condition.

## 2. Blast Radius & Invalidation

- [x] Invalidate/Update Story: [[STORY-009-03]] — `cleargate init` gains a scaffold-file write step (`.cleargate/.gitignore`).
- [x] Invalidate/Update Story: [[STORY-033-03]] — the SDR fan-out this CR finally wires into the orchestrator-facing skill.
- [x] Invalidate/Update Story: [[STORY-009-02]] — payload copier exclusions + a new pre-publish verifier alongside the manifest build.
- [x] Database schema impacts? **No.**
- Consumer-visible: anything importing `cleargate` at its root breaks. Verified zero such consumers — `admin/` imports only `cleargate/admin-api` (16 sites), and the root types were an empty `export {}`.
- Behaviour change: `init` now writes one additional file into `.cleargate/`. Idempotent; rewritten only when content differs.
- Not covered (deferred, see §Later): the inlined TypeScript compiler (19.9 MB, 90% of the package), the CJS *build* itself, `pg` in user `node_modules`, and the internal-policy lines in the shipped CLAUDE.md block.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/commands/init.ts:396-419` — Step 5b `.mcp.json` injection; the new Step 5c ignore-file write lands directly after it, reusing the same `writeAtomic` + warn-on-failure idiom.
- **Surface:** `cleargate-cli/src/init/copy-payload.ts:70-79` — `FIRST_INSTALL_ONLY` lists `.gitignore`, which is why a payload-shipped ignore file could never be refreshed on upgrade even if npm did carry it.
- **Surface:** `cleargate-cli/scripts/copy-planning-payload.mjs` — `EXCLUDE_DIRS`, introduced by CR-089 for `sprint-runs`; extended here with `hook-log`.
- **Surface:** `cleargate-cli/package.json` — `files`, `main`, `module`, `exports`, `scripts`; the trim and the metadata additions.
- **Surface:** `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` §A.4 — the SDR section that omitted the fan-out. §C.0 at the same file already asserted `waves.json` as a precondition.
- **Surface:** `cleargate-planning/.claude/agents/architect.md:102` — documents the reader/synth delegation, but inside the *Architect's* own definition, which cannot act on it (`tools: Read, Grep, Glob, Bash, Write` — no `Task`).
- **Why this CR extends rather than rebuilds:** every mechanism already existed — the ignore rules, the copier exclusion list, the agent definitions, the manifest builder. Each defect is a missing wire between two existing pieces, not a missing piece.

## Prior work

- [[CR-089]] — payload telemetry hygiene. Introduced `EXCLUDE_DIRS`; this CR extends the same list and generalises the lesson (working-tree copy ≠ gitignore-aware).
- [[CR-088]] — upgrade pin + prune. Ships in the same release; its orphan-prune is what cleans retired files out of existing installs.
- [[CR-076]] — trim the published package (dropped sourcemaps, de-duplicated payload). Direct predecessor for the bundle-size work.
- [[STORY-033-03]] — SDR fan-out (architect-reader / architect-synth / waves.json). Built the agents; this CR wires the orchestrator to dispatch them.
- [[CR-009]] — hook CLI resolution and the version pin.
- [[BUG-003]] — MANIFEST regenerating dirty; same class of build-artifact-vs-tracked-state confusion.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/src/commands/init.ts`
- `cleargate-cli/scripts/copy-planning-payload.mjs`
- `cleargate-cli/package.json`
- `cleargate-cli/README.md`
- `cleargate-cli/CHANGELOG.md`
- `cleargate-planning/.claude/skills/sprint-execution/SKILL.md`

**Add:**
- `cleargate-cli/scripts/verify-pack.mjs`

## 4. Verification Protocol

**Command/Test:** `npm test` — 2234 pass / 0 fail / 1 skipped. `npm run typecheck` clean.

**Pre-publish guard:** `node scripts/verify-pack.mjs` → `OK — 111 files, payload 82, version 0.18.0`. Negative paths sanity-checked: telemetry, hook-log, `.env`, and a missing `bin` target all trip it.

**Size:** `npm pack --dry-run` → 111 files / 2.0 MB packed / 11.6 MB unpacked (from 125 / 3.79 MB / 22.08 MB).

**End-to-end from a real tarball** (`npm pack`, extract, run the packed binary in a fresh `git init` repo):
- `init` prints `Created .cleargate/.gitignore (protects .participant.json)`;
- `git check-ignore .cleargate/.participant.json` → ignored;
- `git add -A` stages 84 paths, none of them `participant` / `hook-log` / `sync-marker` / `conflicts`;
- `dist/cli.js --version` → `0.18.0`; `import('dist/admin-api/index.js')` resolves; `require('dist/lib/ledger.cjs')` resolves.

Before the fix, the same sequence staged `.cleargate/.participant.json` containing `{"email":"dev@company.com",...}`.

---

## Context Source

**context_source:** verified codebase grounding — 5-dimension npm delivery audit (bundle, installed scaffold, PII/secrets, metadata, release-over-release diff) with adversarial verification of every actionable finding; 21 confirmed, 10 verified safe-to-apply, and the refuted set explicitly excluded (notably: the payload `MANIFEST.json` is NOT a dead duplicate — `init.ts:438` reads it via explicit `packageRoot`). The privacy defect and the tarball trim were both reproduced end-to-end against real `npm pack` tarballs. Direct owner approval recorded 2026-07-28 for scope ("drop the dead CJS twin") and for the SDR wiring fix.

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
