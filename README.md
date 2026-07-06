# cofracture

Project workspace with [OpenSpec Flow](https://github.com/Fission-AI/OpenSpec) (OSF) for Cursor: propose → apply → finish (archive + merge) or abort.

## OpenSpec Flow

This repo includes the OSF Cursor integration (**`OPENSPEC_FLOW_VERSION`** in **`OPENSPEC_FLOW.md`**). See **`OPENSPEC_FLOW.md`** and **`AGENTS.md`** for workflow and agent rules.

### Prerequisites

- Node.js **20.19+** for `npx @fission-ai/openspec@latest`
- Cursor with **Task** subagents enabled

### Getting started

1. Initialize OpenSpec in this project when ready:

   ```bash
   npx @fission-ai/openspec@latest init
   ```

2. Use **`/osf-explore`** and **`/osf-propose`** to shape intent under **`openspec/changes/`**.
3. Use **`/osf-apply-changes`** to implement approved work on a branch.
