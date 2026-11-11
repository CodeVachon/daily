import { createCalendarFeed, createChangeFeed, type Listen } from "../changes"
import type { KeySource } from "../crypto"
import type { Database } from "../database"
import { createActivityService } from "./activity"
import { createActorService } from "./actors"
import { createCalendarService } from "./calendar"
import { createChecklistService } from "./checklist"
import { createCommentService } from "./comments"
import { createDependencyService } from "./dependencies"
import { createHealthService } from "./health"
import { createInboxService } from "./inbox"
import { createIntegrationService } from "./integrations"
import { createLabelService } from "./labels"
import { createLinkService } from "./links"
import { createOAuthClientService } from "./oauth-clients"
import { createProjectService } from "./projects"
import { createSettingsService } from "./settings"
import { createTaskService } from "./tasks"
import { createUserService } from "./users"
import { createWorkerService } from "./worker"

/**
 * Every data-access service. This is the single source of truth for data:
 * nothing outside packages/db may query the database.
 */
export interface ServiceOptions {
  /** INTEGRATIONS_ENCRYPTION_KEY, read only when a credential is used. */
  encryptionKey: KeySource
  /** LISTEN on a dedicated connection, for the live change feed. */
  listen: Listen
}

export function createServices(db: Database, options: ServiceOptions) {
  const integrations = createIntegrationService(db, options.encryptionKey)
  return {
    activity: createActivityService(db),
    actors: createActorService(db),
    calendar: createCalendarService(db),
    /** Live calendar changes (calendar sync, any process). */
    calendarChanges: createCalendarFeed(options.listen),
    /** Live task changes from every process (web, MCP, sync worker). */
    changes: createChangeFeed(options.listen),
    checklist: createChecklistService(db),
    comments: createCommentService(db),
    dependencies: createDependencyService(db),
    health: createHealthService(db),
    inbox: createInboxService(db),
    integrations,
    users: createUserService(db),
    labels: createLabelService(db),
    links: createLinkService(db, integrations),
    oauthClients: createOAuthClientService(db),
    projects: createProjectService(db),
    settings: createSettingsService(db),
    tasks: createTaskService(db),
    worker: createWorkerService(db),
  }
}

export type Services = ReturnType<typeof createServices>
export type { UserProfile } from "./users"
export type { IntegrationConnection } from "./integrations"
export type {
  DueLink,
  LinkChip,
  RemoteState,
  SyncResult,
  TaskLink,
} from "./links"
export type { WorkerStatus } from "./worker"
export type { CalendarSyncTarget } from "./calendar"
export type { InboxItem } from "./inbox"
export type { OAuthClientDisplay } from "./oauth-clients"
export type { TimezoneUpdate } from "./settings"
export type { TaskDetail, TaskRef, TaskSummary } from "./tasks"
