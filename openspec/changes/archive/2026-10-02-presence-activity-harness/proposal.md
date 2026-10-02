## Why

Two clients still fail to show each other's moving coloring windows, and extra window frames appear, but the session log does not say who this participant is, who was discovered, whether a connection succeeded, or why someone disappeared. The existing multi-peer check drives browser pages. It does not run the same connection-and-position core the page uses, and it cannot treat session activity as signals a repeatable test can assert.

## What Changes

- Each running participant has one public identity for that run. A new run, including a reload, gets a new identity. The identity is not kept for the next run.
- Every participant, including the local one, is shown with a color derived only from that public identity. Every observer assigns the same color to the same identity.
- The session reports activity a person can read and a test can detect: own identity at start, another participant discovered, connection succeeded, connection failed, and a participant removed. Each report names the identity and its color.
- A remote participant who stops sharing is removed, and that removal is reported, within 15 seconds. A failed connection is reported as unsuccessful and does not leave an extra active participant.
- Local position and remote positions live in the shared session core. The fractal page only renders and forwards navigation intent. The core does not render, handle clicks, or depend on a page.
- A separate headless harness runs multiple instances of that same core, with no fractal UI and no page, watches the activity reports as signals, and checks that the instances connect and that a position change on one appears on the others.
- The existing browser-page lifecycle harness stays. This harness does not replace it.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `collaborative-presence`: One identity per run, a shared color fingerprint, an activity report for discovery, connect success, connect failure, and removal, and removal of a silent participant within 15 seconds.
- `networking-architecture`: The session core owns position tracking and sharing without the fractal UI. The page and the headless harness both use that core.
- `network-test-harness`: A headless multi-instance driver of the shared session core, with no page, that treats activity reports as signals and checks connection plus position forwarding.

## Impact

- Session startup, discovery, gossip join, presence, and shutdown gain a stable activity report used by the page console and by tests.
- Peer coloring uses the identity fingerprint so logs and fractal hues agree.
- Viewport code stops owning connection and position state; it reads the core and sends navigation intent.
- Apply adds a repeatable headless run of several session instances. Live browser exploration remains available for a person, but the new harness is the gate for "they found each other and positions moved."
- Does not change the public site URL, mesh capacity, or discovery infrastructure. Does not remove the existing page-based lifecycle harness.
