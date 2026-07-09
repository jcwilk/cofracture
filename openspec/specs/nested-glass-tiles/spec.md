# nested-glass-tiles Specification

## Purpose
TBD - created by archiving change nested-glass-tiles. Update Purpose after archive.
## Requirements
### Requirement: Macro tiles show nested glass faces aligned with the next zoom grid
Each of the 64 macro tiles in the visible square SHALL present a nested 8×8 arrangement of smaller glass-like faces whose partition matches the same 8×8 subdivision used when that macro tile becomes the next full view, so the nested faces foreshadow the tiles revealed after zooming in.

#### Scenario: Nested faces match zoom subdivision
- **GIVEN** the visible square is partitioned into the usual 8×8 macro tiles
- **WHEN** a visitor inspects a single macro tile’s face
- **THEN** they can perceive 64 smaller faces arranged in an 8×8 pattern on that tile
- **AND** those smaller faces align with the regions that become selectable tiles after zooming into that macro tile

### Requirement: Nested faces read as flat-ish glass or mahjong tiles
Nested faces SHALL appear as rounded-square glass / mahjong-like pieces with soft seams, subtle volumetric bevel, and specular-led edge highlights, without opaque decorative grid lines that dominate the Mandelbrot image.
(Previously the specular scenario described a highlight "near the upper-right corner"; now the L extends most of the way along both edges and a complementary catch is added for transparent tiles.)

#### Scenario: Glass aesthetic without opaque grid chrome
- **GIVEN** the nested faces are visible on the idle fractal view
- **WHEN** a visitor compares the fractal color to the tile treatment
- **THEN** the Mandelbrot image remains the dominant visual content of each face
- **AND** seams between nested faces use soft partial transparency rather than hard opaque divider strokes
- **AND** faces show a subtle bevel and glossy highlight language consistent with glass or mahjong tiles

#### Scenario: Specular L stretches along upper and right edges
- **GIVEN** a nested glass face is visible
- **WHEN** a visitor looks for the primary specular cue on that face
- **THEN** the highlight reads as a glossy L that extends most of the way along the top edge and the right edge
- **AND** the L tapers thinner toward the far corners — toward the top-left end of the top stroke and toward the bottom end of the right stroke
- **AND** the highlight does not read as a diffuse wash across the full face

#### Scenario: Soft complementary catch at bottom-left for transparent faces
- **GIVEN** a nested glass face covers a transparent fractal region (Mandelbrot set interior)
- **WHEN** a visitor looks at the bottom-left area of that face
- **THEN** a softer secondary catch light is perceptible at the bottom-left, providing shape contrast on the otherwise dark face

### Requirement: Transparent fractal regions keep a minimum glass substrate
Where the Mandelbrot set interior would otherwise be fully transparent, the nested face SHALL still show a minimum glass-substrate milkiness so nested boundaries remain readable, while opaque fractal color SHALL NOT receive additional milkiness. Substrate milkiness SHALL thin toward the face edge to imply a slight natural bevel. The starfield behind the view SHALL remain visible through transparent regions and soft seams.

#### Scenario: Set interior shows faint glass without hiding stars
- **GIVEN** a nested face covers a region of Mandelbrot set interior (transparent fractal samples)
- **WHEN** a visitor views that region
- **THEN** a faint glass substrate is visible enough to suggest the nested face
- **AND** the starfield behind the fractal view remains visible through that region

#### Scenario: Opaque fractal is not milky-washed
- **GIVEN** a nested face covers brightly colored escaped Mandelbrot samples
- **WHEN** a visitor views that region
- **THEN** the fractal colors are not covered by an added milky plate
- **AND** glass cues appear primarily as edge bevel and specular highlights

### Requirement: Macro tiles wander subtly without changing selection targets
While the idle grid is shown, macro tiles SHALL exhibit a subtle loose arrangement (small positional wander) so they feel like arranged pieces rather than a rigidly locked mesh. Tile selection hit-testing SHALL continue to use the logical 8×8 partition of the visible square, not the momentary visual offset of a wandering tile.

#### Scenario: Idle wander is visible but taps follow the logical grid
- **GIVEN** the idle 8×8 macro grid is displayed
- **WHEN** a visitor watches without interacting
- **THEN** macro tiles show a subtle positional wander or loose layout relative to a perfect lattice
- **WHEN** the visitor selects a tile by tap or click
- **THEN** the selected region matches the logical grid cell under the pointer, not a misaligned neighbor caused by wander

### Requirement: Nested faces maintain glass decoration during fly-apart
During a zoom-in fly-apart animation, each animating face SHALL present the same specular highlights and glass-substrate milkiness visible at idle. As a face grows, its decoration SHALL scale with it. Transparent-region compositing during the animation SHALL NOT wash out or reduce milkiness or specular cues relative to their idle appearance.

#### Scenario: Specular and milkiness persist mid-flight
- **GIVEN** a fly-apart zoom-in animation is in progress
- **WHEN** a visitor observes a nested face mid-flight
- **THEN** the face shows specular and glass-substrate decoration at the same strength as the idle nested face of that size

#### Scenario: Compositing does not suppress glass cues
- **GIVEN** a fly-apart animation is in progress over transparent fractal regions
- **WHEN** the composited result is observed
- **THEN** glass-substrate milkiness and specular highlights are not visually reduced or washed out compared to the idle glass appearance

### Requirement: Nested glass faces present even face pixelization
Nested glass faces SHALL render with even pixelization — each face's pixel coverage SHALL be consistent and free of periodic bright-column or bright-row banding caused by uneven pixels-per-cell allocation.

#### Scenario: No periodic banding at idle
- **GIVEN** the idle 8×8 macro grid is visible
- **WHEN** a visitor scans the nested glass faces across the grid
- **THEN** no periodic bright columns or rows are visible at cell boundaries
- **AND** the pixelization across each face appears visually uniform

#### Scenario: No banding during fly-apart
- **GIVEN** a fly-apart zoom-in animation is in progress
- **WHEN** a visitor observes the growing faces
- **THEN** no periodic bright columns or rows appear as the faces scale upward

