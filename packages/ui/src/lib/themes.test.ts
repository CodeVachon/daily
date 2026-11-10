import { describe, expect, it } from "vitest"

import { swatch, themeCss, themeVars, THEME_PRESET_NAMES } from "@workspace/ui/lib/themes"

describe("themeVars", () => {
  it("reproduces the shipped look (mist / sky / pink)", () => {
    const { light, dark } = themeVars({
      baseColor: "mist",
      theme: "sky",
      chartColor: "pink",
    })
    expect(light.foreground).toBe("oklch(0.148 0.004 228.8)")
    expect(light.primary).toBe("oklch(0.5 0.134 242.749)")
    expect(light["chart-1"]).toBe("oklch(0.823 0.12 346.018)")
    expect(dark["sidebar-primary"]).toBe("oklch(0.685 0.169 237.323)")
  })

  it("uses the base's own primary and charts when theme and chart are the base", () => {
    const plain = themeVars({
      baseColor: "stone",
      theme: "stone",
      chartColor: "stone",
    })
    const accented = themeVars({
      baseColor: "stone",
      theme: "violet",
      chartColor: "emerald",
    })
    expect(plain.light.background).toBe(accented.light.background)
    expect(plain.light.primary).not.toBe(accented.light.primary)
    expect(plain.light["chart-1"]).not.toBe(accented.light["chart-1"])
  })

  it("falls back to the default base for unknown names", () => {
    expect(
      themeVars({ baseColor: "plaid", theme: "plaid", chartColor: "plaid" })
        .light.foreground
    ).toBe("oklch(0.148 0.004 228.8)")
  })
})

describe("themeCss", () => {
  it("writes light vars on :root and dark vars on .dark", () => {
    const css = themeCss({
      baseColor: "zinc",
      theme: "zinc",
      chartColor: "blue",
    })
    expect(css).toMatch(/^:root\{--background:oklch\(1 0 0\);/)
    expect(css).toContain("\n.dark{--background:")
    expect(css).not.toContain("radius")
  })
})

describe("swatch", () => {
  it("gives a colour for every option", () => {
    for (const name of THEME_PRESET_NAMES.baseColors) {
      expect(swatch.base(name)).toMatch(/^oklch/)
      expect(swatch.theme(name)).toMatch(/^oklch/)
      expect(swatch.chart(name)).toHaveLength(5)
    }
    for (const name of THEME_PRESET_NAMES.accents) {
      expect(swatch.theme(name)).toMatch(/^oklch/)
      expect(swatch.chart(name)).toHaveLength(5)
    }
    expect(swatch.chart("plaid")).toEqual([])
  })
})
