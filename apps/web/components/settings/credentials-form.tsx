"use client"

import type { ProviderInfo } from "@workspace/integrations"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { ExternalLinkIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { connectIntegrationAction } from "@/app/(app)/settings/integrations/actions"
import { useAction } from "@/components/task/use-action"

/** Enter (or replace) a provider's credentials; they're checked before saving. */
export function CredentialsForm({
  provider,
  initial = {},
  onDone,
}: {
  provider: ProviderInfo
  /** Non-secret values to start from (e.g. the Jira site). */
  initial?: Record<string, string>
  onDone?: () => void
}) {
  const { pending, run } = useAction()
  const [values, setValues] = useState(initial)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const ok = await run(() => connectIntegrationAction(provider.id, values))
    if (ok) {
      toast.success(`${provider.name} connected`)
      onDone?.()
    }
  }

  return (
    <form onSubmit={submit}>
      <FieldGroup>
        {provider.fields.map((field) => (
          <Field key={field.name}>
            <FieldLabel htmlFor={`${provider.id}-${field.name}`}>
              {field.label}
            </FieldLabel>
            <Input
              id={`${provider.id}-${field.name}`}
              type={field.type}
              placeholder={field.placeholder}
              autoComplete="off"
              required
              value={values[field.name] ?? ""}
              onChange={(e) =>
                setValues({ ...values, [field.name]: e.target.value })
              }
            />
            {field.description && (
              <FieldDescription>{field.description}</FieldDescription>
            )}
          </Field>
        ))}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Checking…" : "Connect"}
          </Button>
          {onDone && (
            <Button type="button" variant="ghost" onClick={onDone}>
              Cancel
            </Button>
          )}
          <Button
            variant="link"
            nativeButton={false}
            render={
              <a href={provider.help.url} target="_blank" rel="noreferrer" />
            }
          >
            {provider.help.text}
            <ExternalLinkIcon />
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
