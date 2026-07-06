## Why

Cofracture should be a shared, playful way to explore the Mandelbrot set together: each person navigates independently while still seeing where others are looking. A mobile-first, tile-based zoom model keeps exploration snappy and legible on phones and desktops alike.

## What Changes

- Introduce a web application where each visitor explores the Mandelbrot set on an 8×8 tile grid.
- Center the canonical complex-plane view (real axis −2 to +2, imaginary axis −2 to +2) in the viewport with letterboxing on the long screen dimension so the square always fills the narrow dimension.
- On tile tap or click, animate a quick linear zoom so the selected tile becomes the full viewport; subdivide the new view into another 8×8 grid and repeat indefinitely.
- Add real-time collaborative presence: each participant broadcasts their current tile focus and sees highlights for every other connected participant.
- Publish the built site as a static deployment reachable via GitHub Pages.
- Implement primarily in TypeScript with minimal hand-authored HTML, JavaScript, and CSS.

## Capabilities

### New Capabilities

- `fractal-viewport`: Viewport framing of the Mandelbrot set, 8×8 tile overlay, touch/click navigation, and animated zoom transitions between views.
- `collaborative-presence`: Peer discovery and exchange of each participant's current tile highlight so everyone can see where others are exploring.
- `site-publication`: Static hosting and delivery of the built application through GitHub Pages.

### Modified Capabilities

- (none — greenfield application)

## Impact

- New application source tree (TypeScript web client).
- New build and GitHub Pages deployment workflow.
- New peer-to-peer networking dependency (iroh) for presence sync — implementation detail in `design.md`.
- No existing living specs or runtime services are modified; this is the first product capability for the repository.
