#!/bin/bash
set -u
SRC=/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-066-14/cleargate-cli/scaffold/core/.cleargate/scripts
P=/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-066-14/probe-scratch
rm -rf $P; mkdir -p $P/.cleargate; cd $P
cp -R $SRC .cleargate/scripts
cat > .cleargate/scripts/gate-checks.json <<J
{"schema_version":1,"qa":{"typecheck":"","debug_patterns":[],"todo_patterns":[],"test":"true"},"arch":{"typecheck":"","new_deps_check":false,"stray_env_files":[],"file_count_report":false,"qa_red_lint":false},"merge":{"prebuild":"","post_test":""}}
J
git init -q -b main; git config user.email a@b.c; git config user.name x; git config commit.gpgsign false
printf '.cleargate/scripts/\n.worktrees/\n' > .gitignore
SD=.cleargate/sprint-runs/SPRINT-99; mkdir -p $SD
node -e '
const now="2026-11-15T09:00:00.000Z",s={};
for(const id of ["STORY-905-01","STORY-905-02","STORY-905-03"])s[id]={state:"QA Passed",qa_bounces:0,arch_bounces:0,worktree:null,updated_at:now,notes:"",lane:"standard",lane_assigned_by:"architect",lane_demoted_at:null,lane_demotion_reason:null};
require("fs").writeFileSync(".cleargate/sprint-runs/SPRINT-99/state.json",JSON.stringify({schema_version:3,sprint_id:"SPRINT-99",sprint_status:"Active",stories:s,last_action:"init",updated_at:now},null,2)+"\n")'
echo base > a.txt; git add -A; git commit -qm base
git checkout -qb sprint/S-99
mkdir -p $SD/.script-incidents; echo '{"a":1}' > $SD/.script-incidents/x.json
git add -A; git commit -qm "sprint base (tracked incident)"
mk(){ git worktree add -q .worktrees/$1 -b story/$1 sprint/S-99; (cd .worktrees/$1; echo $1 > f-$1.txt; git add -A; git commit -qm "feat: $1"); }
st(){ node -e 'console.log(JSON.parse(require("fs").readFileSync(".cleargate/sprint-runs/SPRINT-99/state.json")).stories[process.argv[1]].state)' $1; }
echo "=== Probe A: S11 deleted tracked incident file (905-01)"
mk STORY-905-01; rm .worktrees/STORY-905-01/$SD/.script-incidents/x.json
node .cleargate/scripts/merge_story.mjs STORY-905-01 --sprint SPRINT-99 2>/dev/null; echo "exit=$?"
ls .worktrees; git branch --list 'story/*'; echo state=$(st STORY-905-01)
echo "=== Probe B: half-finished (905-02): hand merge, worktree+branch remain"
mk STORY-905-02
git checkout -q sprint/S-99; git merge -q --no-ff -m "merge(story/STORY-905-02): STORY-905-02" story/STORY-905-02
H=$(git rev-parse HEAD); echo state_before=$(st STORY-905-02)
node .cleargate/scripts/merge_story.mjs STORY-905-02 --sprint SPRINT-99 2>/dev/null; echo "exit=$?"
echo "sprint HEAD unchanged: $([ $(git rev-parse sprint/S-99) = $H ] && echo yes || echo NO)"
ls .worktrees; git branch --list 'story/*'; echo state=$(st STORY-905-02)
echo "=== Probe C: re-run again (branch gone, already Done)"
node .cleargate/scripts/merge_story.mjs STORY-905-02 --sprint SPRINT-99 2>/dev/null; echo "exit=$?"
echo "=== Probe D: no-work branch (905-03)"
git branch story/STORY-905-03 sprint/S-99
node .cleargate/scripts/merge_story.mjs STORY-905-03 --sprint SPRINT-99 2>/dev/null; echo "exit=$?"; echo state=$(st STORY-905-03)
echo "=== Probe E: no args"
node .cleargate/scripts/merge_story.mjs 2>&1 | head -12; echo "exit=${PIPESTATUS[0]}"
git status --short | head
