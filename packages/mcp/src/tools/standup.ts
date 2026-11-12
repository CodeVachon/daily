import type { StandupDraft, StandupPost } from "@workspace/db/core"
import { z } from "zod"

import { json, safely, type ToolModule } from "./types"

const item = z.object({
  number: z.number(),
  title: z.string(),
  due: z.string().nullable().describe("YYYY-MM-DD or an ISO 8601 instant"),
  links: z.array(
    z.object({ key: z.string(), url: z.string(), state: z.string().nullable() })
  ),
  blocked_by: z
    .array(z.object({ number: z.number(), title: z.string() }))
    .describe("Open tasks it waits on"),
})

const postOutput = z.object({
  id: z.string(),
  posted_at: z.string(),
  channel: z.string().nullable(),
  body: z.string(),
  posted_by: z.string(),
})

type Item = StandupDraft["sections"]["done"][number]

const toItem = (i: Item) => ({
  number: i.number,
  title: i.title,
  due: !i.due
    ? null
    : i.due.kind === "date"
      ? i.due.date
      : i.due.at.toISOString(),
  links: i.links,
  blocked_by: i.blockedBy,
})

const toPost = (p: StandupPost) => ({
  id: p.id,
  posted_at: p.postedAt.toISOString(),
  channel: p.channel,
  body: p.body,
  posted_by: p.postedBy.label,
})

/** The standup draft, and the standups the user has posted (motte #44). */
export const standupTools: ToolModule = (server, ctx) => {
  const { standup } = ctx.services

  server.registerTool(
    "draft_standup",
    {
      title: "Draft standup",
      description:
        "Draft the user's standup from their tasks: Done (finished since the last standup), In progress, Blocked (with what each waits on) and Up next (not started, due by the end of the next working day, or overdue), each with its GitHub/Jira links. Meeting tasks are left out. Starts from the last recorded standup, or the start of the previous working day. Returns the text (Markdown or Slack mrkdwn) and the sections, so you can refine the wording. Drafting posts nothing.",
      inputSchema: z.object({
        since: z.iso
          .datetime({ offset: true })
          .optional()
          .describe(
            "Start of the window (ISO 8601); default: the last standup"
          ),
        format: z
          .enum(["markdown", "slack"])
          .default("markdown")
          .describe("Text format"),
      }),
      outputSchema: z.object({
        since: z.string(),
        until: z.string(),
        text: z.string(),
        sections: z.object({
          done: z.array(item),
          in_progress: z.array(item),
          blocked: z.array(item),
          up_next: z.array(item),
        }),
      }),
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ since, format }) =>
      safely(async () => {
        const draft = await standup.draft(ctx.userId, {
          since: since ? new Date(since) : undefined,
        })
        const { done, inProgress, blocked, upNext } = draft.sections
        return json({
          since: draft.since.toISOString(),
          until: draft.until.toISOString(),
          text: format === "slack" ? draft.slack : draft.markdown,
          sections: {
            done: done.map(toItem),
            in_progress: inProgress.map(toItem),
            blocked: blocked.map(toItem),
            up_next: upNext.map(toItem),
          },
        })
      })
  )

  server.registerTool(
    "record_standup",
    {
      title: "Record standup",
      description:
        "Record that the user has posted a standup (for example, pasted into Slack by hand), so the next draft starts from now. It doesn't post anything anywhere. Only call it when the user says they posted it.",
      inputSchema: z.object({
        body: z.string().min(1).describe("The standup as posted"),
        channel: z
          .string()
          .optional()
          .describe("Where it was posted, e.g. #team"),
      }),
      outputSchema: z.object({ standup: postOutput }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ body, channel }) =>
      safely(async () =>
        json({
          standup: toPost(await standup.record(ctx.actor, { body, channel })),
        })
      )
  )

  server.registerTool(
    "list_standups",
    {
      title: "List standups",
      description:
        "The standups the user has posted, newest first, with who recorded each.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(100).default(10),
      }),
      outputSchema: z.object({ standups: z.array(postOutput) }),
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ limit }) =>
      json({
        standups: (await standup.history(ctx.userId, limit)).map(toPost),
      })
  )
}
