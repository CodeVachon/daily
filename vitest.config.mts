import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

/**
 * One test run for the whole monorepo (`bun run test`). Coverage lands in
 * coverage/coverage-final.json, which `fallow` reads for exact CRAP scores.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./apps/web", import.meta.url)) },
  },
  test: {
    include: ["apps/**/*.test.{ts,tsx}", "packages/**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/.next/**"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json"],
      // .ts only: logic lives in lib/services; .tsx views stay thin (fallow
      // estimates those). V8 remapping cannot parse JSX of unloaded files.
      include: [
        "apps/*/{app,lib,components}/**/*.ts",
        "packages/*/src/**/*.ts",
      ],
      exclude: ["**/*.test.*", "**/env.ts"],
    },
  },
})
