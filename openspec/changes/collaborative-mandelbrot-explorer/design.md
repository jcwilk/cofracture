## Context

Cofracture is a greenfield web application: an interactive Mandelbrot explorer with an 8×8 tile navigation model and peer presence overlays. The repository currently ships only the OpenSpec Flow bundle; this change introduces the first client, build tooling, and GitHub Pages delivery path.

Constraints from the product brief:
- Mobile web is first-class (touch navigation).
- TypeScript throughout; minimize hand-authored HTML, JavaScript, and CSS.
- Peer presence uses **iroh** for peer-to-peer messaging.
- Static hosting on **GitHub Pages** for the `jcwilk/cofracture` repository.

## Goals / Non-Goals

**Goals:**
- Render the Mandelbrot set efficiently enough for repeated tile zoom on mid-range mobile devices.
- Model viewport state as nested 8×8 tile coordinates so zoom math stays deterministic.
- Animate tile-selection transitions with a short, linear interpolation (~200–300 ms target).
- Exchange each participant's current tile bounds over iroh so highlights can be drawn on every peer's canvas.
- Ship a Vite-built static bundle via GitHub Actions to GitHub Pages.

**Non-Goals:**
- Accounts, rooms, or server-authoritative session management.
- Chat, cursors, or shared camera control (each player navigates independently).
- Deep zoom beyond practical render precision on the client (no arbitrary-precision math in v1).
- Native mobile apps or offline-first P2P without an initial network path.

## Decisions

### Decision: Vite + TypeScript SPA with a single canvas mount point
Use **Vite** as the bundler and dev server. The HTML shell is minimal (one root element); all UI, rendering, input, and networking live in TypeScript modules.

**Alternatives considered:** Plain `tsc` + esbuild script (more manual tooling); React/Vue (heavier than needed for a canvas-centric toy).

### Decision: Canvas 2D (or WebGL fallback) for fractal rendering
Draw the Mandelbrot set to a `<canvas>` sized to the letterboxed square. Re-render the visible complex-plane bounds on viewport change; cache the last frame during short zoom animations by interpolating bounds.

**Alternatives considered:** WebGL-only from day one (faster at depth but more setup); DOM tile buttons (poor performance at depth, awkward on mobile).

### Decision: Viewport state as complex bounds + tile path
Represent navigation as:
- `bounds`: `{ reMin, reMax, imMin, imMax }` in the complex plane.
- `tilePath`: optional stack of `{ row, col }` selections (0–7 each) from the canonical −2…+2 square.

Selecting tile `(r, c)` subdivides current bounds into an 8×8 grid and sets new bounds to that cell. This makes peer presence a compact message: share `bounds` (or the tile path equivalent).

### Decision: Linear zoom animation via bounds interpolation
On tile select, tween from previous `bounds` to target `bounds` with `requestAnimationFrame` and linear interpolation over a fixed duration (~250 ms). Retile only after the animation completes.

### Decision: iroh-gossip over WASM for peer presence (confirmed)

**Verdict: iroh is viable for this app.** Browser support is official (iroh ≥ 0.33, `iroh-gossip` in browsers since 0.33). Use **iroh-gossip epidemic broadcast**, not point-to-point QUIC streams, to fan out small presence updates to everyone in a session.

