import type { MessageTemplate } from "@workspace/db/core"
import { z } from "zod"

import { json, safely, type ToolModule } from "./types"

const templateOutput = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string(),
  body: z.string().describe("Slack mrkdwn with {{variables}}"),
  is_default: z.boolean(),
  updated_at: z.string().nullable(),
  updated_by: z.string().nullable(),
  variables: z.array(z.object({ name: z.string(), description: z.string() })),
})

const toTemplate = (t: MessageTemplate) => ({
  key: t.key,
  name: t.name,
  description: t.description,
  body: t.body,
  is_default: t.isDefault,
  updated_at: t.updatedAt?.toISOString() ?? null,
  updated_by: t.updatedBy?.label ?? null,
  variables: t.variables,
})

const key = z.enum(["standup"]).default("standup").describe("Which template")

const memberOutput = z.object({ slack_member_id: z.string().nullable() })

/** Slack message templates and the @mention they use (motte #48). */
export const templateTools: ToolModule = (server, ctx) => {
  const { templates, standup, settings } = ctx.services

  server.registerTool(
    "list_templates",
    {
      title: "List message templates",
      description:
        "The Slack message templates the user manages (today: the standup), with their bodies and the variables each can use.",
      inputSchema: z.object({}),
      outputSchema: z.object({ templates: z.array(templateOutput) }),
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () =>
      json({
        templates: (await templates.list(ctx.userId)).map(toTemplate),
      })
  )

  server.registerTool(
    "get_template",
    {
      title: "Get message template",
      description:
        "One template's body, its variables and who last changed it. Templates are logic-less (Mustache-style): {{name}}, {{#list}}…{{/list}} repeats, {{#flag}}…{{/flag}} and {{^name}}…{{/name}} (when empty/false).",
      inputSchema: z.object({ key }),
      outputSchema: z.object({ template: templateOutput }),
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ key }) =>
      safely(async () =>
        json({ template: toTemplate(await templates.get(ctx.userId, key)) })
      )
  )

  server.registerTool(
    "preview_template",
    {
      title: "Preview message template",
      description:
        "Render a template body (or the saved one) with today's standup, without saving it. Use it to check an edit before update_template. Unknown variables are errors.",
      inputSchema: z.object({
        key,
        body: z.string().optional().describe("Default: the saved template"),
      }),
      outputSchema: z.object({ text: z.string() }),
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ key, body }) =>
      safely(async () => {
        const saved = (await templates.get(ctx.userId, key)).body
        return json({
          text: await standup.preview(ctx.userId, body ?? saved),
        })
      })
  )

  server.registerTool(
    "update_template",
    {
      title: "Update message template",
      description:
        "Replace a template's body (Slack mrkdwn with {{variables}}). It's checked first: unknown variables, list variables outside their list and unclosed sections are errors. Templates can be edited but not deleted; to restore the default, save its default body (get_template shows the variables).",
      inputSchema: z.object({
        key,
        body: z.string().min(1).describe("The new body"),
      }),
      outputSchema: z.object({ template: templateOutput }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ key, body }) =>
      safely(async () =>
        json({
          template: toTemplate(await templates.update(ctx.actor, key, body)),
        })
      )
  )

  server.registerTool(
    "get_slack_member_id",
    {
      title: "Get Slack member ID",
      description:
        "The user's Slack member ID (U…), which {{mention}} turns into a real @mention; null if unset.",
      inputSchema: z.object({}),
      outputSchema: memberOutput,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () =>
      json({ slack_member_id: await settings.getSlackMemberId(ctx.userId) })
  )

  server.registerTool(
    "set_slack_member_id",
    {
      title: "Set Slack member ID",
      description:
        "Set the user's Slack member ID (like U012AB3CD; in Slack: profile > ⋮ > Copy member ID), or clear it with an empty string. Only set it to an ID the user gave you.",
      inputSchema: z.object({ slack_member_id: z.string() }),
      outputSchema: memberOutput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ slack_member_id }) =>
      safely(async () =>
        json({
          slack_member_id: await settings.updateSlackMemberId(
            ctx.userId,
            slack_member_id
          ),
        })
      )
  )
}
