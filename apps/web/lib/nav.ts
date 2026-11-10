import { KanbanSquareIcon, ListIcon, type LucideIcon } from "lucide-react"

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
}

/** Sidebar navigation. Add an entry when a page ships. */
export const NAV_ITEMS: NavItem[] = [
  { title: "Board", href: "/board", icon: KanbanSquareIcon },
  { title: "Tasks", href: "/tasks", icon: ListIcon },
]

/** Whether a nav item is the current page (or a page under it). */
export function isActive(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}
