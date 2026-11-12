/**
 * CLI for runMigrations, bundled into the production image as migrate.mjs:
 *
 *   varlock run -- node migrate.mjs [migrations-folder]
 */
import { fileURLToPath } from "node:url"

import { runMigrations } from "../src/migrate"

// The default is relative to this file, so it only suits an unbundled run;
// the image passes its folder explicitly (docker/entrypoint.sh).
const folder =
  process.argv[2] ?? fileURLToPath(new URL("../drizzle", import.meta.url))
await runMigrations(folder)
console.log(`migrations applied from ${folder}`)
