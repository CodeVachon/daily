"use client"

import type { MessageTemplate } from "@workspace/db/core"
import { Button } from "@workspace/ui/components/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { Textarea } from "@workspace/ui/components/textarea"
import { useState } from "react"
import { toast } from "sonner"

import {
  previewTemplateAction,
  updateTemplateAction,
} from "@/app/(app)/settings/actions"
import { useAction } from "@/components/task/use-action"

/** Edit a template, preview it with today's standup, save or restore it. */
export function TemplateEditor({ template }: { template: MessageTemplate }) {
  const { pending, run } = useAction()
  const [body, setBody] = useState(template.body)
  const [preview, setPreview] = useState("")

  async function showPreview() {
    const result = await previewTemplateAction(body)
    setPreview(result.ok ? result.data : `⚠ ${result.error}`)
  }

  async function save(next: string) {
    setBody(next)
    if (await run(() => updateTemplateAction(template.key, next)))
      toast.success(`${template.name} template saved`)
  }

  return (
    <Tabs
      defaultValue="edit"
      onValueChange={(tab) => tab === "preview" && showPreview()}
    >
      <div className="flex flex-wrap items-center gap-2">
        <TabsList>
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <div className="ml-auto flex gap-2">
          <Button
            variant="ghost"
            disabled={pending || body === template.defaultBody}
            onClick={() => save(template.defaultBody)}
          >
            Restore default
          </Button>
          <Button disabled={pending} onClick={() => save(body)}>
            Save
          </Button>
        </div>
      </div>
      <TabsContent value="edit">
        <Textarea
          aria-label={`${template.name} template`}
          className="min-h-96 font-mono text-sm"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </TabsContent>
      <TabsContent value="preview">
        <pre className="min-h-96 rounded-lg border bg-muted/40 p-3 text-sm whitespace-pre-wrap">
          {preview || "Rendering…"}
        </pre>
      </TabsContent>
    </Tabs>
  )
}
