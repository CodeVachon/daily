import { COLORS } from "@workspace/db/core"

export type ColorName = (typeof COLORS)[number]

/** Dot colour classes for the preset palette (literal strings so Tailwind sees them). */
const DOT: Record<ColorName, string> = {
  gray: "bg-gray-400",
  red: "bg-red-500",
  orange: "bg-orange-500",
  amber: "bg-amber-500",
  yellow: "bg-yellow-400",
  lime: "bg-lime-500",
  green: "bg-green-500",
  teal: "bg-teal-500",
  cyan: "bg-cyan-500",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  violet: "bg-violet-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
  rose: "bg-rose-500",
}

export function dotClass(color: string | null): string {
  return color && color in DOT
    ? DOT[color as ColorName]
    : "bg-muted-foreground/40"
}

export const COLOR_OPTIONS = COLORS.map((value) => ({
  value,
  label: value[0]!.toUpperCase() + value.slice(1),
}))
