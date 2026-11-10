import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
  agentActor,
} from "@workspace/db/core"
import { describe, expect, it, vi } from "vitest"
import { z } from "zod"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/session", () => ({
  requireSession: async () => ({ user: { id: "u1", name: "Chris" } }),
}))

const { describeActionError, runAsUser } = await import("./actions")

describe("describeActionError", () => {
  it("passes through messages users can act on", () => {
    expect(describeActionError(new NotFoundError("Task #9"))).toBe(
      "Task #9 not found"
    )
    expect(describeActionError(new ValidationError("Unknown status"))).toBe(
      "Unknown status"
    )
    expect(
      describeActionError(new ForbiddenError("nope", agentActor("u1", "c")))
    ).toBe("nope")
    expect(describeActionError(new RangeError("Unknown time zone"))).toBe(
      "Unknown time zone"
    )
    const zod = z
      .object({ title: z.string().min(1, "Title is required") })
      .safeParse({ title: "" })
    expect(describeActionError(zod.error)).toBe("Title is required")
  })

  it("returns null for bugs", () => {
    expect(describeActionError(new TypeError("x is undefined"))).toBeNull()
  })
})

describe("runAsUser", () => {
  it("runs the mutation as the signed-in user", async () => {
    const result = await runAsUser(async (actor) => actor)
    expect(result).toEqual({
      ok: true,
      data: { type: "user", userId: "u1", clientId: null, label: "Chris" },
    })
  })

  it("turns expected errors into results and rethrows bugs", async () => {
    await expect(
      runAsUser(async () => {
        throw new ValidationError("Bad input")
      })
    ).resolves.toEqual({ ok: false, error: "Bad input" })
    await expect(
      runAsUser(async () => {
        throw new TypeError("boom")
      })
    ).rejects.toThrow("boom")
  })
})
