---
name: osf-explain
description: Renders a short fixed-template human-review summary of an OpenSpec change under `openspec/changes/<name>/`. Mandatory sections after metadata: Spec delta shape → Ambiguities → Apply scope at shipping → Quick read → What the human needs to decide. Use for `/osf-explain`, attached skill, explain/summarize/debrief/review requests, or when `/osf-propose` closes out via this template.
disable-model-invocation: true
---

# `/osf-explain` — structured OpenSpec change debrief

Produces a fixed-template explanation of an OpenSpec change so a human can approve or refine quickly. **Consistency is the point**: same headings every time. Refine the template *here* when reviewer needs change; do not freelance the format in callers.

This skill is **read-only**: it never edits the change folder, never persists, never runs `apply`/`archive`. If review surfaces a fix, route the user back to **`/osf-propose`**.

## When this skill runs

- User says **`/osf-explain`**, attaches this skill, or asks to "explain / summarize / debrief / review" a specific OpenSpec change or artifact.
- **`/osf-propose`** closes out by following this skill’s template. **All propose debriefs go through this skill, not freeform.**

## Resolve scope

1. **Whole change** (default): one folder under `openspec/changes/<name>/`. Name from the user, the calling skill, or — if neither — the most recently modified non-archived change folder (confirm in chat).
2. **Single artifact**: when the user names one (`proposal`, `design`, `specs`, `specs/<capability>`, or `tasks`).
3. **Multiple changes**: render the whole-change template once per change in sequence; do not interleave.

For change-scope, read `proposal.md`, `design.md` (if present), every `specs/<capability>/spec.md`, and `tasks.md`. Feed **Validation** and **Status** from:

```bash
npx @fission-ai/openspec@latest status --change "<name>" --json
npx @fission-ai/openspec@latest validate "<name>" --type change
```

If validation fails, surface the exact CLI output — do not paraphrase it away.

## Spec quality (pointer only)

Do **not** inline quality-flag catalogs here. Definitions and the OpenSpec quick test live under **`/osf-propose`** and **`OPENSPEC_FLOW.md` → “What a spec actually is.”** When a quality issue affects approve or apply, put it under **Ambiguities** (with significance)—do not resurrect a separate flags section.

## Output template — do not improvise

Render the template below verbatim. Every section is **mandatory**. Ambiguities uses a single line `None` when clean. Spec delta shape always states kind/scale (including “docs/process only, no requirement deltas” when true).

### Change-scope template

```markdown
## Change: `<change-name>`

- **Path**: `openspec/changes/<change-name>/`
- **Validation**: `<pass | fail — exact CLI excerpt>`
- **Status**: `<artifact ids that are done / ready / blocked, from openspec status>`
- **Branch & commits**: `<branch>` — `<short SHAs touching this change folder, or "uncommitted">`

## Spec delta shape

<One or two sentences: what *kind* of specification change, roughly how much, and which capability/domain when deltas exist. Not a requirement inventory.

Good: "Strictly new scenarios on factory-builder-thing—about three, OSHA-compliance flavored."
Good: "MODIFIED apply-hygiene requirements on openspec-flow-reference; small structural tweak, no new capabilities."
Good: "Docs/process only—no requirement deltas; skill and OPENSPEC_FLOW narrative."
Bad: listing every ADDED/MODIFIED requirement by name.>

## Ambiguities

<One bullet per material issue: `<Significance> — <what is unclear and where>` with path hints. Use exactly one label: **Blocking before apply** | **Should fix before apply** | **Discuss / may approve**. Include quality concerns that affect approve/apply. When nothing material: single line `None`.>

## Apply scope at shipping

**In scope for apply:**

- <unchecked required tasks that imply build, release, deploy, or live verification—one line each>
- <If none: `No build, release, or live-environment tasks in scope for apply.`>

**Explicitly deferred (by intent):**

- <items under `## Explicitly deferred` or equivalent; owner/follow-up if stated>
- <If none: `None explicitly deferred in tasks.`>

<Never label skipped required work “optional.”>

## Quick read

- <plain-language bullet: what is different after archive>
- <plain-language bullet: why it matters>
- <optional: explicit non-goals>
- <**3–7** substantive bullets total; no duplication of Ambiguities or Apply scope>

## What the human needs to decide

- **Approve** → run `/osf-apply-changes` to spawn an apply worker (in-scope tasks execute or the run aborts—see **Apply scope at shipping**).
- **Refine** → re-enter via `/osf-propose`.
- **Abort** → say so; the change folder stays for revision and no implementation runs.

<Three action lines only—do not restate Ambiguities, Apply scope, or Quick read.>
```

### Single-artifact mode

Always lead with the `## Change:` metadata block. Fill **every** mandatory section from available evidence, or an explicit unavailable note—**do not** resurrect long drill-down sections (Intent, Changelog, Capability impact, Delta details, Spec-quality flags, Design highlights, Tasks, Living-spec impact).

| Subject | Notes |
|---|---|
| `proposal` | Delta shape from proposal intent; Apply scope may be unknown until tasks exist—say so honestly. |
| `design` | Delta shape from design decisions; still fill Ambiguities / Apply scope / Quick read / Decide from available context. |
| `specs` / `specs/<capability>` | Delta shape from the delta files; quality concerns → Ambiguities. |
| `tasks` | Delta shape may be N/A or “tasks only”; Apply scope and Decide are primary. |

Post-apply/finish relay still distinguishes **incomplete** required work from **explicitly deferred (by intent)**—do not call skipped required ops “optional.”

## Behavior rules

- **Read-only** on the change folder; no apply/archive.
- **No persist** from this skill; callers persist first, then hand off the change name.
- **No full requirement paste** unless the user asks; names plus one-liners only when unavoidable.
- **CLI truth** for Validation and Status (`openspec status` / `openspec validate`).
- **Decide** = action lines only.
- **One canonical template** — evolve it in this file, not in callers.

## Reference

- `OPENSPEC_FLOW.md` → "What a spec actually is"
- `.cursor/skills/osf-propose/SKILL.md` — primary caller; also owns spec-quality writing guidance
- `.cursor/skills/osf-propose/reference/concepts.md` — vendored OpenSpec concepts
- `AGENTS.md` — `openspec/` workflow discipline
