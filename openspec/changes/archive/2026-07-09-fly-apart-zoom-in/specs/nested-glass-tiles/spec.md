## ADDED Requirements

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

## MODIFIED Requirements

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
