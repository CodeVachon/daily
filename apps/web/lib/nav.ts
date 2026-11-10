import {
  FolderIcon,
  KanbanSquareIcon,
  ListIcon,
  SettingsIcon,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
}

/** Sidebar navigation. Add an entry when a page ships. */
export const NAV_ITEMS: NavItem[] = [
  { title: "Board", href: "/board", icon: KanbanSquareIcon },
  { title: "Tasks", href: "/tasks", icon: ListIcon },
  { title: "Projects", href: "/projects", icon: FolderIcon },
  { title: "Settings", href: "/settings", icon: SettingsIcon },
]

/** Tabs on the settings pages. */
export const SETTINGS_SECTIONS = [
  { title: "Appearance", href: "/settings" },
  { title: "Labels", href: "/settings/labels" },
]

/** Whether a nav item is the current page (or a page under it). */
export function isActive(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}
