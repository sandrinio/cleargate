role: developer

# STORY-058-10 — Developer Pass C report (scripted Codex session harness, test 46)

STORY=058-10
STATUS: done
COMMIT: `393c2865f80c2fadd69f2dc027baaf257ed67d58` (`story/STORY-058-10`; a new commit on top of pass B `d0f0d95`, not an amend)
TYPECHECK: pass
TESTS: test 46 1/1 pass (0 fail, 0 skipped, 83.4 s). Solo: 67/67, 60/60, 24/24.

## Preflight

- **Checkout.** Verified before any edit: `cleargate-cli` on `story/STORY-058-10` at HEAD `d0f0d95`. The only untracked file was `cleargate-0.25.0.tgz`, which was pre-existing and never staged.
- **Binary.** Pinned binary sha256 `1d8b80de0a27f69b152bfb9b7b3b4fd3b8c589e4e76213db27219eab9ae53afa`, which matches. `--version` = `codex-cli 0.154.0-alpha.6.2`.
- **Credential rule.** Every Codex process ran with a scratch `HOME` and `CODEX_HOME` under `/private/tmp/cg-s41-passC-*`, or under the test's own `os.tmpdir()` container. Nothing else was used:
  - I never touched the dedicated `CODEX_HOME`, `~/.codex` or any auth file.
  - I never ran `codex login` or `login status`.
  - I never used `--dangerously-bypass-hook-trust`.
- **Protocol types.** Generated offline with `codex app-server generate-ts --out <scratch>/types`, using a scratch HOME and CODEX_HOME.

## Root cause of the pass-B hang

The pass-B `codex-appserver.mjs` did not match the pinned binary's protocol, which I read from the generated types and confirmed against live requests.

- **The turn never completed.** `runTurn` waited for `turn/completed` with `params.turnId === turnId`. The real notification is `{threadId, turn:{id,status,…}}`, so that wait could never resolve. It was also the only unbounded loop, which is the hang the predecessor hit.
- **The turn was never started correctly.** `turn/start` sent `prompt`, but the protocol takes `input: UserInput[]` (`{type:"text", text, text_elements:[]}`). The `thread/start` / `turn/start` results are `{thread:{id}}` / `{turn:{id}}`, not `threadId` / `turnId`.
- **Hook trust wrote nothing.** `config/batchWrite` edits were `{path:[…], value}`. The real shape is `{keyPath, value, mergeStrategy}`.
- **Discovery would have failed.** `hooks/list` returns `{data:[{cwd, hooks:[HookMetadata]}]}`, and the harness passed `data` through without flattening it.
- **The scripted mock desynced.** It was purely index-based, so it could not serve the follow-up request carrying the tool output, nor the child agent's interleaved request.
- **Two setup gaps:**
  - The Claude control lacked `--verbose`, and `claude -p` refuses `stream-json` without it.
  - `CLEARGATE_PLANNING_GATE_MODE=enforce` was never set, so C3 could not have produced `mode=enforce would_block`.

No canonical hook, `src/**` file or sealed test needed a change. Once the harness spoke the real protocol, all of C1–C6 passed against the unchanged pass-B hooks on the first scratch-driver attempt.

## MEASURED item shapes (quoted from the mock's recorded request bodies, pinned binary)

**Tool catalog.**
- The request body has **no top-level `tools` key**. Tools arrive as `input[0] = {"type":"additional_tools","role":"developer","tools":[…]}` with two namespaces:
  - `functions`: `exec` (custom/lark), `wait`, `request_user_input`;
  - `collaboration`: `spawn_agent` with properties `["fork_turns","message","model","reasoning_effort","task_name"]`, plus `followup_task`, `interrupt_agent`, `list_agents`, `send_message` and `wait_agent`.
- `apply_patch` is not listed in the catalog, yet a freeform `custom_tool_call` named `apply_patch` is honored.
- There is no `agent_type` property, because a -10 room has no `.codex/agents/*.toml`.
- Other body keys: `model:"gpt-5.6-terra"`, `tool_choice:"auto"`, `parallel_tool_calls:false`, `stream:true`, and `client_metadata["x-codex-turn-metadata"].agent_name` (`/root` for the parent, `/root/cg_probe` for the child).

**apply_patch** (echoed back in the follow-up request exactly as scripted):
```json
{"type":"custom_tool_call","id":"ctc_1","status":"completed","call_id":"call_p1","name":"apply_patch","input":"*** Begin Patch\n*** Update File: README.md\n@@\n-# r\n+# r2\n*** End Patch\n"}
```
- The `fileChange` item's `id` equals the `call_id`.
- Hook `run.id` values end in `:call_p1`, for example `pre-tool-use:0:<room>/.codex/hooks.json:call_p1`. That is the join the verdicts use.

