"use client"

import {
  applyAppearance,
  type Appearance,
  type AppearancePatch,
} from "@workspace/db/core"
import { FieldGroup } from "@workspace/ui/components/field"
import { useState } from "react"

import { updateAppearanceAction } from "@/app/(app)/settings/actions"
import { useAction } from "@/components/task/use-action"
import {
  baseColorOptions,
  chartColorOptions,
  themeOptions,
} from "@/lib/appearance"

import { ModeToggle } from "./mode-toggle"
import { PaletteSelect } from "./palette-select"

/** Pick the base colour, theme and chart palette; saves on every change. */
export function AppearanceForm({ appearance }: { appearance: Appearance }) {
  const { run } = useAction()
  const [value, setValue] = useState(appearance)

  async function change(patch: AppearancePatch) {
    const previous = value
    setValue(applyAppearance(value, patch))
    if (!(await run(() => updateAppearanceAction(patch)))) setValue(previous)
  }

  return (
    <FieldGroup>
      <ModeToggle />
      <PaletteSelect
        id="base-color"
        label="Base colour"
        description="The greys behind everything: backgrounds, borders and text."
        options={baseColorOptions()}
        value={value.baseColor}
        onChange={(baseColor) =>
          change({ baseColor: baseColor as Appearance["baseColor"] })
        }
      />
      {/* Remount on a new base: its options change, and a live select reports a stale value. */}
      <PaletteSelect
        key={`theme-${value.baseColor}`}
        id="theme"
        label="Theme"
        description="The accent for buttons, links, focus and the active page."
        options={themeOptions(value.baseColor)}
        value={value.theme}
        onChange={(theme) => change({ theme: theme as Appearance["theme"] })}
      />
      <PaletteSelect
        key={`chart-${value.baseColor}`}
        id="chart-color"
        label="Chart colours"
        description="The five colours used for charts."
        options={chartColorOptions(value.baseColor)}
        value={value.chartColor}
        onChange={(chartColor) =>
          change({ chartColor: chartColor as Appearance["chartColor"] })
        }
      />
    </FieldGroup>
  )
}
