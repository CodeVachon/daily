import { services } from "@workspace/db"
import { SidebarInset, SidebarProvider } from "@workspace/ui/components/sidebar"
import { themeCss } from "@workspace/ui/lib/themes"

import { AppSidebar } from "@/components/app-sidebar"
import { LiveUpdates } from "@/components/live-updates"
import { nextMeetingView } from "@/lib/meeting"
import { requireSession } from "@/lib/session"

/** Everything behind sign-in: sidebar navigation around the page. */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = await requireSession()
  const now = new Date()
  const [appearance, unread, invitations, next, timezone] = await Promise.all([
    services.settings.getAppearance(user.id),
    services.inbox.count(user.id),
    services.calendar.invitations(user.id, now),
    services.calendar.next(user.id, now),
    services.settings.getTimezone(user.id),
  ])
  return (
    <SidebarProvider>
      {/* The user's colours; comes after globals.css so it overrides the defaults. */}
      <style
        id="appearance"
        dangerouslySetInnerHTML={{ __html: themeCss(appearance) }}
      />
      <AppSidebar
        user={{ name: user.name, email: user.email, image: user.image }}
        counts={{ "/updates": unread + invitations.length }}
        nextMeeting={next && nextMeetingView(next, now, timezone)}
      />
      {/* min-w-0: let the page shrink to the window so only wide content (the board) scrolls. */}
      <SidebarInset className="min-w-0">{children}</SidebarInset>
      <LiveUpdates />
    </SidebarProvider>
  )
}
