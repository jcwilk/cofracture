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

### Requirement: Peer tile highlights are visible
Each participant SHALL see a distinct highlight on the fractal view for every other connected participant's shared tile region.

#### Scenario: Highlights appear for connected peers
- **WHEN** at least one other participant is connected and has shared a tile region
- **THEN** the local participant sees a highlight indicating each peer's current tile region on their own viewport

#### Scenario: Highlights update when peers move
- **WHEN** another participant changes their tile focus
- **THEN** that participant's highlight moves to reflect their new shared tile region without requiring a page reload

### Requirement: Presence works across simultaneous explorers
The application SHALL support multiple participants exploring at the same time with presence updates flowing between them in near real time.

#### Scenario: Multiple highlights coexist
- **WHEN** three or more participants are connected and each has a distinct tile focus
- **THEN** each participant can distinguish highlights for every other participant on their own screen

### Requirement: Participants join a session via shareable link
The application SHALL let visitors join the same collaborative session by opening or sharing a URL that encodes session join information, without creating an account.

#### Scenario: Second visitor joins an active session
- **WHEN** a visitor opens a shareable session link while another participant is already connected
- **THEN** the visitor joins the same session
- **AND** both participants can see each other's tile highlights once connected

#### Scenario: Host can share a session link
- **WHEN** a visitor starts a new collaborative session
- **THEN** they can obtain a shareable URL that allows others to join the same session

### Requirement: Solo exploration continues when presence is unavailable
When peer connectivity cannot be established or is lost, the application SHALL continue local Mandelbrot exploration without blocking navigation.

#### Scenario: Unreachable session falls back to solo mode
- **WHEN** a visitor cannot join or maintain a collaborative session
- **THEN** they can still explore the fractal locally
- **AND** peer highlights are not shown until connectivity succeeds

