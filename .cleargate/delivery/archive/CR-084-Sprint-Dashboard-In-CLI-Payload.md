---
cr_id: CR-084
parent_ref: EPIC-026
parent_cleargate_id: EPIC-026
sprint_cleargate_id: null
carry_over: false
area: cli
status: Completed
approved: true
completed_at: 2026-07-14T13:00:00Z
shipped: cleargate@0.16.0 (npm, tag latest); merged cleargate-cli main 21bfa83
context_source: direct owner request 2026-07-14 (ship a branded sprint dashboard in the CLI + auto-open on sprint init; use Node, static HTML output, live-refresh in serve mode) + verified codebase grounding (cli.ts, sprint.ts, active-sprint.ts, design-guide.md)
created_at: 2026-07-14T00:00:00Z
updated_at: 2026-07-14T12:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: null
  failing_criteria: []
  last_gate_check: null
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-084
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-07-14T14:02:09Z
  sessions: []
---

# CR-084: Ship a Branded Sprint-Progress Dashboard as a `cleargate` CLI Subcommand

## 0.5 Open Questions

> All resolved via owner decision 2026-07-14. Retained for audit.

- **RESOLVED — Runtime:** Node, not Python. The dashboard is a **`cleargate` CLI subcommand** (`cleargate sprint dashboard`), not a loose script. The CLI already has filesystem + subprocess access and ships on every machine, so there is no new runtime and no `.cleargate/tools/` payload file. Rationale (owner Q "why not ordinary js/html/css?"): a `file://` HTML page cannot read sibling data files (Chrome blocks `fetch` of `file://`) and cannot run `git worktree list` (no browser shell), so a data-collector with FS+subprocess access must run first — that collector is the CLI. The **browser-facing output stays ordinary static HTML/CSS/JS** (data inlined as a `<script>` blob; all CSS/JS inline).
- **RESOLVED — Auto-open:** `cleargate sprint init` writes the snapshot and opens it in the **default browser** (new window/tab, best-effort per-platform: macOS `open`, Linux `xdg-open`, Windows `start`). Suppress with `--no-dashboard` or `CLEARGATE_NO_DASHBOARD=1`.
- **RESOLVED — Live refresh:** `--serve` mode auto-updates **without a manual refresh** — a `/data` JSON endpoint plus inline client polling (~2s) patches the DOM in place (no flicker, keeps scroll). Snapshot mode (the file `init` opens) is point-in-time by nature. SSE + `fs.watch` (instant push) is a documented, dependency-free future upgrade over polling.
- **RESOLVED — `--serve` in v1:** yes. Single stdlib `http.server`; serves the page + `/data`; no new dependency.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- None — this CR is **additive**. No existing behavior is evicted. The only change to a shipped code path is that `cleargate sprint init` gains one best-effort trailing step (New Logic #4), a no-op when suppressed or when the render fails.
- (Supersedes the earlier draft of this CR: **no Python, no `.cleargate/tools/` file, no payload-sync of a tool.** The generator is TypeScript inside the CLI package.)

**New Logic (The New Truth):**

1. **New subcommand — `cleargate sprint dashboard [--open] [--serve] [--port <n>]`.** TypeScript in `cleargate-cli/src/`. Auto-detects the active sprint from `.cleargate/sprint-runs/.active` (reusing/extending the active-sprint reader in `src/wiki/synthesis/active-sprint.ts`), then collects — each source degrades gracefully; a missing/malformed input renders an empty or placeholder panel, never throws:
   - `sprint-runs/<id>/state.json` — story states, done/queued counts.
   - the sprint plan pipe-table, keyed to the Sprint Plan Template column order `Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure` — source of story titles + milestone grouping.
   - `sprint-runs/<id>/token-ledger.jsonl` — token spend by agent (empty panel if the SubagentStop hook never ran).
   - `sprint-runs/<id>/sprint-context.md`, `git worktree list`, `reports/`, `execution-log.md`, and the sprint report.

2. **Two render modes over one collector:**
   - **Snapshot** (default / `--open`): write a **single self-contained** `sprint-runs/<id>/dashboard.html` — data inlined as `<script>const DATA=…</script>`, all CSS/JS inline, **zero network requests**. Optionally open it in the default browser.
   - **Live** (`--serve [--open]`): a stdlib `http.server` serves the page plus a `/data` JSON endpoint; inline client JS polls `/data` (~2s) and patches the DOM — updates without a manual refresh. Default port with `--port` override.

3. **Branding.** Skinned to `knowledge/design-guide.md` tokens — canvas `#F4F1EC`, surface `#FFFFFF`, ink `#1A1F2E`, hero `#E85C2F`, secondary `#7BA4D4`, success `#2F9E6B`; Inter / system-ui; bento cards; tabular-nums on stat/token panels. ClearGate wordmark header + footer and an inline data-URI favicon (replaces the `bro.ico` leftover that 404s). Self-contained: no CDN, no font fetch, CSP-clean.

4. **`cleargate sprint init` wiring.** After `init_sprint.mjs` exits 0 (`cleargate-cli/src/commands/sprint.ts:230-242`, where `→ Load skill: sprint-execution` prints), call the dashboard generator **in-process** in snapshot mode and open it. Best-effort: any failure prints one warning line and does **not** change `sprint init`'s exit code. Suppressible via `--no-dashboard` / `CLEARGATE_NO_DASHBOARD=1`. (No `spawn`, no external interpreter.)

5. **New skill — `.claude/skills/sprint-dashboard/SKILL.md`.** Drives usage: `cleargate sprint dashboard` for a snapshot, `--serve --open` for the live view during execution, and the one troubleshooting note — if titles/milestone grouping render blank, the plan table's columns don't match the template order (everything else still renders from `state.json`). This is the **only** new payload file; it ships via the existing skills payload (canonical `cleargate-planning/.claude/skills/` → prebuild mirror → `cleargate init`).

6. **Delivery.** The generator ships **inside the CLI binary** (npm package) — no payload sync, no first-install policy question. Add `.cleargate/sprint-runs/*/dashboard.html` to the scaffold `.gitignore` (regenerated cache) and to the repo-root `.gitignore` (dogfood).

## 2. Blast Radius & Invalidation

- [ ] Database schema impacts? **No.**
- [ ] Downstream Stories/Epics invalidated? **None.** Related admin-console work — [[STORY-006-03]] (Admin projects-list dashboard) and [[PROPOSAL-009]] (Planning Visibility UX) — is a **different surface** (server-rendered stakeholder UI) and is **not** invalidated.
- **Behavioral change:** `cleargate sprint init` gains a best-effort trailing step. Gated + graceful → no existing caller breaks.
- **New CLI surface:** `cleargate sprint dashboard` subcommand — additive; must be registered in `src/cli.ts` alongside the other `sprint` subcommands.
- **First-install gitignore gap:** scaffold `.gitignore` is `FIRST_INSTALL_ONLY` (`copy-payload.ts:71`), so repos that already ran `cleargate init` won't auto-receive the `dashboard.html` ignore line. Acceptable; new installs get it, and the file is a harmless regenerated cache.

## Existing Surfaces

> L1 reuse audit.

- **Surface:** `cleargate-cli/src/commands/sprint.ts:230-242` — `sprintInitHandler` shells out to `init_sprint.mjs`, prints `→ Load skill: sprint-execution` on exit 0. Insertion point for the in-process best-effort dashboard step.
- **Surface:** `cleargate-cli/src/cli.ts` — commander wiring for the `sprint` command group (`init`/`close`/`archive`). Register `sprint dashboard` here.
- **Surface:** `cleargate-cli/src/wiki/synthesis/active-sprint.ts:12-47` — already resolves the active sprint from item state (`activated_at` set, `completed_at` unset). Reuse/extend for active-sprint detection instead of re-implementing.
- **Surface:** `cleargate-planning/.claude/skills/{flashcard,sprint-execution}/` — existing shipped skills; `sprint-dashboard/` sits alongside them and rides the existing skills payload.
- **Surface:** `knowledge/design-guide.md:31-124` — the `--cg-*` palette + Inter type scale the HTML branding consumes.
- **Why this CR extends rather than rebuilds:** No sprint-run dashboard exists (wiki-query: none found). Pre-existing "dashboard" surfaces are admin-console UI on a different stack. This CR reuses the CLI's command plumbing + the active-sprint reader rather than adding new runtime or install machinery.

## 3. Execution Sandbox

**Create:**
- `cleargate-cli/src/dashboard/collect.ts` — active-sprint detection + data collection (state.json, plan table, token-ledger, context, worktrees, reports, report). Pure, unit-testable.
- `cleargate-cli/src/dashboard/render.ts` — data → self-contained branded HTML (inline CSS/JS, data-URI favicon, design-guide tokens).
- `cleargate-cli/src/dashboard/serve.ts` — stdlib http server: page + `/data` endpoint for live polling.
- `cleargate-cli/src/commands/sprint.ts` — add `sprintDashboardHandler({ open, serve, port }, cli?)`.
- `cleargate-planning/.claude/skills/sprint-dashboard/SKILL.md` — the driving skill (only new payload file).

**Modify:**
- `cleargate-cli/src/cli.ts` — register `cleargate sprint dashboard` with `--open` / `--serve` / `--port` flags.
- `cleargate-cli/src/commands/sprint.ts` — `sprintInitHandler`: in-process best-effort snapshot render + open after `init_sprint.mjs` exit 0; add `--no-dashboard` + `CLEARGATE_NO_DASHBOARD` suppression.
- `cleargate-planning/.gitignore` and repo-root `.gitignore` — add `.cleargate/sprint-runs/*/dashboard.html`.

**Create (tests):**
- `cleargate-cli/src/dashboard/collect.node.test.ts` — fixture sprint-run dir → correct milestone grouping, done/queued counts, per-agent token totals; malformed/missing inputs degrade without throwing.
- `cleargate-cli/src/dashboard/render.node.test.ts` — output is self-contained (no `http`/`https`/`//cdn` refs), data blob present, favicon inline.
- `cleargate-cli/src/commands/sprint.dashboard.node.test.ts` — `sprint init` invokes the dashboard step on success; a render failure, `--no-dashboard`, and `CLEARGATE_NO_DASHBOARD=1` each leave `sprint init`'s exit code unchanged.

**Dogfood sync (post-merge, gitignored):** rebuild `cleargate-cli/dist`; copy `sprint-dashboard/SKILL.md` into live `/.claude/skills/`.

**Out of scope:** SSE/`fs.watch` push (documented polling→SSE upgrade path only); dark-mode theme; admin-console integration; npm publish (separate release step after merge).

## 4. Verification Protocol

**Automated:**
- `cd cleargate-cli && npm run typecheck && npm test` — green, including the three new test files.
- `cd cleargate-cli && npm run check:no-pm-sdk` — still green.

**Manual:**
- `cleargate sprint dashboard --open` against a live sprint run → snapshot opens; stories grouped by milestone, done/queued correct, token spend by agent correct, ClearGate branding + favicon render, **zero network requests** (verify in devtools).
- `cleargate sprint dashboard --serve --open`, then mutate `state.json`/append to `token-ledger.jsonl` → the page reflects the change within ~2s **without a manual refresh**.
- `cleargate sprint init <sprint> --stories …` on a scratch sprint → snapshot auto-opens in the default browser; re-run with `--no-dashboard` → does not open, exit code unchanged.
- Force the render to throw → `sprint init` still exits 0 with one warning line.
- Fresh `cleargate init` into a temp repo → `.claude/skills/sprint-dashboard/SKILL.md` present and `cleargate sprint dashboard` runs.

---

## Context Source

> Discovery audit.

**context_source:** Direct owner request (2026-07-14): ship a sprint-progress dashboard via the cleargate CLI so users get it on init, wire it into `sprint init` to feed data + open HTML, brand it properly. Owner design decisions (2026-07-14): use **Node** (a CLI subcommand, not Python / not a loose tool file — "use what we already have"); output is **ordinary static HTML/CSS/JS** with data inlined; **auto-open** a new default-browser window on init; live **`--serve`** with refresh-free auto-update. Verified codebase grounding: `sprint.ts:230-242` (init success hook), `cli.ts` (sprint command group), `active-sprint.ts:12-47` (active-sprint reader to reuse), `copy-payload.ts:71` (first-install gitignore), `knowledge/design-guide.md:31-124` (brand tokens). Duplicate check: `cleargate-wiki-query` → **none found**; nearest neighbors [[STORY-006-03]], [[PROPOSAL-009]] are admin-console UI (distinct surface).

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Ready for Execution** (owner approved 2026-07-14)

*Evaluate each criterion against its literal text.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared. — declared: none (additive); prior Python/tools-file draft superseded.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity. — none impacted (admin surfaces distinct; §2).
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter. — owner approved 2026-07-14.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.

**All four Open Questions resolved.** Sole remaining blocker to 🟢: `approved: true`.
