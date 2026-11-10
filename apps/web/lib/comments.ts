import type { Actor } from "@workspace/db/core"

import { relativeTime } from "./activity"

interface Comment {
  id: string
  body: string
  author: Actor
  createdAt: Date
  editedAt: Date | null
}

/** A comment as the page shows it; only the user's own comments are editable. */
export function toCommentView(comment: Comment, userId: string, now: Date) {
  return {
    id: comment.id,
    body: comment.body,
    authorType: comment.author.type,
    authorName: comment.author.label,
    mine: comment.author.type === "user" && comment.author.userId === userId,
    when: relativeTime(comment.createdAt, now),
    edited: comment.editedAt !== null,
  }
}
