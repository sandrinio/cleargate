# Improvement Suggestions — SPRINT-19


## Trends

Trends: 8 closed sprints visible — full analysis deferred to CR-027.

## Skill Creation Candidates

<!-- generated-by: suggest_improvements.mjs --skill-candidates -->

### CAND-SPRINT-19-S01: BUG-004 × architect
<!-- hash:1daf2c -->

**Pattern detected:** BUG-004 × architect repeated ≥3× in token-ledger
**Proposed skill:** `.claude/skills/<slug>/SKILL.md`

---

## FLASHCARD Cleanup Candidates

<!-- generated-by: suggest_improvements.mjs --flashcard-cleanup -->

### CAND-SPRINT-19-F01: Dev agent's `git commit` landed on `main` instead of `story/
<!-- hash:8c121a -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-02 · #worktree #git #commit · Dev agent's `git commit` landed on `main` instead of `story/<id>` branch — verify post-dispatch with `git log story/<id>` not just commit-success-claim.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F02: cleargate-cli/templates/cleargate-planning/ is DERIVED — cop
<!-- hash:c25e90 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-01 · #scaffold #mirror #prebuild · cleargate-cli/templates/cleargate-planning/ is DERIVED — copy-planning-payload.mjs rmSync+rebuilds it from cleargate-planning/ on every prebuild. Never hand-edit the cli-bundled tree; edit canonical mirror then run npm run prebuild.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F03: CLAUDE.md live↔canonical pre-divergent by 4 canonical-only b
<!-- hash:d42a68 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-01 · #mirror #parity · CLAUDE.md live↔canonical pre-divergent by 4 canonical-only bullets since pre-EPIC-024. Edit-parity invariant applies per-edit, not whole-file — never reconcile pre-existing divergence as a side effect.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F04: `cleargate-planning/MANIFEST.json` SHAs change after every p
<!-- hash:0f1e04 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-01 · #manifest #prebuild · `cleargate-planning/MANIFEST.json` SHAs change after every protocol/template edit; regenerate via `npm run build` (or doctor's auto-regen path) in the SAME commit or doctor flags drift on next session.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F05: DoD §4.2 specifies `feat(<epic>):` but Developers default to
<!-- hash:9d6184 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-01 · #commit-format #dod · DoD §4.2 specifies `feat(<epic>):` but Developers default to `feat(<sprint>):`. Three deviations observed in SPRINT-17. Codify the discrepancy in protocol or enforce in pre-commit lint.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F06: Sprint frontmatter `start_date` is the *planned* date — for 
<!-- hash:c070f1 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-05-01 · #closeout #script #fallback · Sprint frontmatter `start_date` is the *planned* date — for closed sprints whose commits pre-date the planned start, use Strategy 3 `git log --grep "<sprint-id>"` as the reliable fallback in changed-file discovery.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F07: `protocol-section-N.test.ts` files reference numeric §-IDs t
<!-- hash:efb34c -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-05-01 · #test #protocol-section #stale · `protocol-section-N.test.ts` files reference numeric §-IDs that go stale when EPIC-024-style slimming moves sections to enforcement.md. Update or archive these tests in the same wave that moves the §.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F08: import.meta.url in vitest source-mode resolves to src/comman
<!-- hash:17b1b6 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-30 · #cli #vitest #import-meta · import.meta.url in vitest source-mode resolves to src/commands/*.ts not dist/; try ../package.json AND ../../package.json candidates for worktree-safe version reads.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F09: CLEARGATE_NO_UPDATE_CHECK=1 suppresses all checkLatestVersio
<!-- hash:afbb1f -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-30 · #cli #registry-check #env · CLEARGATE_NO_UPDATE_CHECK=1 suppresses all checkLatestVersion network + cache paths; hard contract once 016-01 ships.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F10: Story bodies authored at SPRINT-N draft time freeze the pack
<!-- hash:67e7b6 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-30 · #cli #stories #version-drift · Story bodies authored at SPRINT-N draft time freeze the package.json version literal (e.g. STORY-016-* says `cleargate@0.8.2` but live is 0.9.0 by SPRINT-16 activation). Always read live version from package.json — story-body literals are illustrative.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F11: cleargate-cli/CHANGELOG.md exists pre-EPIC-016 in non-Common
<!-- hash:02c34b -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-30 · #cli #changelog #format · cleargate-cli/CHANGELOG.md exists pre-EPIC-016 in non-Common-Changelog form (## 0.9.0 (date)). STORY-016-03 reformats to ## [0.9.0] — date AND backfills priors; format-test regex /^## \[(\d+\.\d+\.\d+)\] — \d{4}-\d{2}-\d{2}/m fails the existing file as-is.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F12: cleargate-cli/src/commands/sync.ts already exists (718 LOC, 
<!-- hash:0fcb8f -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-30 · #cli #commander #naming-collision · cleargate-cli/src/commands/sync.ts already exists (718 LOC, STORY-010-04 pull/merge/push driver) and cleargate sync is registered. New work-item sync command MUST be a subcommand or scoped flag — never a same-file rewrite. Architect must grep commands/ before approving any story that names a new command file.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F13: token-ledger.sh role-grep loop is hard-coded at line 172; ne
<!-- hash:076cff -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-30 · #wiki #ledger #role-attribution · token-ledger.sh role-grep loop is hard-coded at line 172; new subagent roles (e.g. cleargate-wiki-contradict) must be added there or tokens land as "unknown".`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F14: assert_story_files.mjs covers all six id shapes (STORY/CR/BU
<!-- hash:949850 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-27 · #sprint-init #regex #v2-gate · assert_story_files.mjs covers all six id shapes (STORY/CR/BUG/EPIC/PROPOSAL/PROP/HOTFIX); v2 hard-blocks on missing|unapproved|stub-empty; v1 warns-only.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F15: update_state.mjs has no module guard — `import { fn } from '
<!-- hash:6a8af4 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-27 · #mjs #module-guard #import · update_state.mjs has no module guard — `import { fn } from './update_state.mjs'` triggers its main() at import time; inline the fn instead of importing.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F16: In bash hook, `DOCTOR_EXIT=$?` after `$(cmd || true)` always
<!-- hash:5af18e -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-26 · #hooks #bash #exit-capture · In bash hook, `DOCTOR_EXIT=$?` after `$(cmd || true)` always returns 0 — use a tmpfile: `cmd > tmpfile; EXIT=$?; OUT=$(cat tmpfile); rm tmpfile` to capture both output and exit code independently.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F17: readline.createInterface buffers ahead — when two readline i
<!-- hash:2c1efc -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-25 · #cli #readline #vitest · readline.createInterface buffers ahead — when two readline interfaces read sequentially from the same Readable, the first consumes more data than the first line; use PassThrough with lazy writes (setTimeout 5ms on resume) or a shared single interface for multi-prompt flows.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F18: startDeviceFlow bump logic: shouldApplyBump=(sleepFn provide
<!-- hash:6d2e18 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-25 · #cli #identity-flow #startDeviceFlow · startDeviceFlow bump logic: shouldApplyBump=(sleepFn provided)OR(intervalOverrideMs undefined); passing sleepFn from outer handler when caller omits it activates bumping — only forward sleepFn if caller explicitly set it (use spread conditional).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F19: Device-flow terminal payload is access_token, NOT authorizat
<!-- hash:3b4838 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-25 · #github-oauth #device-flow #identity-provider · Device-flow terminal payload is access_token, NOT authorization-code; re-exchanging via grant_type=authorization_code at /login/oauth/access_token returns error. Member-side providers must skip the re-exchange when proof originates from device-flow.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F20: TS6133 fires when Config is in constructor destructure but n
<!-- hash:27f371 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-25 · #typescript #config #unused-field · TS6133 fires when Config is in constructor destructure but not stored on instance; make the param optional (`config?: Config`) or remove it if the class truly doesn't need it — keep it in the interface signature for server.ts callsites.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F21: IdentityProvider interface (mcp/src/auth/identity/provider.t
<!-- hash:e330de -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-25 · #identity-provider #oauth-device-flow · IdentityProvider interface (mcp/src/auth/identity/provider.ts) returns binary {success | throw} — there is no `pending` result type. GitHub device-flow `authorization_pending` MUST be modeled as a thrown error and the route maps to 502; CLI loops on 502 to keep polling. If you want true pending semantics you must widen the interface — that's an M1-substrate diff, not an M2 provider change.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F22: `identity_proofs.challenge_payload` jsonb is provider-privat
<!-- hash:6cc59b -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-25 · #identity-provider #plaintext-redact · `identity_proofs.challenge_payload` jsonb is provider-private (per provider.ts:7-8 doc); storing the GitHub device_code OR Resend OTP plaintext in payload is allowed and necessary. The plaintext-redact rule covers logs, clientHints, and route response bodies — NOT the jsonb payload column. Don't double-hash device_code thinking the column is logged.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F23: mcp/.env.example documents env vars (e.g. CLEARGATE_RESEND_*
<!-- hash:98add2 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-25 · #config #env-schema #drift · mcp/.env.example documents env vars (e.g. CLEARGATE_RESEND_*) but mcp/src/config.ts envSchema is the actual contract — vars not in the Zod schema are silently dropped by loadConfig(). Always grep both files when adding a new env var; the .env.example alone is dead documentation.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F24: drizzle-kit db:generate emits DDL only (no TRUNCATE/DELETE);
<!-- hash:3b88fc -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-25 · #schema #migrations #drizzle-kit · drizzle-kit db:generate emits DDL only (no TRUNCATE/DELETE); hand-prepend DML after generate — regen clobbers hand edits.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F25: wikiBuildHandler returns on success (no exit(0) call); wikiL
<!-- hash:85f301 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-24 · #wiki-build #async-exit-pattern · wikiBuildHandler returns on success (no exit(0) call); wikiLintHandler explicitly calls exit(0) on success — default wrappers in sprintArchiveHandler must use try/catch on a fakeExit-throw pattern, not Promise resolve/reject.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F26: sprint/epic/proposal discrimination is via filename prefix t
<!-- hash:6a5501 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-24 · #wiki #bucket-inference · sprint/epic/proposal discrimination is via filename prefix through deriveBucket() (scan.ts:60), NOT frontmatter keys; existing fixture helpers use `story_id` even for sprint/epic files (test/wiki/_fixture.ts:55-100) — classify via `item.bucket`.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F27: close_sprint/suggest_improvements/prefill_report resolve spr
<!-- hash:bb43b2 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-21 · #test-harness #scripts #env · close_sprint/suggest_improvements/prefill_report resolve sprint dir from REPO_ROOT by default; add CLEARGATE_SPRINT_DIR env override for test isolation.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F28: macOS ships bash 3.2 as `/usr/bin/env bash`; `mapfile`/`read
<!-- hash:a5b07c -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-21 · #bash #macos #portability · macOS ships bash 3.2 as `/usr/bin/env bash`; `mapfile`/`readarray` are bash 4+ only. Under `set -u` the unbound array trips. Use portable `arr=(); while IFS= read -r x; do arr+=("$x"); done < <(cmd)` instead.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F29: V-Bounce port: state.json lives at `.cleargate/sprint-runs/<
<!-- hash:020cd9 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-21 · #recipe #worktree #state-schema · V-Bounce port: state.json lives at `.cleargate/sprint-runs/<id>/state.json` (NOT `.vbounce/state.json`); init default state is "Ready to Bounce" (not "Draft"); auto-escalate on qa_bounces/arch_bounces==3 (V-Bounce does NOT — we diverge).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F30: Svelte 5 `$state`/`$derived`/`$effect` don't work in plain `
<!-- hash:6ab1c8 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-20 · #svelte5 #runes #production-build · Svelte 5 `$state`/`$derived`/`$effect` don't work in plain `.ts` files — only `.svelte`/`.svelte.ts`/`.svelte.js`. Dev server (Vite preprocessor) silently works; adapter-node production build crashes with `ReferenceError: $state is not defined`. Unit tests that mock the store hide it. Always build the prod image + smoke `/` before shipping.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F31: SvelteKit endpoints forbid non-HTTP-method named exports; ex
<!-- hash:14cd1e -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-19 · #vitest #vi-mock #sveltekit-endpoint · SvelteKit endpoints forbid non-HTTP-method named exports; extract test-seam functions to $lib/server/*.ts and mock ioredis with vi.hoisted() + vi.mock() pattern.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F32: status-of([[ID]]) requires a literal ID — cannot dynamically
<!-- hash:549fdc -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-19 · #gates #predicate · status-of([[ID]]) requires a literal ID — cannot dynamically ref story's parent_epic_ref; use frontmatter(.).parent_epic_ref != null as a proxy for "parent set" in story gate; 008-02 evaluator must handle this constraint.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F33: parseFrontmatter strips one leading blank line from body; st
<!-- hash:6eebe5 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-19 · #cli #frontmatter #parse · parseFrontmatter strips one leading blank line from body; stamp-frontmatter write path must re-add blank separator between frontmatter block and body to preserve roundtrip bytes.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F34: [R] superseded-by BUG-001-fix · parseFrontmatter must use js
<!-- hash:dc7a29 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #yaml #frontmatter · [R] superseded-by BUG-001-fix · parseFrontmatter must use js-yaml CORE_SCHEMA — hand-rolled parser flattened indented maps to top-level keys and stringified null/bool; roundtrip is now lossless and draft_tokens/cached_gate_result are native nested objects on disk.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F35: checking if .cleargate/ is empty via readdirSync misses subd
<!-- hash:b65e98 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-19 · #uninstall #rmdir #empty-check · checking if .cleargate/ is empty via readdirSync misses subdirs left by file deletion; use removeAll flag + preserved-path membership check instead of dir-content scan.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F36: [R] superseded-by BUG-001-fix · parseFrontmatter stores nest
<!-- hash:5d3cad -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-19 · #wiki #lint #yaml · [R] superseded-by BUG-001-fix · parseFrontmatter stores nested YAML as opaque string when value starts with `{`; lint checks reading cached_gate_result must call yaml.load() on that string — block-YAML form in test fixtures will NOT parse correctly.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F37: init.ts has its own HOOK_ADDITION constant (SPRINT-04 legacy
<!-- hash:5771d2 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-19 · #hooks #init #settings · init.ts has its own HOOK_ADDITION constant (SPRINT-04 legacy); when scaffold settings.json is updated, init.ts must also be updated or tests fail with 2 PostToolUse inner-hooks.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F38: ManifestEntry.overwrite_policy uses 'skip' not 'never'; stor
<!-- hash:4a7b7d -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-19 · #schema #manifest #upgrade · ManifestEntry.overwrite_policy uses 'skip' not 'never'; story/plan prose says "never-policy" but the TS type is 'always'|'merge-3way'|'skip'|'preserve'.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F39: readiness-gates.md fenced yaml blocks are YAML lists (- work
<!-- hash:c45bf0 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-19 · #gates #predicate #yaml · readiness-gates.md fenced yaml blocks are YAML lists (- work_item_type: ...); yaml.load() returns array — unwrap [0] to get the gate object.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F40: token-ledger.sh routes via `ls -td sprint-runs/*/` and tags 
<!-- hash:f25585 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-19 · #reporting #hooks #ledger · token-ledger.sh routes via `ls -td sprint-runs/*/` and tags `story_id` from the FIRST `STORY-NNN-NN` it greps in the orchestrator transcript — SPRINT-04 rows landed in `SPRINT-03/token-ledger.jsonl` tagged `STORY-006-01`. Reporter cannot compute per-agent / per-story cost. Fix before next sprint (sentinel file or per-prompt header).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F41: CLAUDE.md bounded-block regex must be GREEDY (`[\s\S]*` not 
<!-- hash:c5c953 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-19 · #init #inject-claude-md #regex · CLAUDE.md bounded-block regex must be GREEDY (`[\s\S]*` not `[\s\S]*?`): the block body itself references both markers in prose (line 37 says "OUTSIDE this <!-- CLEARGATE:START -->...<!-- CLEARGATE:END --> block"), so non-greedy stops at the inline END before the real one.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F42: open-gates.ts filter `status.includes('🔴')` matches zero it
<!-- hash:5677bc -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-19 · #wiki #synthesis #corpus-shape · open-gates.ts filter `status.includes('🔴')` matches zero items in real corpus (statuses are textual `Draft`/`Ready`/`Active`); always validate synthesis filters against actual delivery/ data, not synthetic fixtures.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F43: WikiPage schema lacks `cites` field (topic-page custom field
<!-- hash:bbed2a -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-19 · #wiki #schema #lint · WikiPage schema lacks `cites` field (topic-page custom field); lint-checks re-parses raw frontmatter via parseFrontmatter to read `cites` — don't add to WikiPage or lint's schema check fires.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F44: For malformed-UUID path params, validate with regex before D
<!-- hash:f85168 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-04-18 · #fastify #postgres #uuid · For malformed-UUID path params, validate with regex before DB call; catching pg error 22P02 from drizzle execute is brittle — the code property may be nested and cause a 500 instead of 404.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F45: drizzle-kit manual SQL files are ignored by `db:migrate`; al
<!-- hash:ba0f24 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-18 · #schema #migrations · drizzle-kit manual SQL files are ignored by `db:migrate`; always run `db:generate` to register migration in meta/_journal.json before applying.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F46: Passing `optionalProp: undefined` in an object literal keeps
<!-- hash:ede56d -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-18 · #cli #commander #optional-key · Passing `optionalProp: undefined` in an object literal keeps the key present (`'key' in obj === true`); conditionally assign to omit the key entirely when wire body must not contain it.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F47: vi.mock() is hoisted to top of file; variables used in facto
<!-- hash:b1fd68 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-18 · #cli #vitest #vi-mock-hoisting · vi.mock() is hoisted to top of file; variables used in factory must be declared via vi.hoisted() or you get "Cannot access before initialization" at runtime.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F48: Plaintext secrets (refresh/invite/api tokens) must never be 
<!-- hash:34a6ff -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-18 · #cli #plaintext-redact · Plaintext secrets (refresh/invite/api tokens) must never be spread into log objects; reach into the response with named field access and write only the bare string to stdout. redactSensitive covers debug paths.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F49: Fastify 5 throws FST_ERR_CTP_EMPTY_JSON_BODY when Content-Ty
<!-- hash:bc8414 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-18 · #fastify #ctp-empty-body · Fastify 5 throws FST_ERR_CTP_EMPTY_JSON_BODY when Content-Type: application/json is set with empty body; HTTP clients must omit the header on no-body requests (DELETE).`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F50: vi.mock('@napi-rs/keyring') replaces module before native bi
<!-- hash:92a0bf -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-18 · #vitest #vi-mock #native-modules · vi.mock('@napi-rs/keyring') replaces module before native binary loads; required for testing native deps on libsecret-less CI.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F51: @napi-rs/keyring Entry.getPassword() returns string | null (
<!-- hash:683f9f -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-18 · #keyring #napi #api-mismatch · @napi-rs/keyring Entry.getPassword() returns string | null (not throws NoEntry); handle both null return AND catch for robustness.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-19-F52: fs.writeFile(path, data, {mode}) only sets mode on creation;
<!-- hash:183c0d -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-04-18 · #keyring #napi #posix-modes · fs.writeFile(path, data, {mode}) only sets mode on creation; call fs.chmod explicitly after every security-sensitive write.`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---