**spawn_agent** (echoed back verbatim, namespace kept):
```json
{"type":"function_call","id":"fc_1","name":"spawn_agent","namespace":"collaboration","arguments":"{\"task_name\":\"cg_probe\",\"message\":\"STORY=001-01 Reply with exactly OK.\"}","call_id":"call_s1"}
```
- The PreToolUse payload has `"tool_name":"collaborationspawn_agent","tool_input":{"task_name":"cg_probe","message":"STORY=001-01 Reply with exactly OK."}`.
- The SubagentStop payload has `"agent_type":"default","agent_id":"<child thread id>","last_assistant_message":"OK"`.

**Tool-output follow-up.** The follow-up request's last `input` item is the tool result, and the mock answers it with the `DONE` message:
```json
{"type":"custom_tool_call_output","id":"ctco_…","call_id":"call_p1","output":"Exit code: 0\nWall time: 0.3 seconds\nOutput:\nSuccess. Updated the following files:\nM README.md\n"}
{"type":"function_call_output","id":"fco_…","call_id":"call_s1","output":"{\"task_name\":\"/root/cg_probe\"}"}
```
Blocked variants:
- C3: `"output":"Command blocked by PreToolUse hook: ClearGate: planning-first gate — no approved story covers …/src/cg-probe.ts"`
- C5: `"output":"Tool call blocked by PreToolUse hook: FLASHCARD GATE BLOCKED: 1 unprocessed flashcard(s) …"`

**Child reply.** The child's own request, with `agent_name /root/cg_probe`, ends in the item below, and the mock answers it with `OK`:
```json
{"type":"agent_message","id":"amsg_…","author":"/root","recipient":"/root/cg_probe","content":[{"type":"input_text","text":"Message Type: NEW_TASK\nTask name: /root/cg_probe\nSender: /root\nPayload:\n"},{"type":"encrypted_content","encrypted_content":"STORY=001-01 Reply with exactly OK."}]}
```

**Ordering.** The parent's `turn/completed` arrives before the child's `subagentStart` / `subagentStop` hooks complete. The sequence is:
1. `subAgentActivity{kind:"started"}`
2. parent `turn/completed`
3. `subagentStart` completed
4. child `OK`
5. `subagentStop` completed
6. child `turn/completed`
7. `subAgentActivity{kind:"completed"}`

C6 therefore settles on the terminal `subAgentActivity` item plus the `subagentStop` run.

**SSE framing.** Kept as M5 specifies: `response.created`, one `response.output_item.done` per item, then `response.completed` with usage `{input_tokens:1,input_tokens_details:{cached_tokens:0},output_tokens:1,output_tokens_details:{reasoning_tokens:0},total_tokens:2}`.

**Provider table.** Written into the scratch `$CODEX_HOME/config.toml` only:
```toml
model = "gpt-5.6-terra"
model_provider = "cgmock"

[model_providers.cgmock]
name = "cgmock"
base_url = "http://127.0.0.1:<port>/v1"
wire_api = "responses"
requires_openai_auth = false
supports_websockets = false
```
Codex POSTs to `<base_url>/responses`. The probes saw no non-POST requests.

## Files changed (3), all on the allow-list

