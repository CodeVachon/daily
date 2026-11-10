"use client"

import { buttonVariants } from "@workspace/ui/components/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { ExternalLinkIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

/**
 * Quick-edit a task without leaving the board or list. Open/closed state lives
 * in the URL (?task=12), so the drawer is shareable and Back closes it.
 */
export function TaskDrawer({
  number,
  title,
  meta,
  pageHref,
  closeHref,
  children,
}: {
  number: number
  title: string
  meta: string
  pageHref: string
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
      <SheetContent className="w-full gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
        <SheetHeader className="border-b pr-12">
          <div className="flex items-center gap-2">
            <SheetTitle className="min-w-0 flex-1 truncate">
              <span className="text-muted-foreground">#{number}</span> {title}
            </SheetTitle>
            <Link
              href={pageHref}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ExternalLinkIcon />
              Open full page
            </Link>
          </div>
          <SheetDescription>{meta}</SheetDescription>
        </SheetHeader>
        <div className="p-4">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
