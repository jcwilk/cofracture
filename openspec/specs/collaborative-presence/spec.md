# collaborative-presence Specification

## Purpose
TBD - created by archiving change collaborative-mandelbrot-explorer. Update Purpose after archive.

## Requirements

### Requirement: Participants explore independently
Each connected participant SHALL control their own viewport and tile selections without affecting another participant's navigation.

#### Scenario: One participant's zoom does not move another's view
- **WHEN** two or more participants are connected
- **AND** one participant selects a tile to zoom
- **THEN** only that participant's viewport changes
- **AND** other participants retain their own current view

### Requirement: Current tile focus is shared with peers
Each participant SHALL publish their currently selected tile region so other participants can see where they are exploring.

#### Scenario: Focus updates after a local selection
- **WHEN** a participant completes a tile-selection transition
- **THEN** their shared presence reflects the tile region they are now viewing at the finest selected subdivision

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

### Requirement: Explorers in a mesh see each other's hues
The application SHALL support multiple participants exploring at the same time inside a mesh of at most 16 participants, with presence updates flowing between those participants in near real time.

#### Scenario: Multiple peer hues coexist
- **WHEN** at least three participants share a mesh and each has a distinct tile focus
- **THEN** each of them can distinguish every other participant's hue in the fractal coloring on their own screen

### Requirement: A run has one public identity
A running participant SHALL publish exactly one public identity. That identity SHALL be created for the run. A later run, including a reload of the same page, SHALL receive a different public identity and SHALL NOT publish the previous one. A second startup while the run is still active SHALL NOT create another identity.

#### Scenario: Reload is a new participant
- **GIVEN** a participant run has a public identity
- **WHEN** the page reloads and a new run starts
- **THEN** the new run's public identity is different
- **AND** the new run does not publish the previous identity

#### Scenario: One run stays one identity
- **GIVEN** a participant run has started
- **WHEN** it discovers other participants and joins them
- **THEN** it still publishes only the identity it started with

### Requirement: Participant color is a fingerprint of identity
The system SHALL assign each public identity one color determined only by that identity. Every observer, including the participant who owns the identity, SHALL use that same color for it. The color SHALL NOT depend on who is looking, join order, or viewport position.

#### Scenario: Observers agree on a color
- **GIVEN** two participants can both see a third participant's public identity
- **WHEN** each determines the color for that identity
- **THEN** both choose the same color
- **AND** that color is the color the third participant uses for itself

#### Scenario: A new identity has its own color
- **GIVEN** a run is replaced by a later run with a different public identity
- **WHEN** observers determine the color for the new identity
- **THEN** the color is the fingerprint of the new identity

### Requirement: Session activity is reported with identity and color
The session SHALL emit an activity report a person can read and a listener can detect as the same facts. It SHALL report own identity at start, discovery of another participant, connection success, connection failure, and removal. Every report, including for the local participant, SHALL include that public identity and its fingerprint color. Those kinds SHALL be distinguishable from each other.

#### Scenario: The run announces itself
- **WHEN** a participant run starts
- **THEN** an activity report names that run's public identity and fingerprint color

#### Scenario: Discovery is not yet a connection
- **GIVEN** a participant learns another participant's identity from discovery
- **WHEN** no connection attempt has completed
- **THEN** an activity report says that identity was discovered and includes its fingerprint color
- **AND** the report is not a successful-connection report

#### Scenario: A successful connection is reported
- **WHEN** a participant successfully connects to another participant
- **THEN** an activity report says the connection succeeded and includes that identity and its fingerprint color

#### Scenario: A failed connection is reported
- **GIVEN** a participant has discovered another identity
- **WHEN** connecting to that identity fails
- **THEN** an activity report says the connection was unsuccessful and includes that identity and its fingerprint color
- **AND** that identity is not an active coloring participant

### Requirement: A silent participant is removed
A remote participant who stops sharing presence SHALL stop being an active participant within 15 seconds of the last share. That removal SHALL be reported with the identity and its fingerprint color. The removed participant SHALL NOT remain a coloring window.

#### Scenario: Silence drops the participant
- **GIVEN** a remote participant is active
- **WHEN** 15 seconds pass with no further presence from that identity
- **THEN** the local session no longer treats that identity as active
- **AND** a removal report names that identity and its fingerprint color
