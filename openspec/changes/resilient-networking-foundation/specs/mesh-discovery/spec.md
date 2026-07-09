## ADDED Requirements

### Requirement: Discovery teardown does not surface uncaught errors
Stopping mesh discovery, including during page leave or session shutdown while other participants may still be on the discovery channel, SHALL NOT produce uncaught errors that interrupt the page. Discovery failures during teardown SHALL be contained so solo exploration remains possible.

#### Scenario: Stop while others advertise
- **GIVEN** a client is advertising or listening on the discovery channel
- **AND** at least one other participant is active on that channel
- **WHEN** the client stops discovery or the page begins unload
- **THEN** no uncaught error from discovery teardown is delivered to the page

#### Scenario: Destroy-during-start is contained
- **GIVEN** a client has begun starting discovery
- **WHEN** stop is requested before startup finishes
- **THEN** the client ends in a stopped discovery state without an uncaught error
