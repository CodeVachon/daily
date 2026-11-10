/**
 * CLI for runMigrations, bundled into the production image as migrate.mjs:
 *
 *   varlock run -- node migrate.mjs [migrations-folder]
 */
import { runMigrations } from "../src/migrate"

const folder =
  process.argv[2] ?? new URL("../drizzle", import.meta.url).pathname
await runMigrations(folder)
console.log(`migrations applied from ${folder}`)
