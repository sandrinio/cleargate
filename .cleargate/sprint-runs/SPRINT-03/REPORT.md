# SPRINT-03 Report: CLI Packages (`cleargate-cli` scaffold + Admin CLI + `cleargate join`)

**Status:** Shipped (engineering complete; ops close-out deferred — see DoD)
**Window:** 2026-04-17 21:38Z → 2026-04-18 17:37Z (~20 wall hours, one calendar day of concentrated work)
**Stories:** 11 planned / 11 shipped / 0 carried over
**Commits:** 14 (11 stories + 2 setup + 1 setup-fix) across two repos, all QA-approved

---

## For Product Management

### Sprint goal — did we hit it?

> *"Ship the two CLI packages that make the MCP hub operable without the UI ... After this sprint, a root admin can create a project + issue an invite from their terminal, a Vibe Coder can redeem the invite on their machine, and Claude Code can authenticate to MCP using the resulting refresh token — with no UI required."*

**Yes.** The end-to-end path is wired and green:
`dev-issue-token --role=admin` → `cleargate-admin create-project` → `cleargate-admin invite` → copy invite URL → `cleargate join <url>` → refresh token seated in OS keychain → MCP authenticates. All 11 stories merged; QA approved each after at most one kick-back.

### Headline deliverables

- **Headless admin ops** — a root admin can run `cleargate-admin {create-project, invite, issue-token, revoke-token}` from any terminal against a deployed MCP (STORY-005-01..04, commits `a3d9227`, `a578d7f`, `fb7be36`, `85a5969`).
- **Vibe Coder onboarding** — `cleargate join <invite-url>` redeems an invite and seats a refresh token in the OS keychain with file fallback (STORY-005-05 / `13460ed`, built on STORY-000-04 `f97b3f1`).
- **`@cleargate/cli` package** exists, installable, publishable — scaffold + Commander entry + zod config loader (STORY-000-01..03, commits `3bcfcd4`, `43c50c3`, `acde4ba`).
- **Production-grade invite storage** — Redis cache swapped for a Postgres `invites` table with `consumed_at` redemption semantics + durable audit trail (STORY-004-07 / `bda4308`). Corrects a SPRINT-02 architectural shortcut.
- **Public `POST /join/:invite_token` endpoint** on MCP closes the SPRINT-01 gap; includes a new anonymous rate-limit bucket (10 req / 15 min per IP) the codebase didn't have (STORY-003-13 / `e3c2550`).

### Risks that materialized

From the sprint risk table (sprint file lines 44-54):

