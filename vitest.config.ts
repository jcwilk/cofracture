import { defineConfig } from "vitest/config";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig({
  plugins: [wasm(), topLevelAwait()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    testTimeout: 90_000,
    hookTimeout: 30_000,
    execArgv: ["--experimental-wasm-modules"],
    server: {
      deps: {
        external: ["presence-wasm"],
      },
    },
  },
});
