## 1. Viewport navigation

- [x] 1.1 Maintain a stack of parent bounds and tile coordinates `(row, col)` pushed on each completed tile zoom-in
- [x] 1.2 Implement `zoomOut()` as reverse tile-shrink with parent fade-in from starfield (~250 ms)
- [x] 1.3 Expose whether zoom-out is available (stack non-empty) for UI state

## 2. Zoom transition compositing

- [x] 2.1 Zoom-in: fade outer pre-zoom snapshot to transparent over transition so starfield bleeds through
- [x] 2.2 Zoom-out: shrink current view into stored tile cell; fade parent view in from starfield around it
- [x] 2.3 Extend zoom WebGL/canvas path for bidirectional fade compositing

## 3. Zoom-out control UI

- [x] 3.1 Add accessible zoom-out button to the page shell (`aria-label`, minimum touch target)
- [x] 3.2 Position button from letterbox layout: margin placement for portrait/landscape, viewport corner when nearly square (`|w-h|/max(w,h) < 0.08`)
- [x] 3.3 Update position on resize and after zoom transitions; hide when zoom-out unavailable

## 4. Starfield background

- [x] 4.1 Add full-viewport starfield layer behind the fractal canvas (subtle points, optional slow drift)
- [x] 4.2 Clear letterbox margin regions on the main canvas so margins show the starfield
- [x] 4.3 Replace grid line strokes with narrow inter-tile gaps that reveal the starfield; keep 8×8 hit targets aligned

## 5. Verification

- [x] 5.1 Manual: zoom in — outer view fades to starfield as tile expands; zoom out reverses
- [x] 5.2 Manual: zoom in/out several levels back to canonical; control hidden at root
- [x] 5.3 Manual: portrait and landscape — control sits in margin; starfield in gaps and margins
- [x] 5.4 `npm run build` succeeds

## Explicitly deferred

- Keyboard or gesture zoom-out
- Parallax constellations or themed starfield variants
