/**
 * The database-free part of @workspace/db: actors, errors, input enums and
 * types. Safe to import anywhere (tests, client components, MCP tools)
 * without opening a connection or loading env.
 */
export type {
  Services,
  UserProfile,
  IntegrationConnection,
  RemoteState,
  SyncResult,
  TaskLink,
  OAuthClientDisplay,
  TaskDetail,
  TaskRef,
  TaskSummary,
  TimezoneUpdate,
} from "./services"
export { NotFoundError, ValidationError } from "./errors"
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
  type IntegrationProvider,
  type IntegrationResource,
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
