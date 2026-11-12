"use client"

import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { useState } from "react"
import { toast } from "sonner"

import { updateSlackMemberIdAction } from "@/app/(app)/settings/actions"
import { useAction } from "@/components/task/use-action"

/** My Slack member ID, which {{mention}} turns into a real @mention. */
export function SlackMemberForm({ memberId }: { memberId: string | null }) {
  const { pending, run } = useAction()
  const [value, setValue] = useState(memberId ?? "")

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (await run(() => updateSlackMemberIdAction(value)))
      toast.success(value ? "Slack member ID saved" : "Slack member ID cleared")
  }

  return (
    <form onSubmit={submit}>
      <Field>
        <FieldLabel htmlFor="slack-member-id">Your Slack member ID</FieldLabel>
        <div className="flex gap-2">
          <Input
            id="slack-member-id"
            className="sm:w-72"
            placeholder="U012AB3CD"
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <Button type="submit" variant="outline" disabled={pending}>
            Save
          </Button>
        </div>
        <FieldDescription>
          {"{{mention}}"} becomes a real @mention, so other bots in the channel
          know a post is about you. In Slack: your profile, then ⋮, then Copy
          member ID.
        </FieldDescription>
      </Field>
    </form>
  )
}
