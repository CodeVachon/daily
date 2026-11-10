/** Up to two initials for an avatar fallback ("Octo Cat" → "OC"). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? [parts[0], parts.at(-1)] : parts
  return letters.map((part) => part!.charAt(0).toUpperCase()).join("") || "?"
}
