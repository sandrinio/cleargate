# STORY-062-01 — Architect Post-Flight (§C.6)

role: architect

**Verdict: ARCH: PASS**

Reviewed integrated commit `e5e3a5f` on cli `story/STORY-062-01`. It contains Dev `defd3eb`, QA-Red `fa39ae8`/`2c1cf6a` and C1 `e06cac8`, plus cli `main` `3d2d05f` (STORY-062-03) merged in. I also reviewed outer `story/STORY-062-01` `783934d6`. Both worktrees were read-only and `git status --porcelain` was empty in each. I ran every merge simulation in a scratch `git clone --shared` of the cli repo, so no worktree, branch or ref in the real repos was touched.

## Dispatch flag: `typecheck: exit code 254`

This is the known BUG-087 false fail. I re-ran `npm run typecheck` in `.worktrees/STORY-062-01/cleargate-cli` at `e5e3a5f` and it exits 0. There is no structural signal behind the flag.

## 1. Conformance to M1 (STORY-062-01) and the C1 freeze

| Check | Result | Evidence (`e5e3a5f`) |
|---|---|---|
| Record I/O exports | PASS | `daemon.ts:63-129` has every M1 export with the M1 signatures: `recordPath(cwd)` (single argument), `legacyRecordPath`, `readRecordFile`, `readRecord(cwd)`, `writeRecord`, `removeRecordFile`, `removeRecord(cwd)`, `candidateRecordFiles`, `findLiveRecordSync`. No two-argument `recordPath`/`readRecord` caller is left in `src/` (`git grep`). |
| `ensureDaemon` R2/R4 | PASS | The no-sprint guard is gone. Step 1 checks the new record. Step 1b runs `liveRecord` on the legacy file, then `writeRecord`, then `removeRecordFile(legacy)`, and returns `reused: true` (`daemon.ts:321-331`). The wait loop polls only the new path. |
| `stopDaemon` | PASS | Handles every candidate file. The reason union no longer includes `no-active-sprint`. Precedence is stopped, then already-dead, then not-running (`daemon.ts:350-389`). |
| Sentinel valve removed (R5) | PASS | `DEFAULT_SENTINEL_INTERVAL_MS`, the option, the timer, the valve block and header item 3 are all gone. The idle valve is unchanged. `git grep sentinelInterval` in `src/` returns nothing. |
| `/healthz` (R6) | PASS | The same four keys. `sprintId` is resolved per request, and is `''` with no sprint (`serve.ts:134-142`). |
| `boundPort` | PASS | Not renamed. It is set from `server.address().port` on `listening` (`serve.ts:203`), and `handle.port` is a getter over it. |
| Pid-guarded teardown | PASS | `serve.ts:121`. The EADDRINUSE "reusing it" exit path can no longer delete the live daemon's record. |
| `sprint.ts` | PASS | `findLiveRecordSync` in `defaultDashboardStart`. The `--stop` no-sprint branch is deleted. The `--open` failure text and the hints match M1. The snapshot path (R9) is byte-identical. `sprint close` still calls `stopDaemon` (M1 decision 3). |
| `render.ts` C1 freeze | PASS | `render(data: SprintDashboardData)` is unchanged (`:803`). The four panel stubs (`:739-742`, `:790-801`) appear only as diff context. `defaultTab` is a new line after `statusText`. No element takes `id="backlog\|plan\|sprint"`. The tab CSS is after `.cg-diagnostics li`. |
| Gitignore (R3) | PASS | `scaffold/core/.gitignore:55-56`. `init.ts:495` adds `/.dashboard.json` and keeps the legacy line. The outer `.gitignore` is committed on outer `story/STORY-062-01` (`783934d6`, +2 lines). `git merge-tree sprint/S-44 story/STORY-062-01` is clean. |
| `cli.ts` registration (R1) | PASS (deviation noted in §4) | `sprint dashboard` is at `:460-490` and the top-level `dashboard` at `:492-522`. Both call `sprintDashboardHandler`. The hidden `--foreground` is on both. `spawnDaemon` still re-executes `sprint dashboard --serve --foreground`. `dashboard` is not in `GATED_COMMANDS` (`cli.ts:43`), so it is reachable for pre-member users. |

## 2. Cross-story fit — merge previews (`git merge-tree --write-tree`)

### STORY-062-02 (`7e24a97`) × `e5e3a5f`: CLEAN

- The merge exits 0 (tree `7380868`). There are no textual conflicts, including `render.node.test.ts`, because 01's QA-Red put its tests in new files.
- **Semantic check.** I built a synthetic merge commit of that tree in the scratch clone and ran:
  - `tsc --noEmit`: exit 0
  - nine targeted files, one invocation each, all green: `backlog` 5, `backlog.red` 18, `backlog-tab.red` 13, `render` 31, `tab-shell.red` 13, `dashboard-lifecycle.red` 19, `serve` 2, `cr101` 24, `cr102` 21
