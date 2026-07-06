## Why

Cofracture should be a shared, playful way to explore the Mandelbrot set together: each person navigates independently while still seeing where others are looking. A mobile-first, tile-based zoom model keeps exploration snappy and legible on phones and desktops alike.

Peer presence should work without a backend: visitors share a link, join the same session, and see one another's tile highlights in near real time. **iroh research (2026-03-23) confirms this is viable** in the browser via gossip-over-WASM on n0's public relays — adequate for a hobby demo; see `design.md` for integration detail.

## What Changes

- Introduce a web application where each visitor explores the Mandelbrot set on an 8×8 tile grid.
- Center the canonical complex-plane view (real axis −2 to +2, imaginary axis −2 to +2) in the viewport with letterboxing on the long screen dimension so the square always fills the narrow dimension.
- On tile tap or click, animate a quick linear zoom (~250 ms) so the selected tile becomes the full viewport; subdivide the new view into another 8×8 grid and repeat indefinitely.
- Add collaborative presence over **iroh-gossip**: each participant broadcasts complex-plane bounds for their current tile focus; peers render distinct highlights. Sessions are joined via a **shareable URL ticket** (no accounts or signaling server).
- Degrade gracefully to solo exploration when gossip cannot connect.
- Publish the built site as a static deployment on GitHub Pages.
- Implement the UI in TypeScript with minimal hand-authored HTML, JavaScript, and CSS; networking ships as Rust→WASM bindings (n0 browser-chat pattern) consumed by the Vite client.

## Capabilities

### New Capabilities

- `fractal-viewport`: Viewport framing of the Mandelbrot set, 8×8 tile overlay, touch/click navigation, and animated zoom transitions between views.
- `collaborative-presence`: Shareable session join, peer tile-highlight exchange, solo fallback when connectivity fails, and near-real-time updates for simultaneous explorers.
- `site-publication`: Static hosting and delivery of the built application through GitHub Pages (including WASM assets).

### Modified Capabilities

- (none — greenfield application)

## Non-Goals

- User accounts, passwords, or server-side session stores.
- Dedicated or managed iroh relays (public N0 preset relays are sufficient for v1).
- Chat, shared viewport control, or cursor sync.
- Sub-millisecond presence sync — highlights may lag slightly on shared public relays.
- Arbitrary-precision deep zoom beyond client float precision.
- Native mobile apps.

## Impact

- New Vite + TypeScript web client and minimal HTML shell.
- New Rust crates (`presence-shared/`, `presence-wasm/`) compiled to WASM via wasm-pack; modeled on n0's [browser-chat](https://github.com/n0-computer/iroh-examples/tree/main/browser-chat) example.
- New GitHub Actions workflow: Rust wasm target, `build:wasm`, production build, deploy to GitHub Pages at `/cofracture/`.
- Peer networking uses **iroh-gossip** on **n0 public relays** (relay-only in browsers; E2E encrypted). Presence traffic is tiny (bounds + heartbeat); public relay rate limits are not expected to bind normal hobby use.
- No existing living specs or runtime services are modified; this is the first product capability for the repository.
