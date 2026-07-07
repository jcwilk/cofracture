## Context

Cofracture ships as static assets on GitHub Pages. Peer presence uses iroh-gossip in browser WASM over public n0 relays. Gossip epidemic broadcast works once a client is meshed on a shared topic with at least one live peer, but **finding** that first live `EndpointId` without a backend, without assuming any peer is always online, and without encoding join hints in the URL is the unsolved bootstrap problem.

Current client join path (`presence.ts`):

1. Spawn iroh node.
2. Discover same-origin tabs via `BroadcastChannel` (~800 ms).
3. Read optional `?ticket=` from URL and merge with cached localStorage bootstrap IDs.
4. Call `join_public` against a **fixed global** gossip topic.

This satisfies same-tab and return-visitor cases but not two strangers on the bare site URL.

**Hard constraints (all must hold):**

- No dedicated coordination server run by the project.
- Same bare URL for all visitors.
- No peer assumed always online.

WebTorrent provides a browser-compatible public rendezvous: participants seed small immutable payloads to a shared swarm; trackers relay who has what. It is a **dumb discovery bus**—not authoritative membership—paired with iroh-gossip for actual presence once bootstrapped.

## Goals / Non-Goals

**Goals:**

- Strangers opening the same site URL within a reasonable window discover each other and share presence highlights.
- Discovery payloads are small, signed or self-consistent enough to ignore obvious garbage, and include enough metadata to pick one mesh and merge splits.
- All mesh participants share advertising load with automatic spacing when many peers advertise.
- Sequence numbers per advertiser survive page reloads so stale torrent payloads are ignored.
- Mesh splits converge: when a client learns of an older mesh, it switches rather than perpetuating parallel meshes.

**Non-Goals:**

- Guaranteed discovery if WebTorrent trackers or swarms are unreachable (solo fallback remains).
- Private or invite-only rooms; all discovery is public to anyone on the site.
- Replacing iroh-gossip for presence fan-out—WebTorrent is bootstrap/discovery only.
- Server-side mesh registry, STUN/TURN beyond what iroh relays already provide.
- Strong Byzantine resistance beyond seq filtering and basic payload validation.

## Decisions

### Decision: WebTorrent as the public discovery channel

Use the **WebTorrent** browser library to join a **fixed info hash** per deployment (derived from a stable site identifier, e.g. `cofracture-presence-discovery-v1`). Every client seeds the same logical torrent name space so advertisements are visible to newcomers listening on the swarm.

**Alternatives considered:**

- URL tickets only — fails stranger bootstrap (rejected).
- Mainline BitTorrent DHT / custom UDP rendezvous — impractical in browser WASM today.
- Third-party signaling (Firebase, Ably) — violates static-only constraint.

### Decision: Advertisement payload schema

Each seeded payload is a compact JSON document (UTF-8) with these fields:

| Field | Type | Meaning |
|-------|------|---------|
| `endpoint_id` | string | This client's iroh endpoint id (hex), used as gossip bootstrap dial target |
| `mesh_id` | string | Random id (e.g. 128-bit hex) identifying the gossip mesh this client believes it is in |
| `mesh_formed_at` | number | Unix epoch ms when this mesh was first formed (by the founding client) |
| `seq` | integer | Monotonic per-client advertisement sequence; persisted in `localStorage` under a discovery-specific key so reloads continue the sequence |

Optional future fields (not required for v1): signature over payload bytes with node secret key.

**Topic binding:** Gossip `TopicId` is **derived deterministically from `mesh_id`** (e.g. SHA-256 truncated to topic bytes) so each mesh has an isolated gossip topic. The previous fixed global topic is retired when discovery lands.

### Decision: Startup listen window (N = 10 s)

On presence init, before joining gossip:

1. Connect to the WebTorrent discovery swarm.
2. Collect incoming advertisements for **N = 10 seconds** (configurable constant).
3. Track per-`endpoint_id` latest valid `seq`; discard duplicates and out-of-order seq for the same advertiser.
4. Group valid advertisements by `mesh_id`; for each mesh, track the minimum `mesh_formed_at` seen and the set of live `endpoint_id`s.

If **no valid advertisements** arrive in the listen window → **found a new mesh**: generate random `mesh_id`, set `mesh_formed_at = Date.now()`, `seq` starts from persisted counter.

If **one or more meshes** are seen → select the mesh with the **smallest `mesh_formed_at`** (oldest wins). Bootstrap into gossip using advertised `endpoint_id`s from that mesh (excluding self). Adopt that mesh's `mesh_id` and `mesh_formed_at`.

### Decision: Ongoing advertisement interval (N/M = 2 s base)

After joining gossip and accepting bootstrap connections:

