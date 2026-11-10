"use client"

import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"

const MODES = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
]

const subscribe = () => () => {}

/** Light, dark or follow the system (kept in this browser). */
export function ModeToggle() {
  const { theme, setTheme } = useTheme()
  // The stored mode is only known in the browser; render it after hydration.
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
  return (
    <Field>
      <FieldLabel>Mode</FieldLabel>
      <ToggleGroup
        variant="outline"
        value={mounted && theme ? [theme] : []}
        onValueChange={(value) => value[0] && setTheme(value[0])}
      >
        {MODES.map(({ value, label, icon: Icon }) => (
          <ToggleGroupItem key={value} value={value} aria-label={label}>
            <Icon />
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <FieldDescription>
        Saved in this browser. Press D anywhere to switch quickly.
      </FieldDescription>
    </Field>
  )
}
