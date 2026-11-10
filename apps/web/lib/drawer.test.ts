import { describe, expect, it } from "vitest"

import {
  closeDrawerHref,
  drawerHref,
  drawerTask,
  searchWithoutDrawer,
} from "./drawer"

describe("drawer links", () => {
  it("open a task while keeping filters", () => {
    const search = searchWithoutDrawer({
      priority: "urgent",
      q: "ssl",
      task: "3",
    })
    expect(search).toBe("priority=urgent&q=ssl")
    expect(drawerHref("/board", search, 12)).toBe(
      "/board?priority=urgent&q=ssl&task=12"
    )
    expect(drawerHref("/tasks", "", 4)).toBe("/tasks?task=4")
  })

  it("close back to the filtered view", () => {
    expect(closeDrawerHref("/board", "priority=urgent")).toBe(
      "/board?priority=urgent"
    )
    expect(closeDrawerHref("/board", "")).toBe("/board")
  })

  it("read the task number, ignoring junk", () => {
    expect(drawerTask({ task: "12" })).toBe("12")
    expect(drawerTask({ task: ["7", "8"] })).toBe("7")
    expect(drawerTask({ task: "abc" })).toBeNull()
    expect(drawerTask({})).toBeNull()
  })

  it("keep repeated params", () => {
    expect(searchWithoutDrawer({ tag: ["a", "b"], empty: undefined })).toBe(
      "tag=a&tag=b"
    )
  })
})
