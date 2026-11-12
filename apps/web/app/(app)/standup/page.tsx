import { services } from "@workspace/db"
import { formatDue } from "@workspace/db/time"

import { PageHeader } from "@/components/page-header"
import { StandupEditor } from "@/components/standup/standup-editor"
import { requireSession } from "@/lib/session"
import { sinceLabel } from "@/lib/standup"

export const metadata = { title: "Standup · Daily" }

/**
 * Today's standup, drafted from my tasks: done since the last one, in
 * progress, blocked and up next. Posting to Slack comes with #45.
 */
export default async function StandupPage() {
  const { user } = await requireSession()
  const [draft, history] = await Promise.all([
    services.standup.draft(user.id),
    services.standup.history(user.id, 5),
  ])
  const last = history[0]?.postedAt ?? null

  return (
    <>
      <PageHeader title="Standup" />
      <div className="flex max-w-3xl flex-col gap-4 p-4">
        <p className="text-sm text-muted-foreground">
          {sinceLabel(draft.since, last, draft.timezone)}
        </p>
        <StandupEditor
          // A new draft (after "Mark as posted") starts a fresh editor.
          key={draft.since.toISOString()}
          drafts={{ markdown: draft.markdown, slack: draft.slack }}
        />
        {history.length > 0 && (
          <section className="flex flex-col gap-1 text-sm">
            <h2 className="font-heading">Posted</h2>
            <ul className="text-muted-foreground">
              {history.map((post) => (
                <li key={post.id}>
                  {formatDue(
                    {
                      kind: "instant",
                      at: post.postedAt,
                      timezone: draft.timezone,
                    },
                    draft.timezone
                  )}{" "}
                  · {post.postedBy.label}
                  {post.channel && ` · ${post.channel}`}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  )
}
