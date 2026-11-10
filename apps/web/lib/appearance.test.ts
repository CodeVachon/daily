import { ACCENT_COLORS, BASE_COLORS } from "@workspace/db/core"
import { THEME_PRESET_NAMES } from "@workspace/ui/lib/themes"
import { describe, expect, it } from "vitest"

import { baseColorOptions, chartColorOptions, themeOptions } from "./appearance"

describe("theme presets", () => {
  it("cover exactly the options the settings accept", () => {
    expect([...THEME_PRESET_NAMES.baseColors].sort()).toEqual(
      [...BASE_COLORS].sort()
    )
    expect([...THEME_PRESET_NAMES.accents].sort()).toEqual(
      [...ACCENT_COLORS].sort()
    )
    expect([...THEME_PRESET_NAMES.charts].sort()).toEqual(
      [...ACCENT_COLORS].sort()
    )
  })
})

describe("options", () => {
  it("lists base colours with a swatch each", () => {
    const options = baseColorOptions()
    expect(options.map((o) => o.value)).toEqual([...BASE_COLORS])
    expect(options[0]).toMatchObject({ label: "Neutral" })
    expect(options.every((o) => o.colors.length === 1)).toBe(true)
  })

  it("offers the base as 'no accent' first, then accents", () => {
    const options = themeOptions("stone")
    expect(options[0]).toMatchObject({
      value: "stone",
      label: "Stone (no accent)",
    })
    expect(options.slice(1).map((o) => o.value)).toEqual([...ACCENT_COLORS])
  })

  it("shows five colours per chart palette", () => {
    const options = chartColorOptions("mist")
    expect(options[0]).toMatchObject({ value: "mist", label: "Mist (greys)" })
    expect(options.every((o) => o.colors.length === 5)).toBe(true)
  })
})
