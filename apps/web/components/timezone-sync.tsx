"use client"

import { useEffect } from "react"
import { toast } from "sonner"

import { reportTimezone } from "@/app/actions/timezone"
import { timezoneNotice } from "@/lib/timezone-notice"

/**
 * Reports the browser's time zone on load and whenever the tab regains
 * focus (laptop opened after a flight), and tells the user when it changed.
 */
export function TimezoneSync() {
  useEffect(() => {
    async function sync() {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const notice = timezoneNotice(await reportTimezone(zone))
      if (notice) toast.info(notice)
    }
    const onVisible = () => {
      if (document.visibilityState === "visible") void sync()
    }
    void sync()
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [])

  return null
}
