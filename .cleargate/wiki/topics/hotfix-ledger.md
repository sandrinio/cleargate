---
type: "synthesis"
id: "hotfix-ledger"
generated_at: "2026-04-26T00:00:00Z"
---

# Hotfix Ledger

Append-only audit log of merged hotfixes. Reporter aggregates entries by sprint window at sprint close.

---

- hotfix_id: "HOTFIX-001"
  title: "copy-payload re-asserts +x on no-force content-divergence skip (BUG-018 follow-up)"
  severity: "P2"
  status: "Verified"
  commit_sha: "pending"
  merged_at: "2026-04-30T08:05:40Z"
  lane: "hotfix"
  predecessor: "BUG-018 (aaf0ef2)"
  files_changed:
    - "cleargate-cli/src/init/copy-payload.ts"
    - "cleargate-cli/test/init/copy-payload-perms.test.ts"
  net_loc: 13
  summary: >
    The no-force-skip branch in copyPayload skipped the write on content-divergence
    but did not re-assert chmod 0o755, silently stripping +x from drifted hook files.
    Fixed by adding the same chmodSync guard that existed on the identical-content
    skip branch. New test scenario verifies +x preserved and content unchanged.
