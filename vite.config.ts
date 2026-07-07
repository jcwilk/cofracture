import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig({
  base: "/cofracture/",
  plugins: [wasm(), topLevelAwait()],
  optimizeDeps: {
    exclude: ["webtorrent"],
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
});
