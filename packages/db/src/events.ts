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
