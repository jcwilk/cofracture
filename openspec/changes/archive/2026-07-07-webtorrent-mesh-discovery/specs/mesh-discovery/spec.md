## ADDED Requirements

### Requirement: Clients discover live meshes before joining gossip
Each client SHALL observe the public discovery channel for a bounded initial period before committing to a gossip mesh, so newcomers can detect meshes already being advertised by other participants.

#### Scenario: Listener detects an existing mesh
- **GIVEN** at least one other participant is actively advertising membership in a mesh
- **WHEN** a new visitor starts the application and completes the initial discovery listen period
- **THEN** the visitor identifies at least one live mesh to join rather than forming a new one

#### Scenario: Listener finds no mesh and forms one
- **GIVEN** no other participant advertises a live mesh during the listen period
- **WHEN** a new visitor completes the initial discovery listen period
- **THEN** the visitor forms a new mesh with a newly generated mesh identity and formation timestamp
- **AND** considers itself a participating member of that mesh

### Requirement: Discovery advertisements identify mesh membership and bootstrap targets
Participants that are part of a mesh SHALL publish discovery advertisements that allow other clients to identify which mesh is being offered and which endpoint identity can be used to bootstrap a gossip connection.

#### Scenario: Advertisement enables bootstrap
- **WHEN** a participating client publishes a discovery advertisement
- **THEN** another client can determine the advertiser's mesh identity, when that mesh was formed, and the advertiser's endpoint identity suitable for bootstrap dialing

### Requirement: Advertisement sequence numbers monotonically identify freshness
Each participating client SHALL assign strictly increasing sequence numbers to its own discovery advertisements across page loads, and receivers SHALL treat only the newest sequence from each advertiser as current.

#### Scenario: Out-of-order advertisement is ignored
- **GIVEN** a receiver has already accepted advertisement sequence N from a particular advertiser
- **WHEN** the receiver later sees another advertisement from the same advertiser with sequence less than or equal to N
- **THEN** the receiver discards the stale advertisement and does not change mesh or bootstrap state because of it

#### Scenario: Sequence survives reload
- **GIVEN** a participant has previously published discovery advertisements in the same browser
- **WHEN** the participant reloads the page and publishes again
- **THEN** the new advertisement uses a higher sequence number than any it published before the reload

### Requirement: Participating clients periodically advertise bootstrap availability
Clients that have joined a mesh SHALL continue publishing discovery advertisements on a recurring schedule while they remain active, so future visitors can find live bootstrap targets without relying on a always-online coordinator.

#### Scenario: Ongoing advertisements after join
- **WHEN** a client has joined a mesh and is accepting bootstrap connections
- **THEN** it continues to publish discovery advertisements at a regular interval throughout the session until it leaves or shuts down

### Requirement: Advertising load is shared with automatic spacing
When many participants advertise the same mesh, each participant SHALL increase the time between its own advertisements so discovery traffic spreads out naturally as participant count grows.

#### Scenario: Interval widens as advertisers increase
- **GIVEN** many distinct participants are currently advertising the same mesh
- **WHEN** a participant schedules its next discovery advertisement
- **THEN** the wait before that advertisement is longer than the base interval used when only a few participants are advertising

### Requirement: Mesh partitions merge toward the oldest formation
When a client learns of a mesh whose formation time is earlier than its current mesh, it SHALL attempt to leave its current mesh and join the older mesh so split partitions converge instead of persisting indefinitely.

#### Scenario: Switch to older mesh
- **GIVEN** a client is participating in a mesh formed at time T_new
- **AND** it receives valid discovery advertisements for a different mesh formed at time T_old where T_old is earlier than T_new
- **WHEN** it can reach live bootstrap targets for the older mesh
- **THEN** it joins the older mesh and thereafter advertises membership in that older mesh

#### Scenario: Failed merge retains current mesh
- **GIVEN** a client attempts to switch to an older mesh
- **WHEN** no live bootstrap target for the older mesh can be reached
- **THEN** the client remains in its current mesh until a later successful merge attempt

### Requirement: Discovery operates without a project-run coordination server
Mesh discovery and advertisement SHALL function for visitors using only static site assets and publicly reachable discovery infrastructure, without requiring a dedicated application server operated for session coordination.

#### Scenario: Strangers join via the same bare site URL
- **GIVEN** two visitors open the same published site URL without per-session parameters
- **AND** at least one visitor is already participating in a mesh
- **WHEN** the second visitor completes startup discovery
- **THEN** the second visitor can bootstrap into the first visitor's mesh and participate in collaborative presence
