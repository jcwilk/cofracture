## 1. Discovery module

- [ ] 1.1 Add WebTorrent dependency and verify Vite production bundle includes browser-compatible build
- [ ] 1.2 Create `src/mesh-discovery.ts` with fixed swarm identity, payload encode/decode (`endpoint_id`, `mesh_id`, `mesh_formed_at`, `seq`), and `localStorage` seq persistence
- [ ] 1.3 Implement initial listen window (10 s) collecting advertisements with per-endpoint seq validation and mesh grouping
- [ ] 1.4 Implement mesh selection (oldest `mesh_formed_at` wins) and new-mesh formation when none discovered
- [ ] 1.5 Implement periodic seeding with base 2 s interval, backoff from distinct advertiser count (45 s validity window), and ±10% jitter
- [ ] 1.6 Implement ongoing merge listener: switch to older mesh when live bootstrap targets are reachable

## 2. Gossip topic and WASM join

- [ ] 2.1 Derive gossip topic identity deterministically from `mesh_id` (replace fixed global topic for discovery-based join)
- [ ] 2.2 Extend or adjust WASM join API so TypeScript passes mesh topic plus discovery-sourced bootstrap endpoint ids, with at most 3 concurrent outbound dials and slot refill from a candidate queue on failure
- [ ] 2.3 Rebuild `presence-wasm` release artifacts after Rust changes

## 3. Presence orchestration

- [ ] 3.1 Wire `initPresence` to run discovery listen → form/join → gossip bootstrap before presence broadcast
- [ ] 3.2 Remove URL `?ticket=` read/write and `syncUrlTicket` from default join path
- [ ] 3.3 Demote or remove legacy `localStorage` bootstrap cache as primary join source (keep optional BroadcastChannel sibling hints if useful)
- [ ] 3.4 Re-broadcast viewport bounds after successful mesh merge or gossip re-subscribe

## 4. Verification

- [ ] 4.1 Unit or integration tests for seq discard, mesh selection (oldest wins), and backoff interval calculation
- [ ] 4.2 Manual two-browser test: bare URL join, highlights visible, reload preserves higher seq
- [ ] 4.3 Manual split-merge test: two simultaneous founders converge to older mesh when both stay online
- [ ] 4.4 Production build (`npm run build` + WASM) succeeds; bundle size noted in verification notes

## 5. Release

- [ ] 5.1 Deploy to GitHub Pages via existing CI workflow
- [ ] 5.2 Live acceptance: two strangers (or two networks) open bare site URL and see each other's highlights within one discovery cycle

## Explicitly deferred

- Custom WebSocket tracker infrastructure beyond WebTorrent library defaults (only if default trackers fail in testing)
- DHT-only discovery without WebTorrent trackers
- Signed discovery payloads (rejected — no client-side trust benefit; see `design.md`)
