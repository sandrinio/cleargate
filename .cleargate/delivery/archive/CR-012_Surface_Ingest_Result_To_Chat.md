---
cr_id: CR-012
parent_ref: EPIC-002
parent_cleargate_id: EPIC-002
sprint_cleargate_id: SPRINT-15
status: Completed
sprint: SPRINT-15
milestone: M4
approved: true
approved_at: 2026-04-29T00:00:00Z
approved_by: sandrinio
created_at: 2026-04-26T00:00:00Z
updated_at: 2026-04-26T00:00:00Z
created_at_version: cleargate@0.5.0
updated_at_version: cleargate@0.5.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-30T12:18:15Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
context_source: |
  User direct request 2026-04-26 — proposal gate waived (sharp intent; user explicitly
  asked for a CR after I surfaced the gap).

  Conversational walkthrough of the ingest chain (`.claude/hooks/stamp-and-gate.sh`)
  exposed two coupled problems:
    1. The PostToolUse hook redirects ALL stdout/stderr of the three sub-commands
       (`stamp-tokens`, `gate check`, `wiki ingest`) to `.cleargate/hook-log/gate-check.log`
       via `>>"$LOG" 2>&1`, then unconditionally `exit 0`. A failed ingest (SR3 ≠ 0) leaves
       the wiki silently stale and never reaches the calling agent's context.
    2. The user asked: "Will AI tell me that something was ingested successfully or
       failed?" Today the answer is no — there is no return path from the hook to the
       conversation. The agent that wrote the file has no signal until somebody runs
       `cleargate doctor` or tails the log manually.

  Companion to CR-008 (planning-first stdout routing) and CR-009 (hook resolver pin):
  both upstream fixes ensure the hooks fire and produce signal; this CR ensures the
  signal reaches the human-in-the-loop and the AI orchestrator.
stamp_error: no ledger rows for work_item_id CR-012
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-30T12:18:14Z
  sessions: []
---

# CR-012: Surface Wiki-Ingest Result to Chat (Hook → Conversation Return Path)

## 0. Live Evidence (Why Now)

This session, 2026-04-26, walking the ingest chain with the user. Tail of the live log:

```
❌ repro-steps-deterministic: section 2 has 0 listed-item (≥3 required)
wiki ingest: create bugs/BUG-009.md
[2026-04-26T11:33:22Z] stamp=0 gate=1 ingest=0 file=…/BUG-009_…md
```

The gate failed (`gate=1`) and a wiki page was created anyway (`ingest=0`) — both correct per current design. **Neither result was surfaced to the agent that wrote the file.** I (the conversational agent) only learned the gate had failed because the user asked and I read the log file myself. In an unattended four-agent loop (architect → developer → qa), nothing reads `.cleargate/hook-log/gate-check.log` between spawns. A silent ingest failure (SR3 ≠ 0) — e.g. malformed frontmatter, unrecognised filename prefix, repo-tag derivation error — would let the loop continue against a stale wiki without anyone noticing until session-start the next day.

The CR-009 thesis applies recursively: *silent no-op = invisible failure*. CR-009 fixed it for the resolver chain (does the CLI exist?). This CR fixes it for the operation result (did the CLI command succeed?).

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- "PostToolUse hooks are a side-channel — their job is to log, not to communicate." False for ingest. The wiki is part of the active context surface (every session-start orientation step depends on it); a failed update is operationally identical to a stale wiki, which the orchestrator may then read and act on.
- "`exit 0` on the hook is correct because severity enforcement lives in `cleargate-wiki-lint`." Half-true. Lint runs only at Gate 1 / Gate 3 — manual, infrequent. Between gate runs, the wiki can drift silently for hours or days. The hook needs at least a non-blocking *signal*, even if it doesn't *block*.
- "The agent that wrote the file doesn't need to know whether ingest succeeded." False. An agent making sequential edits to related work items (e.g. an Architect writing an EPIC then its Stories) should see "wiki updated for parent" before drafting the children, so cross-references resolve.

