#!/usr/bin/env bash
# usage: CLI=<cli tree> EV=<dir> bash caseE.sh   (E1 untracked sprint dir, E2 committed sprint dir => state.json ' M')
set -u
unset ORCHESTRATOR_PROJECT_DIR CLAUDE_PROJECT_DIR CLEARGATE_STATE_FILE CLEARGATE_SPRINT_DIR CLEARGATE_REPO_ROOT RUN_SCRIPT_ACTIVE NODE_TEST_CONTEXT
mkdir -p "$EV"; W=$(mktemp -d "${TMPDIR:-/tmp}/cg-e-XXXX"); W=$(cd "$W" && pwd -P)
mk() { R="$W/$1"; mkdir -p "$R"; cd "$R" && git init -q -b main && git config user.email p@example.invalid && git config user.name P && git config commit.gpgsign false
  mkdir -p .cleargate/scripts && cp -R "$CLI/scaffold/core/.cleargate/scripts/." .cleargate/scripts/ && rm -rf .cleargate/scripts/test
  printf '{ "schema_version": 1, "qa": { "typecheck": "", "debug_patterns": [], "todo_patterns": [], "test": "true" }, "arch": { "typecheck": "", "new_deps_check": false, "stray_env_files": [], "file_count_report": false, "qa_red_lint": false }, "merge": { "prebuild": "", "post_test": "" } }\n' >.cleargate/scripts/gate-checks.json
  printf '.worktrees/\n' >.gitignore; printf base >README.md
  mkdir -p .cleargate/sprint-runs/SPRINT-01; printf 'SPRINT-01\n' >.cleargate/sprint-runs/.active
  node -e 'const fs=require("fs");fs.writeFileSync(process.argv[1],JSON.stringify({schema_version:3,sprint_id:"SPRINT-01",sprint_status:"Active",last_action:"init",updated_at:"2026-11-15T00:00:00.000Z",stories:{"STORY-905-01":{state:"QA Passed",qa_bounces:0,arch_bounces:0,worktree:null,updated_at:"2026-11-15T00:00:00.000Z",notes:"",lane:"standard",lane_assigned_by:"architect",lane_demoted_at:null,lane_demotion_reason:null}}},null,2)+"\n")' .cleargate/sprint-runs/SPRINT-01/state.json
  [ "$2" = committed ] && git add -A || git add README.md .gitignore .cleargate/scripts
  git commit -qm base; git checkout -q -b sprint/S-01
  git worktree add -q .worktrees/STORY-905-01 -b story/STORY-905-01 sprint/S-01
  (cd .worktrees/STORY-905-01 && printf f >feat.txt && git add feat.txt && git commit -qm feat)
  D=.worktrees/STORY-905-01/.cleargate/sprint-runs/SPRINT-01; mkdir -p $D/reports
  printf '{"ts":"wt-event"}\n' >$D/events.jsonl; printf 'WT REPORT\n' >$D/reports/STORY-905-01-pre-arch-scan.txt
  if [ "$2" = committed ]; then node -e 'const fs=require("fs"),f=process.argv[1];const s=JSON.parse(fs.readFileSync(f));s.last_action="wt-edit";fs.writeFileSync(f,JSON.stringify(s,null,2)+"\n")' $D/state.json
  else printf '{}\n' >$D/state.json; fi
  git -C .worktrees/STORY-905-01 status --porcelain --untracked-files=all >"$EV/$1-wt-status.txt"
  rootev_before=$( [ -f .cleargate/sprint-runs/SPRINT-01/events.jsonl ] && wc -l <.cleargate/sprint-runs/SPRINT-01/events.jsonl || echo none)
  node .cleargate/scripts/merge_story.mjs STORY-905-01 --sprint SPRINT-01 >"$EV/$1-merge.json" 2>"$EV/$1-merge.err"; echo "exit $?" >>"$EV/$1-merge.err"
  { echo "events before: $rootev_before"; echo "root events.jsonl:"; cat .cleargate/sprint-runs/SPRINT-01/events.jsonl 2>&1; echo "report:"; cat .cleargate/sprint-runs/SPRINT-01/reports/STORY-905-01-pre-arch-scan.txt 2>&1; echo "worktree dir exists?"; ls -d .worktrees/STORY-905-01 2>&1; echo "validate_state:"; CLEARGATE_STATE_FILE=$R/.cleargate/sprint-runs/SPRINT-01/state.json node .cleargate/scripts/validate_state.mjs 2>&1; echo "exit $?"; } >"$EV/$1-after.txt" 2>&1
}
mk E1 untracked; mk E2 committed; echo "scratch: $W"
