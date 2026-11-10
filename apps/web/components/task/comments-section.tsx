"use client"

import type { ActorType } from "@workspace/db/core"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import { Textarea } from "@workspace/ui/components/textarea"
import { BotIcon } from "lucide-react"
import { useState } from "react"

import {
  addCommentAction,
  deleteCommentAction,
  editCommentAction,
} from "@/app/(app)/tasks/collaboration-actions"
import { Markdown } from "@/components/markdown"

import { Section } from "./section"
import { useAction } from "./use-action"

export interface CommentView {
  id: string
  body: string
  authorType: ActorType
  authorName: string
  /** The signed-in user wrote it (only they can edit it). */
  mine: boolean
  when: string
  edited: boolean
}

function CommentForm({
  initial = "",
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: string
  submitLabel: string
  onSubmit: (body: string) => Promise<boolean>
  onCancel?: () => void
}) {
  const [body, setBody] = useState(initial)
  const [pending, setPending] = useState(false)
  async function submit() {
    setPending(true)
    if (await onSubmit(body)) setBody(initial === "" ? "" : body)
    setPending(false)
  }
  return (
    <div className="flex flex-col gap-2">
      <Textarea
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a comment (Markdown)"
        aria-label="Comment"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={pending || !body.trim()}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  )
}

function DeleteComment({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" size="xs" />}>
        Delete
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
          <AlertDialogDescription>
            It disappears from the task; the history keeps a record that it was
            deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function CommentHeader({
  comment,
  onEdit,
  onDelete,
}: {
  comment: CommentView
  onEdit?: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {comment.authorType === "agent" && (
        <BotIcon className="size-3.5 text-primary" />
      )}
      <span className="font-medium text-foreground">{comment.authorName}</span>
      <span>
        {comment.when}
        {comment.edited && " · edited"}
      </span>
      <span className="ml-auto flex gap-1">
        {onEdit && (
          <Button variant="ghost" size="xs" onClick={onEdit}>
            Edit
          </Button>
        )}
        <DeleteComment onConfirm={onDelete} />
      </span>
    </div>
  )
}

function CommentItem({ comment }: { comment: CommentView }) {
  const { run } = useAction()
  const [editing, setEditing] = useState(false)

  async function save(body: string) {
    const ok = await run(() => editCommentAction(comment.id, body))
    if (ok) setEditing(false)
    return ok
  }

  return (
    <li className="flex flex-col gap-1 rounded-xl border p-3">
      <CommentHeader
        comment={comment}
        onEdit={comment.mine && !editing ? () => setEditing(true) : undefined}
        onDelete={() => run(() => deleteCommentAction(comment.id))}
      />
      {editing ? (
        <CommentForm
          initial={comment.body}
          submitLabel="Save"
          onCancel={() => setEditing(false)}
          onSubmit={save}
        />
      ) : (
        <Markdown>{comment.body}</Markdown>
      )}
    </li>
  )
}

export function CommentsSection({
  taskId,
  comments,
}: {
  taskId: string
  comments: CommentView[]
}) {
  const { run } = useAction()
  return (
    <Section title="Comments" aside={comments.length || undefined}>
      <ul className="flex flex-col gap-2">
        {comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </ul>
      <CommentForm
        submitLabel="Comment"
        onSubmit={(body) => run(() => addCommentAction(taskId, body))}
      />
    </Section>
  )
}
