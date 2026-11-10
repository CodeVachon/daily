import { ACCENT_COLORS, BASE_COLORS, type Appearance } from "@workspace/db/core"
import { z } from "zod"

import { json, safely, type ToolModule } from "./types"

const appearanceOutput = z.object({
  base_color: z.string(),
  theme: z.string(),
  chart_color: z.string(),
})

const toOutput = (a: Appearance) => ({
  base_color: a.baseColor,
  theme: a.theme,
  chart_color: a.chartColor,
})

const palette = z
  .enum([...BASE_COLORS, ...ACCENT_COLORS])
  .describe(
    `An accent colour (${ACCENT_COLORS.join(", ")}), or the current base colour for none`
  )

/** The app's look: shadcn base colour, theme and chart palette. */
export const settingsTools: ToolModule = (server, ctx) => {
  const { settings } = ctx.services

  server.registerTool(
    "get_appearance",
    {
      title: "Get appearance",
      description:
        "The colours the user's app is drawn in (shadcn presets): base_color sets the neutrals, theme the primary/accent colour, chart_color the chart palette. A theme or chart_color equal to base_color means no accent. Also lists the allowed values.",
      inputSchema: z.object({}),
      outputSchema: z.object({
        appearance: appearanceOutput,
        options: z.object({
          base_colors: z.array(z.string()),
          accent_colors: z.array(z.string()),
        }),
      }),
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () =>
      json({
        appearance: toOutput(await settings.getAppearance(ctx.userId)),
        options: {
          base_colors: [...BASE_COLORS],
          accent_colors: [...ACCENT_COLORS],
        },
      })
  )

  server.registerTool(
    "update_appearance",
    {
      title: "Update appearance",
      description:
        "Change any of base_color, theme and chart_color; omitted ones stay. A theme/chart_color that was the base follows a new base. Setting theme or chart_color to a base colour other than the (new) base is an error. The user's app picks it up on its next page load.",
      inputSchema: z.object({
        base_color: z
          .enum(BASE_COLORS)
          .optional()
          .describe(`One of: ${BASE_COLORS.join(", ")}`),
        theme: palette.optional(),
        chart_color: palette.optional(),
      }),
      outputSchema: z.object({ appearance: appearanceOutput }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ base_color, theme, chart_color }) =>
      safely(async () =>
        json({
          appearance: toOutput(
            await settings.updateAppearance(ctx.userId, {
              baseColor: base_color,
              theme,
              chartColor: chart_color,
            })
          ),
        })
      )
  )
}
