## Required for this change

### 1. Session façade and layering

- [x] 1.1 Introduce a networking session façade that owns discovery + presence lifecycle phases (discover → join → active → drain/stop) and is callable without the fractal viewport
- [x] 1.2 Route application startup through the session façade while preserving bare-URL join and solo fallback behavior
- [x] 1.3 Ensure transport start/stop errors are contained at the adapter/session boundary (no uncaught teardown exceptions to the page)

### 2. Policy vs transport separation (first slice)

- [x] 2.1 Keep mesh advertisement seq/selection/backoff policy invocable without constructing a live discovery transport
- [x] 2.2 Wrap the live discovery transport behind an adapter with explicit start/stop used only by the session layer
- [x] 2.3 Confirm viewport/render code does not directly own discovery or gossip transport objects

### 3. Network test harness foundation

- [x] 3.1 Add a headless multi-peer harness entry point that spawns N networking participants without rendering the Mandelbrot UI
- [x] 3.2 Implement a two-peer discovery/startup scenario that asserts a coherent mesh membership outcome
- [x] 3.3 Implement lifecycle stress scenarios: overlapping stop while peers remain active, and rapid stop/restart
- [x] 3.4 Fail harness runs when any participant surfaces an uncaught networking error during those scenarios
- [x] 3.5 Encode spike-evidenced teardown failure classes as durable harness gates (concurrent-peer teardown uncaught errors; destroy-during-start) that fail on broken builds
- [x] 3.6 If consulting the exploratory destroy-race spike, treat it as non-authoritative guidance only; implement harness scenarios from this change’s contracts (do not promote or polish the spike into the suite)

### 4. Fix until harness gates pass

- [x] 4.1 Change product networking behavior until concurrent-peer teardown and destroy-during-start harness gates pass (mechanism unconstrained; broader refactors acceptable)
- [x] 4.2 Make presence session stop clear peer highlights and leave local exploration working
- [x] 4.3 Re-run the teardown/lifecycle harness gates and record passing evidence before finish

### 5. Spike cleanup (required before finish)

- [x] 5.1 Remove exploratory destroy-race spike artifacts from the working tree (`scripts/mesh-destroy-harness.html`, `scripts/repro-mesh-destroy-race.mjs`, and any copies) so they are not present when apply finishes
- [x] 5.2 Confirm the delivered harness does not depend on those spike paths

### 6. Validation and archive

- [x] 6.1 Run `openspec validate "resilient-networking-foundation" --type change` and resolve any failures
- [ ] 6.2 Archive change and verify delta requirements are merged into living specs

## Explicitly deferred

- Replacing WebTorrent or iroh with different transports.
- Private rooms, signed discovery payloads, Byzantine-hard discovery.
- Prescribing a specific teardown-fix implementation technique.
- Cataloging every future intermittent third-party race beyond the evidenced failure classes gated above.
- Full rewrite of fractal UI or presence highlight visuals.
- Keeping or committing the exploratory destroy-race spike as project tooling.
