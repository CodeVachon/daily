import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import Link from "next/link"

import { RsvpButtons } from "@/components/calendar/rsvp-buttons"
import type { InvitationView } from "@/lib/meeting"

/** Meetings waiting for an answer, each with Accept / Maybe / Decline. */
export function Invitations({ items }: { items: InvitationView[] }) {
  if (items.length === 0) return null
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-muted-foreground">
        Invitations ({items.length})
      </h2>
      {items.map((item) => (
        <Card key={item.key} size="sm">
          <CardHeader>
            <CardTitle className="text-sm">
              <Link href={item.href} className="hover:underline">
                {item.title}
              </Link>
            </CardTitle>
            <CardDescription>
              {[item.when, item.repeats].filter(Boolean).join(" · ")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RsvpButtons rsvp={item.rsvp} defaultScope={item.scope} />
          </CardContent>
        </Card>
      ))}
    </section>
  )
}
