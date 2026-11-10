"use client"

import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"
import { move } from "@dnd-kit/helpers"
import { DragDropProvider, useDroppable } from "@dnd-kit/react"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { moveTaskAction } from "@/app/(app)/tasks/actions"
import { dropTarget, type BoardCard, type BoardItems } from "@/lib/board"

import { TaskCard } from "./task-card"

/** Columns win collisions only when no card is under the pointer. */
const COLUMN_COLLISION_PRIORITY = 1

function Column({
  id,
  name,
  count,
  children,
}: {
  id: string
  name: string
  count: number
  children: React.ReactNode
}) {
  const { ref, isDropTarget } = useDroppable({
    id,
    type: "column",
    accept: "item",
    collisionPriority: COLUMN_COLLISION_PRIORITY,
  })
  return (
    <section className="flex w-72 shrink-0 flex-col gap-2">
      <h2 className="flex items-center gap-2 px-1 text-sm font-medium">
        {name}
        <Badge variant="secondary">{count}</Badge>
      </h2>
      <div
        ref={ref}
        className={cn(
          "flex min-h-24 flex-1 flex-col gap-2 rounded-xl p-1 transition-colors",
          isDropTarget && "bg-muted"
        )}
      >
        {children}
      </div>
    </section>
  )
}

/**
 * Drag cards between status columns (changes status) or within a column
 * (reorders). The board updates immediately; the server confirms or the move
 * is undone with an error.
 */
export function KanbanBoard({
  columns,
  cards,
  initialItems,
  version,
}: {
  columns: { key: string; name: string }[]
  cards: Record<string, BoardCard>
  initialItems: BoardItems
  /** Changes whenever the server's arrangement changes (after a move, an edit, an agent…). */
  version: string
}) {
  const [items, setItems] = useState(initialItems)
  // Take the server's arrangement when it changes, without remounting (which
  // would tear down and rebuild the drag-and-drop manager).
  const [syncedVersion, setSyncedVersion] = useState(version)
  if (version !== syncedVersion) {
    setSyncedVersion(version)
    setItems(initialItems)
  }
  const before = useRef(initialItems)
  // The arrangement as of the last drag-over (state may not have re-rendered yet).
  const latest = useRef(initialItems)

  async function save(id: string, after: BoardItems) {
    const target = dropTarget(before.current, after, id)
    if (!target) return
    const result = await moveTaskAction(String(cards[id]!.number), target)
    if (!result.ok) {
      toast.error(result.error)
      setItems(before.current)
    }
  }

  return (
    <DragDropProvider
      onDragStart={() => {
        before.current = items
        latest.current = items
      }}
      onDragOver={(event) => {
        latest.current = move(latest.current, event)
        setItems(latest.current)
      }}
      onDragEnd={(event) => {
        if (event.canceled) return setItems(before.current)
        const id = event.operation.source?.id
        if (id !== undefined) void save(String(id), latest.current)
      }}
    >
      <div className="flex flex-1 gap-4 overflow-x-auto p-4">
        {columns.map((column) => (
          <Column
            key={column.key}
            id={column.key}
            name={column.name}
            count={items[column.key]?.length ?? 0}
          >
            {(items[column.key] ?? []).map((id, index) => (
              <TaskCard
                key={id}
                card={cards[id]!}
                column={column.key}
                index={index}
              />
            ))}
          </Column>
        ))}
      </div>
    </DragDropProvider>
  )
}
