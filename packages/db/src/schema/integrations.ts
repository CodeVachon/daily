// Connections to external systems and what's in scope (motte #37).
import { relations } from "drizzle-orm"
import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"

import type { IntegrationProvider } from "../integration-inputs"
import { user } from "./auth"

/**
 * One per user and provider. Credentials are encrypted (crypto.ts); the row
 * survives a disconnect, with the secret wiped, so the selection comes back
 * on reconnect.
 */
export const integrationConnection = pgTable(
  "integration_connection",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: text().$type<IntegrationProvider>().notNull(),
    /** Who the credentials belong to, for display ("codevachon"). */
    account: text().notNull(),
    /** Non-secret details for display (Jira site, email). */
    config: jsonb().$type<Record<string, string>>().notNull().default({}),
    /** `seal(JSON credentials)`; null once disconnected. */
    credentialsEnc: text(),
    connectedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    disconnectedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex("integration_connection_user_provider_idx").on(
      t.userId,
      t.provider
    ),
  ]
)

/** Repositories / projects the user chose; nothing else is ever queried. */
export const integrationResource = pgTable(
  "integration_resource",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    connectionId: text()
      .notNull()
      .references(() => integrationConnection.id, { onDelete: "cascade" }),
    externalId: text().notNull(),
    key: text().notNull(),
    name: text().notNull(),
    url: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("integration_resource_connection_external_idx").on(
      t.connectionId,
      t.externalId
    ),
  ]
)

export const integrationConnectionRelations = relations(
  integrationConnection,
  ({ many }) => ({ resources: many(integrationResource) })
)

export const integrationResourceRelations = relations(
  integrationResource,
  ({ one }) => ({
    connection: one(integrationConnection, {
      fields: [integrationResource.connectionId],
      references: [integrationConnection.id],
    }),
  })
)