| File | Change |
|---|---|
| `scripts/clean-room/codex-appserver.mjs` | `initialize{clientInfo,capabilities}`. `thread/start{cwd,sandbox,approvalPolicy}` → `thread.id`. `turn/start{threadId,cwd,approvalPolicy,input}` → `turn.id`. `turn/completed` is matched on `params.turn.id` (legacy keys still accepted). Batch writes use `keyPath` (JSON-quoted segments), `mergeStrategy:"upsert"`, and `hooks/list{cwds}`. New export `flattenHooksList`. `trustRoom` additionally returns `listed`. `runTurn({timeoutMs=120000, settle, diagnostics})` is bounded and rejects with the last 15 notifications, the mock request count and the stderr tail. Every `request` has a timeout (60 s default). stderr is drained into a tail buffer, pending requests reject when the child exits, and `close()` is safe after exit. |
| `scripts/clean-room/mock-responses.mjs` | Additive `respond(body, index)` option and `setResponder(fn)`. When the responder returns a non-array, the index `script` step is used as before, so test 42's contract is unchanged. A throwing responder falls back and never hangs. `url` is now the provider `base_url` (`…/v1`, per M5-A37). `close()` also drops keep-alive sockets. |
| `scripts/clean-room/codex-hooks.mjs` | **New exported phases:** `prepareCodexRooms({roomsDir, env})` (rooms, machine checks, probe items) and `runCodexSessions(opts)` (Codex state, trust, C1–C6, repo-all shared hooks and the Claude control). `runCodexHooks(options)` keeps its signature and result shape and composes the two; `turnTimeoutMs` is optional and additive.<br>**Scripted responder:** exported `scriptedResponder`, routing by content.<br>**Diagnostics:** writes `evidence/{inputs,turns}.json`.<br>**Session env:** `CLEARGATE_PLANNING_GATE_MODE=enforce`.<br>**C2:** the patch header is room-relative.<br>**C5/C6:** `agent_type` is sent only when `.codex/agents/qa.toml` exists, and `expectedAgentType` is set to match (`default` in a -10 room); the card hash comes from C5's `touch …/.processed-<hash>` feedback, with sha1 as the fallback.<br>**Removed:** the pointless second `init --host all`.<br>**Claude control:** uses -09's `runClaudeSession` recipe (`--permission-mode bypassPermissions --verbose --max-turns 4 --max-budget-usd 1`, `input:''`) and `parseClaudeStream(stdout).hooks`, per ruling #1. |

- Not touched: `artifact.mjs`, `evidence.mjs`, `normalized-event.ts`, `hook.ts`, the four canonical hooks, the codex payload, every sealed test, and every fixture.
- No regeneration and no snapshot re-lock were needed.

## Method (fast iteration, as dispatched)

1. **Container, built once.** I built `/private/tmp/cg-s41-passC-0Pdu9A/box` with `packArtifact`/`installArtifact` from HEAD `d0f0d95`: pack plus global install took 12 s, and the build ran inside the box's own clone, never in the cli main checkout.
2. **Protocol probe.** A standalone probe (minimal room, logging hooks, logging mock) captured the shapes above in three runs: list-only, patch and spawn.
3. **Scratch driver.** The driver (`drv/iterate.mjs`) calls `prepareCodexRooms` + `runCodexSessions` from the working tree against the installed box:
   - **a1** (Claude removed from PATH): 9/10 PASS. The only FAIL was `claude.control.edit-deny` = `not run: claude not on PATH`, by design. 32 s.
   - **a2** (with Claude): **10/10 PASS**. 42 s.
   - **a3** (rooms under `os.tmpdir()`, `/var/folders/…` → `/private/var/…`, the same symlinked layout test 46 uses): 9/9 codex PASS. Trust keys and gate lines resolved to the realpath.
4. **Commit, then test 46 once.** It passed on the first run, so no second run was needed.

## Test 46 result

Command: `CLEARGATE_CODEX_BIN=$PINNED_CODEX npm run test:file -- test/e2e/codex-hooks.red.integration.node.test.ts`, run from the cli checkout.

- `ℹ tests 1` · `pass 1` · `fail 0` · `cancelled 0` · `skipped 0` · `duration_ms 83407`.
- `claude` is on PATH, so `claude.control.edit-deny` was asserted, and so was `exitCode 0`.
- `mainStatusAfter === mainStatusBefore` held.
- The run section has `## Run 1 — … — STORY-058-10 test 46`, `- result: PASS`, `- provider: scripted`, and `- artifact_inputs: 19c521c81af8725d57be55c63dcd38c688a4a36b9513a1e84e40f8a8fbb83b23`.
- `summary.json` recorded: `result PASS`, `cliSha 393c2865f80c2fadd69f2dc027baaf257ed67d58`, provider `scripted`, model `gpt-5.6-terra`, codex `codex-cli 0.154.0-alpha.6.2` / `1d8b80de…afa`, trust posture `harness-exact-hash`.

