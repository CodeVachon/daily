"use client"

import { Button } from "@workspace/ui/components/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { Textarea } from "@workspace/ui/components/textarea"
import { CheckIcon, CopyIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { recordStandupAction } from "@/app/(app)/standup/actions"
import { useAction } from "@/components/task/use-action"

type Format = "markdown" | "slack"

const FORMATS: { value: Format; label: string }[] = [
  { value: "markdown", label: "Markdown" },
  { value: "slack", label: "Slack" },
]

/**
 * The draft, editable, as Markdown or Slack text. Copy it, post it by hand,
 * then "Mark as posted" so the next draft starts from now.
 */
export function StandupEditor({ drafts }: { drafts: Record<Format, string> }) {
  const { pending, run } = useAction()
  const [format, setFormat] = useState<Format>("markdown")
  const [texts, setTexts] = useState(drafts)

  async function copy() {
    await navigator.clipboard.writeText(texts[format])
    toast.success("Copied")
  }

  async function markPosted() {
    if (await run(() => recordStandupAction(texts[format])))
      toast.success("Recorded. The next draft starts from now.")
  }

  return (
    <Tabs value={format} onValueChange={(value) => setFormat(value as Format)}>
      <div className="flex flex-wrap items-center gap-2">
        <TabsList>
          {FORMATS.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={copy}>
            <CopyIcon />
            Copy
          </Button>
          <Button onClick={markPosted} disabled={pending}>
            <CheckIcon />
            Mark as posted
          </Button>
        </div>
      </div>
      {FORMATS.map((f) => (
        <TabsContent key={f.value} value={f.value}>
          <Textarea
            aria-label={`Standup (${f.label})`}
            className="min-h-96 font-mono text-sm"
            value={texts[f.value]}
            onChange={(e) =>
              setTexts((t) => ({ ...t, [f.value]: e.target.value }))
            }
          />
        </TabsContent>
      ))}
    </Tabs>
  )
}
