"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@workspace/ui/components/sidebar"
import { CheckCheckIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import type { NextMeetingView } from "@/lib/meeting"
import { isActive, NAV_ITEMS } from "@/lib/nav"

import { NextMeeting } from "./next-meeting"
import { UserMenu, type MenuUser } from "./user-menu"

export function AppSidebar({
  user,
  counts = {},
  nextMeeting = null,
}: {
  user: MenuUser
  /** Badge numbers by nav href (e.g. unread updates). */
  counts?: Record<string, number>
  /** The meeting on now or next, for a line above the user menu. */
  nextMeeting?: NextMeetingView | null
}) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/board" />}>
              <CheckCheckIcon />
              <span className="font-heading text-base">Daily</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(item.href, pathname)}
                    tooltip={item.title}
                    render={<Link href={item.href} />}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                  {Boolean(counts[item.href]) && (
                    <SidebarMenuBadge
                      aria-label={`${counts[item.href]} unread`}
                    >
                      {counts[item.href]}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {nextMeeting && <NextMeeting meeting={nextMeeting} />}
          <SidebarMenuItem>
            <UserMenu user={user} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
