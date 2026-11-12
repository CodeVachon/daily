import { formatDue } from "@workspace/db/time"

/**
 * Where the draft starts, in words: "Since your last standup (Wed, Nov 11,
 * 9:30 AM ET)" or "Since Wed, Nov 11, 12:00 AM ET (the previous working day)".
 */
export function sinceLabel(
  since: Date,
  lastPostedAt: Date | null,
  timezone: string
): string {
  const when = formatDue({ kind: "instant", at: since, timezone }, timezone)
  return lastPostedAt && +lastPostedAt === +since
    ? `Since your last standup (${when})`
    : `Since ${when}, the start of the previous working day`
}
