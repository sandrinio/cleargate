# Milestone: distributable Codex executor bootstrap

role: architect

## Stories: STORY-058-12 bootstrap slice; BUG-089

## Wave: B0 qualification, B1 implementation, B2 dogfood

The owner's latest instruction authorizes autonomous technical decisions and an isolated baseline under `/Users/ssuladze/Documents/Dev/CG_TEST`. It supersedes the approval request in `codex-bootstrap-review.md`. No further bootstrap approval is required. This is a bounded implementation plan, not the full sprint SDR or permission to declare -12/-13 complete. `CLI_ROOT` is `/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/workspace/cleargate-cli`, never the original checkout. `META_ROOT` is `/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/workspace`. Reports remain at the parent's explicitly assigned durable destination.

## Order

1. DevOps supplies the isolated baseline and exact repository SHAs. Parent reconciles raw -12, sprint strategy and context with the approved wave executor; commit scoped work-item changes before story worktree creation.
2. Probe the pinned external Codex transport before promising its live capabilities. In parallel, QA-Red can specify deterministic executor and BUG-089 tests; these are separate file surfaces except CLI registration, which merges BUG-089 first.
3. BUG-089 shared signal → wrapper tests → QA verification. Implement executor against the qualified transport. Use separate native Codex QA/Developer/DevOps roles for this authorized bootstrap.
4. Test packed CLI in the isolated fixture, then run developmental dogfood. Installed-host integration and -13 final evidence remain after their existing payload/Claude-baseline prerequisites.

## Transport decision and qualification

Use Node `child_process.spawn` with argv, no shell command interpolation and no host SDK dependency: the configured absolute Codex binary runs `app-server` over stdio. ClearGate is the external client; its npm package contains the coordinator. Private conversation `functions`, `collaboration`, desktop task tools, or hidden MCP servers must never be runtime dependencies.

