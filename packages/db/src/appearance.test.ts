import { describe, expect, it } from "vitest"

import {
  applyAppearance,
  DEFAULT_APPEARANCE,
  toAppearance,
  type Appearance,
} from "./appearance"
import { ValidationError } from "./errors"

const mist: Appearance = {
  baseColor: "mist",
  theme: "mist",
  chartColor: "pink",
}

describe("applyAppearance", () => {
  it("returns the current look for an empty patch", () => {
    expect(applyAppearance(DEFAULT_APPEARANCE, {})).toEqual(DEFAULT_APPEARANCE)
  })

  it("moves base-coloured theme and chart along with the base", () => {
    expect(
      applyAppearance({ ...mist, chartColor: "mist" }, { baseColor: "zinc" })
    ).toEqual({ baseColor: "zinc", theme: "zinc", chartColor: "zinc" })
  })

  it("keeps accent colours when the base changes", () => {
    expect(applyAppearance(DEFAULT_APPEARANCE, { baseColor: "olive" })).toEqual(
      { baseColor: "olive", theme: "sky", chartColor: "pink" }
    )
  })

  it("accepts the new base as theme in the same patch", () => {
    expect(
      applyAppearance(DEFAULT_APPEARANCE, {
        baseColor: "taupe",
        theme: "taupe",
      })
    ).toMatchObject({ theme: "taupe" })
  })

  it("rejects another base colour as theme or chart", () => {
    expect(() => applyAppearance(mist, { chartColor: "stone" })).toThrow(
      ValidationError
    )
  })

  it("rejects unknown names", () => {
    expect(() =>
      applyAppearance(mist, { baseColor: "gray" as "mist" })
    ).toThrow(ValidationError)
  })
})

describe("toAppearance", () => {
  it("reads a valid row", () => {
    expect(toAppearance(mist)).toEqual(mist)
  })

  it("falls back to the defaults for a stale row", () => {
    expect(
      toAppearance({ baseColor: "gray", theme: "sky", chartColor: "pink" })
    ).toEqual(DEFAULT_APPEARANCE)
  })
})
