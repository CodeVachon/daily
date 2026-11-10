import { Geist_Mono, DM_Sans, Merriweather } from "next/font/google"

import "@workspace/ui/globals.css"
import { Toaster } from "@workspace/ui/components/sonner"

import { ThemeProvider } from "@/components/theme-provider"
import { TimezoneSync } from "@/components/timezone-sync"
import { cn } from "@workspace/ui/lib/utils"

const merriweatherHeading = Merriweather({
  subsets: ["latin"],
  variable: "--font-heading",
})

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        dmSans.variable,
        merriweatherHeading.variable
      )}
    >
      <body>
        <ThemeProvider>
          {children}
          <TimezoneSync />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
