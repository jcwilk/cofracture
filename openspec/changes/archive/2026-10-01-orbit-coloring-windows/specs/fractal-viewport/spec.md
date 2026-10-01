## ADDED Requirements

### Requirement: Fractal color comes from coloring windows
The application SHALL color a pixel only from coloring windows its Mandelbrot orbit enters. A coloring window is a rectangular complex-plane region with one hue. Entry SHALL be tested at the orbit position on each step, not at the pixel's location. The same rule SHALL apply at every zoom level. The escape-time rainbow palette SHALL NOT color the fractal.

#### Scenario: One window paints only its hue
- **GIVEN** a single coloring window
- **WHEN** an orbit enters that window and no other
- **THEN** the pixel is a shade of that window's hue only
- **AND** no rainbow banding from escape time is visible

#### Scenario: Zoomed-in and zoomed-out views use the same rule
- **GIVEN** the visitor zooms from the canonical region into a smaller tile
- **WHEN** the picture is colored before and after that zoom
- **THEN** color still depends only on which coloring windows contain the orbit position
- **AND** the zoom changes the size and position of the local window rather than switching coloring methods

#### Scenario: An orbit that misses every window stays clear
- **GIVEN** an orbit that never enters a coloring window
- **WHEN** that pixel is shown
- **THEN** it stays clear so the starfield shows through

#### Scenario: A trapped orbit that revisits a window is strongly colored
- **GIVEN** an orbit that never escapes and repeatedly enters a coloring window
- **WHEN** that pixel is shown
- **THEN** it is strongly colored from that window
- **AND** it is not left clear merely because it never escaped

### Requirement: Repeated entries to a coloring window matter less
For each coloring window, the first time an orbit enters it SHALL change that pixel more than a later entry to the same window. Further entries SHALL keep adding less.

#### Scenario: A single entry is visible
- **GIVEN** an orbit that enters a coloring window once
- **WHEN** that pixel is compared with a pixel whose orbit never enters a window
- **THEN** the single entry produces a clearly visible amount of that hue

#### Scenario: Another revisit after many entries changes little
- **GIVEN** an orbit that has already entered the same coloring window many times
- **WHEN** it enters that window once more
- **THEN** the pixel changes only slightly compared with the change from the first entry

### Requirement: Multiple window hues stay vivid
When an orbit enters more than one coloring window, the pixel SHALL show a vivid combination of those hues. Greater influence SHALL pull the hue more. The result SHALL stay saturated. A combination that would otherwise look gray, brown, or dull SHALL resolve to a vivid hue led by the more influential window.

#### Scenario: Two windows blend without mud
- **GIVEN** two coloring windows of different hues
- **AND** an orbit that enters both
- **WHEN** the pixel is shown
- **THEN** its hue is closer to the window that influenced it more
- **AND** the color stays vivid rather than turning gray or brown

#### Scenario: Widely different hues do not wash out
- **GIVEN** three coloring windows of widely different hues
- **AND** an orbit that enters all three
- **WHEN** the pixel is shown
- **THEN** the color stays vivid
- **AND** it does not collapse toward gray

### Requirement: The local view is a coloring window
The visitor's current visible complex-plane square SHALL be a coloring window in the visitor's own hue, including while exploring alone and while a zoom transition is in progress. During a transition that window SHALL follow the region being displayed.

#### Scenario: Solo view is colored by the local window
- **GIVEN** no other participants are connected
- **WHEN** the visitor views the fractal
- **THEN** the fractal is colored by the local view window in the visitor's hue

#### Scenario: The local window tracks a zoom transition
- **GIVEN** a zoom transition is playing
- **WHEN** orbits are colored during that transition
- **THEN** the local coloring window matches the moving view region
- **AND** it is not stuck on only the starting frame or only the ending frame
