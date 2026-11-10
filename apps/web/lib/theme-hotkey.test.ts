import { describe, expect, it } from "vitest"

import { isThemeToggleKey, isTypingTarget } from "./theme-hotkey"

const key = (
  overrides: Partial<Parameters<typeof isThemeToggleKey>[0]> = {}
) => ({
  defaultPrevented: false,
  repeat: false,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  key: "d",
  target: null,
  ...overrides,
})

const el = (tagName: string, isContentEditable = false) =>
  ({ tagName, isContentEditable }) as unknown as EventTarget

describe("isTypingTarget", () => {
  it("is true for text fields and contenteditable", () => {
    expect(isTypingTarget(el("INPUT"))).toBe(true)
    expect(isTypingTarget(el("TEXTAREA"))).toBe(true)
    expect(isTypingTarget(el("SELECT"))).toBe(true)
    expect(isTypingTarget(el("DIV", true))).toBe(true)
  })

  it("is false for other elements and no target", () => {
    expect(isTypingTarget(el("BUTTON"))).toBe(false)
    expect(isTypingTarget(null)).toBe(false)
  })
})

describe("isThemeToggleKey", () => {
  it("fires on a plain d / D", () => {
    expect(isThemeToggleKey(key())).toBe(true)
    expect(isThemeToggleKey(key({ key: "D" }))).toBe(true)
  })

  it("ignores other keys, modifiers, repeats and handled events", () => {
    expect(isThemeToggleKey(key({ key: "x" }))).toBe(false)
    expect(isThemeToggleKey(key({ metaKey: true }))).toBe(false)
    expect(isThemeToggleKey(key({ ctrlKey: true }))).toBe(false)
    expect(isThemeToggleKey(key({ altKey: true }))).toBe(false)
    expect(isThemeToggleKey(key({ repeat: true }))).toBe(false)
    expect(isThemeToggleKey(key({ defaultPrevented: true }))).toBe(false)
  })

  it("ignores typing in text fields", () => {
    expect(isThemeToggleKey(key({ target: el("INPUT") }))).toBe(false)
  })
})
