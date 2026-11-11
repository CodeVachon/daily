"use client"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { useRouter } from "next/navigation"

/**
 * A meeting's details over the calendar. Open/closed lives in the URL
 * (?event=…), so Back closes it, like the task drawer.
 */
export function MeetingSheet({
  title,
  when,
  closeHref,
  children,
}: {
  title: string
  when: string
  closeHref: string
  children: React.ReactNode
}) {
  const router = useRouter()
  return (
    <Sheet
      open
      onOpenChange={(open) =>
        !open && router.replace(closeHref, { scroll: false })
      }
    >
      <SheetContent className="w-full gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-lg">
        <SheetHeader className="border-b pr-12">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{when}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-5 p-4">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
