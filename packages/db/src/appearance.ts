/**
 * Appearance settings: the shadcn base colour, theme and chart palette the app
 * is drawn in. Names match shadcn's presets; @workspace/ui holds the colours.
 *
 * A base colour sets every neutral. The theme is either one of the accent
 * colours or the base colour itself (no accent); the chart palette likewise.
 */
import { z } from "zod"

import { ValidationError } from "./errors"

export const BASE_COLORS = [
  "neutral",
  "stone",
  "zinc",
  "mauve",
  "olive",
  "mist",
  "taupe",
] as const

export const ACCENT_COLORS = [
  "amber",
  "blue",
  "cyan",
  "emerald",
  "fuchsia",
  "green",
  "indigo",
  "lime",
  "orange",
  "pink",
  "purple",
  "red",
  "rose",
  "sky",
  "teal",
  "violet",
  "yellow",
] as const

export type BaseColor = (typeof BASE_COLORS)[number]
export type AccentColor = (typeof ACCENT_COLORS)[number]
/** An accent colour, or the base colour itself. */
export type Palette = BaseColor | AccentColor

export interface Appearance {
  baseColor: BaseColor
  theme: Palette
  chartColor: Palette
}

/** The look the app shipped with. */
export const DEFAULT_APPEARANCE: Appearance = {
  baseColor: "mist",
  theme: "sky",
  chartColor: "pink",
}

const palette = z.enum([...BASE_COLORS, ...ACCENT_COLORS])

export const appearancePatch = z
  .object({
    baseColor: z.enum(BASE_COLORS),
    theme: palette,
    chartColor: palette,
  })
  .partial()
export type AppearancePatch = z.input<typeof appearancePatch>

const isBase = (value: string): value is BaseColor =>
  (BASE_COLORS as readonly string[]).includes(value)

/**
 * Apply a patch. A theme or chart set to a base colour must be the (new) base;
 * one that followed the old base follows the new one.
 */
export function applyAppearance(
  current: Appearance,
  patch: AppearancePatch
): Appearance {
  const parsed = appearancePatch.safeParse(patch)
  if (!parsed.success)
    throw new ValidationError(parsed.error.issues[0]!.message)
  const { baseColor = current.baseColor } = parsed.data
  const follow = (value: Palette | undefined, was: Palette): Palette => {
    const next = value ?? (isBase(was) ? baseColor : was)
    if (isBase(next) && next !== baseColor)
      throw new ValidationError(
        `"${next}" is a base colour; use "${baseColor}" (the base) or an accent colour`
      )
    return next
  }
  return {
    baseColor,
    theme: follow(parsed.data.theme, current.theme),
    chartColor: follow(parsed.data.chartColor, current.chartColor),
  }
}

/** Read stored values, falling back to the defaults for anything unknown. */
export function toAppearance(row: {
  baseColor: string
  theme: string
  chartColor: string
}): Appearance {
  try {
    return applyAppearance(DEFAULT_APPEARANCE, {
      baseColor: row.baseColor as BaseColor,
      theme: row.theme as Palette,
      chartColor: row.chartColor as Palette,
    })
  } catch {
    return DEFAULT_APPEARANCE
  }
}
