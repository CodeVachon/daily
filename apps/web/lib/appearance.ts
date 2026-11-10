import { ACCENT_COLORS, BASE_COLORS, type Appearance } from "@workspace/db/core"
import { swatch } from "@workspace/ui/lib/themes"

export interface PaletteOption {
  value: string
  label: string
  /** Colours to show beside the label. */
  colors: string[]
}

const title = (name: string) => name[0]!.toUpperCase() + name.slice(1)
const defined = (colors: (string | undefined)[]) =>
  colors.filter((c): c is string => Boolean(c))

/** Base colours (the neutrals). */
export function baseColorOptions(): PaletteOption[] {
  return BASE_COLORS.map((name) => ({
    value: name,
    label: title(name),
    colors: defined([swatch.base(name)]),
  }))
}

/** Themes: no accent (the base itself), then every accent colour. */
export function themeOptions(base: Appearance["baseColor"]): PaletteOption[] {
  return [base, ...ACCENT_COLORS].map((name) => ({
    value: name,
    label: name === base ? `${title(base)} (no accent)` : title(name),
    colors: defined([swatch.theme(name)]),
  }))
}

/** Chart palettes: the base's greys, then every accent colour. */
export function chartColorOptions(
  base: Appearance["baseColor"]
): PaletteOption[] {
  return [base, ...ACCENT_COLORS].map((name) => ({
    value: name,
    label: name === base ? `${title(base)} (greys)` : title(name),
    colors: swatch.chart(name),
  }))
}
