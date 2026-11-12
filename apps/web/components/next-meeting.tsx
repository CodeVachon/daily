"use client"

import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar"
import { CalendarClockIcon, VideoIcon } from "lucide-react"
import Link from "next/link"

import type { NextMeetingView } from "@/lib/meeting"

/** "2:30 PM Standup" in the sidebar, with Join when it has a Meet link. */
export function NextMeeting({ meeting }: { meeting: NextMeetingView }) {
  const label = `${meeting.when} ${meeting.title}`
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={`Next: ${label}`}
        render={<Link href={meeting.href} />}
      >
        <CalendarClockIcon />
        <span className="truncate">
          <span className="text-muted-foreground">{meeting.when}</span>{" "}
          {meeting.title}
        </span>
      </SidebarMenuButton>
      {meeting.meetUrl && (
        <SidebarMenuAction
          aria-label={`Join ${meeting.title}`}
          title="Join"
          render={<a href={meeting.meetUrl} target="_blank" rel="noreferrer" />}
        >
          <VideoIcon />
        </SidebarMenuAction>
      )}
    </SidebarMenuItem>
  )
}