**New Logic (The New Truth):**

Three changes — they ship together.

**Change 1 — Hook emits a one-line result block to stdout (in addition to the log).**

`stamp-and-gate.sh` currently routes `>>"$LOG" 2>&1` for each sub-command. Replace with a `tee` pattern: each sub-command's output goes to BOTH the log file AND stdout. The trailing `[$TS] stamp=$SR1 gate=$SR2 ingest=$SR3 file=$FILE` summary is also written to stdout.

PostToolUse stdout in Claude Code surfaces as a `<system-reminder>`-style block visible to the model on the tool result. This is the same routing CR-008 establishes for its planning-first reminder; this CR rides on that infrastructure. **If CR-008 has not yet shipped, this CR's stdout-surfacing change is dormant** — log-only behaviour persists.

**Change 2 — Severity-aware exit-code policy on ingest failure (still non-blocking).**

The hook's terminal `exit 0` is preserved (we still don't want to block the user's Edit/Write). But:
- If `SR3 ≠ 0` (ingest failed), the hook writes a sentinel file: `.cleargate/hook-log/.ingest-fail-<id>` containing the timestamp + raw_path + last 20 lines of ingest stderr.
- `cleargate doctor --session-start` reads `.cleargate/hook-log/.ingest-fail-*` and surfaces them in the doctor block at next session boot, prefixed `🔴 stale wiki: <id> — last ingest failed <timestamp>. Re-run: cleargate wiki ingest <path>`.
- A successful re-ingest (SR3 = 0) deletes the corresponding sentinel.

Net: failures persist across sessions until resolved, even when the original hook fire produced no in-session signal (e.g. user closed the laptop).

**Change 3 — AI orchestrator behaviour codified in CLAUDE.md.**

Add one bullet to `CLAUDE.md` (within the `<!-- CLEARGATE:START -->` block) under "Conversational style":

> After Writing or Editing any file under `.cleargate/delivery/**`, briefly note the ingest result if the PostToolUse hook surfaced one — one short sentence (`✅ ingested as <bucket>/<id>.md` / `⚠️ gate failed: <criterion>` / `🔴 ingest error — see .cleargate/hook-log/gate-check.log`). Do not narrate when nothing fired (skip-excluded paths). This is conversational confirmation, not retry logic.

This is a behavioural spec, not code. It only takes effect once Change 1 is shipped (the AI has nothing to report otherwise).

## 2. Blast Radius & Invalidation

- [x] Invalidate/Update Story: none direct. Patch is to one hook script + one CLI subcommand (`doctor --session-start`) + one CLAUDE.md bullet.
- [x] Invalidate/Update Epic: parent is **EPIC-002** (Knowledge Wiki). The wiki's reliability story now spans ingest (SPRINT-04), lint (SPRINT-04), and operational signal (this CR).
- [x] CR-008 dependency: Change 1 is dormant until CR-008's stdout-routing fix lands (the hook can `echo` to stdout but Claude Code only surfaces it once CR-008 has wired the conduit). Sequencing: CR-008 ships first or concurrently. If CR-008 slips, this CR still ships Change 2 (sentinel + doctor surface) and Change 3 (CLAUDE.md bullet, with caveat noting it's a no-op until CR-008 lands).
- [x] CR-009 interaction: CR-009 ensures the CLI is *resolvable*; this CR ensures the result of an *invocation* is surfaced. They compose cleanly.
- [x] BUG-008 / BUG-009 visibility: both bugs surfaced in the live log because I (a human-in-the-loop) tailed `gate-check.log` deliberately. Post-CR-012, the same gate failures surface in chat at the moment they fire — no log-tailing required.
- [ ] Database schema impacts: **No.**
- [ ] FLASHCARD impact: add card on completion — *"Hook results that affect the wiki must reach the conversation, not just the log file. Silent SR3 ≠ 0 = stale wiki nobody knows about until next session-start."* Tags: `#hooks #wiki #observability`.
- [ ] Manifest impact: `cleargate-planning/MANIFEST.json` entry for `stamp-and-gate.sh` rev bumps; `overwrite_policy` per CR-009's pin-aware decision.
- [ ] Cross-repo: existing downstream installs ship pre-fix. They keep silent-fail behaviour until `cleargate upgrade` lands (per CR-009 ship note).
- [ ] **Risk: stdout volume.** Three sub-commands × verbose mode = potentially 30+ lines per Edit. Mitigation: `stamp-tokens` + `gate check` + `wiki ingest` already produce tight one-to-three-line outputs in the live log; cap stdout at 20 lines via `tail -20` if needed. If a sub-command produces large output (rare), it stays log-only.

