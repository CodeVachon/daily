import { SidebarTrigger } from "@workspace/ui/components/sidebar"

/** Top bar for app pages: sidebar toggle, title, and page actions on the right. */
export function PageHeader({
  title,
  children,
}: {
  title: string
  children?: React.ReactNode
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <h1 className="font-heading text-lg">{title}</h1>
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </header>
  )
}
