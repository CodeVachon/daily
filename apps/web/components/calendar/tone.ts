import type { MeetingTone } from "@/lib/meeting"

/** How a meeting looks, by my answer (personal blocks grey). */
export const TONE: Record<MeetingTone, string> = {
  accepted: "border-l-2 border-primary bg-primary/15 text-foreground",
  tentative: "border border-dashed border-primary bg-primary/5 text-foreground",
  pending:
    "border border-dashed border-muted-foreground/60 bg-background text-muted-foreground",
  block: "bg-muted text-muted-foreground",
}
