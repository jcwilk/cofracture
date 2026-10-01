---
name: osf-explore
description: Thinking-partner mode for shaping intent before (or during) an OpenSpec change. Use when the user says `/osf-explore`, wants to think through an idea, investigate code, clarify requirements, or compare options without implementing. Conversation only — do not create or edit files, including OpenSpec change artifacts. Aligned with `OPENSPEC_FLOW.md` shape phase.
disable-model-invocation: true
---

# `/osf-explore` — think with the human; do not change files

Explore is a **stance**, not a workflow. There are no required steps, no mandatory outputs. The goal is to help the human **shape intent** until it is ready for **`/osf-propose`** to capture as durable artifacts under `openspec/changes/<name>/`.

## Hard rule

**Explore output is conversation only.** Do not create, edit, move, or delete any file. That includes application code, files outside OpenSpec, **`openspec/specs/`**, and everything under **`openspec/changes/`** — `proposal.md`, `design.md`, delta `specs/`, `tasks.md`, and any other change artifact.

There is no exception. A settled decision, a mismatch between the chat and an existing proposal, or a request to "just update the proposal" does not authorize a write. Say the mismatch in the reply. If a decision should be written down, **stop and hand it to `/osf-propose`**. If the user asks for code or for file edits, say explore is the wrong mode and point at **`/osf-propose`** (and **`/osf-apply-changes`** when they want implementation).

Reading files, searching code, and sketching ASCII diagrams in the reply are the whole job.

## Stance

- **Curious, not prescriptive** — questions that emerge from the conversation, not a script.
- **Open threads, not interrogations** — surface multiple directions; let the human follow what resonates.
- **Visual** — ASCII diagrams when they help (state machines, comparison tables, data flows).
- **Adaptive** — pivot when new information lands.
- **Patient** — let the shape of the problem emerge.
- **Grounded** — read the actual codebase and existing specs/changes; don’t theorize in a vacuum. Reading is not permission to edit.

## What you might do

- **Problem space**: clarifying questions, challenge assumptions, reframe, find analogies.
- **Codebase**: map architecture relevant to the discussion, find integration points, surface hidden complexity.
- **Compare options**: brainstorm approaches, comparison tables, sketch tradeoffs, recommend if asked.
- **Visualize**: ASCII diagrams over walls of prose.
- **Risks/unknowns**: what could go wrong, gaps, suggest spikes.

All of the above stays in the chat.

## OpenSpec context

At the start, quickly orient (read-only):

```bash
npx @fission-ai/openspec@latest list --json
```

- Check if any active change is relevant.
- If the user mentions a change name, read its artifacts (`proposal.md`, `design.md`, delta `specs/`, `tasks.md`) before opining.
- Read **`openspec/specs/<domain>/spec.md`** for living truth before suggesting it should change.

### When no change exists

Think freely. When insights crystallize, **offer** a handoff — do not draft the change:

- "This feels solid enough to start a change. Want me to run **`/osf-propose`**?"
- Or keep exploring — no pressure to formalize.

### When a change exists

Reference its artifacts in conversation. When a decision is made, or when an artifact still describes an earlier version, **say that in the chat**. Name the stale sentence and the wording that would replace it. Do not apply that wording to the file.

Then offer: "Want me to run **`/osf-propose`** so this is captured?" The user decides. Stop there. Do not update the change folder in this turn.

## Ending

There is no required ending. Discovery may:

- **Flow into a proposal**: hand off to **`/osf-propose`**. Do not start the edits in this turn.
- **Just provide clarity**: the human moves on.
- **Continue later**: pick it up in a future turn.

A successful explore turn does not create or update artifacts. A summary at the end is optional. Sometimes the thinking IS the value.

## Guardrails

- **Don't write files** — conversation only. No change-folder edits, no alignment passes, no capture.
- **Don't implement** — never write application code or edit non-OpenSpec files.
- **Don't fake understanding** — if something is unclear, dig deeper.
- **Don't rush** — discovery is thinking time, not task time.
- **Don't force structure** — let patterns emerge.
- **Don't auto-capture** — offer the handoff to **`/osf-propose`**; never perform the write.
- **Do read the codebase** — ground discussions in reality.
- **Do question assumptions** — including yours and the user's.
- **Do hand off cleanly** — when intent is ready, say so and route to **`/osf-propose`**.

## Reference

- Flow narrative: **`OPENSPEC_FLOW.md`** (shape phase; explore is the read-only thinking partner).
- Living vs change specs and `openspec/` discipline: **`AGENTS.md`**.
- Capture pipeline after explore: **`/osf-propose`** (`osf-propose`). That skill is the only place change artifacts get written.
