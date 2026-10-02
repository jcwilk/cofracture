## ADDED Requirements

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
