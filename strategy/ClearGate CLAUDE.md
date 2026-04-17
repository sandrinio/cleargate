ClearGate CLAUDE.md Integration Blueprint
Since ClearGate is an npm package installed alongside the user's own code, it must not overwrite the user's existing CLAUDE.md. Instead, npx cleargate init safely injects and manages a dedicated block.

1. The Injection Strategy (Bounded Block)
We use HTML comments to create a bounded section. This allows ClearGate to safely append its instructions to the bottom of an existing CLAUDE.md, and safely update them in the future without touching the user's custom prompts.

What gets injected into CLAUDE.md:

Copy
... (User's existing CLAUDE.md content here) ...

<!-- CLEARGATE:START -->
## 🔄 ClearGate Execution Framework
This repository uses the standalone ClearGate framework for work item tracking and delivery.

**Whenever you start, update, or finish a task, you MUST:**
1. Read the strict delivery protocol in `.cleargate/knowledge/cleargate-protocol.md`.
2. Use the templates in `.cleargate/templates/` for drafting deliverables, Epics, Stories, or Bugs.
3. Manage all task syncing through the `.cleargate/delivery/` folder and `cleargate_*` MCP tools.
<!-- CLEARGATE:END -->
2. Moving Core Logic to the Knowledge Base
To prevent bloating the user's CLAUDE.md, the verbose rules are moved entirely into the scaffolded file system. The injection above simply points Claude Code to this file.

Target Path: .cleargate/knowledge/cleargate-protocol.md

Content of cleargate-protocol.md:

Standalone PM Integration (Adapter Pattern)
ClearGate operates completely independent of any custom databases. This repository is connected directly to a native PM tool (e.g., Linear, Jira, GitHub) via the ClearGate MCP server.

Use the cleargate_* MCP tools to translate local markdown drafts into native PM tool updates.
The MCP tools act as pure adapters. Do not write custom API scripts to communicate with the PM tool.
The Delivery Protocol ("Local First, Sync, Update")
Draft: Create a Markdown file in .cleargate/delivery/pending-sync/ using the appropriate template.
Sync: Call the cleargate_push_item MCP tool with the draft's exact file path.
Commit: Inject the returned native Remote ID (e.g., LIN-102 or PROJ-45) into the draft's frontmatter.
Archive: Rename the file to include the ID and move to .cleargate/delivery/archive/.
Strict Constraints
File System First: .cleargate/delivery/ is the absolute source of truth for execution state.
Failures: If the MCP adapter fails to reach the PM tool, leave the file in pending-sync/ and halt. Do not implement infinite retry loops.