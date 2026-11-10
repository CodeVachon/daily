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

/** Tinted chip classes per palette colour (light and dark), for project/label badges. */
const CHIP: Record<ColorName, string> = {
  gray: "border-gray-500/30 bg-gray-500/10 text-gray-700 dark:text-gray-300",
  red: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  orange:
    "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  amber:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  yellow:
    "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  lime: "border-lime-500/30 bg-lime-500/10 text-lime-700 dark:text-lime-300",
  green:
    "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300",
  teal: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300",
  cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  blue: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  indigo:
    "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  violet:
    "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  purple:
    "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300",
  pink: "border-pink-500/30 bg-pink-500/10 text-pink-700 dark:text-pink-300",
  rose: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
}

const isPalette = (color: string | null): color is ColorName =>
  !!color && color in DOT

/** Badge classes for a coloured chip; empty for "no colour" (keeps the badge's default look). */
export function chipClass(color: string | null): string {
  return isPalette(color) ? CHIP[color] : ""
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
