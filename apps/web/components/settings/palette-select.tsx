"use client"

import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@workspace/ui/components/select"

import type { PaletteOption } from "@/lib/appearance"

function Swatches({ colors }: { colors: string[] }) {
  return (
    <span className="flex shrink-0 -space-x-1">
      {colors.map((color, i) => (
        <span
          key={i}
          className="size-3.5 rounded-full ring-2 ring-background"
          style={{ background: color }}
        />
      ))}
    </span>
  )
}

function OptionLabel({ option }: { option: PaletteOption }) {
  return (
    <span className="flex flex-1 items-center gap-2 text-left">
      <Swatches colors={option.colors} />
      {option.label}
    </span>
  )
}

/** A labelled select of shadcn palettes, each shown with its colours. */
export function PaletteSelect({
  id,
  label,
  description,
  options,
  value,
  onChange,
}: {
  id: string
  label: string
  description: string
  options: PaletteOption[]
  value: string
  onChange: (value: string) => void
}) {
  const selected = options.find((o) => o.value === value)
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        value={value}
        onValueChange={(next) => next && onChange(next)}
        items={options}
      >
        <SelectTrigger id={id} className="w-full sm:w-72">
          {selected && <OptionLabel option={selected} />}
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <OptionLabel option={option} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldDescription>{description}</FieldDescription>
    </Field>
  )
}
