import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { ENV } from "@/env"
import { describeBuild } from "@/lib/build-info"

export const metadata = { title: "About · Settings · Daily" }

function Row({
  label,
  value,
  href,
}: {
  label: string
  value: string
  href?: string
}) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono text-sm">
        {href ? (
          <a
            href={href}
            className="hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  )
}

export default function AboutPage() {
  const build = describeBuild({
    version: ENV.APP_VERSION,
    commit: ENV.APP_COMMIT,
  })
  return (
    <div className="max-w-xl p-4">
      <Card>
        <CardHeader>
          <CardTitle>Daily</CardTitle>
          <CardDescription>
            Personal task manager for you and your agents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="divide-y">
            <Row
              label="Version"
              value={build.version}
              href={build.releaseUrl}
            />
            {build.commit && (
              <Row label="Commit" value={build.commit} href={build.commitUrl} />
            )}
            <Row label="Environment" value={ENV.APP_ENV} />
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
