import { services } from "@workspace/db"

import { SlackMemberForm } from "@/components/settings/slack-member-form"
import { TemplateEditor } from "@/components/settings/template-editor"
import { requireSession } from "@/lib/session"

export const metadata = { title: "Templates · Settings · Daily" }

/** The Slack messages I manage, and the @mention they use (motte #48). */
export default async function TemplatesSettingsPage() {
  const { user } = await requireSession()
  const [templates, memberId] = await Promise.all([
    services.templates.list(user.id),
    services.settings.getSlackMemberId(user.id),
  ])
  return (
    <div className="flex max-w-5xl flex-col gap-6 p-4">
      <SlackMemberForm memberId={memberId} />
      {templates.map((template) => (
        <section
          key={template.key}
          className="grid gap-4 lg:grid-cols-[1fr_16rem]"
        >
          <div className="flex flex-col gap-2">
            <h2 className="font-heading">{template.name}</h2>
            <p className="text-sm text-muted-foreground">
              {template.description} Slack formatting (*bold*, _italic_) with{" "}
              {"{{variables}}"}.
            </p>
            <TemplateEditor
              key={template.updatedAt?.toISOString() ?? "default"}
              template={template}
            />
          </div>
          <aside className="flex flex-col gap-2 text-sm">
            <h3 className="font-heading">Variables</h3>
            <dl className="flex flex-col gap-2">
              {template.variables.map((v) => (
                <div key={v.name}>
                  <dt className="font-mono text-xs">{`{{${v.name}}}`}</dt>
                  <dd className="text-muted-foreground">{v.description}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </section>
      ))}
    </div>
  )
}
