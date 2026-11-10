import { PageHeader } from "@/components/page-header"
import { SettingsNav } from "@/components/settings/settings-nav"

/** Settings pages share a header and tabs between sections. */
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <PageHeader title="Settings" />
      <div className="border-b px-4 pt-2">
        <SettingsNav />
      </div>
      {children}
    </>
  )
}
