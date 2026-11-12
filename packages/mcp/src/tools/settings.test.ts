import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createMcpHarness, type McpHarness } from "../test-harness"

let h: McpHarness
beforeAll(async () => {
  h = await createMcpHarness()
})
afterAll(() => h.t.close())

async function call(name: string, args: object = {}) {
  const result = await h.callTool(name, args)
  if (result.isError) throw new Error(result.content[0].text)
  return result.structuredContent
}

describe("appearance", () => {
  it("reads the default look and the options", async () => {
    const { appearance, options } = await call("get_appearance")
    expect(appearance).toEqual({
      base_color: "mist",
      theme: "sky",
      chart_color: "pink",
    })
    expect(options.base_colors).toContain("stone")
    expect(options.accent_colors).toContain("violet")
  })

  it("updates part of the look", async () => {
    const { appearance } = await call("update_appearance", {
      base_color: "stone",
      theme: "stone",
    })
    expect(appearance).toEqual({
      base_color: "stone",
      theme: "stone",
      chart_color: "pink",
    })
    expect((await call("get_appearance")).appearance.theme).toBe("stone")
  })

  it("explains invalid combinations", async () => {
    const result = await h.callTool("update_appearance", { theme: "zinc" })
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toMatch(/base colour/)
  })
})

describe("week start", () => {
  it("starts on Sunday until changed", async () => {
    expect(await call("get_week_start")).toEqual({ week_starts_on: "Sunday" })
    expect(await call("set_week_start", { day: "monday" })).toEqual({
      week_starts_on: "Monday",
    })
    expect(await call("get_week_start")).toEqual({ week_starts_on: "Monday" })
  })

  it("rejects other days", async () => {
    const result = await h.callTool("set_week_start", { day: "friday" })
    expect(result.isError).toBe(true)
  })
})
