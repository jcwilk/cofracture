# Manual verification notes (task 2.7)

## Desktop click path

1. Open `npm run dev` in a desktop browser.
2. Confirm the Mandelbrot set renders centered with letterboxing on the long axis.
3. Confirm an 8×8 grid overlay is visible.
4. Click any tile — the view animates linearly (~250 ms) until that tile fills the square.
5. After animation completes, a new 8×8 grid appears over the zoomed region.
6. Repeat clicks to zoom through multiple levels.

## Mobile touch path

1. Open the dev server URL on a touch-capable device (or use browser device emulation with touch events).
2. Tap a tile — same zoom animation as desktop click.
3. Tap rapidly on successive tiles — each selection queues only when not animating; repeated multi-level zoom works via touch alone.
4. Confirm no hover-only affordances are required.

## Expected behavior

- Portrait: square spans full viewport width, margins top/bottom.
- Landscape: square spans full viewport height, margins left/right.
- Animation is linear (constant rate), not ease-in/out.
