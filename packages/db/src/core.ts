/**
 * The database-free part of @workspace/db: actors, errors, input enums and
 * types. Safe to import anywhere (tests, client components, MCP tools)
 * without opening a connection or loading env.
 */
export type {
  Services,
  CalendarEvent,
  CalendarSyncTarget,
  Invitation,
  UserProfile,
  IntegrationConnection,
  InboxItem,
  DueLink,
  LinkChip,
  MessageTemplate,
  RemoteState,
  WorkerStatus,
  SyncResult,
  TaskLink,
  OAuthClientDisplay,
  StandupDraft,
  StandupPost,
  TaskDetail,
  TaskRef,
  TaskSummary,
  TimezoneUpdate,
} from "./services"
export { NotFoundError, ValidationError } from "./errors"
export type { CalendarChange, ChangeFeed, TaskChange } from "./changes"
export type {
  CalendarEventInput,
  CalendarSyncBatch,
  ConferenceEntry,
  EventAttachment,
  EventAttendee,
  EventPerson,
  EventStatus,
  EventType,
  ResponseStatus,
  RsvpResponse,
  RsvpScope,
} from "./calendar-inputs"
export {
  EVENT_TYPES,
  RESPONSE_STATUSES,
  RSVP_RESPONSES,
} from "./calendar-inputs"
export { COLORS } from "./catalog-inputs"
export {
  LINK_KINDS,
  LINK_STATE_CATEGORIES,
  parseExternalRef,
  type ExternalRef,
  type LinkKind,
  type LinkStateCategory,
} from "./external-ref"
export {
  INTEGRATION_PROVIDERS,
  integrationResource,
  LINK_PROVIDERS,
  type IntegrationProvider,
  type IntegrationResource,
  type LinkProvider,
} from "./integration-inputs"
export {
  ACCENT_COLORS,
  applyAppearance,
  appearancePatch,
  BASE_COLORS,
  DEFAULT_APPEARANCE,
  type AccentColor,
  type Appearance,
  type AppearancePatch,
  type BaseColor,
  type Palette,
} from "./appearance"
export { describeEvent, type TaskEvent, type TaskEventPayload } from "./events"
export {
  PRIORITIES,
  STATUS_CATEGORIES,
  type ListTasksInput,
  type Priority,
  type StatusCategory,
} from "./task-inputs"
export {
  agentActor,
  assertCanDelete,
  ForbiddenError,
  systemActor,
  userActor,
  type Actor,
  type ActorType,
  type SystemActorName,
} from "./actor"
export {
  CALENDAR_FULL_SYNC_DAYS,
  CALENDAR_SYNC_FUTURE_DAYS,
  CALENDAR_SYNC_JOB,
  CALENDAR_SYNC_PAST_DAYS,
  LINK_SYNC_JOB,
  SYNC_INTERVALS,
} from "./sync-policy"
