import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ["./vitest.global-setup.ts"],
    setupFiles: ["./vitest.setup.ts"],
    // `npm run build` emits compiled tests into dist; never run those as source tests.
    exclude: ["dist/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/index.ts", "src/seed.ts", "src/jobs/**", "src/scripts/**"],
      reporter: ["text", "json-summary"],
      reportsDirectory: "coverage",
      // Initial ratchet: the all-source baseline when this gate was added. Raise these
      // as tests are added; lowering one needs a deliberate review decision.
      thresholds: {
        statements: 58,
        branches: 44,
        functions: 47,
        lines: 58,
      },
    },
  },
});
