## ADDED Requirements

### Requirement: Headless instances run the shared session core
The project SHALL provide a harness that starts multiple instances of the same session core the fractal page uses. The harness SHALL NOT open the fractal explorer, render the fractal, or install page input handlers. Each instance SHALL emit session activity reports.

#### Scenario: Two instances start without a page
- **WHEN** the harness starts two session instances
- **THEN** each instance reports its own public identity and fingerprint color
- **AND** the run does not require a fractal canvas or page input

### Requirement: The harness reads activity reports as signals
The harness SHALL observe session activity reports as signals. It SHALL distinguish own identity, discovery, connection success, connection failure, and removal. Each signal SHALL include the reported public identity and fingerprint color.

#### Scenario: Connection success is its own signal
- **GIVEN** two harness instances
- **WHEN** one successfully connects to the other
- **THEN** the harness records a connection-success signal for that identity and color
- **AND** that signal is distinct from a discovery signal and from a removal signal

### Requirement: The harness checks connection and position forwarding
The harness SHALL run its instances in a collaboration scope private to that run. It SHALL fail the run if an instance treats someone the harness did not start as an active participant. After the instances are connected, changing one instance's exploration region SHALL be visible on each other connected instance. With only those instances running, each SHALL have exactly one active remote participant, and that participant SHALL be the other instance.

#### Scenario: A region change arrives
- **GIVEN** two harness instances are connected
- **WHEN** the first instance changes its exploration region
- **THEN** the second instance's session shows that region for the first instance

#### Scenario: The run does not pick up outsiders
- **GIVEN** the public site scope may contain other participants
- **WHEN** the harness runs two instances
- **THEN** those instances connect to each other
- **AND** neither records an active participant the harness did not start

#### Scenario: Two instances do not grow extra participants
- **GIVEN** the harness started exactly two instances
- **WHEN** they have connected
- **THEN** each instance has exactly one active remote participant
- **AND** that participant is the other instance
