## ADDED Requirements

### Requirement: Presence session follows the shared networking lifecycle
Collaborative presence startup, mesh join, merge attempts, and shutdown SHALL go through the shared networking session lifecycle so presence does not own conflicting transport teardown paths. Presence SHALL remain compatible with solo exploration when the session is stopped or unavailable.

#### Scenario: Presence shutdown is session-scoped
- **GIVEN** a visitor has an active presence session with peer highlights
- **WHEN** the networking session stops
- **THEN** peer highlights are cleared or cease updating
- **AND** local fractal navigation continues

#### Scenario: Presence does not require the viewport module to manage transports
- **GIVEN** presence networking is initialized
- **WHEN** transports for discovery or gossip are started or stopped
- **THEN** those lifecycle operations are performed by the networking session layer, not by viewport rendering code
