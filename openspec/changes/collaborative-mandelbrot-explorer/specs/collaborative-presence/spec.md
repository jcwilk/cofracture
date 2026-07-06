## ADDED Requirements

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
