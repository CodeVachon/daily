/**
 * Activity event vocabulary (motte #14). Every change a service makes is
 * described by one of these and stored in `task_event`.
 */
import type { Actor } from "./actor"

export interface FieldChange {
  field: string
  from: unknown
  to: unknown
}

type Ref<T extends string, K extends string> = { type: T } & Record<K, string>

export type TaskEventPayload =
  | { type: "created" }
  | { type: "updated"; changes: FieldChange[] }
  | { type: "status_changed"; from: string; to: string }
  | { type: "reordered" }
  | { type: "deleted" }
  | { type: "restored" }
  | Ref<"comment_added" | "comment_edited" | "comment_deleted", "commentId">
  | (Ref<"label_added" | "label_removed", "labelId"> & { name: string })
  | (Ref<
      "checklist_added" | "checklist_updated" | "checklist_removed",
      "itemId"
    > & {
      text: string
    })
  | (Ref<"checklist_toggled", "itemId"> & { text: string; done: boolean })
  | (Ref<"subtask_added" | "subtask_detached", "subtaskId"> & { title: string })
  | Ref<"dependency_added" | "dependency_removed", "blockedByTaskId">
  | (Ref<"link_added" | "link_removed", "linkId"> & { url: string })
  | (Ref<"link_synced", "linkId"> & { changes: FieldChange[] })

export interface TaskEvent {
  seq: number
  taskId: string
  at: Date
  actor: Actor
  payload: TaskEventPayload
}

const same = (a: unknown, b: unknown) =>
  a instanceof Date && b instanceof Date
    ? +a === +b
    : JSON.stringify(a) === JSON.stringify(b)

/**
 * The fields of `after` whose values differ from `before` (old → new).
 * Fields absent from `after` are not considered changed.
 */
export function diffFields<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>
): FieldChange[] {
  return Object.keys(after)
    .filter((field) => !same(before[field], after[field]))
    .map((field) => ({
      field,
      from: before[field] ?? null,
      to: after[field] ?? null,
    }))
}

const show = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "nothing"
  if (typeof value === "object" && value && "kind" in value) {
    const due = value as { kind: string; date?: string; at?: string | Date }
    return due.kind === "date"
      ? String(due.date)
      : new Date(due.at!).toISOString()
  }
  return typeof value === "string" ? `"${value}"` : JSON.stringify(value)
}

const FIELD_NAMES: Record<string, string> = {
  title: "title",
  description: "description",
  priority: "priority",
  due: "due date",
  projectId: "project",
  parentTaskId: "parent task",
}

function describeChange({ field, from, to }: FieldChange): string {
  const name = FIELD_NAMES[field] ?? field
  if (field === "description") return "edited the description"
  return `changed ${name} from ${show(from)} to ${show(to)}`
}

/** The payload shape for one event type (members may share a union of types). */
type Payload<T extends TaskEventPayload["type"]> = TaskEventPayload extends infer P
  ? P extends { type: infer U }
    ? T extends U
      ? P
      : never
    : never
  : never

/** One formatter per event type; the mapped type makes the table exhaustive. */
const DESCRIBE: {
  [T in TaskEventPayload["type"]]: (payload: Payload<T>) => string
} = {
  created: () => "created the task",
  updated: (p) => p.changes.map(describeChange).join("; "),
  status_changed: (p) => `moved it from ${p.from} to ${p.to}`,
  reordered: () => "reordered it on the board",
  deleted: () => "deleted the task",
  restored: () => "restored the task",
  comment_added: () => "commented",
  comment_edited: () => "edited a comment",
  comment_deleted: () => "deleted a comment",
  label_added: (p) => `added label "${p.name}"`,
  label_removed: (p) => `removed label "${p.name}"`,
  checklist_added: (p) => `added checklist item "${p.text}"`,
  checklist_updated: (p) => `renamed checklist item to "${p.text}"`,
  checklist_toggled: (p) => `${p.done ? "checked" : "unchecked"} "${p.text}"`,
  checklist_removed: (p) => `removed checklist item "${p.text}"`,
  subtask_added: (p) => `added subtask "${p.title}"`,
  subtask_detached: (p) => `detached subtask "${p.title}"`,
  dependency_added: () => "added a blocking task",
  dependency_removed: () => "removed a blocking task",
  link_added: (p) => `linked ${p.url}`,
  link_removed: (p) => `unlinked ${p.url}`,
  link_synced: (p) =>
    `synced a link: ${p.changes.map(describeChange).join("; ")}`,
}

/**
 * One-line description of an event, without the actor ("moved it from todo
 * to done"). Shared by the web timeline and MCP.
 */
export function describeEvent(payload: TaskEventPayload): string {
  const describe = DESCRIBE[payload.type] as (
    payload: TaskEventPayload
  ) => string
  return describe(payload)
}
