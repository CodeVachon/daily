import { defineConfig } from "drizzle-kit"

// Run through `varlock run -- drizzle-kit ...` (see package.json scripts) so
// DATABASE_URL is loaded and validated from the shared .env.schema.
export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  casing: "snake_case",
  strict: true,
  verbose: true,
})
