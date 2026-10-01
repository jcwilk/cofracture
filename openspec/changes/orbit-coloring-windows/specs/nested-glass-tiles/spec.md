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
- **GIVEN** a nested glass face covers an uncolored fractal sample whose orbit entered no coloring window
- **WHEN** a visitor looks at the bottom-left area of that face
- **THEN** a softer secondary catch light is perceptible at the bottom-left, providing shape contrast on the otherwise dark face

### Requirement: Transparent fractal regions keep a minimum glass substrate
Where a fractal sample is uncolored because its orbit entered no coloring window, the nested face SHALL still show a minimum glass-substrate milkiness so nested boundaries remain readable, while colored fractal samples SHALL NOT receive additional milkiness. Substrate milkiness SHALL thin toward the face edge to imply a slight natural bevel. The starfield SHALL remain visible through uncolored regions and soft seams.
(Previously: set interior counted as clear; escaped samples counted as opaque.)

#### Scenario: Set interior shows faint glass without hiding stars
- **GIVEN** a nested face covers an uncolored fractal sample, including set interior whose orbit entered no coloring window
- **WHEN** a visitor views that region
- **THEN** a faint glass substrate is visible enough to suggest the nested face
- **AND** the starfield behind the fractal view remains visible through that region

#### Scenario: Opaque fractal is not milky-washed
- **GIVEN** a nested face covers a fractal sample colored by one or more coloring windows
- **WHEN** a visitor views that region
- **THEN** those hues are not covered by an added milky plate
- **AND** glass cues appear primarily as edge bevel and specular highlights
