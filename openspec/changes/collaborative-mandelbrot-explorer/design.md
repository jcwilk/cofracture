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

### Decision: iroh for peer presence mesh
Use **iroh** (JavaScript/WASM bindings as available) to form a lightweight peer group. Each client broadcasts presence messages containing:
- a stable `participantId` (random UUID in `sessionStorage`),
- current `bounds` (or tile path),
- optional display color for highlight differentiation.

Peers apply incoming messages to a local `Map<participantId, Presence>` and draw semi-transparent highlight rectangles over the Mandelbrot canvas in each peer's shared bounds (transformed into the local viewport coordinate system).

**Alternatives considered:** WebRTC data channels without iroh (more signaling plumbing); WebSocket relay server (violates static-only hosting preference).

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
| iroh browser/WASM maturity or NAT traversal failures | Document that presence is best-effort; degrade gracefully to solo exploration when P2P cannot connect; log connection state in dev builds |
| Mandelbrot re-render cost on every animation frame | Interpolate bounds but throttle heavy re-renders during animation (e.g., render every N ms or use scaled preview while animating) |
| GitHub Pages subpath base URL breaks asset loading | Set Vite `base` explicitly; verify deployed smoke test in tasks |
| Peer highlights misaligned after deep zoom | Share absolute complex-plane bounds, not screen pixels; reproject on each peer |

## Migration Plan

Greenfield — no migration. Rollback is reverting the merge commit and disabling the Pages workflow if needed.

## Open Questions

- Exact iroh package/API surface for browser peers (confirm during apply with current iroh docs).
- Whether v1 uses a public iroh relay/bootstrap endpoint or a bundled discovery mechanism.
- Target animation duration constant (proposal suggests “snappy”; start at 250 ms, tune in apply).
