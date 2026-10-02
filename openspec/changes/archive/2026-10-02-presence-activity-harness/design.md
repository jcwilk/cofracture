# Design

## Context

See proposal.md for why. The fractal page starts a networking session, then keeps peer regions and drawing in the viewport. Activity today is a few console lines that do not name the local identity, do not separate discovery from a finished connection, and do not carry a color. The existing harness opens browser pages and checks teardown. Gossip itself is the existing wasm transport; the session API around it is TypeScript.

## Goals / Non-Goals

**Goals:**

- One activity stream that a person can read in the console and a harness can subscribe to.
- The page and the harness call the same session core for identity, connections, and regions.
- A repeatable two-instance run that proves connect and region forwarding without the fractal.

**Non-Goals:**

- Replacing the existing page-based lifecycle harness.
- Changing mesh capacity, the public site URL, or the coloring-window hue mix.
- Deciding whether peer regions are also drawn as outlines. That stays as it is until a separate change.
- Fixing transport bugs by bypassing the session core with test-only connections.

## Decisions

### One emitter, two audiences

Each activity fact is one record: kind (`self`, `discovered`, `connected`, `connect-failed`, `removed`), public identity, fingerprint color, and an optional short failure reason. The session writes one console line a person can scan and notifies in-process subscribers with the same record. The harness subscribes. It does not scrape unrelated logs.

Console lines use a stable `presence` prefix, the kind, the identity, and the color, so a person and a later log reader see the same words the subscriber got.

Alternative: console-only parsing. Rejected because the harness should not depend on log wording drift, and a person still needs the line.

### Color is the identity fingerprint already used for hues

The color is a pure function of the public identity, shared by logs and fractal coloring. Join order and who is looking do not enter the function. A reload mints a new identity, so it gets that identity's color, not the previous run's.

Alternative: a random color stored beside the identity. Rejected because two observers could disagree and a reload could keep a stale color.

### One identity lives only for the run

The run generates an identity when the session starts and keeps it in memory for that run. A second start in the same run returns the running session instead of opening another transport. Reload is a new run and a new identity. Any identity saved for a future load is discarded and not read.

Alternative: reuse an identity across reload so a refresh is not a new participant. Rejected because a refresh that overlaps the previous run is what stacks extra participants, and the requested rule is a new identity per run plus removal of the old one.

### The session core owns regions

The core stores the local region and each remote region. Navigation in the page calls the core when the local region changes. Coloring reads regions from the core. The harness sets a region on the core with no canvas and no pointer handlers. Peer maps inside the viewport are not a second source of truth.

### Private scope for the harness

The public page keeps the public discovery scope. The harness passes a scope used only by that run, so a visitor on the public site cannot appear as a third participant. The core already has one discovery channel; the scope selects which channel a session joins.

### Harness shape

The harness starts two or more session cores in the test runner, subscribes to activity records, waits until each has a connection-success signal for the other, sets a new region on one, and asserts the other core's remote region matches. It fails if the active remote set is anything other than the instances it started.

The gossip transport is wasm and expects a browser-like network stack. Apply runs this harness in the test runner against the real session module. If that transport cannot start there, apply stops and reports that blocker. It does not switch the scenario to the fractal app or to the existing page harness.

### Removal

Presence sharing already repeats on a short interval. If no share arrives for an active remote for 15 seconds, the core drops that remote and emits `removed`. An explicit disconnect emits `removed` immediately. A `connect-failed` record does not add an active remote.

## Risks / Trade-offs

- [Wasm gossip may not bind in the test runner] → Apply reports the blocker instead of substituting a page. The spec stays the contract.
- [15 seconds makes the silence scenario slow] → Only that scenario waits. The connect-and-forward scenario returns as soon as the regions match.
- [A private harness scope can hide a bug that only happens on the public swarm] → The page still uses the public scope. The harness proves the core. A person can still watch the public page logs.
- [Moving region state can desync the fractal during the change] → The page reads one core snapshot for both coloring and any outline. There is no second peer map.

## Migration Plan

Ship the core and the log first so the page shows the new lines, then point the page at the core's regions, then add the harness gate. Rollback is reverting the session and page wiring; the public discovery scope for the site does not change.

## Open Questions

None. A wasm startup failure in the test runner is a blocker to report, not a second design.
