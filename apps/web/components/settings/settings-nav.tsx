"use client"

import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { SETTINGS_SECTIONS } from "@/lib/nav"

/** Tabs across the settings pages; each tab is a link. */
export function SettingsNav() {
  const pathname = usePathname()
  return (
    <Tabs value={pathname}>
      <TabsList variant="line">
        {SETTINGS_SECTIONS.map((section) => (
          <TabsTrigger
            key={section.href}
            value={section.href}
            nativeButton={false}
            render={<Link href={section.href} />}
          >
            {section.title}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
