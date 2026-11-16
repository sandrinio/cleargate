---
type: "synthesis"
id: "contradictions"
generated_at: "2026-04-30T00:00:00Z"
---

# Wiki Contradictions — Advisory Log

(Append-only. Each entry is one YAML record. Human applies label: true-positive | false-positive | nitpick.)

findings: []
- draft: "[[BUG-121]]"
  neighbor: "[[BUG-037]]"
  claim: "BUG-037 fix is \"re-run detection\" vs BUG-121 says it replaces repo commands"
  ingest_sha: "4374f46cd7b60916c80049769897e4e49418bb8cb7184faf79d43e699a89a29e"
  truncated: false
  label: null
- draft: "[[BUG-129]]"
  neighbor: "[[BUG-062]]"
  claim: "§3.1 cells with spaces: reject vs read the first backticked span"
  ingest_sha: "c86292bff30b0382f28c3c93e8ecb82e3c52f6a32fd841e1add326c6c1a2469c"
  truncated: false
  label: null
- draft: "[[CR-120]]"
  neighbor: "[[BUG-085]]"
  claim: "CR-120 says BUG-085 is Draft; BUG-085 is Completed"
  ingest_sha: "30f6838f16e6c6a05c0623fc3bd4d39d03132fe980c5cc8b1d43edcf4adf424b"
  truncated: false
  label: null
- draft: "[[CR-120]]"
  neighbor: "[[BUG-087]]"
  claim: "CR-120 places BUG-087 in SPRINT-42; BUG-087 says SPRINT-43"
  ingest_sha: "30f6838f16e6c6a05c0623fc3bd4d39d03132fe980c5cc8b1d43edcf4adf424b"
  truncated: false
  label: null
- draft: "[[STORY-064-01]]"
  neighbor: "[[EPIC-064]]"
  claim: "repo list: reuses wiki.brief.release_repos vs new metrics.repos key"
  ingest_sha: "94dc7b4021728553228bbc00232c7061e12fb9f2b051758c62acacd7f57100c4"
  truncated: false
  label: null
- draft: "[[STORY-065-06]]"
  neighbor: "[[CR-129]]"
  claim: "ack stamp: `goal_verdict_acked_by` vs `goal_verdict_acked_at` only"
  ingest_sha: "35c90892292056555a9b4497f22fe84333d38c8d6d898a7f8fef686a2dcbcd72"
  truncated: false
  label: null
