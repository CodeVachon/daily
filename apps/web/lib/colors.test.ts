import { describe, expect, it } from "vitest"

import { COLOR_OPTIONS, dotClass } from "./colors"

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
