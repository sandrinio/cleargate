#!/usr/bin/env bash
# usage: CLI=<cli tree> EV=<evidence dir> bash replay.sh
set -u
unset ORCHESTRATOR_PROJECT_DIR CLAUDE_PROJECT_DIR CLEARGATE_STATE_FILE CLEARGATE_SPRINT_DIR CLEARGATE_REPO_ROOT RUN_SCRIPT_ACTIVE NODE_TEST_CONTEXT
mkdir -p "$EV"; W=$(mktemp -d "${TMPDIR:-/tmp}/cg-proof-21-XXXX"); W=$(cd "$W" && pwd -P)
printf '%s\n' '# example.invalid/tally/internal/tally [example.invalid/tally/internal/tally.test]' 'internal/tally/top_red_test.go:9:9: undefined: TopN' >"$W/vet.txt"
seed() { (cd "$1" && git init -q -b main && git config user.email p@example.invalid && git config user.name Proof && git config commit.gpgsign false
  mkdir -p .cleargate/scripts && cp -R "$CLI/scaffold/core/.cleargate/scripts/." .cleargate/scripts/ && rm -rf .cleargate/scripts/test
  printf '{ "schema_version": 1, "qa": { "typecheck": "", "debug_patterns": [], "todo_patterns": [], "test": "true" }, "arch": { "typecheck": "cat %s; exit 1", "new_deps_check": false, "stray_env_files": [], "file_count_report": false, "qa_red_lint": false }, "merge": { "prebuild": "", "post_test": "" } }\n' "'$W/vet.txt'" >.cleargate/scripts/gate-checks.json
  printf '.worktrees/\n.claude/\n' >.gitignore && printf 'base\n' >README.md && git add -A && git commit -qm base); }
state() { node -e 'const fs=require("fs"),p=require("path"),[f,id,st]=process.argv.slice(1);let s;try{s=JSON.parse(fs.readFileSync(f,"utf8"))}catch{s={schema_version:3,sprint_id:"SPRINT-01",sprint_status:"Active",last_action:"init",updated_at:"2026-11-15T00:00:00.000Z",stories:{}}}s.stories[id]={state:st,qa_bounces:0,arch_bounces:0,worktree:null,updated_at:"2026-11-15T00:00:00.000Z",notes:"",lane:"standard",lane_assigned_by:"architect",lane_demoted_at:null,lane_demotion_reason:null};fs.mkdirSync(p.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(s,null,2)+"\n")' "$1/.cleargate/sprint-runs/SPRINT-01/state.json" "$2" "$3"; }
red() { mkdir -p "$1/internal/tally" && printf 'package tally\n\nimport "testing"\n\nfunc TestTopN(t *testing.T) { _ = TopN }\n' >"$1/internal/tally/top_red_test.go"; }
seal() { (cd "$1" && bash .cleargate/scripts/run_script.sh node .cleargate/scripts/seal_red.mjs "$2" --worktree . --sprint-branch sprint/S-01 -- internal/tally/top_red_test.go); }
feat() { printf '%s\n' "$2" >"$1/feature-$2.txt" && git -C "$1" add -A && git -C "$1" commit -qm "feat: $2"; }

# A. plain checkout, 4a sequence
R="$W/plain"; mkdir -p "$R"; seed "$R"; cd "$R" && git checkout -q -b sprint/S-01
mkdir -p .cleargate/sprint-runs && printf 'SPRINT-01\n' >.cleargate/sprint-runs/.active; state "$R" STORY-901-01 'Ready to Bounce'
CLEARGATE_STATE_FILE="$R/.cleargate/sprint-runs/SPRINT-01/state.json" node .cleargate/scripts/validate_bounce_readiness.mjs STORY-901-01 >"$EV/A1-readiness.out" 2>&1; echo "exit $?" >>"$EV/A1-readiness.out"
git add .cleargate/sprint-runs && git commit -qm 'chore(SPRINT-01): kickoff artefacts'   # 4a e37d0de
git worktree add -q .worktrees/STORY-901-01 -b story/STORY-901-01 sprint/S-01; red .worktrees/STORY-901-01
seal .worktrees/STORY-901-01 STORY-901-01 >"$EV/A2-seal.out" 2>&1; echo "exit $?" >>"$EV/A2-seal.out"
git -C .worktrees/STORY-901-01 status --porcelain --untracked-files=all >"$EV/A3-wt-status.txt"
{ ls .cleargate/sprint-runs/SPRINT-01/reports; tail -n 2 .cleargate/sprint-runs/SPRINT-01/pre-gate.jsonl; tail -n 2 .cleargate/sprint-runs/SPRINT-01/reports/STORY-901-01-pre-arch-scan.txt; } >"$EV/A4-root-records.txt" 2>&1
state "$R" STORY-901-01 'QA Passed'
node .cleargate/scripts/merge_story.mjs STORY-901-01 --sprint SPRINT-01 >"$EV/A5-merge.json" 2>"$EV/A5-merge.err"; echo "exit $?" >>"$EV/A5-merge.err"

