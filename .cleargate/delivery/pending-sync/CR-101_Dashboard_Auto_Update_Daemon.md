---
cr_id: CR-101
parent_ref: EPIC-043
parent_cleargate_id: EPIC-043
sprint_cleargate_id: null
carry_over: false
status: Completed
approved: true
area: cli
context_source: |
  verified codebase grounding — read cleargate-cli/src/dashboard/{serve,render,open,collect}.ts,
  src/commands/{sprint,state,init}.ts, cleargate-planning/.claude/hooks/token-ledger.sh, and
  .claude/settings.json against the published cleargate@0.22.0 tarball. Direct user request
  2026-08-02: "lets wire it so it automatically updates when things change", after confirming
  the sprint-dashboard skill ships to clients but nothing keeps its output current.
created_at: 2026-08-02T00:00:00Z
updated_at: 2026-08-02T16:05:00Z
created_at_version: 0.22.0
updated_at_version: 0.23.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-08-02T14:14:25Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-101
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-08-02T14:14:25Z
  sessions: []
---

# CR-101: The Dashboard Keeps Itself Current

## 0.5 Open Questions

- **Question:** Should `--serve` also detach, for consistency with the new `--open`?
- **Recommended:** No. `--serve` keeps its current foreground, Ctrl-C-to-stop semantics — that is what a `serve` verb means everywhere else, and it is the escape hatch for anyone who wants the server in the foreground. `--open` is the "give me a tab" verb and is the one that detaches. This splits the two flags that CR-097 fused (`--open` implied `--serve`) rather than changing what `--serve` has always done.
- **Human decision:** {populated during Brief review}

- **Question:** How long before an unattended daemon exits on its own?
- **Recommended:** 30 minutes with no HTTP request, overridable via `CLEARGATE_DASHBOARD_IDLE_MS`. Plus an unconditional exit when `.cleargate/sprint-runs/.active` stops naming the sprint the daemon was started for, checked every 30s. Two independent safety valves, because an orphaned HTTP server on a user's machine is a worse failure than a dashboard that needs restarting.
- **Human decision:** {populated during Brief review}

- **Question:** Should the snapshot re-render fire on every `SubagentStop` even when a daemon is already serving live data?
- **Recommended:** Yes. The daemon serves `collect()` fresh per request and never reads `dashboard.html`; the two are independent. The snapshot is the durable artifact that survives the daemon and is what a reader sees when they open the file later. It stays suppressible through the existing `CLEARGATE_NO_DASHBOARD=1` token.
- **Human decision:** {populated during Brief review}

- **Question:** Port-scan range when 4713 is held by a foreign process.
- **Recommended:** Scan 4713→4722 (10 attempts), then fail with the existing "pass --port" message. Bounded so a machine full of listeners produces an error rather than a scan.
- **Human decision:** {populated during Brief review}

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- Forget CR-097 §0.5's ruling that `sprint init` must leave a `file://` snapshot: *"handing it a server would leave a process running after a command the user expects to finish."* The objection is correct about a **foreground** server and does not survive a detached one with a recorded PID, a self-exit condition, and a `--stop` verb. The consequence of leaving it unaddressed is the thing the dashboard exists to prevent: kickoff opens a tab that is wrong from the first state transition onward, and looks exactly like a right one.
- Forget that `--open` implying `--serve` is enough to solve tab staleness. It solves it only for a human who types the command; it does nothing for the auto-opened tab, which is the one almost every user actually gets.
- Forget that `GET /healthz` returning `{service:'cleargate-sprint-dashboard'}` identifies *our* server. It identifies the software, not the checkout. Two ClearGate repos on one machine both want port 4713; the second one's EADDRINUSE probe reads "ours" and reuses the first repo's dashboard, showing a different project's sprint with no indication anything is wrong.
- Forget that `dashboard.html` is only written at `sprint init`. It is the durable artifact and must track the data it claims to show.

**New Logic (The New Truth):**

