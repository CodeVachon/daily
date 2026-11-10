const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"])

interface MaybeElement {
  isContentEditable?: boolean
  tagName?: string
}

/** True when focus is in a text field, so single-key shortcuts must not fire. */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as MaybeElement | null
  return (
    !!el && (el.isContentEditable === true || TYPING_TAGS.has(el.tagName ?? ""))
  )
}

type HotkeyEvent = Pick<
  KeyboardEvent,
  | "defaultPrevented"
  | "repeat"
  | "metaKey"
  | "ctrlKey"
  | "altKey"
  | "key"
  | "target"
>

/** Whether a keydown should toggle the theme (plain `d`, outside text fields). */
export function isThemeToggleKey(event: HotkeyEvent): boolean {
  const modified = event.metaKey || event.ctrlKey || event.altKey
  const ignored = event.defaultPrevented || event.repeat || modified
  return (
    !ignored && event.key.toLowerCase() === "d" && !isTypingTarget(event.target)
  )
}