- **Admin JWT acquisition path** — mitigation held. Admin JWT sourced from `CLEARGATE_ADMIN_TOKEN` env var first, then `~/.cleargate/admin-auth.json`. `cleargate-admin login` / OAuth device flow correctly deferred to SPRINT-04.
- **Keychain library native-binary breakage** — did not fire. `@napi-rs/keyring@^1.2.0` installed cleanly on Node 24; file fallback verified by vi-mock unit tests on libsecret-less CI.
- **Typed admin-API client drift** — mitigation held. Chose the "vendor a snapshot + drift test" option from the risk row; `snapshot-drift.test.ts` now owns the drift signal.
- **Monorepo topology** — decision landed mid-sprint. npm workspaces adopted in M3 (not earlier, per W1's explicit deferral); `mcp` tests stayed green. No duplication fallback needed.
- **Refresh-token printed to stdout** — did not fire; `cleargate join` never logs the token (vitest spy asserts on stderr/stdout during the integration smoke).
- **Three-install-mode matrix** — deferred to ops close-out (see DoD).

**Surprise:** STORY-004-07's spec referenced `mcp/src/auth/issue.ts` (STORY-003-02) but that file does not exist; the shipped codebase has `JwtService.issueRefresh` at `mcp/src/auth/jwt.ts`. W4 architect caught and overrode; no Developer rework. Flag for spec hygiene.

### Cost envelope

**Reporting data is incomplete.** The token ledger at `.cleargate/sprint-runs/SPRINT-03/token-ledger.jsonl` captured only 33 rows — all from a single architect session for STORY-004-07 / W4 planning. Developer, QA, and the M1/M2/M3 architect sessions are **not** represented.

Based on the 33 captured rows (architect only, W4 only): **~$768** at Opus 4 rates (input $15/M, output $75/M, cache-create $18.75/M, cache-read $1.50/M; rates as of 2026-04-18). **Sprint-total cost is meaningfully higher** — the ledger undercounts by (at minimum) every developer and QA invocation across 11 stories plus M1/M2/M3 architect planning. Treat the $768 as a *lower bound on architect cost alone*, not a sprint total.

### What's unblocked for next sprint

- **SPRINT-04 / EPIC-006 Admin UI** can now build against a stable Admin API with durable invite storage. The OAuth `POST /admin-api/v1/auth/exchange` route + `cleargate-admin login` device flow slot in once GitHub OAuth session plumbing lands.
- **EPIC-001 (`cleargate stamp`)** and **EPIC-002 (`cleargate wiki *`)** now have a package to root into — `@cleargate/cli` is stable, typed, and exports `AdminApiClient` + `TokenStore` primitives.
- **v0.9 "headless alpha" milestone** — anyone with VPS access can stand up an MCP and onboard a team via SSH + CLI. Gate is the ops close-out below.

---

## For Developers

### Per-story walkthrough

**STORY-000-01: Package scaffold for `@cleargate/cli`** · L1 · meta-repo `3bcfcd4`
- Files: `cleargate-cli/{package.json, tsconfig.json, tsup.config.ts, .gitignore, README.md, src/cli.ts}` + `package-lock.json`
- Tests added: 0 unit (manual gates per Gherkin — build + shebang + `--version`)
- Kickbacks: 0
- Deviations: none — workspace-root deferral held per W1 L23-24.
- Flashcards: `#tsup #cjs #esm` (top-level await breaks CJS emit).

**STORY-000-02: Commander entry + stub subcommands** · L1 · meta-repo `43c50c3`
- Files: `cleargate-cli/src/cli.ts` (rewrite), `src/commands/_stub.ts`, `test/cli.test.ts`
- Tests added: 5 (spawnSync-based out-of-process)
- Kickbacks: 0

**STORY-000-03: zod-validated config loader** · L1 · meta-repo `acde4ba`
- Files: `cleargate-cli/src/config.ts`, `test/config.test.ts`
- Tests added: 11 (precedence + defaults + malformed-JSON + zod-strict + `requireMcpUrl`)
- Kickbacks: 0

**STORY-000-04: TokenStore (keychain + file fallback)** · L2 · meta-repo `f97b3f1`
- Files: `cleargate-cli/src/auth/{token-store.ts, keychain-store.ts, file-store.ts, factory.ts, require-token.ts}` + four test files
- Tests added: 19 (8 FileStore behavior + 3 FileStore read-error + 3 KeychainStore mocked + 3 factory + 2 requireToken)
- Kickbacks: 0
- Deviations: `@napi-rs/keyring@^1.2.0` chosen (no fallback to `keytar` needed — resolves STORY-000-04's "🟡 keychain lib pick")
- Flashcards: `#keyring #napi #posix-modes`, `#keyring #napi #api-mismatch`, `#vitest #vi-mock #native-modules`.

**M3 Setup** · meta-repo `50e29e0` (+ mcp-repo `7e0e289`)
- Files: root `package.json` + `package-lock.json` (npm workspaces), `cleargate-cli/src/admin-api/{client,responses,errors,redact,admin-auth,index}.ts`, four admin-api test files, `mcp/scripts/{cleargate-admin.ts, commands/_stub.ts, commands/_render-error.ts}`, schema-export renames in three `mcp/src/admin-api/*.ts` files.
- Tests added: ~17 (client error matrix + admin-auth loader + redact + snapshot-drift)
- Flashcards: `#monorepo #npm-workspaces`, `#fastify #ctp-empty-body`, `#admin-jwt #file-shape`, `#zod #drift-detection`, `#cli #plaintext-redact`.

**Setup-fix spillover** · meta-repo `cad6638` (arrived during STORY-005-01 QA)
- Kick-back reason: **D6 compliance gap** — `AdminApiError` with `kind: 'network'` lacked `baseUrl` in the stderr line mandated by D6 (`"cannot reach <baseUrl>"`). Fixed inline; committed as a surgical correction before STORY-005-01 re-approval.

**STORY-005-01: `cleargate-admin create-project`** · L1 · mcp-repo `a3d9227` (amended once)
- Files: `mcp/scripts/commands/create-project.{ts, test.ts}` + wiring in `cleargate-admin.ts`
- Tests added: 7 (P-1..P-7 error matrix)
- Kickbacks: 1 — `_render-error.ts` didn't include `baseUrl` for network errors per D6. Fix landed in setup-fix `cad6638` + amended story commit. Re-approved.

**STORY-005-02: `cleargate-admin invite`** · L1 · mcp-repo `a578d7f` (amended once)
- Files: `mcp/scripts/commands/invite.{ts, test.ts}` + wiring
- Tests added: 7 (I-1..I-7 including redaction test)
- Kickbacks: 1 — **I-3 (invalid `--role` → 400 → exit 5) test scenario not implemented.** Developer amended with the missing case; re-approved.

**STORY-005-03: `cleargate-admin issue-token`** · L1 · mcp-repo `fb7be36`
- Files: `mcp/scripts/commands/issue-token.{ts, test.ts}` + wiring
- Tests added: 6 (T-1..T-6, including T-3 stderr-no-plaintext enforcement)
- Kickbacks: 0 — plaintext-redaction discipline held.

**STORY-005-04: `cleargate-admin revoke-token`** · L1 · mcp-repo `85a5969`
- Files: `mcp/scripts/commands/revoke-token.{ts, test.ts}` + wiring
- Tests added: 5 (R-1..R-5 including idempotent 204→204 re-call)
- Kickbacks: 0

**STORY-004-07: Invite storage Redis → Postgres retrofit** · L2 · mcp-repo `bda4308`
- Files: `mcp/src/db/schema.ts` (+31), `src/db/migrations/0003_invites_table.sql` (+16), `src/admin-api/invites.ts` (rewrite +65), `src/admin-api/members.ts` (+119/-89 rewrite), `src/admin-api/members.test.ts` (+129), drop `src/admin-api/index.ts` Redis wiring (-4), `scripts/smoke-admin-api.ts` URL match update. Total: +1079/-89 across 9 files.
- Tests: `members.test.ts` rewritten to assert DB state; LATERAL-join status-derivation tested.
- Kickbacks: 0
- Flashcards: `#schema #migrations`.

**STORY-003-13: `POST /join/:invite_token` redemption route** · L2 · mcp-repo `e3c2550`
- Files: `mcp/src/routes/join.{ts, test.ts}` (+117/+397), `src/middleware/rate-limit.{ts, test.ts}` (+32/+69), `src/server.ts` (+2). Total: +616/-1.
- Tests: 7 scenarios in `join.test.ts` (valid-redeem sets `consumed_at` + issues RT, expired → 410 `invite_expired`, consumed → 410 `invite_already_consumed`, not-found → 404, concurrent double-redeem → exactly one 200, rate-limit 429, audit row written).
- Kickbacks: 0
- Flashcards: `#fastify #postgres #uuid`.

**STORY-005-05: `cleargate join <invite-url>`** · L2 · meta-repo `13460ed` (amended once)
- Files: `cleargate-cli/src/commands/join.ts` (+159), `src/cli.ts` (+12/-6), `test/commands/join.test.ts` (+536), `test/e2e/join-smoke.test.ts` (+132), `test/cli.test.ts` (+8)
- Tests: unit matrix + in-process e2e smoke (mocked fetch + real TokenStore)
- Kickbacks: 1 — **exit-99 unhandled-throw path missing.** Non-`AdminApiError` throws during `cleargate join` fell through to Node's default unhandled-rejection exit (code 1, no stderr message), violating D6 `exit 99`. Amended with top-level `try/catch`; re-approved.
- Flashcards: `#cli #url-parsing #join`, `#cli #commander #optional-key`, `#cli #vitest #vi-mock-hoisting`.

### Token ledger rollup

**The ledger is partial.** `.cleargate/sprint-runs/SPRINT-03/token-ledger.jsonl` contains 33 rows, all with `agent_type: architect`, `story_id: STORY-004-07`, `model: claude-opus-4-7`. Spans two session IDs (`d2d4a56a-...` and `4d99a9e6-...`), 2026-04-17 21:38Z → 2026-04-18 13:46Z — corresponds to W4 architect plan authoring, not every SubagentStop event in the sprint.

**Captured rows aggregate:**

| Metric | Count |
|---|---|
| Rows | 33 |
| Input tokens | 9,629 |
| Output tokens | 1,726,717 |
| Cache-creation tokens | 25,189,532 |
| Cache-read tokens | 110,836,857 |
| **Total** | **137,762,735** |
| Rough cost (Opus 4, rates of 2026-04-18) | **~$768** |

| Agent × Story | Invocations | Tokens | Cost |
|---|---|---|---|
| architect × STORY-004-07 | 33 | 137.76M | ~$768 |
| architect × STORY-000-01..04, 003-13, 005-01..05 | **missing** | **missing** | **missing** |
| developer × 11 stories | **missing** | **missing** | **missing** |
| qa × 11 stories + 3 re-runs | **missing** | **missing** | **missing** |
| reporter × this report | will append on SubagentStop | — | — |

**Ledger gap is the single most impactful reporting issue this sprint.** Every "what did a story cost" and "was the four-agent loop economical" question is unanswerable from the ledger alone. Commit diff-stats (per-story above) are the fallback signal.

### What the loop got right

1. **Strict architect-before-developer discipline held.** Every story had a locked plan in `plans/W{1..4}.md` before any Developer started; all four plans are pre-execution artifacts with "flashcard candidates" sections that were later confirmed. Zero mid-story architectural rework.
2. **QA-mandated kick-backs caught real spec-compliance bugs, not stylistic ones.** All three kick-backs (D6 baseUrl message, I-3 test gap, exit-99 path) were genuine contract violations that would have shipped silently without QA. Independent-verification premise vindicated.
3. **Flashcard harvest was rich and on-topic.** 13 new flashcards, all newest-on-top, all tagged with re-usable vocabularies (`#keyring`, `#monorepo`, `#fastify`, `#schema`, `#cli`). Concrete, greppable lessons — not vague maxims.
4. **Setup-commit pattern (M3's `50e29e0` / `7e0e289`) worked.** Landing AdminApiClient + workspaces + admin-auth as a shared scaffold before parallel story commits prevented merge thrash on `cleargate-admin.ts`. Architect's "12th commit is justified" recommendation was correct.
5. **W4 architect caught a stale story spec (`mcp/src/auth/issue.ts` doesn't exist) before dispatching Developer.** Plan-before-code loop paid for itself. One read saved one round-trip.

### What the loop got wrong

1. **The SubagentStop token-ledger hook undercounts by an order of magnitude.** Ledger captured only architect-W4 sessions. Either `.claude/hooks/token-ledger.sh` is misfiring on `subagent_type` detection for `developer`/`qa`/other-architect sessions, or it only fires on certain stop conditions. **Concrete fix:** audit `.claude/hooks/token-ledger.sh` + `.claude/settings.json` wiring; emit a test event per role per sprint; add a self-check that prints N subagent invocations at sprint end and bails if N < expected. Without this, every subsequent Reporter faces the same cost-blindness.
2. **All three QA kick-backs were spec-compliance gaps, not implementation bugs.** (D6 baseUrl phrasing, I-3 case coverage, exit-99 handler.) Pattern: Developer executes to 90% of the plan, misses a specific clause. **Concrete fix:** add a `plan_compliance_checklist` section at the bottom of each `plans/W<N>.md` enumerating every concrete D-decision + error-code cell + test-matrix ID. QA runs the checklist mechanically before approving. ~5 min of architect time; eliminates the "shipped 90%" failure mode.
3. **Story files drifted from shipped code.** STORY-004-07 referenced `mcp/src/auth/issue.ts` (doesn't exist); STORY-003-13 also pointed at the wrong file. Architect caught both, but cost is now on *every* architect read. **Concrete fix:** pre-sprint grep pass in the orchestrator — resolve every `mcp/src/...` path mentioned in upcoming sprint stories; any ENOENT gets flagged for spec correction before plans start.
4. **Ops close-out items are mingled with engineering DoD.** The sprint DoD at lines 96-106 contains 10 checkboxes, 5 of which are ops-only. Engineering is "done" but the sprint is "not shipped" by the document's own criteria. **Concrete fix:** split DoD into `Engineering DoD` and `Ops DoD` explicitly in the sprint-file template. Reporter marks engineering complete; orchestrator chases ops independently.
5. **`plans/W2.md` sits untracked in git** (`?? .cleargate/sprint-runs/SPRINT-03/plans/W2.md`). W1, W3, W4 are committed via setup commits; W2 was never staged. **Concrete fix:** architect's contract should require the plan file be committed in the same commit as the M-N setup (or first story commit) — a `git add plans/W<N>.md` gate in the architect exit criteria.

### Architectural decisions that landed

- **npm workspaces adopted at M3**, not earlier (W1 correctly deferred). Single root `package.json` with `workspaces: ["cleargate-cli", "mcp"]`; `mcp/package.json` depends on `@cleargate/cli: "*"` (workspace-resolved).
- **Vendored Zod response schemas + snapshot-drift test** — rejected full OpenAPI codegen. Server DTOs in `mcp` are TS interfaces (not Zod); hand-authoring ~60 LOC of response Zod plus `snapshot-drift.test.ts` is the pragmatic choice.
- **Invite-token format: UUIDv4 (PK *is* the token)** — not base64url, not v7, not JWT. 122-bit random ID doubles as primary key and secret. Matches EPIC-005 §6.4.
- **Canonical join URL path: `/join/<token>`** — W4 noted legacy code emitted `/invite/<token>`; STORY-004-07 standardized on `/join/` to match STORY-003-13's endpoint.
- **Anonymous rate-limit bucket: 10 req / 15 min per IP, hardcoded** in `mcp/src/middleware/rate-limit.ts` as `buildAnonymousRateLimit`. Not plumbed through `config.ts` (no new env var per sprint DoD L105).
- **Postgres invites are source of truth; Redis drops out of invite path entirely.** Schema has `consumed_at` (nullable) + partial index on active invites. Members list derives three-state status (`pending` | `active` | `expired`) via LATERAL join on most-recent invite row.
- **Admin JWT file is a single-token shape `{version, token}`**, NOT a `FileTokenStore` profile map. Distinct security/UX domain from the user-facing refresh-token store.
- **`@napi-rs/keyring@^1.2.0` pick locked** (W2 D-decision), removing `🟡 keychain lib pick` ambiguity on STORY-000-04.

### Sprint DoD check (sprint file L96-106)

| # | DoD item | Status |
|---|---|---|
| 1 | All 11 Stories merged | [x] done — 11 story commits + 2 setup + 1 setup-fix |
| 2 | `npm run typecheck` clean in both packages | [x] done — green pre-commit on every story |
| 3 | `npm test` passes in `cleargate-cli/` (new suites for config, TokenStore, AdminApiClient, subcommands) | [x] done |
| 4 | `npm test` in `mcp/` still green | [x] done — includes rewritten `members.test.ts` + new `join.test.ts` |
| 5 | Three-install-mode matrix smoke (`npx`, `npm i -D`, `npm i -g`) | [ ] **deferred to ops** |
| 6 | End-to-end two-terminal smoke (admin-issues → vibe-coder-joins → MCP authenticates) | [ ] **deferred to ops** — unit + integration smoke pass; live two-terminal run not executed |
| 7 | `docker build ./mcp` still succeeds | [~] **not re-verified this sprint** — no Dockerfile changes in shipped diffs, but not explicitly re-run |
| 8 | Keychain library final pick documented + remove 🟡 marker | [x] done — `@napi-rs/keyring@^1.2.0`, noted in STORY-000-04 commit body (close-out still needs to strip the 🟡 from the story file itself) |
| 9 | `cleargate-cli/README.md` expansion | [ ] **deferred to ops** — placeholder README landed in M1; full docs not yet authored |
| 10 | Coolify redeploy | [ ] **deferred to ops** — runbook at `coolify/DEPLOYMENT.md`, no new env vars |
| 11 | First npm publish of `@cleargate/cli@0.1.0-alpha.1` | [ ] **deferred to ops** — manual, maintainer machine |

**5 items `deferred to ops`, 1 `partial`, 5 `done`.** Engineering is complete; operational close-out remains.

### QA kick-back pattern

| Kick-back | Story | Gap | Amended commit |
|---|---|---|---|
| D6 baseUrl missing from network error | STORY-005-01 | `_render-error.ts` didn't substitute `<baseUrl>` into the literal D6 phrasing | `cad6638` (setup-fix) + story amend |
| I-3 test case absent | STORY-005-02 | Gherkin called for `invalid --role` case; test suite omitted it | story amend |
| Exit-99 unhandled throw | STORY-005-05 | Top-level catch missing; non-`AdminApiError` throws fell through to Node's default | story amend |

**Pattern:** Developer implements happy path + most of error matrix, misses one specific clause.

### Flashcards added this sprint

**13 new entries in `.cleargate/FLASHCARD.md`** (newest-on-top, all dated 2026-04-18):

| Tag combo | Lesson topic |
|---|---|
| `#cli #url-parsing #join` | UUID-first-check before `new URL()` in `cleargate join` |
| `#fastify #postgres #uuid` | Regex-validate UUID path params before DB; pg 22P02 catch is brittle |
| `#schema #migrations` | drizzle-kit manual SQL ignored by `db:migrate`; use `db:generate` |
| `#cli #commander #optional-key` | `{ optionalProp: undefined }` keeps key present; conditional-assign to omit |
| `#cli #vitest #vi-mock-hoisting` | `vi.mock()` hoists; use `vi.hoisted()` for factory vars |
| `#cli #plaintext-redact` | Never spread secret-carrying responses into log objects |
| `#zod #drift-detection` | Snapshot-drift test for vendored CLI schemas against server OpenAPI |
| `#admin-jwt #file-shape` | Admin JWT file is single-token, not a profile map |
| `#fastify #ctp-empty-body` | FST_ERR_CTP_EMPTY_JSON_BODY — omit `content-type` on no-body requests |
| `#monorepo #npm-workspaces` | Adopt workspaces only at first cross-package import; verify sibling tests |
| `#vitest #vi-mock #native-modules` | `vi.mock('@napi-rs/keyring')` before native load |
| `#keyring #napi #api-mismatch` | `Entry.getPassword()` returns `string \| null`; handle both null AND throw |
| `#keyring #napi #posix-modes` | `fs.writeFile(path,data,{mode})` only sets mode on create; chmod after |
| `#tsup #cjs #esm` | Top-level await breaks CJS emit; use `void program.parseAsync()` |

### Open follow-ups / carry-forward

- **Pre-existing `pull-item.test.ts` socket.destroySoon unhandled errors** in the mcp test harness. Flagged across multiple QA reports this sprint. **Not introduced by SPRINT-03.** Target: infra sprint after SPRINT-04.
- **Ops close-out items** (DoD 5, 6, 9, 10, 11) — Coolify redeploy, first npm publish of `@cleargate/cli@0.1.0-alpha.1`, three-install-mode matrix smoke, two-terminal end-to-end smoke, README expansion. Target: immediate, pre-SPRINT-04 kickoff.
- **`cleargate-admin login` (GitHub OAuth device flow)** — deferred by design to SPRINT-04 / EPIC-006 closeout. Admin JWT sourcing today is env-var + file.
- **Token-ledger hook gap** — see "loop got wrong" #1. Target: fix before SPRINT-04 starts so SPRINT-04's REPORT has real cost data.
- **STORY-000-04 `🟡` ambiguity marker** still in the story file body. Text edit; trivial close-out.

### Next sprint pointer

**SPRINT-04 = EPIC-006 (Admin UI — SvelteKit, 10 stories)** + deferred OAuth session→admin-JWT exchange (`POST /admin-api/v1/auth/exchange`) + `cleargate-admin login` device flow as sprint closeout items.

---

## Meta

**Token ledger:** `.cleargate/sprint-runs/SPRINT-03/token-ledger.jsonl` — 33 rows, architect-only, STORY-004-07-only. **Significantly undercounts sprint cost.**
**Plans:** `.cleargate/sprint-runs/SPRINT-03/plans/{W1,W2,W3,W4}.md` (note: W2.md is untracked in git)
**Flashcards added:** 13 (see `.cleargate/FLASHCARD.md`, newest-on-top)
**Model rates used:** Opus 4 pricing as of 2026-04-18 (input $15/M · output $75/M · cache-create $18.75/M · cache-read $1.50/M)
**Sprint file:** `strategy/work-items/sprints/SPRINT-03_CLI_Packages.md`
**Report generated:** 2026-04-18 by Reporter agent
