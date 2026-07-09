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

An uncommitted exploratory spike (`scripts/mesh-destroy-harness.html` + `scripts/repro-mesh-destroy-race.mjs`) once showed that discovery teardown can be isolated from the UI and that some destroy races are observable. Treat it as **disposable guidance only**—partial, flaky, and not authoritative. Do not copy it forward as the suite; extract scenario *ideas* if useful, then **delete the spike files** before apply finishes so they are not left in the working tree or shipped.

## Goals / Non-Goals

**Goals:**

- Establish a three-layer architecture: **policy** (pure, deterministic), **transport adapters** (WebTorrent discovery bus, iroh gossip), **session orchestration** (lifecycle state machine used by the app).
- Make session phases and teardown observable and safe under concurrency.
- Land a **network test harness foundation** that can spawn N peers, drive discovery/join/presence/lifecycle scenarios headlessly, and assert no uncaught teardown faults — without requiring Mandelbrot rendering.
- **Close the loop**: transform spike-evidenced teardown failures into harness gates, then change product code until those gates pass (scope may widen; approach is not prescribed here).
- Keep solo exploration when networking fails.

**Non-Goals:**

- Replacing WebTorrent or iroh in this change (adapters may wrap them; swap is future).
- Private rooms, signed discovery payloads, or Byzantine-hard discovery.
- Prescribing *how* teardown races are fixed (ordering tricks, library patches, drains, etc.) — only that harness-gated failure modes must stop occurring.
- Guaranteeing every future intermittent third-party race fails a single short CI run (known evidenced classes must be gated; open-ended soak catalog is later work).
- Shipping, committing, or leaving the exploratory destroy-race spike scripts in the tree after apply.

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
   Uncaught exceptions from discovery/presence teardown during multi-peer activity are bugs. Session guarantees page remains usable (solo).  
   *Why:* Dependable networking means the explorer never dies because discovery teardown raced.

5. **Evidence → tooling → fix is the apply gate sequence**  
   Spike evidence established that teardown under multi-peer stress can throw. Apply must (a) encode that failure class in the durable harness so it fails closed when the bug is present, (b) fix product behavior until the harness passes, (c) delete the spike. Broader architectural changes to achieve (b) are acceptable. This design does **not** pick a fix recipe.  
   *Why:* Otherwise the harness becomes a museum of known bugs.  
   *Alternative:* Ship harness-only and defer fixes — rejected for this change.

6. **Spike is throwaway guidance; suite is greenfield relative to it**  
   Scenario *themes* from the spike (start/stop storm, warm stop wave, multi-tab flap) may inspire named L2 cases. The harness API, layout, and runners are designed from this change’s specs—not by polishing the spike. Before finish: remove the spike paths if they still exist locally so apply-complete leaves no spike residue.

## Risks / Trade-offs

- **[Risk] Refactor churn breaks working happy-path join** → Mitigation: L1/L2 harness scenarios for discover→join→advertise before deleting monolith paths; keep solo fallback covered.
- **[Risk] Known teardown races are intermittent and hard to gate** → Mitigation: encode the evidenced failure *class* (uncaught teardown under concurrent peers / destroy-during-start) as harness scenarios; tune until they reliably fail on broken code and pass on fixed code; soak only as needed for that class—not an unbounded race catalog.
- **[Risk] Fix scope balloons** → Mitigation: acceptable per proposal; keep façade/harness gates green as the definition of done, avoid unrelated visual work.
- **[Risk] Over-abstraction slows shipping** → Mitigation: Lite first slice — session façade + harness gates + fixes until green; defer perfect DI.

## Migration Plan

1. Introduce session façade wrapping current `initPresence` behavior without UI change.  
2. Add L1 tests with fake discovery transport.  
3. Build L2 harness scenarios that encode spike-evidenced teardown failure modes as failing gates.  
4. Change product networking until those gates pass (mechanism unconstrained).  
5. Delete any remaining exploratory destroy-race spike artifacts from the tree.  
6. Thin toward policy vs adapter split as needed to keep gates green and architecture coherent.

Rollback: façade can delegate to legacy path if a flag is needed; living behavior (bare URL join, solo fallback) stays.

## Open Questions

- Whether L2 peers run in Playwright pages, same-origin workers, or both — apply chooses based on WebTorrent browser constraints; design allows either as long as multi-peer + no UI holds.
- CI budget for soak — default to PR-critical L0/L1 + short L2; longer soak deferred unless human expands tasks.