- **Who resolves:** nobody needs to. 02's integration is a plain `git merge --no-ff main` plus prebuild and its tests.

### STORY-062-04 (`39a513c`) — previewed against `e5e3a5f`, then against `e5e3a5f`+02 (its real integration base)

Against `e5e3a5f` alone, there are two conflicts. Against `e5e3a5f`+02 (simulated), there are three:

| # | File | Kind | Resolution |
|---|---|---|---|
| 1 | `src/dashboard/serve.ts:32` | import append/append: 01 adds `type AddressInfo` from `node:net`, 04 adds `randomBytes, timingSafeEqual` from `node:crypto` | Keep both lines. |
| 2 | `src/dashboard/render.ts:295` | CSS append/append after `.cg-diagnostics li`: 01 adds the tab-bar rules, 04 adds the `plan-*` rules | Keep both, 01's tab-bar block first. |
| 3 | `src/dashboard/render.ts:965` (only once 02 is on main) | Adjacent stub lines (M1 cross-story risk 5): main has 02's backlog block followed by the `cgRenderPlan` stub; 04 has the `cgRenderBacklog` stub, then `cgPlanToken`, then `PLAN_CLIENT` | Keep 02's block, then `cgPlanToken`, then `PLAN_CLIENT`. **Delete both stub lines.** |

**Who resolves:** the STORY-062-04 Developer, at 04's integration (rule 13). All three conflicts are in production `src/` files, so main's side wins and 04 re-applies its insertions. No test file conflicts, so QA-Red is not needed.

**Simulated resolution, in the scratch clone.** I applied exactly the table above:
- `tsc --noEmit`: exit 0
- 16 targeted files, all green: `plan` 9, `plan.red` 9, `plan-tab.red` 14, `plan-endpoint.red` 24, `plan-roundtrip.red` 2, the three `backlog*` files 5/18/13, `render` 31, `tab-shell.red` 13, `dashboard-lifecycle.red` 19, `serve` 2, `cr101` 24, `cr102` 21, `cr097` 13, `sprint.dashboard` 9

**Hazard in conflict 3 (the reason for the "delete both stubs" rule).** A naive keep-both leaves a later `function cgRenderX(d) { /* stub */ }` declaration in the script, and the later declaration wins silently. I tested both orders in the scratch clone:
- **Main side first (git's HEAD-first orientation).** The backlog stub follows 02's real `cgRenderBacklog`, so the Backlog tab goes dead. `backlog-tab.red` catches this (10 fail).
- **04 side first.** The plan stub follows `PLAN_CLIENT`, so the Plan tab goes dead. **No test catches this.** `plan-tab.red` stubs `getElementById → null` and tests only the pure helpers: 14/14 green.
- **Required post-resolution check for 04's integration:** `grep -cE '/\* STORY-062-0[24] \*/ \}' src/dashboard/render.ts` must print `0`.

**Other 04 fit notes (none blocking):**
- `plan-endpoint.red:116` and `plan-roundtrip.red:109` pass `sentinelIntervalMs: 0` inside an `as any` literal. That option is inert after 01, and `test/` is outside `tsc` (`tsconfig.json` `include: src/**`). No QA-Red edit is needed.
- 04's `serve.ts` comment "boundPort stays 0 under `port: 0`" is stale after 01 (`serve.ts:203`). `livePort(server, boundPort)` is still correct. The 04 Developer may fix the comment at integration.
- 04 rewrites both `sprint-dashboard/SKILL.md` copies byte-identically, with record path `.cleargate/.dashboard.json` and the valve marked as gone (`cmp` of the two copies: identical). Until 04 merges, `e5e3a5f`'s SKILL.md still documents the old per-sprint path. That is expected, and it is M1 risk 11.
- 01's poller reloads the page on an `active`/`sprintId` flip, which drops unsaved Plan-tab ticks. This was accepted in M1 risk 7, and Plan commits never flip `.active`.

## 3. Daemon and lifecycle — legacy adoption and the Gate 4 rebuild

**What is live right now (probed 2026-11-10 11:39 +04).** The dispatch premise is stale.

- There is **no ClearGate dashboard running**:
  - `.cleargate/sprint-runs/SPRINT-44/.dashboard.json` is absent
  - `.cleargate/.dashboard.json` is absent
  - nothing listens on 4714
  - `/healthz` on 4713-4722 shows no `root` matching this repo
