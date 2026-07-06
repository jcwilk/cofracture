## Required for this change

## 1. Spec alignment

- [x] 1.1 Replace `fractal-viewport` Purpose placeholder with a concise capability statement when reconciling living specs
- [x] 1.2 Verify zoom animation matches MODIFIED requirements (static surround, expanding tile, linear tile-rect motion, ~250 ms)

## 2. Implementation verification

- [x] 2.1 Confirm shipped zoom uses single-pass composite (background unchanged outside tile rect; target bounds inside)
- [x] 2.2 Confirm idle rendering uses GPU path when available with CPU fallback

## 3. Acceptance

- [x] 3.1 Run `npx @fission-ai/openspec@latest validate refine-fractal-viewport-zoom --type change`
- [x] 3.2 Run `npx @fission-ai/openspec@latest validate --specs` after archive

## Explicitly deferred

- Mandelbrot iteration count tuning
- Cardioid / analytic inside shortcuts
- Retina-resolution rendering (device-pixel-ratio scaling)
