import { describe, expect, it } from "vitest"

import { chipClass, COLOR_OPTIONS, dotClass } from "./colors"

describe("colors", () => {
  it("maps palette names to dot classes, with a neutral fallback", () => {
    expect(dotClass("blue")).toBe("bg-blue-500")
    expect(dotClass(null)).toBe("bg-muted-foreground/40")
    expect(dotClass("chartreuse")).toBe("bg-muted-foreground/40")
  })

  it("labels every palette colour", () => {
    expect(COLOR_OPTIONS[0]).toEqual({ value: "gray", label: "Gray" })
    expect(COLOR_OPTIONS).toHaveLength(15)
  })
})

describe("chipClass", () => {
  it("tints chips in the palette colour, light and dark", () => {
    expect(chipClass("green")).toBe(
      "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300"
    )
  })

  it("leaves uncoloured or unknown colours to the badge default", () => {
    expect(chipClass(null)).toBe("")
    expect(chipClass("chartreuse")).toBe("")
  })
})