# B. Claude-managed session worktree of a parent checkout on main
P="$W/parent"; mkdir -p "$P"; seed "$P"; git -C "$P" worktree add -q "$P/.claude/worktrees/s" -b sprint/S-01; S="$P/.claude/worktrees/s"; cd "$S"
mkdir -p .cleargate/sprint-runs && printf 'SPRINT-01\n' >.cleargate/sprint-runs/.active; state "$S" STORY-901-02 'Ready to Bounce'
CLEARGATE_STATE_FILE="$S/.cleargate/sprint-runs/SPRINT-01/state.json" node .cleargate/scripts/validate_bounce_readiness.mjs STORY-901-02 >"$EV/B1-readiness.out" 2>&1; echo "exit $?" >>"$EV/B1-readiness.out"
git add .cleargate/sprint-runs && git commit -qm 'chore(SPRINT-01): kickoff artefacts'
git worktree add -q .worktrees/STORY-901-02 -b story/STORY-901-02 sprint/S-01; red .worktrees/STORY-901-02
seal .worktrees/STORY-901-02 STORY-901-02 >"$EV/B2-seal.out" 2>&1; echo "exit $?" >>"$EV/B2-seal.out"
git -C .worktrees/STORY-901-02 status --porcelain --untracked-files=all >"$EV/B3-wt-status.txt"
{ ls "$S/.cleargate/sprint-runs/SPRINT-01/reports"; tail -n 2 "$S/.cleargate/sprint-runs/SPRINT-01/pre-gate.jsonl"; echo "parent:"; ls -R "$P/.cleargate/sprint-runs"; } >"$EV/B4-records.txt" 2>&1
state "$S" STORY-901-02 'QA Passed'
node .cleargate/scripts/merge_story.mjs STORY-901-02 --sprint SPRINT-01 >"$EV/B5-merge.json" 2>"$EV/B5-merge.err"; echo "exit $?" >>"$EV/B5-merge.err"

# C. 4a's two files placed in a story worktree by hand (old scripts, other writers)
cd "$R"; git worktree add -q .worktrees/STORY-901-03 -b story/STORY-901-03 sprint/S-01; feat .worktrees/STORY-901-03 three
D3=.worktrees/STORY-901-03/.cleargate/sprint-runs/SPRINT-01; mkdir -p "$D3/reports"
printf 'HAND-PLACED REPORT\n' >"$D3/reports/STORY-901-03-pre-arch-scan.txt"; printf '{"ts":"hand","mode":"arch","item":null,"exit":0,"flagged_checks":[]}\n' >"$D3/pre-gate.jsonl"
state "$R" STORY-901-03 'QA Passed'
node .cleargate/scripts/merge_story.mjs STORY-901-03 --sprint SPRINT-01 >"$EV/C1-merge.json" 2>"$EV/C1-merge.err"; echo "exit $?" >>"$EV/C1-merge.err"
{ cat .cleargate/sprint-runs/SPRINT-01/reports/STORY-901-03-pre-arch-scan.txt; tail -n 1 .cleargate/sprint-runs/SPRINT-01/pre-gate.jsonl; } >"$EV/C2-records.txt" 2>&1

# D. sprint-2 shape: .active committed empty by a close, rewritten by the next init
printf '' >.cleargate/sprint-runs/.active && git add .cleargate/sprint-runs/.active && git commit -qm 'chore(SPRINT-01): close (Step 7.8 commits .active empty)'
printf 'SPRINT-01\n' >.cleargate/sprint-runs/.active
git worktree add -q .worktrees/STORY-901-04 -b story/STORY-901-04 sprint/S-01; feat .worktrees/STORY-901-04 four; state "$R" STORY-901-04 'QA Passed'
node .cleargate/scripts/merge_story.mjs STORY-901-04 --sprint SPRINT-01 >"$EV/D1-merge.json" 2>"$EV/D1-merge.err"; echo "exit $?" >>"$EV/D1-merge.err"
{ cat .cleargate/sprint-runs/.active; git status --porcelain -- .cleargate/sprint-runs/.active; } >"$EV/D2-active.txt"
echo "scratch: $W"
