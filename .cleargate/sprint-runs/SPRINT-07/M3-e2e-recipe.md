# M3 E2E Recipe — Two-Terminal Sync Verification

**Sprint:** SPRINT-07  
**Story:** STORY-010-04  
**Status:** Recipe authored; to be verified once MCP is deployed with LINEAR_API_KEY configured.

## Prerequisites

1. MCP server running at `https://cleargate-mcp.soula.ge/` with `LINEAR_API_KEY` set (adapter configured).
2. Two separate terminal sessions / working directories.
3. Both terminals have `cleargate` CLI v0.2.x installed.
4. Both terminals have valid `CLEARGATE_MCP_TOKEN` (JWT from `cleargate join`).
5. A shared ClearGate project with both devA and devB as members.

## Steps

```bash
# ─── Terminal A (devA) ─────────────────────────────────────────────────────────
export CLEARGATE_MCP_URL=https://cleargate-mcp.soula.ge
export CLEARGATE_MCP_TOKEN=<devA-jwt>

cd /tmp/cleargate-e2e-a
cleargate join <invite-url-for-devA>

# Draft a story with remote_id (obtained by pushing to MCP first)
# STORY-999-01.md in .cleargate/delivery/pending-sync/ with approved: true
cleargate push .cleargate/delivery/pending-sync/STORY-999-01.md

# Verify STORY-999-01 now has remote_id in its frontmatter
grep remote_id .cleargate/delivery/pending-sync/STORY-999-01.md

# ─── Terminal B (devB) ─────────────────────────────────────────────────────────
export CLEARGATE_MCP_URL=https://cleargate-mcp.soula.ge
export CLEARGATE_MCP_TOKEN=<devB-jwt>

cd /tmp/cleargate-e2e-b
cleargate join <invite-url-for-devB>

cleargate sync
# Expected output:
#   sync: pulled N, pushed 0, conflicts 0
# or if something was already pushed by devA:
#   sync: pulled 1, pushed 0, conflicts 0

# Verify assertions:
# 1. STORY-999-01.md appears in .cleargate/delivery/pending-sync/ with pushed_by=devA
grep pushed_by .cleargate/delivery/pending-sync/STORY-999-01.md

# 2. sync-log.jsonl has one op=pull, result=ok, actor=devB
cleargate sync-log --actor <devB-email> --limit 5

# Expected sync-log entry:
#   { ts, actor: devB, op: pull, target: STORY-999-01, remote_id: LIN-NNNN, result: ok }

# Both assertions verified → M3 E2E recipe PASS
```

## Assertions

- [ ] `STORY-999-01.md` appears in devB's `.cleargate/delivery/pending-sync/` with `pushed_by=devA@example.com`
- [ ] `cleargate sync-log --actor devB@example.com` shows `op=pull, result=ok` for STORY-999-01
- [ ] `exit 0` from `cleargate sync`

## Notes

- This is a manual recipe; not automated in the test suite (Sprint-level R9).
- Pre-flight requires `CLEARGATE_ADAPTER_INFO` to return `configured: true` — if MCP is missing `LINEAR_API_KEY`, `cleargate sync` exits 2 with a clear message.
- `cleargate conflicts` should show empty conflicts list on clean sync.
