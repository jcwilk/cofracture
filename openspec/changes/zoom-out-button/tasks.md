## 1. Viewport navigation

- [ ] 1.1 Maintain a stack of parent bounds pushed on each completed tile zoom-in
- [ ] 1.2 Implement `zoomOut()` with linear bounds transition (~250 ms) and grid refresh on completion
- [ ] 1.3 Expose whether zoom-out is available (stack non-empty) for UI state

## 2. Zoom-out control UI

- [ ] 2.1 Add accessible zoom-out button to the page shell (`aria-label`, minimum touch target)
- [ ] 2.2 Position button from letterbox layout: margin placement for portrait/landscape, viewport corner when nearly square (`|w-h|/max(w,h) < 0.08`)
- [ ] 2.3 Update position on resize and after zoom transitions; hide when zoom-out unavailable

## 3. Verification

- [ ] 3.1 Manual: zoom in several levels, zoom out stepwise back to canonical; control hidden at root
- [ ] 3.2 Manual: portrait and landscape — control sits in margin, not over upper-left tile
- [ ] 3.3 `npm run build` succeeds

## Explicitly deferred

- Reverse tile-shrink shader matching zoom-in composite exactly
- Keyboard or gesture zoom-out
