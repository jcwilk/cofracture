## Why

Collaborative presence currently depends on URL-encoded session tickets, same-browser tab discovery, and a local bootstrap cache to find live iroh peers. That model fails for strangers opening the same bare GitHub Pages URL with no assumed always-online peer and no backend to coordinate join hints. A public, client-side discovery channel is needed so newcomers can find recent live endpoint identities and bootstrap into the same gossip mesh without per-session URL signaling.

## What Changes

- Add a **mesh discovery** layer that advertises and collects live bootstrap targets over WebTorrent so any visitor at the same site URL can find peers.
- On load, each client **listens** for existing mesh activity before deciding whether to **form a new mesh** or **join** one already being advertised.
- Participating clients **periodically advertise** their endpoint as a bootstrap target for their mesh, with **backoff** when many advertisers are active.
- When a client observes a **older** mesh (earlier formation time), it **attempts to merge** into that mesh rather than sustaining a split.
- Advertisements carry a **per-client monotonic sequence**; receivers discard stale or out-of-order updates from the same advertiser.
- **BREAKING:** Remove reliance on shareable session URLs and URL ticket parameters as the primary join path; joining uses the same bare site URL for everyone.
- Retire or demote localStorage bootstrap caching and BroadcastChannel sibling discovery as primary join mechanisms (may remain as supplementary hints in implementation).

## Capabilities

### New Capabilities

- `mesh-discovery`: Public client-side discovery of live mesh bootstrap targets, mesh formation, merge toward the oldest advertised mesh, shared periodic advertising with backoff, and per-advertiser sequence validation.

### Modified Capabilities

- `collaborative-presence`: Join model changes from shareable session links to automatic mesh discovery at a single public URL; solo fallback behavior preserved.

## Impact

- TypeScript presence bootstrap flow (`src/presence.ts` and related modules).
- Possible new discovery module and WebTorrent dependency in the Vite bundle.
- iroh join path: bootstrap peer list sourced from discovery advertisements instead of URL tickets.
- Gossip topic identity may be derived from mesh identity rather than a single fixed global topic.
- Bundle size and browser compatibility (WebTorrent in static GitHub Pages deployment).
- Living `collaborative-presence` spec requirements for session links superseded after archive.
