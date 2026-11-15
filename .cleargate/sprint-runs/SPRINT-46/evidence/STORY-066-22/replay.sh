#!/usr/bin/env bash
# usage: CLI=<cli tree> EV=<evidence dir> bash replay.sh
set -u
unset ORCHESTRATOR_PROJECT_DIR CLAUDE_PROJECT_DIR CLEARGATE_STATE_FILE CLEARGATE_SPRINT_DIR CLEARGATE_REPO_ROOT RUN_SCRIPT_ACTIVE NODE_TEST_CONTEXT CLEARGATE_RED_FILES CLEARGATE_RED_SCENARIOS CLEARGATE_RED_BASE
SB=/Users/ssuladze/Documents/Dev
J=/Users/ssuladze/.claude/projects/-Users-ssuladze-Documents-Dev-cg-sandbox-s46-3b/1f09c2f8-3a49-4bc6-90d3-82999b2a067e/subagents/workflows/wf_d05eeb95-72e/journal.jsonl
mkdir -p "$EV"; cp "$J" "$EV/run6-journal.jsonl"
W=$(mktemp -d "${TMPDIR:-/tmp}/cg-proof-22-XXXX"); W=$(cd "$W" && pwd -P)
GC=(-c user.email=p@example.invalid -c user.name=Proof -c commit.gpgsign=false)
install() { # $1 = checkout on the sprint branch: scripts under test over the tracked copy, gate-checks.json kept
  rsync -a --exclude test/ --exclude gate-checks.json "$CLI/scaffold/core/.cleargate/scripts/" "$1/.cleargate/scripts/" \
    && git -C "$1" add .cleargate/scripts && git "${GC[@]}" -C "$1" commit -qm 'chore: install scripts under test'; }

# A. run 5a's STORY-001-04 seal, Claude session-worktree layout (parent on main, session on sprint/S-01)
A="$W/a"; git clone -q "$SB/cg-sandbox-s46" "$A"
git -C "$A" worktree add -q "$A/.claude/worktrees/s" -b sprint/S-01 162763d; S="$A/.claude/worktrees/s"
install "$S"; mkdir -p "$S/.cleargate/sprint-runs/SPRINT-01"; printf 'SPRINT-01\n' >"$S/.cleargate/sprint-runs/.active"
git -C "$S" worktree add -q "$S/.worktrees/STORY-001-04" -b story/STORY-001-04 sprint/S-01; T="$S/.worktrees/STORY-001-04"
git -C "$T" checkout -q 3dfcedf -- cmd/tally/main_test.go cmd/tally/top_red_test.go
(cd "$T" && git config user.email p@example.invalid && git config user.name Proof && git config commit.gpgsign false \
  && bash .cleargate/scripts/run_script.sh node .cleargate/scripts/seal_red.mjs STORY-001-04 --worktree . --sprint-branch sprint/S-01 -- cmd/tally/main_test.go cmd/tally/top_red_test.go) >"$EV/A1-seal.out" 2>&1; echo "exit $?" >>"$EV/A1-seal.out"
git -C "$T" status --porcelain --untracked-files=all >"$EV/A2-wt-status.txt"
{ tail -n 1 "$S/.cleargate/sprint-runs/SPRINT-01/pre-gate.jsonl"; command grep -n 'qa_red_lint\|R-volume' "$S/.cleargate/sprint-runs/SPRINT-01/reports/STORY-001-04-pre-arch-scan.txt"; } >"$EV/A3-records.txt" 2>&1

# B. run 6's STORY-001-04 re-seal, plain layout
B="$W/b"; git clone -q "$SB/cg-sandbox-s46-3b" "$B"
git -C "$B" checkout -q -b sprint/S-01 9c34251; install "$B"
mkdir -p "$B/.cleargate/sprint-runs/SPRINT-01"; printf 'SPRINT-01\n' >"$B/.cleargate/sprint-runs/.active"
git -C "$B" worktree add -q "$B/.worktrees/STORY-001-04" -b story/STORY-001-04 sprint/S-01; T="$B/.worktrees/STORY-001-04"
git -C "$T" checkout -q b842a61 -- cmd/tally/main_red_test.go cmd/tally/main_top_red_test.go
(cd "$T" && git config user.email p@example.invalid && git config user.name Proof && git config commit.gpgsign false \
  && bash .cleargate/scripts/run_script.sh node .cleargate/scripts/seal_red.mjs STORY-001-04 --worktree . --sprint-branch sprint/S-01 -- cmd/tally/main_red_test.go cmd/tally/main_top_red_test.go) >"$EV/B1-seal.out" 2>&1; echo "exit $?" >>"$EV/B1-seal.out"
git -C "$T" status --porcelain --untracked-files=all >"$EV/B2-wt-status.txt"
{ tail -n 1 "$B/.cleargate/sprint-runs/SPRINT-01/pre-gate.jsonl"; command grep -n 'qa_red_lint\|R-volume' "$B/.cleargate/sprint-runs/SPRINT-01/reports/STORY-001-04-pre-arch-scan.txt"; } >"$EV/B3-records.txt" 2>&1

# C. the runner fed run 6's three journal results verbatim
cat >"$W/c.mjs" <<'EOF'
import fs from 'node:fs'; import vm from 'node:vm'; import { pathToFileURL } from 'node:url';
const [cli, journal] = process.argv.slice(2);
const res = fs.readFileSync(journal, 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((d) => d.type === 'result').map((d) => d.result);
const { stagesFor } = await import(pathToFileURL(`${cli}/scaffold/core/.cleargate/scripts/segment_stages.mjs`).href);
const src = fs.readFileSync(`${cli}/scaffold/core/.cleargate/scripts/wave_runner.js`, 'utf8').replace(/^export const meta = /m, 'const meta = ');
const PASS = { Wiring: { result: 'APPROVED', issue: '' }, Build: { status: 'done', commit: 'devsha', blocker_section: 'none', notes: '' }, Verify: { result: 'PASS', defect_in: 'none', defects: [], commands_run: [], proof: 'pass' }, 'Post-flight': { result: 'PASS', issue: '' } };
const calls = []; let n = 0;
const agent = async (prompt, o) => { calls.push(`${o.phase}: ${o.label}`); return n < res.length ? res[n++] : PASS[o.phase]; };
const item = { id: 'STORY-001-04', lane: 'standard', base: 'sprint/S-01', upstream: [], stages: stagesFor('standard'), models: {}, runId: 'run-SPRINT-01-STORY-001-04-replay', file: '.cleargate/delivery/pending-sync/STORY-001-04_top_flag.md' };
const args = { sprintId: 'SPRINT-01', sprintBranch: 'sprint/S-01', bounceCap: 3, merged: [], worktreeCommands: [], items: [item] };
const ret = await vm.runInContext(`(async () => {\n${src}\n})()`, vm.createContext({ agent, parallel: (t) => Promise.all(t.map((f) => f())), log: (m) => calls.push(`log: ${m}`), args }));
console.log(JSON.stringify({ calls, verdict: ret.verdicts[0] }, null, 2));
EOF
node "$W/c.mjs" "$CLI" "$EV/run6-journal.jsonl" >"$EV/C1-runner.json" 2>&1; echo "exit $?" >>"$EV/C1-runner.json"
echo "scratch: $W"
