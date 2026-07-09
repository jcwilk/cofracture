## ADDED Requirements

### Requirement: Networking is separated into policy, transport, and session layers
Collaborative networking SHALL be organized so that mesh/presence policy decisions are independent of concrete transport mechanisms, and so that a session layer owns lifecycle and exposes a stable façade to the application UI. The fractal viewport SHALL NOT be required for discovery or presence logic to run.

#### Scenario: Policy can be exercised without a live transport
- **GIVEN** mesh selection, advertisement freshness, or advertising-interval policy needs verification
- **WHEN** those rules are evaluated in isolation
- **THEN** the outcomes do not require a live discovery swarm, gossip mesh, or rendered fractal viewport

#### Scenario: UI is not the networking runtime
- **GIVEN** a networking session is started for collaborative presence
- **WHEN** discovery and presence proceed
- **THEN** those steps are driven through the session façade rather than ad hoc UI-module side effects that own transport objects directly

### Requirement: Session lifecycle phases are explicit and teardown is safe
A networking session SHALL progress through well-defined phases including discovery, join, active participation, and shutdown. Leaving a session or stopping discovery SHALL complete without uncaught errors that interrupt the page, even when other peers are concurrently advertising or connected. After shutdown, the visitor SHALL remain able to explore the fractal locally. Known teardown failure modes that exploratory multi-peer stress already evidenced SHALL be treated as must-fix defects for this change, verified by network-test-harness gates rather than by unchecked claim.

#### Scenario: Shutdown during multi-peer activity does not crash the page
- **GIVEN** at least two participants are in discovery or active mesh participation
- **WHEN** one participant’s session is stopped or the page begins unload
- **THEN** no uncaught error from networking teardown surfaces to the page
- **AND** local fractal exploration remains available for that visitor (solo)

#### Scenario: Repeated start and stop is tolerated
- **GIVEN** a client starts a networking session
- **WHEN** the session is stopped and started again in quick succession
- **THEN** the client reaches a coherent session state without uncaught teardown or startup errors from the prior attempt

#### Scenario: Harness teardown gates must pass before the change is considered done
- **GIVEN** the headless network harness encodes concurrent-peer teardown and destroy-during-start failure classes
- **WHEN** those gates are evaluated for apply completion
- **THEN** they pass against the delivered build

### Requirement: Connectivity loss degrades to solo without blocking exploration
When discovery, join, or an active mesh fails or becomes unavailable, the application SHALL continue local exploration and SHALL omit peer highlights until connectivity succeeds again.

#### Scenario: Failed join leaves solo mode
- **GIVEN** a visitor cannot complete discovery or mesh join
- **WHEN** networking reports failure or gives up the attempt
- **THEN** the visitor can still navigate the fractal
- **AND** peer highlights are not shown
