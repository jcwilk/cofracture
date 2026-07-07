# cofracture

Collaborative Mandelbrot explorer — explore the fractal on an 8×8 tile grid with peer presence overlays via [iroh-gossip](https://docs.iroh.computer/connecting/gossip).

**Live site:** https://jcwilk.github.io/cofracture/

## Local development

### Prerequisites

- Node.js 20.19+
- Rust stable with `wasm32-unknown-unknown` target
- [wasm-pack](https://rustwasm.github.io/wasm-pack/)
- `clang` (for building iroh's TLS dependencies for WASM)

### Setup

```bash
rustup target add wasm32-unknown-unknown
npm install
npm run build:wasm    # or build:wasm:release for production
npm run dev
```

Open the dev server URL (typically http://localhost:5173/cofracture/).

### Production build

```bash
npm run build:wasm:release
npm run build
npm run preview
```

Preview serves at http://localhost:4173/cofracture/.

## Usage

- **Navigate:** tap or click a tile to zoom into that region (8×8 grid subdivides after each zoom).
- **Collaborate:** everyone shares one global presence room — peer tile highlights appear automatically when others are exploring at the same time.

## OpenSpec Flow

This repo also ships [OpenSpec Flow](https://github.com/Fission-AI/OpenSpec) (OSF) for Cursor. See **`OPENSPEC_FLOW.md`** and **`AGENTS.md`**.
