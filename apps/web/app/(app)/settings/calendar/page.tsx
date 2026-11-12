import { services } from "@workspace/db"

import { WeekStartForm } from "@/components/settings/week-start-form"
import { requireSession } from "@/lib/session"

export const metadata = { title: "Calendar · Settings · Daily" }

export default async function CalendarSettingsPage() {
  const { user } = await requireSession()
  const weekStartsOn = await services.settings.getWeekStart(user.id)
  return (
    <div className="max-w-xl p-4">
      <WeekStartForm weekStartsOn={weekStartsOn} />
    </div>
  )
}
