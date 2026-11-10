"use client"

import { Button } from "@workspace/ui/components/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { Textarea } from "@workspace/ui/components/textarea"
import { useState } from "react"

import { Markdown } from "@/components/markdown"

function MarkdownOrHint({ text, hint }: { text: string; hint: string }) {
  return text ? (
    <Markdown>{text}</Markdown>
  ) : (
    <span className="text-sm text-muted-foreground">{hint}</span>
  )
}

function DescriptionForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: string
  onSave: (value: string) => Promise<boolean>
  onCancel: () => void
}) {
  const [draft, setDraft] = useState(initial)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const saved = await onSave(draft)
    setSaving(false)
    if (saved) onCancel()
  }

  return (
    <Tabs defaultValue="write" className="gap-2">
      <TabsList>
        <TabsTrigger value="write">Write</TabsTrigger>
        <TabsTrigger value="preview">Preview</TabsTrigger>
      </TabsList>
      <TabsContent value="write">
        <Textarea
          rows={10}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      </TabsContent>
      <TabsContent value="preview" className="min-h-40 rounded-lg border p-3">
        <MarkdownOrHint text={draft} hint="Nothing to preview" />
      </TabsContent>
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </Tabs>
  )
}

/** Markdown description: rendered, with Write/Preview editing on demand. */
export function DescriptionEditor({
  value,
  onSave,
}: {
  value: string
  onSave: (value: string) => Promise<boolean>
}) {
  const [editing, setEditing] = useState(false)
  if (editing)
    return (
      <DescriptionForm
        initial={value}
        onSave={onSave}
        onCancel={() => setEditing(false)}
      />
    )
  return (
    <button
      type="button"
      className="w-full rounded-lg p-2 text-left hover:bg-muted/50"
      onClick={() => setEditing(true)}
      aria-label="Edit description"
    >
      <MarkdownOrHint text={value} hint="Add a description…" />
    </button>
  )
}