## 3. Execution Sandbox

**Modify:**

- `cleargate-cli/templates/cleargate-planning/.claude/hooks/stamp-and-gate.sh:23-31`
  - Replace each `>>"$LOG" 2>&1` redirection with `2>&1 | tee -a "$LOG"`. Capture the *original* exit code via `${PIPESTATUS[0]}` (bash) — the `tee` swallows it otherwise.
  - On `SR3 ≠ 0`: write sentinel file `.cleargate/hook-log/.ingest-fail-<id>` with timestamp + raw_path + last 20 stderr lines (`tail -20`).
  - On `SR3 = 0` AND `id` is known: remove any pre-existing `.cleargate/hook-log/.ingest-fail-<id>` (recovery case).
  - Preserve terminal `exit 0`.
- `.claude/hooks/stamp-and-gate.sh` (the live dogfood copy in the meta-repo) — same patch.
- `cleargate-cli/src/commands/doctor.ts`
  - Extend `--session-start` mode: glob `.cleargate/hook-log/.ingest-fail-*`, emit one `🔴 stale wiki: <id> …` line per sentinel. Token budget (per `cleargate-protocol.md` §464: ≤100 tokens / ≤10 items + overflow pointer) applies — sentinels share the doctor budget with existing blocked-items, so cap at 5 sentinels + overflow pointer (`…and N more — see .cleargate/hook-log/`).
- `CLAUDE.md` (within the `<!-- CLEARGATE:START -->` block, under "Conversational style.")
  - Add the one-bullet behavioural rule from §1 Change 3 verbatim.
- `cleargate-planning/CLAUDE.md` (the canonical scaffold copy) — mirror.

**Tests:**

- `cleargate-cli/test/hooks/stamp-and-gate.tee.test.sh` (new) — smoke test asserting:
  - On a clean ingest, stdout contains `wiki ingest: create|update <bucket>/<id>.md` AND the log gets the same line.
  - On a forced ingest failure (e.g. raw file with malformed frontmatter), `.cleargate/hook-log/.ingest-fail-<id>` exists post-run, terminal exit code is still 0, and stdout contains the failure line.
  - On a recovery ingest (failure → fix → re-edit), the sentinel file is gone after the second hook fire.
