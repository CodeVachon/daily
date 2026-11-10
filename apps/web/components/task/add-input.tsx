"use client"

import { Input } from "@workspace/ui/components/input"
import { useState } from "react"

/** A one-line "add …" field: Enter submits, clears on success. */
export function AddInput({
  placeholder,
  onAdd,
  disabled,
}: {
  placeholder: string
  onAdd: (text: string) => Promise<boolean>
  disabled?: boolean
}) {
  const [text, setText] = useState("")
  return (
    <Input
      placeholder={placeholder}
      aria-label={placeholder}
      value={text}
      disabled={disabled}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={async (e) => {
        if (e.key !== "Enter" || !text.trim()) return
        e.preventDefault()
        if (await onAdd(text.trim())) setText("")
      }}
    />
  )
}
