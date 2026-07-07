## ADDED Requirements

### Requirement: Participants join from a single public site URL
The application SHALL allow any visitor to join collaborative presence by opening the same published site URL as everyone else, without requiring a per-session link or encoded join ticket in the address.

#### Scenario: Second visitor joins without a special URL
- **WHEN** a visitor opens the standard published site URL while another participant is already connected to a live mesh
- **THEN** the visitor automatically attempts discovery and join
- **AND** both participants can see each other's tile highlights once connected

## MODIFIED Requirements

### Requirement: Solo exploration continues when presence is unavailable
When peer connectivity cannot be established or is lost, the application SHALL continue local Mandelbrot exploration without blocking navigation.

#### Scenario: Unreachable session falls back to solo mode
- **WHEN** a visitor cannot discover a live mesh, bootstrap into gossip, or maintain a collaborative connection
- **THEN** they can still explore the fractal locally
- **AND** peer highlights are not shown until connectivity succeeds

## REMOVED Requirements

### Requirement: Participants join a session via shareable link
**Reason:** Join coordination moves to automatic mesh discovery at the single public site URL; per-session URL encoding is no longer the primary join mechanism.
**Migration:** Visitors share the ordinary site URL; discovery and bootstrap replace ticket-based session links.
