ClearGate Core Architecture Decisions
ClearGate operates as an npm package that scaffolds an AI-native workspace directly into the user's repository. To maximize efficiency and keep Claude Code decoupled from complex external sync logic, ClearGate relies on a hybrid architecture.

1. Decoupling: Total Independence from Chyro
ClearGate is a completely standalone framework. It does not require a proprietary database, nor does it rely on Chyro to function.

The Paradigm: ClearGate is an execution engine for local AI agents (like Claude Code) to interact with native Project Management (PM) tools (Linear, Jira, GitHub Issues).
Chyro's Role (Optional): If a team uses Chyro, Chyro acts strictly as a "PM Agent" that connects to those same external PM APIs to plan Sprints and write Initiatives. It never acts as a bespoke backend for ClearGate.
2. Context & Templates: Karpathy's "LLM Wiki" Pattern
We intentionally avoid local databases (SQLite/DuckDB) or complex RAG pipelines within the repository. Instead, ClearGate uses the "LLM Wiki" pattern popularized by Andrej Karpathy.

How it works: All execution templates, codebase rules, and framework constraints are stored as interconnected, plain-text Markdown files.
Why it is optimal: Claude Code natively excels at reading local file systems. A flat folder of Markdown is instantly accessible, version-controlled via Git alongside the user's code, and easily digested without external queries.
Scaffolded Structure:

Copy
.cleargate/
├── knowledge/          # Global rules, context, and framework constraints
├── templates/          # Markdown templates for tasks, PRs, and reports
└── delivery/           # Delivery lifecycle directories
    ├── pending-sync/   # Agent drafts work here before MCP handoff
    └── archive/        # Synced work with injected remote IDs
3. Task Syncing: Agnostic Model Context Protocol (MCP)
To ensure Product Managers can track progress in native tools (Linear/Jira) without custom sync daemons, ClearGate acts as an embedded MCP adapter.

How it works: ClearGate ships an MCP server inside its npm package. When a user runs npx cleargate init, the MCP server is registered in their claude.json.
Why it is optimal: Claude Code simply calls cleargate_push_item. The ClearGate MCP server reads the local .cleargate/delivery/pending-sync/ markdown, translates the payload via an adapter (e.g., Linear adapter, Jira adapter), pushes it to the native tracker, and returns the remote ID (e.g., LIN-102) back to the local file.