## ADDED Requirements

### Requirement: The session core shares position without a page
The shared session core SHALL hold the local exploration region and each active remote participant's region, SHALL publish local region changes, and SHALL apply remote region updates. It SHALL do this without rendering a fractal, handling pointer input, or requiring a document. The fractal page SHALL send navigation intent to this core and SHALL color from the regions the core holds. A headless caller SHALL change its region through the same core.

#### Scenario: A region changes with no page
- **GIVEN** two session cores are connected and neither is attached to a fractal page
- **WHEN** one core sets a new local exploration region
- **THEN** the other core records that region for the first participant

#### Scenario: The page follows the core
- **GIVEN** the fractal page is showing a session
- **WHEN** a remote region changes in the session core
- **THEN** fractal coloring uses the region held by the core
- **AND** the page does not keep a separate connection lifecycle for that participant

### Requirement: A session can use a private collaboration scope
A session SHALL be startable in a collaboration scope that does not discover or exchange presence with the public site scope. The fractal page SHALL use the public scope. Another scope SHALL NOT connect to participants who are only in the public scope.

#### Scenario: A private scope ignores the public mesh
- **GIVEN** a participant is active in the public site scope
- **WHEN** a session starts in a different collaboration scope
- **THEN** it does not discover or connect to that public-scope participant