**Integration pattern (official n0 recommendation):** follow the [`browser-chat`](https://github.com/n0-computer/iroh-examples/tree/main/browser-chat) example structure:

| Crate / package | Role |
|-----------------|------|
| `presence-shared/` (Rust) | `PresenceNode`, gossip subscribe/broadcast, ticket encode/decode, signed messages |
| `presence-wasm/` (Rust → wasm-pack) | `wasm-bindgen` exports consumed by TypeScript (`spawn`, `create`, `join`, event stream) |
| Vite frontend (TypeScript) | Canvas app; imports local `file:../presence-wasm/pkg` |

Build tooling: `wasm-pack` target `wasm32-unknown-unknown`, Vite plugins `vite-plugin-wasm` + `vite-plugin-top-level-await`. CI must run `build:wasm` before `npm run build`.

**Do not use `@number0/iroh` npm for the browser client.** That package (v1.0.0, published by n0) is **Node.js NAPI** bindings wrapping native iroh — full hole-punching, not WASM. It does not run on GitHub Pages.

**Do not depend on `@salvatoret/iroh` for v1.** Community WASM bindings exist but are unofficial, thinly adopted, and may lag gossip APIs. Prefer the n0-documented custom-wrapper pattern for a stable gossip + ticket surface.

**Session join model (no backend):** mirror browser-chat tickets:

1. First visitor calls `create()` → random `TopicId`, empty bootstrap set, returns a serializable **session ticket** string.
2. Ticket is appended to the page URL (query param or hash) for share/copy.
3. Joiners call `join(ticket)`; ticket carries `topic_id` plus `bootstrap: Set<EndpointId>` so gossip can mesh.
4. Creator re-serializes ticket including their `EndpointId` as bootstrap when sharing the link.

**Presence message payload** (gossip broadcast, postcard + signature like browser-chat):

```json
{ "kind": "presence", "bounds": { "reMin", "reMax", "imMin", "imMax" }, "color": "#..." }
```

Sign with the node's `SecretKey` so peers can ignore spoofed messages. Use endpoint id (from iroh) as stable peer identity; color from hashing endpoint id.

**When to send:**

- Immediately after each completed tile-selection transition (bounds changed).
- Periodic heartbeat every ~5 s while connected (browser-chat uses 5 s `PRESENCE_INTERVAL`) so peers detect disconnects.

**Bootstrap / relays (resolved):**

- Use iroh `presets::N0` — four public n0 relays (US/EU/Asia), DNS/Pkarr address lookup, free for dev/hobby.
- **Browser limitation (accepted):** WASM nodes cannot send raw UDP; **all browser traffic is relayed** (still E2E encrypted). No browser hole-punching today; FAQ comparison to WebRTC is partially stale — iroh *does* run in browsers, but relay-only.
- Public relays are **rate-limited**; fine for a toy/demo. No dedicated relay needed for v1.
- Gossip still needs **bootstrap endpoint IDs** (peers already in the topic); the ticket mechanism supplies this — no separate signaling server.

**Solo fallback:** if `receiver.joined()` times out or gossip broadcast fails, continue local exploration with no peer highlights; surface connection state in UI (optional badge).

**Alternatives considered:**

| Option | Why not for v1 |
|--------|----------------|
| `@number0/iroh` in browser | Node-only NAPI |
| `@salvatoret/iroh` | Unofficial; gossip/ticket pattern unproven for our shape |
| WebRTC data channels | Requires custom signaling server (conflicts with static-only hosting) |
| WebSocket relay on GitHub Pages | No server component on Pages |
| Point-to-point iroh streams to each peer | O(n²) connections; gossip is the intended fan-out primitive |

### Decision: GitHub Actions → GitHub Pages
Add `.github/workflows/deploy-pages.yml` (or equivalent) that on push to `main`:
1. installs dependencies,
2. runs `npm run build`,
3. uploads `dist/` to GitHub Pages.

Configure Vite `base` for project Pages URL (`/cofracture/` if user/org site path applies).

### Decision: Distinct highlight styling per peer
Assign each participant a color from a fixed palette based on `participantId` hash so highlights are distinguishable when multiple peers overlap.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| WASM bundle size (iroh + gossip) | `wasm-pack --release` for production; code-split if needed; budget ~2–5 MB gzipped — acceptable for a demo |
| Browser relay-only + public relay rate limits | Accept for v1; presence is low-bandwidth; highlights may lag on shared relays; degrade to solo mode on failure |
| Gossip mesh needs ≥1 bootstrap peer | Ticket URL must include creator endpoint id before share; document “copy link after room loads” |
| Mandelbrot re-render cost on every animation frame | Interpolate bounds but throttle heavy re-renders during animation (e.g., render every N ms or use scaled preview while animating) |
| GitHub Pages subpath base URL breaks WASM/asset loading | Set Vite `base: '/cofracture/'`; use `vite build --base` matching Pages; test WASM load on deployed URL |
| Peer highlights misaligned after deep zoom | Share absolute complex-plane bounds, not screen pixels; reproject on each peer |
| Rust/WASM build in CI | Install `wasm-pack` + `wasm32-unknown-unknown` in GitHub Actions before frontend build |

## Migration Plan

Greenfield — no migration. Rollback is reverting the merge commit and disabling the Pages workflow if needed.

## iroh research summary (2026-03-23)

Sources: [WebAssembly and Browsers](https://docs.iroh.computer/languages/wasm-browser), [Gossip Broadcast](https://docs.iroh.computer/connecting/gossip), [Relays](https://docs.iroh.computer/concepts/relays), [Tickets](https://docs.iroh.computer/concepts/tickets), [browser-chat example](https://github.com/n0-computer/iroh-examples/tree/main/browser-chat) (live demo: [n0-computer.github.io/iroh-examples/main/browser-chat](https://n0-computer.github.io/iroh-examples/main/browser-chat/index.html)).

| Question | Answer |
|----------|--------|
| Does iroh run in browsers? | **Yes** — compile to WASM with `wasm-bindgen`; gossip works in browsers (≥ 0.33). |
| Official browser npm package? | **No** — n0 recommends app-specific Rust wrapper + wasm-pack. `@number0/iroh` is Node NAPI only. |
| Direct P2P from browser? | **No** — relay-only in browsers (no UDP hole-punch); traffic is still E2E encrypted. |
| Right protocol for “everyone sees my tile”? | **iroh-gossip** `broadcast()` on a shared `TopicId`. |
| How do peers find a session without a server? | **Ticket** encoding `topic_id` + bootstrap `EndpointId`s in the share URL (browser-chat pattern). |
| Which relays? | **N0 preset** public relays (free, rate-limited) — sufficient for v1. |
| Public relay rate limits for this app? | **Unlikely to matter** — n0 publishes no numeric cap; presence payloads are ~hundreds of bytes at human tap rates plus ~5 s heartbeats. Comparable to n0's browser-chat demo on the same relays. Binding risks are shared-infra latency and no SLA, not bandwidth quota. |
| Stale FAQ note | FAQ WebRTC comparison still says “iroh doesn't run in the browser”; wasm-browser docs supersede that. |

## Resolved decisions

- **Animation duration:** 250 ms linear (tune ±50 ms in apply if needed).
- **iroh API surface:** custom `presence-shared` + `presence-wasm` crates modeled on browser-chat; TypeScript sees `PresenceNode.spawn()`, `create()`, `join(ticket)`, and a readable event stream.
- **Relay/bootstrap:** `presets::N0` + gossip ticket bootstrap peers; no custom relay or signaling server for v1.

## Open Questions

- None blocking apply for iroh/presence. Remaining polish: exact UI for “share session link” and connection-status indicator.
