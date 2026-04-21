#!/usr/bin/env bash
# pre_gate_common.sh — Shared helpers for pre_gate_runner.sh
# Sourced by pre_gate_runner.sh. Do NOT execute directly.
# Handles Node+TS stacks only (no Python/Rust/Go/Java/Swift detectors).
set -euo pipefail

# ---------------------------------------------------------------------------
# read_config_field <field_path> <config_file>
# Uses node -p to parse JSON and extract a field.
# field_path: dot-separated path, e.g. "qa.typecheck"
# ---------------------------------------------------------------------------
read_config_field() {
  local field_path="$1"
  local config_file="$2"
  node -p "
    const c = JSON.parse(require('fs').readFileSync('${config_file}', 'utf8'));
    const parts = '${field_path}'.split('.');
    let v = c;
    for (const p of parts) { v = v[p]; }
    Array.isArray(v) ? JSON.stringify(v) : (v === undefined ? '' : String(v));
  " 2>/dev/null || echo ""
}

# ---------------------------------------------------------------------------
# get_modified_files <worktree_path>
# Lists files modified in the current git index vs HEAD.
# ---------------------------------------------------------------------------
get_modified_files() {
  local worktree="$1"
  git -C "$worktree" diff --name-only HEAD 2>/dev/null || true
  git -C "$worktree" diff --cached --name-only 2>/dev/null || true
}

# ---------------------------------------------------------------------------
# get_staged_diff <worktree_path>
# Returns unified diff of staged changes.
# ---------------------------------------------------------------------------
get_staged_diff() {
  local worktree="$1"
  git -C "$worktree" diff --cached 2>/dev/null || git -C "$worktree" diff HEAD 2>/dev/null || true
}

# ---------------------------------------------------------------------------
# record_result <report_file> <check_name> <status> [details]
# Appends one result line to the report.
# status: PASS | FAIL | WARN | INFO
# ---------------------------------------------------------------------------
record_result() {
  local report_file="$1"
  local check_name="$2"
  local status="$3"
  local details="${4:-}"
  echo "[${status}] ${check_name}: ${details}" >> "$report_file"
}

# ---------------------------------------------------------------------------
# print_summary <report_file>
# Prints count of PASS/FAIL/WARN lines from the report.
# ---------------------------------------------------------------------------
print_summary() {
  local report_file="$1"
  local pass_count fail_count warn_count
  pass_count=$(grep -c '^\[PASS\]' "$report_file" 2>/dev/null || echo 0)
  fail_count=$(grep -c '^\[FAIL\]' "$report_file" 2>/dev/null || echo 0)
  warn_count=$(grep -c '^\[WARN\]' "$report_file" 2>/dev/null || echo 0)
  echo "Summary: ${pass_count} passed, ${fail_count} failed, ${warn_count} warnings"
}

# ---------------------------------------------------------------------------
# write_report <report_file> <mode> <worktree_path> <branch>
# Writes the report header.
# ---------------------------------------------------------------------------
write_report_header() {
  local report_file="$1"
  local mode="$2"
  local worktree="$3"
  local branch="$4"
  mkdir -p "$(dirname "$report_file")"
  {
    echo "# ClearGate Pre-Gate Scan Report"
    echo "Mode: ${mode}"
    echo "Worktree: ${worktree}"
    echo "Branch: ${branch}"
    echo "Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
    echo "---"
  } > "$report_file"
}

# ---------------------------------------------------------------------------
# detect_stack <worktree_path>
# Returns "node-ts" if package.json + tsconfig.json found, else "unknown".
# Node+TS only — no Python/Rust/Go/Java/Swift detectors.
# ---------------------------------------------------------------------------
detect_stack() {
  local worktree="$1"
  if [[ -f "${worktree}/package.json" ]]; then
    if [[ -f "${worktree}/tsconfig.json" ]]; then
      echo "node-ts"
    else
      echo "node"
    fi
  else
    echo "unknown"
  fi
}

# ---------------------------------------------------------------------------
# diff_package_json <worktree_path> <branch>
# Prints new runtime deps (non-dev) introduced vs <branch>^.
# Returns lines like: "new runtime dep: <name>"
# ---------------------------------------------------------------------------
diff_package_json() {
  local worktree="$1"
  local branch="$2"

  # Get old package.json from branch parent (branch^ in the worktree's git)
  local old_json
  old_json=$(git -C "$worktree" show "${branch}^:package.json" 2>/dev/null || echo '{"dependencies":{}}')

  local new_json
  new_json=$(cat "${worktree}/package.json" 2>/dev/null || echo '{"dependencies":{}}')

  # Extract dep keys using node
  node -e "
    const oldPkg = JSON.parse($(echo "$old_json" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>process.stdout.write(JSON.stringify(d)))"));
    const newPkg = JSON.parse($(echo "$new_json" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>process.stdout.write(JSON.stringify(d)))"));
    const oldDeps = Object.keys(oldPkg.dependencies || {});
    const newDeps = Object.keys(newPkg.dependencies || {});
    const added = newDeps.filter(d => !oldDeps.includes(d));
    added.forEach(d => console.log('new runtime dep: ' + d));
  " 2>/dev/null || true
}
