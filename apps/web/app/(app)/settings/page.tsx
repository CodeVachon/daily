import { services } from "@workspace/db"

import { AppearanceForm } from "@/components/settings/appearance-form"
import { ThemePreview } from "@/components/settings/theme-preview"
import { requireSession } from "@/lib/session"

export const metadata = { title: "Appearance · Settings · Daily" }

export default async function AppearancePage() {
  const { user } = await requireSession()
  const appearance = await services.settings.getAppearance(user.id)
  return (
    <div className="grid max-w-5xl gap-8 p-4 lg:grid-cols-[1fr_22rem]">
      <AppearanceForm appearance={appearance} />
      <ThemePreview />
    </div>
  )
}