- **A dashboard daemon has a lifecycle.** `.cleargate/sprint-runs/<id>/.dashboard.json` records `{pid, port, root, sprintId, startedAt}`. The record is written by the server itself inside the `listen` callback — so a record exists only for a process that is genuinely bound — and removed on `close`, `SIGTERM`, `SIGINT`, and `exit`.
- **`ensureDaemon()` is idempotent.** It reads the record, checks the pid is alive, probes `/healthz`, and reuses a matching daemon without spawning or opening a second tab. A dead pid or a non-matching probe deletes the stale record and starts fresh.
- **`/healthz` identifies the checkout,** returning `{service, root, sprintId, pid}`. `root` is the resolved project root. Reuse requires `service` **and** `root` to match; a foreign occupant on the port makes the caller scan 4713→4722 for a free one, and the chosen port is what lands in the record and the URL.
- **The daemon self-terminates.** It exits 0 when the `.active` sentinel no longer names its sprint (polled every 30s) or after `CLEARGATE_DASHBOARD_IDLE_MS` (default 1,800,000) with no request. `SIGTERM` is handled alongside the existing `SIGINT`.
- **`sprint init` starts the daemon and opens the served URL** instead of a `file://` snapshot. It still writes `dashboard.html` as the artifact. The whole step stays inside the existing `try/catch` and can never change `sprint init`'s exit code, and stays gated by `--no-dashboard` / `CLEARGATE_NO_DASHBOARD`.
- **Flag semantics split.** `--open` (alone) ensures the daemon, opens the URL, exits 0. `--serve` keeps its foreground blocking behavior unchanged. `--serve --open` is foreground plus a tab, unchanged. `--stop` terminates the recorded daemon and removes the record. `--foreground` is a hidden flag the spawned child uses so it runs the server rather than recursing into `ensureDaemon`.
- **The snapshot re-renders when its inputs change.** `stateUpdateHandler` re-renders after a successful `update_state.mjs` exit; `token-ledger.sh` re-renders after appending its ledger row. Both are best-effort: wrapped, backgrounded where relevant, never able to change an exit code or block a subagent stop.
- **`.dashboard.json` is runtime state, not team-shared** — `cleargate init` adds `/sprint-runs/*/.dashboard.json` to the generated `.cleargate/.gitignore`.

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update CR: [CR-097](CR-097_Dashboard_Truthfulness_And_Single_Tab.md) — its §0.5 "sprint init stays a snapshot" ruling is superseded, and its `--open ⇒ --serve` fusion is split. CR-097 is `status: Completed`; this CR records the supersession rather than reopening it.
- [ ] Invalidate/Update CR: [CR-084](../archive/CR-084-Sprint-Dashboard-In-CLI-Payload.md) — the shipped skill doc gains the daemon, `--stop`, and the auto-refresh contract.
- [ ] Database schema impacts? **No.** No schema, no server, no MCP surface. Local CLI and hook only.
- **Behavioral break:** anyone scripting `cleargate sprint dashboard --open` and expecting a blocking process now gets a detached one and an immediate exit. `--serve` is the unchanged foreground path and is named as the migration in the skill doc.
- **New failure mode:** an orphaned daemon if both self-exit conditions and `--stop` are missed. Bounded by the idle timeout; `cleargate sprint dashboard --stop` is the manual recovery.
- **Hook cost:** `token-ledger.sh` gains one backgrounded CLI spawn per `SubagentStop`. It must be backgrounded and fully redirected — a foreground spawn adds latency to every agent completion, and an un-redirected one can hold the hook's stdout open.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/dashboard/serve.ts:39` — `serve()` binds a stdlib http server; `/`, `/data`, `/healthz`, 404. Foreground; `SIGINT` only. Gains the record write/remove, the `root` field on `/healthz`, `SIGTERM`, and the two self-exit timers.
- **Surface:** `cleargate-cli/src/dashboard/serve.ts:77-115` — the EADDRINUSE reuse probe. Gains the `root` comparison that makes "ours" mean this checkout.
- **Surface:** `cleargate-cli/src/dashboard/open.ts:26` — already spawns `detached:true` + `unref()`. The daemon spawn reuses this exact pattern; no new dependency.
- **Surface:** `cleargate-cli/src/commands/sprint.ts:106` — `defaultDashboardSnapshot()`, called by `sprint init` at `:457` with `open:true`, which routes to `file://` at `:120`. This is the dead-tab path.
- **Surface:** `cleargate-cli/src/commands/sprint.ts:132` — `sprintDashboardHandler()`; the `--open ⇒ --serve` branch at `:156`.
- **Surface:** `cleargate-cli/src/commands/state.ts:130` — `stateUpdateHandler()`; gains the trailing re-render before `exitFn`.
- **Surface:** `cleargate-cli/src/commands/init.ts:443-461` — `cleargateIgnoreBody`, which already lists `/sprint-runs/*/dashboard.html` at `:459`.
- **Surface:** `cleargate-planning/.claude/hooks/token-ledger.sh:612` — the ledger append. The re-render goes after it, before the sentinel cleanup.
- **Surface:** `cleargate-cli/src/cli.ts:393-396` — the `sprint dashboard` command registration; gains `--stop` and a hidden `--foreground`.
- **Why this CR extends rather than rebuilds:** every piece of the live view already exists and works — the 2s poller (`render.ts:735-741`), the `/data` endpoint, the `/healthz` identity probe, the detached-spawn helper. What is missing is only process lifecycle: nothing starts the server unattended, nothing records that it is running, nothing stops it. This CR adds that layer and touches the renderer not at all.

