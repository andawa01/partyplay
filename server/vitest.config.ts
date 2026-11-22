import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ["./vitest.global-setup.ts"],
    setupFiles: ["./vitest.setup.ts"],
    // `npm run build` emits compiled tests into dist; never run those as source tests.
    exclude: ["dist/**", "node_modules/**"],
  },
});
