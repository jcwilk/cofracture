## ADDED Requirements

### Requirement: Application is delivered as a static public site
The built application SHALL be published as static assets served from the repository's GitHub Pages site.

#### Scenario: Visitor can load the published site
- **WHEN** a visitor opens the repository's configured GitHub Pages URL
- **THEN** the collaborative Mandelbrot explorer loads and is usable without a separate application server

### Requirement: Published build matches the shipped client
The assets deployed to GitHub Pages SHALL be produced from the same verified production build used for release acceptance.

#### Scenario: Deployment uses the production build output
- **WHEN** a release is published to GitHub Pages
- **THEN** visitors receive the production build of the explorer client
- **AND** not development-only or unbundled source assets
