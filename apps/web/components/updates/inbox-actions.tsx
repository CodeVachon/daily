"use client"

import { Button } from "@workspace/ui/components/button"
import { CheckCheckIcon, CheckIcon } from "lucide-react"
import { useEffect } from "react"

import { markAllReadAction, markReadAction } from "@/app/(app)/updates/actions"
import { useAction } from "@/components/task/use-action"

export function MarkReadButton({ taskId }: { taskId: string }) {
  const { pending, run } = useAction()
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => run(() => markReadAction(taskId))}
    >
      <CheckIcon />
      Mark read
    </Button>
  )
}

export function MarkAllReadButton() {
  const { pending, run } = useAction()
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => run(() => markAllReadAction())}
    >
      <CheckCheckIcon />
      Mark all read
    </Button>
  )
}

/** Opening a task (page or drawer) marks its changes as seen. */
export function MarkReadOnOpen({
  taskId,
  unread,
}: {
  taskId: string
  unread: boolean
}) {
  useEffect(() => {
    if (unread) void markReadAction(taskId)
  }, [taskId, unread])
  return null
}
