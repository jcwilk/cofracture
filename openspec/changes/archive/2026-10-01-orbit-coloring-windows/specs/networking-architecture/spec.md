## MODIFIED Requirements

### Requirement: Connectivity loss degrades to solo without blocking exploration
When discovery, join, or an active mesh fails or becomes unavailable, the application SHALL continue local exploration and SHALL omit other participants' coloring windows until connectivity succeeds again. The local view's coloring window SHALL remain active.

#### Scenario: Failed join leaves solo mode
- **GIVEN** a visitor cannot complete discovery or mesh join
- **WHEN** networking reports failure or gives up the attempt
- **THEN** the visitor can still navigate the fractal
- **AND** other participants' coloring windows are not shown
- **AND** the local view still colors the fractal
