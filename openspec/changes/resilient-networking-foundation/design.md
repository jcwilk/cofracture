## Context

Today’s stack is roughly:

```
main / viewport (UI)
        │
   presence.ts  ── orchestrates BroadcastChannel + MeshDiscovery + presence-wasm
        │
   mesh-discovery.ts  ── WebTorrent swarm + ad encode/seq/merge policy
        │
   presence-wasm / iroh-gossip  ── mesh join + presence fan-out
```

Policy (seq, oldest-mesh, backoff), transport (WebTorrent client lifecycle), and UI startup are interleaved. Teardown is `client.destroy()` / `pagehide` without a clear “draining” phase, which matches the observed intermittent `removeListener` / `client already destroyed` failures under multi-tab flap. Unit tests cover pure discovery helpers; acceptance scripts exercise the full app slowly. There is no layered harness that can stress lifecycle without the fractal.

An uncommitted spike (`scripts/mesh-destroy-harness.html` + `scripts/repro-mesh-destroy-race.mjs`) proved we can isolate discovery teardown from the UI and that some destroy races are reproducible; it is input to this design, not the destination suite.

## Goals / Non-Goals

**Goals:**

- Establish a three-layer architecture: **policy** (pure, deterministic), **transport adapters** (WebTorrent discovery bus, iroh gossip), **session orchestration** (lifecycle state machine used by the app).
- Make session phases and teardown observable and safe under concurrency.
- Land a **network test harness foundation** that can spawn N peers, drive discovery/join/presence/lifecycle scenarios headlessly, and assert no uncaught teardown faults — without requiring Mandelbrot rendering.
- Keep solo exploration when networking fails.

**Non-Goals:**

- Replacing WebTorrent or iroh in this change (adapters may wrap them; swap is future).
- Private rooms, signed discovery payloads, or Byzantine-hard discovery.
- Perfect single-shot reproduction of every intermittent library race in CI (harness must make races *actionable* and catch regressions; flaky library bugs may still need soak modes).
- Shipping the spike scripts as-is as the permanent suite.

## Decisions

1. **Three layers, one session façade**  
   - **Policy**: pure functions already largely in mesh-discovery helpers (seq, mesh selection, backoff) — keep free of transports.  
   - **Transports**: thin adapters with explicit `start` / `stop` that never throw across the session boundary (errors become typed results or events).  
   - **Session**: single owner of phase transitions; UI only calls session APIs and subscribes to peer/presence events.  
   *Why:* Isolates flaky transport teardown from policy and UI; enables harness peers without canvas.  
   *Alternative:* Keep monolithic `presence.ts` — rejected; blocks reliable testing.

2. **Explicit lifecycle phases**  
   Phases: `idle → discovering → joining → active → merging → draining → stopped` (names illustrative). Transitions are idempotent where possible; `draining` awaits/ignores in-flight transport work before releasing resources.  
   *Why:* Matches real failure mode (destroy while seed/tracker hot).  
   *Alternative:* Fire-and-forget `destroy()` on pagehide — status quo, rejected.

3. **Harness as first-class peer runtime, not only Playwright-on-full-app**  
   Prefer a headless peer factory that constructs session+transports in-page (or worker) with injectable clocks/RNG for policy tests, plus a thinner Playwright multi-context driver for browser-real transports. Pyramid:  
   - L0: pure policy (vitest, already started)  
   - L1: session + fake transports (deterministic lifecycle)  
   - L2: real discovery transport, multi-peer, no UI  
   - L3: full-app smoke (rare)  
   *Why:* Fast feedback on architecture; L2 catches WebTorrent races without fractal noise.  
   *Alternative:* Only full-app Playwright — too slow/noisy (spike experience).

4. **Teardown safety is a product requirement, not a log nicety**  
   Uncaught exceptions from discovery/presence teardown during multi-peer activity are bugs. Adapters catch and surface; session guarantees page remains usable (solo).  
   *Why:* Dependable networking means the explorer never dies because a tracker socket raced destroy.

5. **Spike informs L2 scenarios; suite owns the API**  
   Destroy-race scenarios (start/stop storm, warm stop wave, multi-tab flap) become named harness cases. Implementation may rewrite the spike into the suite layout during apply.

## Risks / Trade-offs

- **[Risk] Refactor churn breaks working happy-path join** → Mitigation: L1/L2 harness scenarios for discover→join→advertise before deleting monolith paths; keep solo fallback covered.
- **[Risk] Intermittent WebTorrent races remain flaky in CI** → Mitigation: deterministic L1 for lifecycle; L2 soak job optional/nightly; assert “no uncaught error” with retries/quarantine only where documented.
- **[Risk] Over-abstraction slows shipping** → Mitigation: Lite first slice — extract session façade + fake transport + one L2 destroy scenario; defer perfect DI.

## Migration Plan

1. Introduce session façade wrapping current `initPresence` behavior without UI change.  
2. Add L1 tests with fake discovery transport.  
3. Fold spike scenarios into L2 harness; gate teardown safety.  
4. Harden real adapter stop/drain.  
5. Only then thin `presence.ts` / `mesh-discovery.ts` toward policy vs adapter split.

Rollback: façade can delegate to legacy path if a flag is needed; living behavior (bare URL join, solo fallback) stays.

## Open Questions

- Whether L2 peers run in Playwright pages, same-origin workers, or both — apply chooses based on WebTorrent browser constraints; design allows either as long as multi-peer + no UI holds.
- CI budget for soak — default to PR-critical L0/L1 + short L2; longer soak deferred unless human expands tasks.
