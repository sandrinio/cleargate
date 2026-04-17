ClearGate MCP & Adapter Specifications
This document outlines how the ClearGate MCP server acts as an agnostic bridge between local filesystem markdown (written by Claude Code) and remote native Project Management (PM) APIs (Linear, Jira, GitHub Issues).

Core Principle: ClearGate is strictly independent. It uses standard API adapters instead of a proprietary middle-tier database or relying on Chyro.

1. Adapter Architecture (The PM Agnostic Layer)
ClearGate maps its standardized markdown concepts (Initiatives, Epics, Stories) to the native equivalents of the user's chosen PM tool via an interface layer.

Linear Adapter: Initiative -> Project, Epic -> Cycle/Project, Story -> Issue.
Jira Adapter: Initiative -> Initiative, Epic -> Epic, Story -> Story/Task.
There is no "ClearGate Database". The remote PM tool is the absolute source of truth.

2. Local CLI MCP Tools (Exposed to Claude Code)
These tools are bundled into the npx cleargate MCP server. They handle the file-to-API translation.

cleargate_pull_initiative
Description: Pulls an Initiative directly from the remote PM tool (Linear/Jira) and writes it to a local .cleargate/plans/INIT-{ID}.md file for Claude Code to analyze.
Parameters:
remote_id (String, Required): The exact ID in the PM tool (e.g., ENG-402).
cleargate_push_item
Description: Reads YAML frontmatter and Markdown body from .cleargate/delivery/pending-sync/, translates it via the active adapter, and pushes it to the native PM API. Returns the remote generated ID.
Parameters:
file_path (String, Required): Local path to the standardized Markdown artifact.
item_type (Enum: epic, story, Required)
parent_id (String, Optional): To link a Story to an Epic natively.
cleargate_sync_status
Description: Sends a state change event to the remote PM API based on local completion.
Parameters:
remote_id (String, Required): e.g., LIN-204
new_status (Enum, Required): Maps to native workflow states (todo, in_progress, done).
3. Chyro's Independent Interface (Optional PM Client)
If a team uses Chyro to orchestrate the PM layer, Chyro does not connect to ClearGate. It connects directly to the Linear/Jira APIs.

Chyro PM Operations
Create Initiative: Chyro takes natural language, writes the .cleargate/templates/initiative.md schema, and pushes it to Linear/Jira via standard REST/MCP.
Sprint Overview: Chyro queries the PM tool directly to visualize the state of the active Sprint.
Interaction: Vibe Coder never needs Chyro online to execute; they only need the remote PM tool to be accessible by the ClearGate MCP adapter.