## Prior work

- [[CR-084]] — shipped the dashboard into the CLI payload (`collect`/`render`/`serve`/`open`) and the `sprint-dashboard` skill; established the snapshot-plus-optional-serve split this CR revises.
- [[CR-097]] — made the dashboard declare when it cannot be trusted, and made `--open` imply `--serve` to stop tab-stacking. Explicitly deferred the `sprint init` case (§0.5) — that deferral is what this CR takes up.
- `cleargate wiki query "sprint dashboard auto-update live server detached daemon lifecycle"` → `no matches`. The CLI wiki-query greps `wiki/index.md` only (`wiki-query.ts:3-13`), which carries no per-CR body text; the two related items above were found by direct grep over `.cleargate/delivery/**`, `.cleargate/wiki/crs/`, and `.cleargate/FLASHCARD.md`.
- FLASHCARD `#ux #danger` 2026-08-01 [CR-097] — "a dashboard built from a stale sentinel + another sprint's ledger looked identical to a healthy one." The cross-repo `/healthz` defect this CR fixes is the same class of failure: a page that is confidently wrong.

## 3. Execution Sandbox

**Add:**
- `cleargate-cli/src/dashboard/daemon.ts` — `readRecord` / `writeRecord` / `removeRecord` / `isAlive` / `probeHealthz` / `findFreePort` / `ensureDaemon` / `stopDaemon`.
- `cleargate-cli/test/dashboard/daemon.node.test.ts`

**Modify:**
- `cleargate-cli/src/dashboard/serve.ts`
- `cleargate-cli/src/commands/sprint.ts`
- `cleargate-cli/src/commands/state.ts`
- `cleargate-cli/src/commands/init.ts`
- `cleargate-cli/src/cli.ts`
- `cleargate-cli/test/dashboard/serve.node.test.ts`
- `cleargate-cli/test/commands/sprint.dashboard.node.test.ts`
- `cleargate-planning/.claude/hooks/token-ledger.sh`
- `cleargate-planning/.claude/skills/sprint-dashboard/SKILL.md`
- `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` (one line: the daemon is automatic; `--stop` is the off switch)

**Do not touch:** `render.ts`, `collect.ts`, `markdown.ts` (CR-102 owns the renderer), the MCP server, `admin/`.

## 4. Verification Protocol

**Command:** `cd cleargate-cli && npm run typecheck && npm test`

Tests that must exist and pass:

1. `/healthz` includes `root` and `sprintId`; a probe whose `root` differs is **not** treated as ours.
2. `ensureDaemon` with a live matching daemon reuses it — no second spawn, no second browser open.
3. `ensureDaemon` with a record whose pid is dead deletes the record and starts a new daemon.
4. A foreign listener on 4713 makes `ensureDaemon` bind 4714, and the record + returned URL both carry 4714.
5. `--stop` signals the recorded pid and removes the record; `--stop` with no record exits 0 with a "not running" message.
6. The daemon exits 0 when the `.active` sentinel changes (injected short poll interval).
7. The daemon exits 0 after the idle timeout with no requests (injected short `CLEARGATE_DASHBOARD_IDLE_MS`).
8. `state update` re-renders `dashboard.html`; a render that throws leaves the command's exit code unchanged.
9. `sprint init` starts a daemon **and** writes `dashboard.html`; `--no-dashboard` and `CLEARGATE_NO_DASHBOARD=1` each suppress both.
10. `--serve` (no `--open`) still blocks in the foreground and does not write a record via `ensureDaemon`.

**Manual:** in a scratch repo, `cleargate sprint init` → confirm the browser lands on `http://localhost:4713` (not `file://`), move a story with `cleargate state update`, confirm the open tab reflects it within ~2s with no reload and no scroll jump. Then `cleargate sprint close` → confirm the process is gone (`lsof -i :4713` empty) and `.dashboard.json` is removed.

**Regression guard:** `git grep -n "file://" cleargate-cli/src/commands/sprint.ts` must return only the plain-snapshot `--open`-less path, never the `sprint init` step.

---

## Context Source

> Discovery audit. Populated from verified codebase grounding and recorded direct approval.

**context_source:** verified codebase grounding — the three defects named in §1 were each read out of source, not inferred: the `sprint init` → `file://` path (`sprint.ts:457`→`:120`), the poller's deliberate `file://` no-op (`render.ts:733-741`), and the identity-free `/healthz` (`serve.ts:61`). CR-097's §0.5 deferral is quoted from its own text. Direct user approval recorded 2026-08-02 selecting "Daemon + snapshot refresh" from four offered mechanisms.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.
