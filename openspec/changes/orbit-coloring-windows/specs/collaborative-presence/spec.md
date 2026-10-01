## ADDED Requirements

### Requirement: Peer regions are coloring windows
Each other connected participant's shared tile region SHALL act as a coloring window in that participant's hue. The application SHALL NOT draw that region as a filled or stroked rectangle. Its place SHALL be visible only as hue on orbits that pass through it.

#### Scenario: A peer region colors orbits and draws no rectangle
- **GIVEN** another participant is connected and has shared a tile region
- **WHEN** the local participant views the fractal
- **THEN** pixels whose orbits pass through that region pick up the peer's hue
- **AND** no filled or outlined rectangle is drawn for that region

#### Scenario: Peer coloring follows a new tile focus
- **WHEN** another participant changes their tile focus
- **THEN** orbits pick up that participant's hue from the new region
- **AND** the update does not require a page reload

## MODIFIED Requirements

### Requirement: Presence works across simultaneous explorers
The application SHALL support multiple participants exploring at the same time with presence updates flowing between them in near real time.

#### Scenario: Multiple highlights coexist
- **WHEN** three or more participants are connected and each has a distinct tile focus
- **THEN** each participant can distinguish every other participant's hue in the fractal coloring on their own screen

### Requirement: Solo exploration continues when presence is unavailable
When peer connectivity cannot be established or is lost, the application SHALL continue local Mandelbrot exploration without blocking navigation.

#### Scenario: Unreachable session falls back to solo mode
- **WHEN** a visitor cannot discover a live mesh, bootstrap into gossip, or maintain a collaborative connection
- **THEN** they can still explore the fractal locally
- **AND** other participants' coloring windows are absent until connectivity succeeds
- **AND** the local view continues to color the fractal

### Requirement: Participants join from a single public site URL
The application SHALL allow any visitor to join collaborative presence by opening the same published site URL as everyone else, without requiring a per-session link or encoded join ticket in the address.

#### Scenario: Second visitor joins without a special URL
- **WHEN** a visitor opens the standard published site URL while another participant is already connected to a live mesh
- **THEN** the visitor automatically attempts discovery and join
- **AND** both participants can see each other's regions as coloring in the fractal once connected

### Requirement: Presence session follows the shared networking lifecycle
Collaborative presence startup, mesh join, merge attempts, and shutdown SHALL go through the shared networking session lifecycle so presence does not own conflicting transport teardown paths. Presence SHALL remain compatible with solo exploration when the session is stopped or unavailable.

#### Scenario: Presence shutdown is session-scoped
- **GIVEN** a visitor has an active presence session with peer coloring windows
- **WHEN** the networking session stops
- **THEN** other participants' coloring windows cease to affect the fractal
- **AND** local fractal navigation continues
- **AND** the local coloring window remains active

#### Scenario: Presence does not require the viewport module to manage transports
- **GIVEN** presence networking is initialized
- **WHEN** transports for discovery or gossip are started or stopped
- **THEN** those lifecycle operations are performed by the networking session layer, not by viewport rendering code

## REMOVED Requirements

### Requirement: Peer tile highlights are visible
**Reason:** Peer regions no longer appear as drawn highlights. They color orbits, which is specified by "Peer regions are coloring windows."
**Migration:** Treat each peer's shared tile region as a coloring window. Do not draw a filled or stroked rectangle for it.