- Seed an updated discovery payload on a base interval of **N/M = 2 seconds** (N=10, M=5).
- Payload always reflects the client's **current** mesh identity and latest `seq` (increment before each publish).
- Continue advertising while the presence session is active; stop on shutdown/page hide.

### Decision: Merge when observing an older mesh

While advertising, the client keeps listening for peer advertisements. If it receives valid advertisements for a mesh whose `mesh_formed_at` is **strictly less** than its current mesh's formation time:

1. Attempt to **switch**: leave current gossip topic (shutdown/resubscribe), dial bootstrap targets from the older mesh, join older mesh's derived topic.
2. On successful neighbor connection to the older mesh, **adopt** older `mesh_id` / `mesh_formed_at` and emit advertisements for the older mesh going forward.
3. If switch fails (no live bootstrap reachable), remain on current mesh and retry on later advertisements.

This biases split partitions toward the longest-lived mesh.

### Decision: Shared advertising with backoff

Count **distinct `endpoint_id`s** currently advertising the **same `mesh_id`** (seen within a recent validity window, e.g. last 30 s). Let `K` be that count.

Base interval `T0 = 2 s`. Actual interval:

```
T = T0 * max(1, ceil(K / K0))
```

with `K0 = 5` (tunable). As more peers advertise the same mesh, each waits longer between seeds, spreading tracker/swarm load without a central coordinator.

Jitter: add uniform random ±10% to `T` to avoid synchronization.

### Decision: Sequence persistence and stale discard

- On each client, persist `seq` in `localStorage` (separate key from legacy bootstrap cache).
- In memory, maintain `lastSeqByEndpoint: Map<endpoint_id, number>`.
- When an advertisement arrives: if `seq <= lastSeq` for that endpoint, **discard**; else accept and update `lastSeq`.
- Initial `seq` after first run: `max(stored, 0) + 1` on each publish.

This mitigates replay of old torrent blobs after a peer reloads or multiple seeds coexist.

### Decision: Retire URL ticket as primary join path

Remove `?ticket=` from the default user flow:

- `initPresence` no longer reads ticket from URL or calls `syncUrlTicket`.
- `join_public` (or successor API) receives bootstrap list from discovery + optional same-tab `BroadcastChannel` hints only.
- Legacy ticket in URL may be ignored or used only as optional hint during transition (implementation choice; spec requires bare URL join).

Remove or stop writing legacy `cofracture-presence-bootstrap` localStorage cache as primary bootstrap source; neighbor snapshots may still help same-return-visitor edge cases but discovery is authoritative.

### Decision: Module layout

| Piece | Location (apply phase) |
|-------|----------------------|
| WebTorrent client, swarm lifecycle, payload encode/decode | `src/mesh-discovery.ts` (new) |
| Orchestration: listen → form/join → merge loop | `src/presence.ts` |
| Topic derivation from `mesh_id` | `presence-shared` or TS helper |
| WASM join API | extend `join_public` bootstrap-only path or add `join_mesh(topic, bootstraps)` |

Dependency: `webtorrent` npm package (+ types); verify Vite bundling and bundle size budget.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| WebTorrent trackers blocked or flaky | Solo exploration fallback; retry discovery on timer; multiple public trackers in client config |
| Large bundle size | Lazy-import WebTorrent after WASM init; measure CI bundle budget |
| Split meshes during listen window | Merge-toward-oldest after join; continued listening |
| Stale endpoint ids in advertisements | iroh dial failures are non-fatal; seq discard; gossip neighbor events prune dead peers |
| Malicious spam advertisements | seq + ignore self; optional signed payloads later; rate-limit processing |
| Privacy: endpoint ids public on trackers | Acceptable for public toy; document in README |
| Mesh merge mid-session may briefly drop highlights | Re-subscribe gossip; re-broadcast bounds after merge |

## Migration Plan

1. Implement `mesh-discovery.ts` and topic derivation behind feature flag or direct cutover.
2. Wire `initPresence` to await discovery phase before gossip join.
3. Remove URL ticket sync from UX; verify bare URL works for two browsers / two networks.
4. Deploy to GitHub Pages; smoke-test stranger join.
5. Archive change; update living `collaborative-presence` spec (remove session link requirement).

Rollback: revert to ticket + global topic join path (previous commit); no server migration needed.

## Open Questions

- **Signed payloads:** Ship unsigned v1 or require iroh secret-key signature in advertisement JSON from day one?
- **Tracker list:** Default public WebTorrent trackers only, or also WebSocket trackers for restrictive networks?
- **Validity window:** How long is an advertisement considered "live" for backoff counting if seq stops incrementing?
- **Maximum bootstrap fan-out:** Dial all advertised endpoints or cap parallel dials while still allowing full mesh via gossip fan-out?
