import { closeDatabase, db } from "./client"
import { ENV } from "./env"
import { createServices } from "./services"

/** App-wide services bound to the real database. */
export const services = createServices(db, {
  encryptionKey: () => ENV.INTEGRATIONS_ENCRYPTION_KEY,
})

export { authDatabaseAdapter } from "./auth-adapter"
/** Close the connection pool (long-running processes shutting down). */
export { closeDatabase }
export * from "./core"
