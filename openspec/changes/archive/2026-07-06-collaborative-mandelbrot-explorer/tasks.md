## Required for this change

## 1. Project scaffold

- [x] 1.1 Initialize Vite + TypeScript project with minimal `index.html` (single mount root only)
- [x] 1.2 Add npm scripts for `dev`, `build`, and `preview`
- [x] 1.3 Configure Vite `base` for GitHub Pages project-site path (`/cofracture/`)

## 2. Fractal viewport

- [x] 2.1 Implement complex-plane bounds model and canonical −2…+2 initial state
- [x] 2.2 Implement letterboxed square layout (full width in portrait, full height in landscape)
- [x] 2.3 Render Mandelbrot set to canvas for current bounds
- [x] 2.4 Overlay 8×8 tile grid with hit testing for touch and pointer input
- [x] 2.5 Implement tile-selection zoom with linear bounds interpolation (~250 ms)
- [x] 2.6 Re-tile into 8×8 after each transition completes
- [x] 2.7 Add local manual verification notes for mobile touch and desktop click paths

## 3. Collaborative presence (iroh-gossip + WASM)

- [x] 3.1 Add `presence-shared/` Rust crate (`iroh`, `iroh-gossip`, `iroh-tickets`, `presets::N0`) modeled on browser-chat
- [x] 3.2 Add `presence-wasm/` crate with wasm-bindgen exports (`spawn`, `create`, `join`, ticket serialize, event stream)
- [x] 3.3 Wire Vite `build:wasm` script, `vite-plugin-wasm`, and `vite-plugin-top-level-await`; local `file:` dependency on wasm pkg
- [x] 3.4 Implement signed presence gossip messages (`bounds` + color) with broadcast on tile change and ~5 s heartbeat
- [x] 3.5 Implement session ticket in URL (create/join flow with bootstrap endpoint ids)
- [x] 3.6 TypeScript: maintain peer `Map<endpointId, Presence>` from WASM events; draw highlight overlays on canvas
- [x] 3.7 Solo-exploration fallback when gossip join fails; optional connection status in UI
- [x] 3.8 CI: install `wasm-pack` + `rustup target add wasm32-unknown-unknown` before production build

## 4. Build and GitHub Pages delivery

- [x] 4.1 Add GitHub Actions workflow: Rust wasm target + wasm-pack + `npm run build:wasm` + `npm run build`, deploy `dist/` to GitHub Pages on `main`
- [x] 4.2 Enable GitHub Pages for the repository (workflow or Pages settings as needed)
- [x] 4.3 Verify production build locally with `npm run build` and `npm run preview`
- [x] 4.4 Verify live GitHub Pages URL loads the explorer and supports tile navigation

## 5. Acceptance

- [x] 5.1 Run `npx @fission-ai/openspec@latest validate collaborative-mandelbrot-explorer --type change`
- [x] 5.2 Document local dev and Pages URL in `README.md`

## Explicitly deferred

- Arbitrary-precision deep zoom beyond client float precision
- Named rooms, invites, or server-side matchmaking
- Dedicated or managed iroh relays (upgrade path if promoted beyond hobby scale)
- Chat or shared viewport control
- Native mobile wrappers
