/**
 * Runtime theming from shadcn's palettes (see scripts/generate-theme-presets.ts).
 * A choice of base colour + theme + chart palette becomes CSS variables for
 * `:root` (light) and `.dark`, overriding the defaults in globals.css.
 */
import presets from "./theme-presets.json" with { type: "json" }

type Vars = Record<string, string>
interface Modes {
  light: Vars
  dark: Vars
}
type Table = Record<string, Modes>

const { baseColors, baseCharts, themes, chartColors } = presets as {
  baseColors: Table
  baseCharts: Table
  themes: Table
  chartColors: Table
}

export interface ThemeChoice {
  baseColor: string
  theme: string
  chartColor: string
}

/** Names available in the snapshot (for checks against the stored options). */
export const THEME_PRESET_NAMES = {
  baseColors: Object.keys(baseColors),
  accents: Object.keys(themes),
  charts: Object.keys(chartColors),
}

function chartsFor(choice: ThemeChoice): Modes {
  return chartColors[choice.chartColor] ?? baseCharts[choice.baseColor]!
}

/** Every colour variable for a choice; unknown names fall back to the base. */
export function themeVars(choice: ThemeChoice): Modes {
  const base = baseColors[choice.baseColor] ?? baseColors.mist!
  const accent = themes[choice.theme]
  const charts = chartsFor({
    ...choice,
    baseColor: baseColors[choice.baseColor] ? choice.baseColor : "mist",
  })
  const merge = (mode: keyof Modes) => ({
    ...base[mode],
    ...accent?.[mode],
    ...charts[mode],
  })
  return { light: merge("light"), dark: merge("dark") }
}

const block = (selector: string, vars: Vars) =>
  `${selector}{${Object.entries(vars)
    .map(([key, value]) => `--${key}:${value};`)
    .join("")}}`

/** A stylesheet applying a choice in light and dark mode. */
export function themeCss(choice: ThemeChoice): string {
  const { light, dark } = themeVars(choice)
  return `${block(":root", light)}\n${block(".dark", dark)}`
}

/** Representative light-mode colours, for swatches in pickers. */
export const swatch = {
  /** A mid-tone of the base colour's neutrals. */
  base: (name: string) => baseColors[name]?.light["muted-foreground"],
  /** The primary colour a theme gives (the base's own primary for "no accent"). */
  theme: (name: string) =>
    themes[name]?.light.primary ?? baseColors[name]?.light.primary,
  /** The five chart colours of a palette. */
  chart: (name: string) => {
    const vars = chartColors[name] ?? baseCharts[name]
    return vars ? [1, 2, 3, 4, 5].map((n) => vars.light[`chart-${n}`]!) : []
  },
}
