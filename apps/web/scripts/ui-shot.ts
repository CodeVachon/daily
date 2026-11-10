/**
 * Screenshot an app page as a throwaway signed-in user (dev only).
 *
 *   bun run ui:shot /board /tmp/board.png [--dark] [--width=1280] [--click=Label]
 *
 * Needs the dev server running. Creates a temporary user with a few sample
 * tasks, mints a session cookie for it (DB access + BETTER_AUTH_SECRET, like
 * mcp:smoke), screenshots the page in headless Chromium, then deletes the
 * user and everything it owns. Browser errors are printed.
 */
import { readdirSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

import { auth } from "@workspace/auth"
import { services, userActor } from "@workspace/db"
import { chromium, type Page } from "playwright"

const [path = "/board", out = "/tmp/daily.png", ...flags] =
  process.argv.slice(2)
const flag = (name: string) =>
  flags.find((f) => f.startsWith(`--${name}=`))?.slice(name.length + 3)
const dark = flags.includes("--dark")
const width = Number(flag("width") ?? 1280)
/** Accessible name of a button to click first (e.g. to open a dialog). */
const click = flag("click")

/** Newest cached Playwright headless shell, unless PLAYWRIGHT_CHROMIUM_PATH is set. */
function chromiumPath(): string | undefined {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH)
    return process.env.PLAYWRIGHT_CHROMIUM_PATH
  const cache = join(homedir(), "Library/Caches/ms-playwright")
  try {
    const shell = readdirSync(cache)
      .filter((d) => d.startsWith("chromium_headless_shell-"))
      .sort()
      .at(-1)
    return (
      shell &&
      join(
        cache,
        shell,
        "chrome-headless-shell-mac-arm64/chrome-headless-shell"
      )
    )
  } catch {
    return undefined
  }
}

async function seed(userId: string, name: string) {
  await services.settings.reportTimezone(userId, "America/Toronto")
  const me = userActor({ id: userId, name })
  const project = await services.projects.create(me, {
    name: "Appello",
    color: "blue",
  })
  const make = (title: string, extra: object = {}) =>
    services.tasks.create(me, { title, ...extra })
  await make("Draft Q4 roadmap", { status: "backlog", priority: "medium" })
  await make("Renew SSL certificate", {
    priority: "urgent",
    due: { kind: "date", date: "2026-11-12" },
  })
  await make("Invoice reconciliation", {
    projectId: project.id,
    priority: "high",
    status: "in_progress",
  })
  await make("Review onboarding PR", {
    status: "todo",
    due: {
      kind: "instant",
      at: new Date(Date.now() + 6 * 3600_000),
      timezone: "America/Toronto",
    },
  })
  await make("Wait on vendor reply", { status: "blocked" })
  await make("Ship release 1.4", { status: "done" })
}

async function sessionCookie(userId: string) {
  const ctx = await auth.$context
  const session = await ctx.internalAdapter.createSession(userId)
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(ctx.secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const sig = Buffer.from(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(session.token)
    )
  ).toString("base64")
  return {
    name: ctx.authCookies.sessionToken.name,
    value: encodeURIComponent(`${session.token}.${sig}`),
  }
}

async function clickButton(page: Page, name: string) {
  // Dev builds can report network idle before React has hydrated.
  await page.waitForTimeout(1500)
  await page.getByRole("button", { name }).first().click()
  await page
    .getByRole("dialog")
    .waitFor({ timeout: 3000 })
    .catch(() => page.waitForTimeout(500))
}

const ctx = await auth.$context
const base = new URL(ctx.baseURL).origin
const user = await ctx.internalAdapter.createUser(
  {
    name: "Screenshot User",
    email: `ui-shot-${Date.now()}@example.invalid`,
    emailVerified: true,
  },
  { method: "admin" }
)
try {
  await seed(user.id, user.name)
  const browser = await chromium.launch({ executablePath: chromiumPath() })
  const page = await browser.newPage({
    viewport: { width, height: 800 },
    colorScheme: dark ? "dark" : "light",
  })
  page.on("pageerror", (error) => console.error(`[pageerror] ${error.message}`))
  page.on("console", (msg) => {
    if (msg.type() === "error") console.error(`[console] ${msg.text()}`)
  })
  await page
    .context()
    .addCookies([
      {
        ...(await sessionCookie(user.id)),
        url: base,
        httpOnly: true,
        secure: base.startsWith("https"),
      },
    ])
  const response = await page.goto(new URL(path, base).href, {
    waitUntil: "networkidle",
  })
  if (click) await clickButton(page, click)
  await page.screenshot({ path: out, fullPage: true })
  console.log(`${response?.status()} ${page.url()} -> ${out}`)
  await browser.close()
} finally {
  await services.users.delete(user.id)
  process.exit(0)
}
