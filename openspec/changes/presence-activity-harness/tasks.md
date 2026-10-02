# Tasks

## 1. Identity, color, and activity

- [x] 1.1 Assign each public identity one fingerprint color from that identity alone, and use it for both activity reports and fractal hues. Verify two callers agree on an identity, a different identity can differ, and the owner of an identity gets the same color observers use.
- [x] 1.2 Give each run one in-memory public identity. A second start while that run is active reuses it. A new run, including after reload, gets a different identity and does not read a previously saved one. Verify with a test that a second start does not publish another identity and that a fresh run does not reuse a stored identity.
- [x] 1.3 Emit activity for own identity, discovery, connection success, connection failure, and removal. Each record includes the public identity and fingerprint color, is one readable console line, and is delivered to subscribers as the same facts. Verify a subscriber receives each kind as a distinct signal and the console line carries the identity and color.

## 2. Session core

- [x] 2.1 Hold the local exploration region and each active remote region in the session core, publish local changes, and apply remote updates, with no fractal render and no pointer handling. Verify a test with no document can set a local region and observe another core record it once presence is delivered.
- [x] 2.2 Point the fractal page at that core: navigation intent updates the core's local region, and coloring reads remote regions from the core. Verify the page does not keep a second peer-connection list.
- [x] 2.3 Let a session start in a private collaboration scope that does not discover or connect to the public site scope. The fractal page keeps the public scope. Verify a private-scope session does not become active with a participant who exists only in the public scope.
- [x] 2.4 Remove a remote participant immediately on disconnect and within 15 seconds of the last presence share, and report that removal with identity and color. A failed connection is reported and does not add an active participant. Verify with a test clock that silence at 15 seconds removes the participant and that a failed attempt leaves the active set unchanged.

## 3. Headless harness

- [x] 3.1 Start multiple instances of the shared session core in the test runner with no fractal page and no page input. Subscribe to activity records. Verify two instances each emit an own-identity signal with a fingerprint color and that the run does not load the fractal explorer.
- [x] 3.2 Run two instances in a private scope until each has a connection-success signal for the other and exactly one active remote, that remote being the other instance. Change one instance's region and verify the other instance's session shows it. Verify the run fails if an outsider or a duplicate identity is active. If the gossip transport cannot start in the test runner, stop and record that blocker; do not substitute the fractal app or the existing browser-page harness.

## Explicitly deferred

- Replacing the existing browser-page lifecycle harness.
- Changing whether peer regions are also drawn as outlines.
- Changing mesh capacity or the public site URL.
