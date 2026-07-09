## Why

Collaborative presence and mesh discovery work in happy-path demos, but the networking stack is not yet something we can depend on: discovery teardown races surface as uncaught errors under multi-tab flap, lifecycle and transport concerns are tangled with the fractal UI, and there is no coherent harness that can prove discovery, join, presence, and shutdown under controlled multi-peer conditions. Visual work outpaced networking discipline; this change establishes the architectural and verification foundation so resilience can be built intentionally rather than chased reactively.

## What Changes

- **Layered networking architecture**: Separate pure mesh/presence policy from transport adapters and from UI orchestration, so discovery rules, gossip presence, and browser transports can evolve and be tested independently.
- **Explicit session lifecycle**: Define start → discover → join → advertise → merge → leave/shutdown as observable phases with safe teardown (no uncaught transport failures; solo exploration remains available when networking fails).
- **Network test harness foundation**: Introduce a self-coherent multi-peer harness that can drive discovery and presence scenarios headlessly, including lifecycle stress (overlapping start/stop, reload, multi-tab), without requiring the fractal viewport.
- **Regression contract for teardown safety**: Discovery/presence shutdown under concurrent peer activity MUST NOT throw uncaught errors that break the page; failures degrade to solo mode.
- **Evidence → harness → fix gate**: Exploratory spike work already showed concrete teardown/lifecycle failures under multi-peer stress. Apply MUST turn that evidence into durable harness scenarios, then use those scenarios as gates: apply is not complete while they still fail. Fixing what they surface is in scope and MAY require broader networking changes; this proposal does not prescribe the implementation of those fixes.
- **Disposable destroy-race spike**: The uncommitted spike may be consulted as rough guidance only (take with a grain of salt). Apply MUST build the real harness from this change’s contracts, MUST NOT promote the spike into the permanent suite, and MUST remove the spike artifacts before apply finishes so they are not left in the tree.

## Capabilities

### New Capabilities

- `networking-architecture`: Layering and session-lifecycle contracts that make the collaborative stack dependable and testable (policy vs transport vs UI; safe teardown; solo fallback under failure).
- `network-test-harness`: Behavioral contract for a multi-peer headless harness that verifies discovery, join, presence continuity, and lifecycle stress without the fractal UI—and that known teardown failure modes (evidenced in exploration) are encoded as failing gates until fixed.

### Modified Capabilities

- `mesh-discovery`: Add teardown/lifecycle safety so discovery stop and page leave do not surface uncaught transport errors; keep existing discovery/advertise/merge behavior.
- `collaborative-presence`: Clarify that presence orchestration respects the layered lifecycle and that connectivity loss or teardown faults leave local exploration intact.

## Impact

- Restructures how discovery and presence code is organized and verified; apply will introduce harness scaffolding, encode known teardown failures as gates, and fix product behavior until those gates pass (broader refactors acceptable).
- Does not change the public site URL join model or require a project-run coordination server.
- Exact transport libraries, file layout, CI wiring, and the concrete mechanism of any teardown fix are design/task/apply concerns — not living-spec obligations beyond observable safe behavior.
- Full production-grade Byzantine hardening and private rooms remain out of scope.
- The exploratory destroy-race spike is not part of the delivered product; finishing apply with those spike files still present is a failed close-out.
- Finishing apply while harness lifecycle/teardown gates still fail is also a failed close-out.
