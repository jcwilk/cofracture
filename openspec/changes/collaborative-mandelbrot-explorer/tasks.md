## Required for this change

## 1. Project scaffold

- [ ] 1.1 Initialize Vite + TypeScript project with minimal `index.html` (single mount root only)
- [ ] 1.2 Add npm scripts for `dev`, `build`, and `preview`
- [ ] 1.3 Configure Vite `base` for GitHub Pages project-site path (`/cofracture/`)

## 2. Fractal viewport

- [ ] 2.1 Implement complex-plane bounds model and canonical −2…+2 initial state
- [ ] 2.2 Implement letterboxed square layout (full width in portrait, full height in landscape)
- [ ] 2.3 Render Mandelbrot set to canvas for current bounds
- [ ] 2.4 Overlay 8×8 tile grid with hit testing for touch and pointer input
- [ ] 2.5 Implement tile-selection zoom with linear bounds interpolation (~250 ms)
- [ ] 2.6 Re-tile into 8×8 after each transition completes
- [ ] 2.7 Add local manual verification notes for mobile touch and desktop click paths

## 3. Collaborative presence (iroh)

- [ ] 3.1 Add iroh dependency and wire minimal peer connection/bootstrap per design
- [ ] 3.2 Define presence message payload (participant id, bounds, highlight color)
- [ ] 3.3 Broadcast local bounds after each completed tile selection
- [ ] 3.4 Render distinct peer highlight overlays on the local canvas
- [ ] 3.5 Handle peer disconnect and solo-exploration fallback when P2P unavailable

## 4. Build and GitHub Pages delivery

- [ ] 4.1 Add GitHub Actions workflow to build and deploy `dist/` to GitHub Pages on `main`
- [ ] 4.2 Enable GitHub Pages for the repository (workflow or Pages settings as needed)
- [ ] 4.3 Verify production build locally with `npm run build` and `npm run preview`
- [ ] 4.4 Verify live GitHub Pages URL loads the explorer and supports tile navigation

## 5. Acceptance

- [ ] 5.1 Run `npx @fission-ai/openspec@latest validate collaborative-mandelbrot-explorer --type change`
- [ ] 5.2 Document local dev and Pages URL in `README.md`

## Explicitly deferred

- Arbitrary-precision deep zoom beyond client float precision
- Named rooms, invites, or server-side matchmaking
- Chat or shared viewport control
- Native mobile wrappers
