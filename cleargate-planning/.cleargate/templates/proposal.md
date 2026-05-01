<instructions>
USE THIS TEMPLATE FOR INITIATIVE-CLASS SCOPE ONLY — multi-Epic work where a persistent file-based Brief is genuinely useful before decomposition begins. For single Epic / Story / CR / Bug / Hotfix, triage directly into the appropriate template; no Proposal step is needed.

FOLLOW THIS EXACT STRUCTURE. Output sections in order 1-4.
YAML Frontmatter: Proposal ID, Status, Author, and the crucial approved boolean.
§1 Initiative & Context: The "Why" and "What".
§2 Technical Architecture & Constraints: Architecture constraints, data flow, dependencies.
§3 Touched Files: Real files that will need modification.
Output location: .cleargate/delivery/pending-sync/PROPOSAL-{Name}.md

POST-WRITE BRIEF
After Writing this document, render a Brief in chat with the following sections,
mechanically extracted from the document's own structure:

  - Summary        ← §1 Initiative & Context
  - Open Questions ← (new — add §1.4 Open Questions if multi-Epic scope is ambiguous)
  - Edge Cases     ← (new — add §3.3 Edge Cases)
  - Risks          ← §2 Constraints
  - Ambiguity      ← bottom-of-doc ambiguity gate block

Halt for human review. When ambiguity reaches 🟢, proceed to call cleargate_push_item.
Do NOT ask separately for push confirmation — Brief approval covers it.

Do NOT output these instructions.
</instructions>

proposal_id: "PROP-{ID}" status: "Draft / In Review / Approved" author: "{AI Agent / Vibe Coder}" approved: false
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-17T00:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: null
  failing_criteria: []
  last_gate_check: null
# Sync attribution. Optional; stamped by `cleargate push` / `cleargate pull`.
pushed_by: null            # set by push: which user pushed
pushed_at: null            # set by push: ISO-8601 timestamp
last_pulled_by: null       # set by pull: which user pulled
last_pulled_at: null       # set by pull: ISO-8601 timestamp
last_remote_update: null   # set by pull: server's last-modified timestamp
source: "local-authored"   # flips to "remote-authored" on intake
last_synced_status: null   # required for conflict-detector; status at last sync
last_synced_body_sha: null # sha256 of body at last sync
PROPOSAL-{ID}: {Initiative Name}
1. Initiative & Context
1.1 Objective
{1-2 sentences explaining the high-level goal and business value.}

1.2 The "Why"
{Reason 1}
{Reason 2}
2. Technical Architecture & Constraints
2.1 Dependencies
{List required external APIs, packages, or systems}
2.2 System Constraints
Constraint	Details
Architectural Rules	{e.g., Must use purely functional components, etc.}
Security	{e.g., Data must be encrypted at rest.}
3. Scope Impact (Touched Files & Data)
3.1 Known Files
path/to/existing/file.ext - {Explanation of expected change}
3.2 Expected New Entities
path/to/new/file.ext - {Explanation of purpose}
🔒 Approval Gate
(Vibe Coder: Review this proposal. If the architecture and context are correct, change approved: false to approved: true in the YAML frontmatter. Only then is the AI authorized to proceed with Epic/Story decomposition.)