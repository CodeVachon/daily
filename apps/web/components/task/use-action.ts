"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import type { ActionResult } from "@/lib/actions"

/** Run a server action; show its error as a toast. Resolves to whether it succeeded. */
export function useAction() {
  const [pending, startTransition] = useTransition()
  const run = (action: () => Promise<ActionResult<unknown>>) =>
    new Promise<boolean>((resolve) =>
      startTransition(async () => {
        const result = await action()
        if (!result.ok) toast.error(result.error)
        resolve(result.ok)
      })
    )
  return { pending, run }
}
