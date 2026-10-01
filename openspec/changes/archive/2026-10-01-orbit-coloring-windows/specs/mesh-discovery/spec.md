## ADDED Requirements

### Requirement: A mesh holds at most 16 participants
A collaborative mesh SHALL contain at most 16 participants. A listener SHALL be able to tell that a mesh is full without observing every member. When a mesh is seen with more than 16 participants, membership SHALL return to 16 by a rule every member can apply the same way, and anyone left out SHALL join or form a mesh that still has room.

#### Scenario: A sixteenth participant fills the mesh
- **GIVEN** a mesh has 15 participants
- **WHEN** one more participant joins it
- **THEN** the mesh has 16 participants
- **AND** it is full

#### Scenario: Over-capacity membership returns to 16
- **GIVEN** a mesh is observed with more than 16 participants
- **WHEN** members apply the capacity rule
- **THEN** the same 16 participants remain in that mesh no matter which member evaluates it
- **AND** each participant left out joins or forms a mesh that has room

### Requirement: Join and merge prefer the oldest mesh with room
A participant choosing a mesh SHALL join the oldest live mesh that still has room. When no live mesh has room, the participant SHALL form a new mesh. A participant SHALL NOT join or merge into a mesh that is already full.

#### Scenario: Oldest mesh with room wins over a newer one
- **GIVEN** two live meshes both have fewer than 16 participants
- **AND** one was formed earlier than the other
- **WHEN** a new participant finishes discovery
- **THEN** that participant joins the earlier mesh

#### Scenario: A full older mesh is skipped
- **GIVEN** the oldest live mesh already has 16 participants
- **AND** a newer mesh has room
- **WHEN** a new participant finishes discovery
- **THEN** that participant joins the newer mesh
- **AND** does not join the full mesh

#### Scenario: Every live mesh is full
- **GIVEN** every live mesh already has 16 participants
- **WHEN** a new participant finishes discovery
- **THEN** that participant forms a new mesh
- **AND** becomes a member of that new mesh

#### Scenario: Merge skips a full older mesh
- **GIVEN** a participant is in a mesh
- **AND** an older mesh exists and is already full
- **WHEN** the participant can reach that older mesh
- **THEN** the participant stays in the current mesh

## MODIFIED Requirements

### Requirement: Clients discover live meshes before joining gossip
Each client SHALL observe the public discovery channel for a bounded initial period before committing to a gossip mesh, so newcomers can detect meshes already being advertised by other participants.
(Previously: any advertised mesh was joinable, including one that would exceed 16 participants.)

#### Scenario: Listener detects an existing mesh
- **GIVEN** at least one other participant is actively advertising membership in a mesh that has room for another participant
- **WHEN** a new visitor starts the application and completes the initial discovery listen period
- **THEN** the visitor identifies at least one live mesh to join rather than forming a new one

#### Scenario: Listener finds no mesh and forms one
- **GIVEN** no other participant advertises a live mesh during the listen period
- **WHEN** a new visitor completes the initial discovery listen period
- **THEN** the visitor forms a new mesh with a newly generated mesh identity and formation timestamp
- **AND** considers itself a participating member of that mesh

### Requirement: Mesh partitions merge toward the oldest formation
When a client learns of a mesh whose formation time is earlier than its current mesh and that older mesh has room, it SHALL attempt to leave its current mesh and join the older mesh so split partitions converge instead of persisting indefinitely.
(Previously: the client attempted the switch whenever the older mesh was reachable, even if that mesh was full.)

#### Scenario: Switch to older mesh
- **GIVEN** a client is participating in a mesh formed at time T_new
- **AND** it receives valid discovery advertisements for a different mesh formed at time T_old where T_old is earlier than T_new
- **AND** the older mesh has room for another participant
- **WHEN** it can reach live bootstrap targets for the older mesh
- **THEN** it joins the older mesh and thereafter advertises membership in that older mesh

#### Scenario: Failed merge retains current mesh
- **GIVEN** a client attempts to switch to an older mesh
- **WHEN** no live bootstrap target for the older mesh can be reached
- **THEN** the client remains in its current mesh until a later successful merge attempt
