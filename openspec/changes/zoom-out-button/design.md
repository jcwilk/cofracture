## Context

The Mandelbrot explorer letterboxes a square render region inside the full viewport (`computeSquareLayout()` in `viewport.ts`). Tile selection zooms **in** by animating the selected cell to fill the square and updating `bounds`; there is no parent stack today, so zoom-out requires remembering prior bounds on each successful zoom-in.

The canvas is full-screen; UI chrome was previously removed (no share/status bar). The zoom-out control will be a small DOM button overlaid on the page, positioned from layout math on resize and after zoom animations.

## Goals / Non-Goals

**Goals:**

- One tap/click zooms out exactly one level with a transition consistent with zoom-in (linear, ~250 ms).
- Control is visible and reachable on mobile and desktop without blocking tile selection at the grid’s upper-left cell.
- Placement respects letterboxing: sits in the margin beside the render square when portrait or landscape; falls back to viewport corner when aspect ratio is nearly square.

**Non-Goals:**

- Breadcrumb UI, depth indicator, or arbitrary jump in the zoom stack
- Pinch-to-zoom or keyboard bindings
- Zoom-out while a zoom-in animation is in progress

## Decisions

### Decision: Parent bounds stack on zoom-in

Push the current `bounds` onto a stack before each completed tile zoom-in. Zoom-out pops one entry and animates back to that parent bounds (inverse of zoom-in: shrink current view into the cell that was last selected, or simpler **bounds lerp** from current to parent over the same duration).

**Simpler v1 animation:** Lerp complex-plane `bounds` from current to parent over `ZOOM_DURATION_MS` (whole-frame bounds interpolation for zoom-out only). Zoom-in keeps the existing tile-grow composite; zoom-out may use bounds lerp since reversing the exact tile shrink is harder without storing last `(row, col)`. Outward behavior is still visually clear.

**Alternative considered:** Store last `(row, col)` per level and mirror zoom-in shader in reverse — more faithful but more work; defer unless bounds lerp feels wrong.

### Decision: Control availability

When the stack is empty (canonical bounds), hide the button or set `disabled` + `aria-hidden`. Prefer **hidden** when unavailable so letterbox margin stays clean at root view.

### Decision: Placement algorithm

Let `layout = { x, y, size }` be the letterboxed square, `w` and `h` viewport CSS pixels, `margin = max(8, size * 0.02)`.

**Nearly square** when `|w - h| / max(w, h) < 0.08` (tunable):

- Place control at viewport `(margin, margin)` — upper-left of the window.

**Portrait** (`w < h`, meaningful top/bottom letterbox):

- Place just **above** the square’s top-left: `(layout.x + margin, layout.y - controlHeight - margin)`, clamped to `y >= margin`.

**Landscape** (`w > h`, meaningful left/right letterbox):

- Place just **left** of the square’s top-left: `(layout.x - controlWidth - margin, layout.y + margin)`, clamped to `x >= margin`.

If both margins are thin (near-square but not quite), viewport corner wins.

Recompute on `window.resize` and after zoom animations complete.

### Decision: DOM button over canvas drawing

Use a `<button>` in `#app` (sibling to canvas) with fixed/absolute positioning updated from TS. Easier hit targets, accessibility (`aria-label="Zoom out"`), and focus styles than painting on canvas.

**Alternatives considered:** Canvas-drawn icon — worse a11y and touch targets.

### Decision: Icon and label

Compact control: “−” or magnifying-glass-minus glyph with `aria-label="Zoom out"`. No text label required on narrow screens; minimum touch target ~44×44 CSS px.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Button overlaps upper-left tile | Offset into letterbox margin; on near-square use small inset from corner |
| Bounds lerp zoom-out looks different from zoom-in | Accept for v1; revisit reverse tile animation if reviewers care |
| Stack desync if bounds change elsewhere | Only push on completed zoom-in; clear stack on full reset (future) |

## Migration Plan

Ship in one apply pass; no data migration. Existing sessions simply start with empty stack at current bounds.

## Open Questions

- None blocking — square threshold `0.08` and bounds-lerp vs reverse-tile animation can be tuned during apply.
