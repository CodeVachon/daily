import { SidebarInset, SidebarProvider } from "@workspace/ui/components/sidebar"

import { AppSidebar } from "@/components/app-sidebar"
import { requireSession } from "@/lib/session"

/** Everything behind sign-in: sidebar navigation around the page. */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = await requireSession()
  return (
    <SidebarProvider>
      <AppSidebar
        user={{ name: user.name, email: user.email, image: user.image }}
      />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  )
}