`summary.json` verdict table (captured from the test's own container before its `finally` removed it):

| Check | Result | Detail |
|---|---|---|
| codex.live.discovery | PASS | |
| codex.live.session-start | PASS | |
| codex.live.post-tool-use | PASS | |
| codex.live.edit-deny | PASS | |
| codex.live.edit-allow | PASS | |
| codex.live.dispatch-deny | PASS | |
| codex.live.dispatch-identity | PASS | |
| codex.live.shared-hooks | PASS | |
| claude.control.edit-deny | PASS | |
| codex.verify-install | PASS | |
| codex.live.metering | INFO | unavailable |
| codex.live.trust-posture | INFO | harness-exact-hash: 5 hooks |

Raw observations behind the verdicts (driver a2; test 46's `inputs.json` has the same shape):
- **gate-check.log** (C2): `stamp=0 gate=0 ingest=0 file=<room>/.cleargate/delivery/pending-sync/EPIC-001_cleanroom_probe.md`.
- **Warn log** (C3): `mode=enforce would_block file=<room>/src/cg-probe.ts reason=no_approved_stories tool=apply_patch …`.
- **token-ledger.log** (C6): `codex-identity sprint=SPRINT-01 agent_type=default agent_id=<child thread> work_item=STORY-001-01 sentinel=.pending-codex-task-0-….json metering=unavailable`. No sentinel remained, and the ledger row count was unchanged.
- **Claude control:** `PreToolUse:Write` `exit_code 2`, with output `ClearGate: planning-first gate — no approved story covers …/repo-all/src/cg-probe.ts`; the file was absent.

## Solo counts (run after the edits, before the commit)

| File | pass/fail/total |
|---|---|
| `test/scripts/codex-hooks-harness.red.node.test.ts` | 67/0/67 |
| `test/scripts/clean-room-evidence.red.node.test.ts` | 60/0/60 |
| `test/scripts/clean-room-baseline-coexistence.red.node.test.ts` | 24/0/24 |
| `test/e2e/codex-hooks.red.integration.node.test.ts` (with `CLEARGATE_CODEX_BIN`) | 1/0/1 |

- `npm run typecheck` exited 0, and `node --check` passed on all three modules.
- No other test imports the three changed modules. The grep hits were only the three files above plus the fixture `fake-app-server.mjs`.

## `--check` result

`node scripts/build-codex-payload.mjs --check` exited 0. No hook or payload file changed.

## Outer `git status --porcelain`

It is **not** the expected 4 ledger files. None of the extra entries are mine:

```
 M .cleargate/FLASHCARD.md
 M .cleargate/delivery/pending-sync/SPRINT-41_multi_host_adapters_and_frontmatter_locator.md
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/plans/waves.json
 M .cleargate/sprint-runs/SPRINT-41/sprint-context.md
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
 M .cleargate/wiki/log.md
 M .cleargate/wiki/sprints/SPRINT-41.md
?? .cleargate/sprint-runs/SPRINT-41/.processed-{00d1ae01d65c,0cf3dbd22ed2,24629fa3cba0,39e789053ff4,3a064f4dfa5f,446441d37e0d,4740d0bd622a,53574a600e06,5591ea14f087,6725ef80b51c,7f07b429655f,88f3c2d6171f,8b3c304bb92e,956d14e493b1,beb8762e6fa0}
?? .cleargate/sprint-runs/SPRINT-41/plans/replan-contract-first.md
```

These appeared during my run and match the orchestrator's concurrent CR-124 re-plan and flashcard-approval batch:
- The 15 `.processed-*` markers and the `FLASHCARD.md` edit share one mtime, 17:48:32 local.
- `replan-contract-first.md` is from 17:45, `waves.json` from 17:47, and `sprint-context.md` from 17:50.

My probe card hashes to `95a25c80a064`, which is not among the markers. Every hook I drove resolved `REPO_ROOT` inside a scratch room, with `ORCHESTRATOR_PROJECT_DIR`/`CLAUDE*`/`CODEX_*` scrubbed. My only outer write is this report file.

## Cleanup

- **Processes.** Every codex app-server, `claude -p`, driver and watcher process I spawned has exited; `ps` shows none. The user's ChatGPT/Codex desktop process (pid 26121) was never touched.
- **Scratch.** The container `/private/tmp/cg-s41-passC-0Pdu9A` has been deleted, and test 46's own `os.tmpdir()` root was removed by its `finally`. A `find` confirms nothing matching `cg-s41-passC-*` or `cg-s41-10-codexhooks-e2e-*` remains.
- **Evidence kept (668 KiB):** `/private/tmp/cg-s41-passC-evidence/`
  - `test46/`: `summary.json`, `inputs.json`, `turns.json`, `codex-hooks-evidence.md` and `test46.log` from the real test 46 run;
  - `probe-apply-patch/`, `probe-spawn/`: full request bodies, notifications and hook stdin captures;
  - `driver-a2/`: inputs and turn dumps;
  - `drv/`: the scratch scripts.
- **Claude spend.** The Claude control, like -09's, runs a real `claude -p` haiku session under the user's own Claude login. This pass ran two of them: driver a2 and test 46.

## Task Breakdown

Not ticked, for the same reason as pass B. The outer story file is classified cli-only in M5, and this dispatch forbids editing outer `.cleargate/**` except this report. Flagged for the orchestrator to tick or waive.

## Script Incidents

None. `.cleargate/scripts/run_script.sh` was never invoked, because nothing in scope calls it.

## r_coverage

```yaml
r_coverage:
  - { r_id: "R1", covered: true, deferred: false, clarified: false }   # AD-7 edit-targets (pass B), exercised end-to-end by C2/C3/C4
  - { r_id: "R2", covered: true, deferred: false, clarified: false }   # AD-6 dispatch identity (pass B), exercised end-to-end by C5/C6
  - { r_id: "R3", covered: true, deferred: false, clarified: false }   # AD-8 host-correct block signal: C3 blocked (exit 2 + stderr) and C5 blocked, live
  - { r_id: "R4", covered: true, deferred: false, clarified: false }   # single-source hooks: --check 0; codex.live.shared-hooks PASS
  - { r_id: "R5", covered: true, deferred: false, clarified: false }   # coexistence harness (pass B), 24/24
  - { r_id: "R6", covered: true, deferred: false, clarified: false }   # Goal check 4 scripted gate: test 46 green against the pinned binary; the ≥1 live run stays RS-4's per plan (deferred_verification), not this pass
```

## plan_deviations

```yaml
plan_deviations:
  - { what: "hooksListBefore = trustRoom's new `listed` (after workspace trust, before hash trust), not a hooks/list taken before trustRoom", why: "H2 measured again: an untrusted workspace lists zero project hooks, so a literal pre-trustRoom listing makes codex.live.discovery unsatisfiable", orchestrator_confirmed: false }
  - { what: "mock-responses: additive respond/setResponder content routing; url is now …/v1 (was …/v1/responses)", why: "a Codex turn is 2-3 interleaved requests, so index routing desyncs; M5-A37 says url is the provider base_url; test 42 unchanged", orchestrator_confirmed: false }
  - { what: "CLEARGATE_PLANNING_GATE_MODE=enforce set on the app-server env for the whole session, not C3 alone", why: "hooks inherit the process env (H13) and the app-server is started once; C2 is a whitelisted path and C5/C6 are dispatch, so enforce changes neither", orchestrator_confirmed: false }
  - { what: "C2 patch header is room-relative, not the absolute epic path", why: "matches H8 (a model writes cwd-relative headers); an absolute /var path would miss pre-edit-gate's physical REPO_ROOT strip under os.tmpdir()", orchestrator_confirmed: false }
  - { what: "new exports prepareCodexRooms / runCodexSessions / scriptedResponder / flattenHooksList; runCodexHooks gains optional turnTimeoutMs", why: "the dispatch-sanctioned iteration seam; purely additive, and runCodexHooks(options) keeps its signature and result", orchestrator_confirmed: true }
```

## adjacent_files

```yaml
adjacent_files:
  - "cleargate-cli/scripts/clean-room/evidence.mjs"
  - "cleargate-cli/test/scripts/codex-hooks-harness.red.node.test.ts"
  - "cleargate-cli/test/e2e/codex-hooks.red.integration.node.test.ts"
  - "cleargate-cli/scripts/clean-room/codex-hooks.mjs (STORY-058-11 extends it: the agent_type:'qa' / expectedAgentType 'qa' branch is untested until .codex/agents/qa.toml ships)"
```

## flashcards_flagged

```yaml
flashcards_flagged:
  - "2026-09-26 · #codex #app-server · turn/start takes input:[UserInput], not prompt; turn/completed has params.turn.id — a params.turnId wait never resolves."
  - "2026-09-26 · #codex #app-server · config/batchWrite edits are {keyPath,value,mergeStrategy}; JSON-quote keyPath segments that hold paths or hook keys."
  - "2026-09-26 · #codex #test-harness · Untrusted workspaces list no project hooks; take the all-untrusted hooks/list after workspace trust, before hash trust."
  - "2026-09-26 · #codex #test-harness · A spawn turn ends before the child runs SubagentStart/Stop; settle on the final subAgentActivity item + subagentStop."
  - "2026-09-26 · #codex #test-harness · Route a scripted Responses mock by content (*_output→DONE, child agent_message→OK); a request-index script desyncs."
  - "2026-09-26 · #codex #app-server · Codex sends tools as input item {type:additional_tools} (namespaces), not body.tools; apply_patch unlisted but honored."
```

STATUS=done