- `cleargate-cli/test/commands/doctor.session-start.sentinels.test.ts` (new) — given N sentinel files in a temp `.cleargate/hook-log/`, doctor surfaces them in the session-start block, capped per the protocol budget.
- Manual smoke (matches user's question scenario):
  ```bash
  # Trigger the existing failing-gate condition from the live log
  echo '---\nbug_id: BUG-X\n# malformed: no closing ---' > .cleargate/delivery/pending-sync/BUG-X.md
  # Observe stdout in the session — should see gate / ingest one-liners
  # Observe sentinel: ls .cleargate/hook-log/.ingest-fail-*
  # Run doctor: cleargate doctor --session-start  → should list BUG-X
  # Fix the file; re-edit; observe sentinel removed
  ```

**Out of scope:**

- Making the hook *block* on ingest failure. This is an observability CR, not an enforcement CR. Blocking enforcement remains the lint agent's job at Gate 1 / Gate 3.
- Streaming intermediate stdout during long sub-commands. The three current sub-commands are fast (<1s typical); streaming buys nothing.
- Building a TUI dashboard for wiki health. Sentinel files + doctor surface are the MVP; a richer UI is a separate epic if ever justified.
- Changing `cleargate-wiki-lint`'s scope. Lint stays manual / pre-gate; this CR explicitly chooses the cheaper signal-only path.

## 4. Verification Protocol

**Acceptance:**

1. **Successful ingest is visible in chat:**
   - In a Claude Code session in this repo, Edit `.cleargate/delivery/pending-sync/CR-012_Surface_Ingest_Result_To_Chat.md` (this file).
   - The PostToolUse tool result includes a system-reminder block containing `wiki ingest: update crs/CR-012.md` (assuming CR-008 stdout routing is live).
   - The conversational agent then emits one short confirmation line per the new CLAUDE.md bullet.

2. **Failed ingest leaves a sentinel and a chat signal:**
   - Construct a malformed delivery file (broken frontmatter); Edit it via the tool.
   - PostToolUse stdout shows `wiki ingest: malformed frontmatter in …` AND `[ts] stamp=0 gate=? ingest=1`.
   - `ls .cleargate/hook-log/.ingest-fail-*` returns one entry containing timestamp + path + tail of stderr.
   - Hook still exits 0 (the user's Edit is not blocked).

3. **Doctor surfaces the sentinel at next session start:**
   - Open a fresh Claude Code session.
   - SessionStart hook fires `cleargate doctor --session-start`; the system message includes `🔴 stale wiki: BUG-X — last ingest failed <ts>. Re-run: cleargate wiki ingest <path>`.
   - Within the doctor budget (≤10 items, sentinels capped at 5).

4. **Recovery deletes the sentinel:**
   - Fix the malformed file (valid frontmatter); Edit it again.
   - Hook fires; `ingest=0`; sentinel file is removed.
   - Next session-start no longer lists the stale entry.

5. **CR-008 dormancy guard:**
   - With CR-008 not shipped, hook stdout is captured by Claude Code's tool-result channel but not surfaced to the model — verify by reading hook-log: still gets the tee'd output. Sentinel mechanism still works (Change 2 has no CR-008 dependency).

**Test commands:**

- `cd cleargate-cli && npm run typecheck && npm test` — green.
- `cd cleargate-cli && npm test -- doctor.session-start.sentinels` — focused.
- `bash cleargate-cli/test/hooks/stamp-and-gate.tee.test.sh` — shell smoke.
- Manual smoke per acceptance steps 1–4 above.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟡 Medium Ambiguity**

Requirements to pass to Green (Ready for Execution):

- [x] "Obsolete Logic" to be evicted is explicitly declared (silent-log premise; lint-only-at-gate premise; agent-doesn't-need-to-know premise).
- [x] All impacted downstream Epics/Stories/CRs identified (EPIC-002, CR-008 dependency, CR-009 composition).
- [x] Execution Sandbox contains exact file paths + line ranges.
- [x] Verification command and acceptance scenarios provided.
- [ ] Confirm the `tee` + `${PIPESTATUS[0]}` pattern works inside Claude Code's hook execution shell (POSIX sh vs. bash). If only POSIX sh is guaranteed, fall back to a temp-file capture pattern. Recommendation: bash is already required for the existing hook (`#!/usr/bin/env bash` line 1) — `${PIPESTATUS[0]}` is safe.
- [ ] Confirm the sentinel-file naming scheme (`.ingest-fail-<id>`) — `<id>` may be unknown if bucket derivation itself fails. Fallback: hash the raw path (`shasum`) and use `.ingest-fail-<hash>`.
- [ ] Confirm doctor's session-start budget can absorb up to 5 sentinel lines without pushing existing blocked-items past the ≤10 cap. If not, drop sentinel cap to 3.
- [ ] Decide whether the CLAUDE.md bullet (Change 3) ships in this CR or in a follow-up doc-only PR. Recommendation: in scope — it's three lines.
- [ ] `approved: true` is set in the YAML frontmatter.
