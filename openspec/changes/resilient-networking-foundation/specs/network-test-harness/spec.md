## ADDED Requirements

### Requirement: Headless multi-peer harness drives networking without the fractal UI
The project SHALL provide a headless multi-peer test harness that can create multiple networking participants, exercise discovery and presence session flows, and collect failures — without rendering the Mandelbrot viewport.

#### Scenario: Two harness peers complete discovery-oriented startup
- **GIVEN** the harness can spawn two participants with networking enabled and UI rendering disabled or absent
- **WHEN** both complete startup discovery against the same public discovery channel configuration used by the app
- **THEN** at least one coherent mesh membership outcome is observed (join existing or form/merge per mesh-discovery rules)
- **AND** the run does not require a visible fractal canvas

### Requirement: Harness covers lifecycle stress and teardown safety
The harness SHALL include scenarios that overlap session start and stop across peers (including rapid stop/restart and multi-participant teardown while others remain active) and SHALL fail the scenario if an uncaught networking error is observed on a participant page or runtime.

#### Scenario: Overlapping stop while peers remain active
- **GIVEN** several harness participants are discovering or advertising
- **WHEN** one or more participants stop their sessions while others continue
- **THEN** the stopped participants report clean shutdown to the harness
- **AND** the harness records a failure if any participant surfaces an uncaught networking teardown error

#### Scenario: Rapid restart does not poison the suite
- **GIVEN** a harness participant has stopped a session
- **WHEN** it starts a new session immediately afterward
- **THEN** the new session can proceed without uncaught errors attributable to the previous session’s teardown

### Requirement: Harness results distinguish policy, session, and transport failures
Harness output SHALL make it possible to tell whether a failure is in deterministic policy expectations, session lifecycle, or live transport behavior, so contributors can target fixes without re-running the full application UI.

#### Scenario: Policy assertion failure is identifiable
- **GIVEN** a harness or unit scenario expects a specific mesh-selection or sequence-freshness outcome
- **WHEN** that expectation fails
- **THEN** the failure is reported as a policy/session expectation miss rather than only as a generic page error

### Requirement: Full-app networking smoke remains available but is not the only gate
A full-application multi-tab networking smoke path MAY remain for end-to-end confidence, but the headless harness SHALL be the primary place for lifecycle and discovery regression coverage.

#### Scenario: Lifecycle regression is catchable without full UI
- **GIVEN** a teardown or discovery lifecycle regression is introduced
- **WHEN** the headless harness lifecycle scenarios run
- **THEN** the regression can be detected without opening the fractal explorer UI
