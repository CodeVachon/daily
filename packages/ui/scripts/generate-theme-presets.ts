/**
 * Snapshots shadcn's theme palettes (base colours, themes, chart colours) for
 * the base-maia style into src/lib/theme-presets.json, so the app can switch
 * them at runtime without a network call.
 *
 *   bun run --cwd packages/ui themes:generate
 *
 * Data comes from shadcn's own theme builder (the endpoint `shadcn create` and
 * `shadcn init --preset` use). A base colour sets every neutral; a coloured
 * theme overrides the primary/accent family on top of it; a chart palette sets
 * --chart-1..5. Grey-family themes and charts only exist for their own base.
 */
import { writeFileSync } from "node:fs"
import { join } from "node:path"

import {
  PRESET_BASE_COLORS,
  PRESET_CHART_COLORS,
  PRESET_THEMES,
} from "shadcn/preset"

type Vars = Record<string, string>
type Modes = { light: Vars; dark: Vars }

const MODES = ["light", "dark"] as const
const bases = [...PRESET_BASE_COLORS] as string[]
const accents = (PRESET_THEMES as readonly string[]).filter(
  (t) => !bases.includes(t)
)
const charts = (PRESET_CHART_COLORS as readonly string[]).filter(
  (c) => !bases.includes(c)
)

async function theme(base: string, accent: string, chart: string) {
  const params = new URLSearchParams({
    base: "base",
    style: "maia",
    baseColor: base,
    theme: accent,
    chartColor: chart,
    iconLibrary: "lucide",
    font: "dm-sans",
    rtl: "false",
    menuAccent: "bold",
    menuColor: "default",
    radius: "default",
    only: "theme",
  })
  const res = await fetch(`https://ui.shadcn.com/init?${params}`)
  const body = (await res.json()) as { cssVars?: Modes; error?: string }
  if (!body.cssVars)
    throw new Error(`${base}/${accent}/${chart}: ${body.error}`)
  const colours = (vars: Vars) =>
    Object.fromEntries(
      Object.entries(vars).filter(([, v]) => v.startsWith("oklch"))
    )
  return {
    light: colours(body.cssVars.light),
    dark: colours(body.cssVars.dark),
  }
}

function pick(
  modes: Modes,
  keep: (key: string, value: string, mode: (typeof MODES)[number]) => boolean
) {
  return Object.fromEntries(
    MODES.map((m) => [
      m,
      Object.fromEntries(
        Object.entries(modes[m]).filter(([k, v]) => keep(k, v, m))
      ),
    ])
  ) as Modes
}

const isChart = (key: string) => key.startsWith("chart-")

const baseColors: Record<string, Modes> = {}
const baseCharts: Record<string, Modes> = {}
for (const base of [...bases]) {
  // The preset list can name a base the builder no longer serves (e.g. gray).
  const vars = await theme(base, base, base).catch((error: Error) => {
    console.warn(`skipping base ${base}: ${error.message}`)
    bases.splice(bases.indexOf(base), 1)
  })
  if (!vars) continue
  baseColors[base] = pick(vars, (k) => !isChart(k))
  baseCharts[base] = pick(vars, isChart)
}

// A theme's overrides are the keys it sets to the same value on two different
// bases, where that value differs from at least one of the bases' own.
const [a, b] = ["neutral", "mist"]
const plainA = await theme(a, a, a)
const plainB = await theme(b, b, b)
const themes: Record<string, Modes> = {}
for (const accent of accents) {
  const onA = await theme(a, accent, a)
  const onB = await theme(b, accent, b)
  themes[accent] = pick(
    onA,
    (k, v, m) =>
      !isChart(k) &&
      onB[m][k] === v &&
      (plainA[m][k] !== v || plainB[m][k] !== v)
  )
}

const chartColors: Record<string, Modes> = {}
for (const chart of charts) {
  chartColors[chart] = pick(await theme("neutral", "neutral", chart), isChart)
}

const out = join(import.meta.dirname, "../src/lib/theme-presets.json")
writeFileSync(
  out,
  JSON.stringify({ baseColors, baseCharts, themes, chartColors }, null, 2) +
    "\n"
)
console.log(
  `${bases.length} base colours, ${accents.length} themes, ${charts.length} chart palettes -> ${out}`
)
