import { and, asc, eq, isNull } from "drizzle-orm"
import { z } from "zod"

import { assertCanDelete, ForbiddenError, type Actor } from "../actor"
import type { Database } from "../database"
import { NotFoundError } from "../errors"
import { taskComment, taskCommentRevision } from "../schema"
import { recordEvents } from "./activity"
import { createTaskService, type TaskRef } from "./tasks"

const commentBody = z.string().trim().min(1, "Comment is empty").max(20_000)

export interface Comment {
  id: string
  taskId: string
  body: string
  author: Actor
  createdAt: Date
  editedAt: Date | null
}

export interface CommentRevision {
  body: string
  replacedAt: Date
  replacedBy: Actor
}

const toComment = (row: typeof taskComment.$inferSelect): Comment => ({
  id: row.id,
  taskId: row.taskId,
  body: row.body,
  author: row.author,
  createdAt: row.createdAt,
  editedAt: row.editedAt,
})

/** The same person/agent: the user, or the same OAuth client. */
const sameAuthor = (a: Actor, b: Actor) =>
  a.type === b.type && a.userId === b.userId && a.clientId === b.clientId

export function createCommentService(db: Database) {
  const tasks = createTaskService(db)

  async function load(userId: string, id: string) {
    const [row] = await db
      .select()
      .from(taskComment)
      .where(
        and(
          eq(taskComment.id, id),
          eq(taskComment.userId, userId),
          isNull(taskComment.deletedAt)
        )
      )
    if (!row) throw new NotFoundError(`Comment ${id}`)
    return row
  }

  return {
    /** A task's comments, oldest first. */
    async list(userId: string, taskRef: TaskRef): Promise<Comment[]> {
      const taskId = await tasks.resolveId(userId, taskRef)
      const rows = await db
        .select()
        .from(taskComment)
        .where(
          and(eq(taskComment.taskId, taskId), isNull(taskComment.deletedAt))
        )
        .orderBy(asc(taskComment.createdAt))
      return rows.map(toComment)
    },

    async add(actor: Actor, taskRef: TaskRef, body: string): Promise<Comment> {
      const text = commentBody.parse(body)
      const taskId = await tasks.resolveId(actor.userId, taskRef)
      return db.transaction(async (tx) => {
        const [row] = await tx
          .insert(taskComment)
          .values({ taskId, userId: actor.userId, body: text, author: actor })
          .returning()
        await recordEvents(tx, actor, taskId, [
          { type: "comment_added", commentId: row!.id },
        ])
        return toComment(row!)
      })
    },

    /** Only the author may edit; the previous body is kept as a revision. */
    async edit(actor: Actor, id: string, body: string): Promise<Comment> {
      const text = commentBody.parse(body)
      const current = await load(actor.userId, id)
      if (!sameAuthor(actor, current.author)) {
        throw new ForbiddenError(
          `${actor.label} can only edit their own comments`,
          actor
        )
      }
      if (text === current.body) return toComment(current)
      return db.transaction(async (tx) => {
        await tx.insert(taskCommentRevision).values({
          commentId: current.id,
          body: current.body,
          replacedBy: actor,
        })
        const [row] = await tx
          .update(taskComment)
          .set({ body: text, editedAt: new Date() })
          .where(eq(taskComment.id, current.id))
          .returning()
        await recordEvents(tx, actor, current.taskId, [
          { type: "comment_edited", commentId: current.id },
        ])
        return toComment(row!)
      })
    },

    /** Earlier versions of a comment, oldest first. */
    async revisions(userId: string, id: string): Promise<CommentRevision[]> {
      const current = await load(userId, id)
      return db
        .select({
          body: taskCommentRevision.body,
          replacedAt: taskCommentRevision.replacedAt,
          replacedBy: taskCommentRevision.replacedBy,
        })
        .from(taskCommentRevision)
        .where(eq(taskCommentRevision.commentId, current.id))
        .orderBy(asc(taskCommentRevision.replacedAt))
    },

    /** User only (soft delete). */
    async softDelete(actor: Actor, id: string): Promise<void> {
      assertCanDelete(actor, "comments")
      const current = await load(actor.userId, id)
      await db.transaction(async (tx) => {
        await tx
          .update(taskComment)
          .set({ deletedAt: new Date(), deletedBy: actor })
          .where(eq(taskComment.id, current.id))
        await recordEvents(tx, actor, current.taskId, [
          { type: "comment_deleted", commentId: current.id },
        ])
      })
    },
  }
}
