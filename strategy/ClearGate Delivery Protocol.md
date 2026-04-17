ClearGate Delivery Protocol
In the standalone ClearGate architecture, Delivery is the un-opinionated bridge between a local AI agent completing a task and an external Project Management (PM) tool (e.g., Linear, Jira, GitHub Issues) reflecting that state.

Core Principle: ClearGate operates completely independent of Chyro or any custom databases. It uses a "Local First, Sync, Update" pattern that relies entirely on the developer's local file system as the staging ground, and pure API Adapters to mutate state in the remote PM tool.

The Research-Driven Decomposition Flow
ClearGate enforces an artifact-guided phase gate to ensure AI does not push hallucinated or unverified tickets to the PM tool.

Research First: Use .cleargate/templates/proposal.md to map dependencies and constraints.
Approval Gate: The proposal defaults to approved: false in its YAML frontmatter. Do NOT generate Epics/Stories or invoke cleargate_push_item until the Human changes this to approved: true.
Decomposition: Once approved, scaffold epic.md and story.md based strictly on the approved proposal.
Folder Structure for Delivery
Copy
.cleargate/
└── delivery/
    ├── pending-sync/   # Drafts waiting to be translated and pushed via MCP
    └── archive/        # Historically synced artifacts (containing remote PM IDs)
The Workflow Step-by-Step
1. Generating the Local Deliverable (Drafting)
Instead of forcing Claude Code to wrangle complex HTTP requests or custom database schemas, it is instructed to simply fill out a Markdown template. It saves this draft as a Markdown file with YAML frontmatter in .cleargate/delivery/pending-sync/.

2. The MCP Translation Handoff (Adapter Pattern)
Claude Code invokes the built-in ClearGate CLI MCP tool (e.g., cleargate_push_item) and passes the local file path.

The ClearGate MCP server reads the file and parses the YAML frontmatter.
It determines the active integration (e.g., Linear, Jira) via user config.
The Adapter Layer: It translates the standardized Markdown payload into the specific API schema of the target PM tool.
3. Write-Back & Cleanup
Once the native PM tool responds with its generated remote ID, the MCP server passes this back. Claude Code updates the local file's frontmatter with the true remote ID and moves the file to .cleargate/delivery/archive/.

Initialization (npx cleargate init)
Running npx cleargate init injects the necessary routing into the workspace's CLAUDE.md, pointing the agent to these strict rules in .cleargate/knowledge/cleargate-protocol.md.