- The only 0.27 daemon on the machine is pid 49837 on **4713**. It belongs to a different checkout (`.../BA_colleague_prototype/exadel-colleague-aidlc`, SPRINT-09). That is why this repo's dashboard had autoPort-scanned to 4714.
- The 0.27 SPRINT-44 daemon most likely exited through its idle valve, and its own teardown removed the legacy record.
- **So today the Gate 4 rebuild has nothing to adopt and nothing to orphan.**

**If a 0.27 daemon is started again before Gate 4, here are the outcomes:**

| Case | Outcome |
|---|---|
| 0.28 `dashboard --open` while `.active` = SPRINT-44 | Adopted and migrated: Step 1b writes the new record, drops the legacy one, and reuses the daemon (S4, tested). **Not orphaned.** The page served is still the 0.27 page (no tabs) until that daemon exits. |
| Close via `cleargate sprint close`, either binary | Stopped. `close_sprint.mjs` never clears `.active` (grep), so at `stopDaemon` time the legacy SPRINT-44 path is still a candidate for 0.28, and it is the only path 0.27 reads. |
| Close via `close_sprint.mjs` directly (the CLAUDE.md path) | No stop call. The 0.27 daemon keeps its own sentinel valve and exits within ~30 s of `.active` changing, or after 30 min idle. Not orphaned. |
| Global `cleargate` 0.27 (still on PATH until 0.28.0 is published and reinstalled) with a 0.28 daemon running | `sprint init` spawns a 0.27 child. The child scans 4713 (foreign), then 4714 (ours by `isOurs`, since the `/healthz` shape is unchanged), so it reuses that daemon and exits. That is one browser tab and no second server. 0.27 `sprint close` does not stop a 0.28 daemon, which is harmless because the idle valve reaps it. |
| Record-less "ours" daemon on the port (e.g. 0.28 `--open` in the ~30 s before a 0.27 daemon for a now-inactive sprint self-exits) | The 0.28 child sees "ours" and exits 0, and the parent times out after 5 s with "could not start the dashboard" (exit 1). Retrying after the old daemon exits works. This is a pre-existing CR-097 gap (M1 risk 10), not a regression. |

**Gate 4 walkthrough order (recommended to the orchestrator):** while `.active` still names SPRINT-44, run `node cleargate-cli/dist/cli.js dashboard --stop`. It retires any legacy 0.27 daemon. Then remove `.active` for Goal Check 1 and run `dashboard --open`. This makes sure the page under test is the 0.28 tab shell and not an adopted 0.27 page.

## 4. Accepted deviation — duplicate `cli.ts` registration (for Phase D.5 consolidation)

- `cli.ts:460-490` (`sprint dashboard`) and `:492-522` (`dashboard`) are two 31-line blocks that differ only in the parent and the description. Options, the hidden `--foreground`, the help text and the action are byte-identical.
- Risk: drift (one block edited, the other not). Today only the S2(a) help-parity test pins them together.
- D.5 fix: fold both into M1's `registerDashboardCommand(parent, description)`. No behaviour change. 03's `cli.ts` insertions (`:19`, `:413-430`) are disjoint.
- Not a FAIL.
- Owner decision to note at D.5, not for this story: under R1's "identical behaviour", a bare `cleargate dashboard` (no flags) is the snapshot path and exits 1 with no sprint.

## Advisory (non-blocking; follow-up candidates)

1. **Pid-only liveness on a record that now persists.**
   - `stopDaemon` (`daemon.ts:368-376`) and `findLiveRecordSync` (`:124-129`) trust `isAlive(pid)` without `isOurs`. M1 sanctioned this ("no root check, same as today").
   - The per-sprint record used to go out of use when the sprint changed. `.cleargate/.dashboard.json` is now read indefinitely.
   - After a reboot or SIGKILL, `--stop` or a successful `sprint close` can therefore SIGTERM a recycled same-user pid.
   - Follow-up: confirm `/healthz`'s `pid === rec.pid` before signalling.
2. **Record-less "ours" daemon.** `ensureDaemon` could adopt via `findPort(DEFAULT_PORT, cwd).reusable` before spawning, which closes the 5 s "could not start" case in §3.
3. **04's stale `boundPort` comment** (§2).

## Script Incidents

None. No wrapped script was invoked. The preview and semantic runs used `git merge-tree` and a scratch `git clone --shared`. Targeted tests ran with a short private `TMPDIR` (sprint-context Test Stack), because tsx's IPC pipe fails with EINVAL under a long `TMPDIR`.

flashcards_flagged:
- `2026-11-10 · #merge #dashboard · Client-script stub/fill conflict: drop BOTH stubs; a kept later 'function cgX' redeclaration silently wins.`
- `2026-11-10 · #dashboard #daemon · One long-lived .dashboard.json + pid-only isAlive in stopDaemon can SIGTERM a recycled pid after reboot.`
