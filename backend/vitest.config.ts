import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.spec.ts"],
    exclude: ["tests/integration/**"],
    testTimeout: 10_000,
    hookTimeout: 10_000,
    server: {
      deps: {
        external: [/^node:/],
      },
    },
  },
});