Official documentation describes stdio JSONL, the initialize/initialized handshake, thread start/resume, turn start and completion/interrupt. It separates stable methods from experimental opt-in. Use the stable surface and do not enable experimental capabilities automatically. The documentation also states that the app-server command and WebSocket transport are experimental and unsupported for production workloads; stable method availability does not waive that command-level maturity limit. Source: [Codex App Server](https://learn.chatgpt.com/docs/app-server), fetched 2026-09-12. Our new adapter remains experimentally qualified against its recorded binary, not production-certified.

`probe` records binary absolute path, version, SHA-256, protocol/schema identity where the binary exposes it, authenticated capability result without secrets, and model availability. Run two harmless role threads concurrently in a disposable fixture, observe distinct thread/turn IDs and completion, restart the client/server and read/resume persisted threads, and prove interrupt handling. A successful handshake alone is not a live dispatch probe. Smoke the requested Astra/Terra/Sol role models rather than silently substituting an available model. Inspect the pinned binary's emitted protocol schema/help for exact field names before coding request objects; do not assume today's documentation schema matches `0.154.0-alpha.6.2`.

Hook trust, edit denial and dispatch admission denial require separate live fixtures. Protocol requests returning successfully do not prove hooks fire. If the pinned binary cannot perform required operations, persist the precise unsupported method/model/gate result and stop live qualification; deterministic development remains useful, but do not fall back to a serial transport or mark a production run ready. Do not bypass trust or migrate personal credentials into fixtures implicitly.

## Per-story blueprint

### STORY-058-12

Cross-story coupling: CLI command registration with BUG-089; eventual HostAdapter integration with -03/-10; role/skill installation with -11; -13 consumes evidence. Keep this bootstrap independent of the future adapter registry by accepting an explicit executor config. Later host installation supplies that same config; no second engine.

Exact code paths, relative to `CLI_ROOT`:

| Path | Responsibility |
|---|---|
| `src/commands/workflow.ts` | `probe`, `run`, `resume`, `status` handlers with injected IO/process seams |
| `src/cli.ts` | Register `cleargate workflow` local commands |
| `src/workflow/types.ts` | Strict plan/config/journal/verdict schemas and typed interfaces |
| `src/workflow/codex-transport.ts` | Stdio framing, correlated RPC, events, timeouts, process death, approvals and reconnect |
| `src/workflow/journal.ts` | Exclusive writer lock, append/fsync, replay, snapshot cache, duplicate detection |
| `src/workflow/engine.ts` | Bounded wave scheduler, phase pipeline, barrier, recovery |
| `src/workflow/worktrees.ts` | Owning-root checks, argv Git operations, branch/base verification, merge receipt reconciliation |
| `src/workflow/roles.ts` | Full role instructions, models, context paths, role output parsing and dispatch identity |
| `src/workflow/gates.ts` | Existing script wrappers, actual exit checks, flashcard admission, state-command bridge |
| `test/workflow/engine.red.node.test.ts` | Sealed deterministic behavioral acceptance |
| `test/workflow/transport.red.node.test.ts` | Fake stdio process protocol/termination acceptance |
| `test/workflow/workflow.integration.node.test.ts` | Real disposable Git, restart/merge and packed-command smoke |
| `test/fixtures/workflow/fake-codex.mjs` | Process fixture emitting controlled JSONL, no real model calls |

Runtime code is bundled through the existing `src/cli.ts` tsup entry and shipped as `dist/cli.js`; package `files` already includes `dist` and `templates`. Do not introduce runtime imports from the development meta-repository. Existing build entry evidence: `cleargate-cli/tsup.config.ts:9-11`; shipping convention: `cleargate-cli/package.json` bin/files. No new npm dependency is needed.

After M1 relocation, the precise host-owned prose targets are `CLI_ROOT/scaffold/hosts/codex/.agents/skills/sprint-execution/SKILL.md` and adjacent `dispatch-codex.md`; translate into the actual installed `.agents/skills/sprint-execution/` layout through the existing payload builder. Do not hand-edit generated `templates`. Before relocation, keep bootstrap invocation in this plan/config; do not create a competing canonical scaffold tree. -11 supplies distributable roles. A temporary bootstrap config may reference the copied `.codex/agents` profiles in the isolated workspace, but packed validation must use self-contained installed instruction files and must fail if any original-machine path remains.

Proposed interfaces (implementation may split types without changing semantics):

```ts
type Role = 'architect' | 'qa-red' | 'developer' | 'qa-verify' | 'devops';
type Usage = { metering: 'unavailable' } |
  { metering: 'measured'; input: number; output: number;
    cache_creation: number; cache_read: number; model: string; source: string };
interface Transport {
  probe(): Promise<CapabilityReport>;
  startThread(spec: RoleDispatch): Promise<{ threadId: string }>;
  readThread(threadId: string): Promise<ThreadState>;
  resumeThread(threadId: string, spec: RoleDispatch): Promise<void>;
  startTurn(threadId: string, prompt: string): Promise<{ turnId: string }>;
  events(): AsyncIterable<TransportEvent>;
  interrupt(threadId: string, turnId: string): Promise<void>;
  close(): Promise<void>;
}
interface GateRunner {
  check(phase: string, context: StoryContext): Promise<GateResult>;
}
interface Journal {
  append(event: WorkflowEvent): Promise<void>;
  replay(): Promise<RunState>;
}
// runWave(plan, {transport, gates, journal, git, clock}) -> RunSummary
```

`cleargate workflow run --plan <absolute-json> --config <absolute-json>` creates a durable run; `resume --run <absolute-run-dir>` reuses it; `status --run ...` is read-only. `probe --config ...` writes a qualification artifact only to the designated fixture/report location. Config names absolute binary, dedicated host state, role instructions/models and default max parallelism 2. Plan names sprint ID, explicit own-repo root and base branch/SHA, ordered waves/story IDs, approved surfaces, absolute story/context/report paths and actual test commands. Validate uniqueness, containment, branch existence and file reachability before any spawn; reject ignored nested-source assumptions. No generic arbitrary shell-program plan language.

New executor data lives under `.cleargate/sprint-runs/<id>/workflow/<runId>/`: `manifest.json` (immutable config/plan hashes), `events.jsonl` (single-writer authority), derived `snapshot.json`, and transport/role reports. This journal is separate from the existing sprint event log; sprint transitions go only through existing commands/wrappers. Never write sprint `state.json` directly. Event identity includes monotonic sequence, stable run/story/phase/attempt IDs, actual thread/turn IDs, instruction/executor hashes, gate result and real commit/merge SHAs where available. Append intent before effects and completion after reconciliation. Reject divergent duplicates or mid-run plan/hash changes.

Recovery is at-least-once observation with effect reconciliation, not a promise of exactly-once RPC. A lost `turn/start` acknowledgement is ambiguous: inspect persisted thread turns, match the persisted dispatch identity and reconcile; never blindly replay. If effect identity cannot be established, mark recovery BLOCKED. Ignore only a demonstrably incomplete final journal record; corruption of a completed record fails closed. Lock contention rejects the second coordinator; stale-lock recovery requires proof its recorded local process is gone, not elapsed time alone.

Pipeline preserves Architect planning → QA-Red → conditional TPV → Developer → QA-Verify → conditional post-flight → barrier DevOps merge. Per-story roles run sequentially; disjoint stories run concurrently up to the bound. Stop admitting work on blocker, drain already-running segments, preserve GREEN siblings, process flashcards, merge eligible GREEN stories serially, then stop before the next wave. Never mutate `SKIP_FLASHCARD_GATE`; implement explicit executor admission checks and distinguish them from host hook denials. Hook negative-control evidence remains required separately.

Only a DevOps role can execute the merge/Done/teardown phase. Coordinator holds the shared branch lease while dispatching that role, verifies expected branch head and validated QA SHA, and records actual merge ancestry after return. On crash, inspect ancestry/receipt before dispatching any second merge. An unverified or conflicting head blocks. No remote push, sprint close, forced cleanup or destructive branch rewrite. Preserve untracked reports before teardown.

Reuse (no duplication): existing wrapper/script resolution (`src/commands/story.ts:26-34,59-62`), project-root resolution and state command route. Existing `story complete` couples checkout/merge/teardown/Done (`src/commands/story.ts:12-19`), so DevOps may use it only after its own gate and recovery checks; do not invoke it speculatively from coordinator. Reuse installed `launch_wave.mjs` vocabulary/validator through resolved payload paths where valid, without calling `launchWave` (which sets a Claude-only skip override at `.cleargate/scripts/launch_wave.mjs:290-303`). Keep default Claude validator behavior unchanged. Add a Codex validator branch explicitly allowing missing pre-commit SHAs on non-GREEN and unavailable metering; GREEN requires verified SHAs. Existing validator otherwise requires SHAs even for early blockers (`:64,140-145`) and measured token fields (`:163-175`). Persist run IDs: its helper mints fresh entropy (`:91-95`) and does not supply resume durability.

Test scenarios (all required): concurrent overlap with bounded admission; proper phase order/conditional scans; mixed GREEN/BLOCKED drains and suppresses next wave; resume skips completed phases; lost start acknowledgement does not duplicate edits; duplicate completion/merge receipt is idempotent; corrupt journal/lock contention/hash drift fails closed; real Git own-root isolation and serialized merge; rejected gate prevents a dispatch; unavailable usage creates no ledger row; malformed/missing-SHA GREEN fails; process death/invalid JSON/RPC errors/approval request interrupt rather than hang; packed CLI runs without original checkout paths. Use fake transport for deterministic faults, real Git for side effects, real pinned Codex for transport/enforcement qualification. Do not equate fixture green with live green.

### BUG-089

Exact CLI paths: `src/hooks/hook-signal.ts`, `src/commands/hook.ts`, `src/cli.ts`, `test/hooks/hook-signal.red.node.test.ts`, `test/scripts/test_pre_edit_gate.sh`. Canonical workspace paths before M1: `cleargate-planning/.claude/hooks/pre-edit-gate.sh`, `cleargate-planning/.claude/hooks/pending-task-sentinel.sh`, `cleargate-planning/.claude/settings.json`, and existing flashcard shell suites under `.cleargate/scripts/test/` with canonical mirrors. Update enforcement prose only for observed block-signal facts. Parent ensures amended raw surface list includes the sealed red filename.

Interface: `resolveHookSignal({host: 'claude', decision: 'block'|'allow'}): {exitCode: 0|2}` plus `cleargate hook signal <decision> --host claude`. Unknown host/invalid decision is an error; blocking shell branches convert resolver errors, missing CLI and any unexpected result to Claude exit 2. Explicitly pass host at settings boundary. Do not silently default an unknown host to allow. Codex mapping is not guessed here; -10 extends the same resolver after host qualification.

Preserve planning warn mode and active-sprint bypass, flashcard advisory/skip semantics, current matchers and all observability-only scripts. Only blocking branches currently at `pre-edit-gate.sh:163-166` and `pending-task-sentinel.sh:150-160` change signal path. Tests exercise true settings wiring, not just direct helper calls, and prove exact exit 2 for block, 0 for allow, missing resolver, unknown host, failed resolver and unexpected status. Retain diagnostic output. New real Claude session must demonstrate absence of forbidden edit/spawn plus permitted controls after exact backed-up fixture re-sync; a shell signal test alone cannot close BUG-089.

## QA and cutover

Run through the supplied absolute `run_script.sh`: package `npm run test:file -- <specific paths>`, relevant shell suites explicitly, then owning-package typecheck and required default suite. Fixtures must redirect project/sprint writes into CG_TEST; prior suites have written into the live delivery tree. Preserve user files and capture actual exit codes/incidents. Build/pack using the existing scripts; smoke installed `cleargate workflow --help`, probe, and fixture run outside the source checkout. No npm publication.

Switch only with zero active role turns, reconciled terminal/suspended journal records, completed GREEN merge receipts, processed flashcards, validated sprint events/state and preserved reports/worktrees. Record old/new executor, binary, profile and hook hashes; start fresh host sessions for hook changes. No hot-swapping a running wave. Development bootstrap qualification does not satisfy clean-room -13, Claude regression baseline, or full sprint goal. Keep those gates open until observed.

## Decisions and limitations

No open implementation-choice question remains. Runtime capability and authentication/trust availability are measurements, not assumptions. Fresh standalone artifact qualification retains -13's existing pin unless the owner-authorized approach is explicitly amended by the parent with evidence. This plan creates no new dependency, no SDK import and no remote write. It is the only file edited by this Architect dispatch; no execution or production checks have been claimed.
