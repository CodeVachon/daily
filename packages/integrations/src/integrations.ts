import {
  assertCanDelete,
  INTEGRATION_PROVIDERS,
  ValidationError,
  type Actor,
  type IntegrationConnection,
  type LinkProvider,
  type RsvpResponse,
  type RsvpScope,
  type Services,
  type SyncResult,
  type TaskLink,
} from "@workspace/db/core"
import { z } from "zod"

import { github } from "./github"
import { answerInvitation, fetchCalendarChanges } from "./google-events"
import {
  exchangeGoogleCode,
  googleAuthorizeUrl,
  googleCredentials,
  googlePrimaryCalendar,
  isFresh,
  listGoogleCalendars,
  refreshGoogleToken,
  revokeGoogleToken,
  toCalendarResource,
  type GoogleConfig,
} from "./google"
import { ProviderError } from "./http"
import { jira } from "./jira"
import type { AvailableResource, Fetch, Provider, ProviderInfo } from "./types"

const PROVIDERS: Record<LinkProvider, Provider> = {
  github: github as Provider,
  jira: jira as Provider,
}

const providerId = z.enum(INTEGRATION_PROVIDERS, {
  error: `Unknown integration; one of: ${INTEGRATION_PROVIDERS.join(", ")}`,
})

/** The serializable part of a provider, for forms and tool output. */
function info({
  id,
  name,
  resourceNoun,
  fields,
  help,
}: Provider): ProviderInfo {
  return {
    id,
    name,
    resourceNoun,
    fields,
    help,
    auth: "credentials",
    configured: true,
  }
}

const googleInfo = (configured: boolean): ProviderInfo => ({
  id: "google",
  name: "Google Calendar",
  resourceNoun: { one: "calendar", many: "calendars" },
  fields: [],
  help: {
    text: "Set up the Google OAuth client",
    url: "https://console.cloud.google.com/auth/clients",
  },
  auth: "oauth",
  configured,
})

/** Strip what the picker adds; keep what's stored. */
const stored = ({ externalId, key, name, url }: AvailableResource) => ({
  externalId,
  key,
  name,
  url,
})

/**
 * Pick resources by external id or key (case-insensitive). Unknown ones are
 * an error naming them, so a typo never silently narrows the selection.
 */
export function pickResources(
  available: AvailableResource[],
  wanted: string[]
): AvailableResource[] {
  const find = (ref: string) =>
    available.find(
      (r) => r.externalId === ref || r.key.toLowerCase() === ref.toLowerCase()
    )
  const missing = wanted.filter((ref) => !find(ref))
  if (missing.length > 0)
    throw new ValidationError(
      `Not visible with these credentials: ${missing.join(", ")}`
    )
  return wanted.map((ref) => find(ref)!)
}

/** What one sync pass did. */
export interface SyncSummary {
  checked: number
  failed: number
}

/** What one calendar sync pass did. */
export interface CalendarSyncSummary {
  /** Selected calendars asked. */
  calendars: number
  /** Events added, changed or removed. */
  changed: number
  failed: number
}

export interface IntegrationsOptions {
  services: Pick<Services, "integrations" | "links" | "calendar">
  fetch?: Fetch
  /** The Google OAuth client; without it Google can't be connected. */
  google?: GoogleConfig | null
}

/**
 * Connecting to external systems: verify credentials, list what they can
 * see, and store the user's selection. Shared by the web app and MCP tools.
 * Data goes through `services.integrations`; providers through `fetch`.
 */
export function createIntegrations({
  services,
  fetch = globalThis.fetch,
  google = null,
}: IntegrationsOptions) {
  const store = services.integrations

  /** A provider connected with pasted credentials (not Google). */
  function provider(id: string): Provider {
    const parsed = providerId.parse(id)
    if (parsed === "google")
      throw new ValidationError(
        "Connect Google with the Connect button in Settings > Integrations"
      )
    return PROVIDERS[parsed]
  }

  function googleClient(): GoogleConfig {
    if (!google)
      throw new ValidationError(
        "Google isn't set up on this server (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)"
      )
    return google
  }

  /**
   * A working Google access token for the user, refreshed (and the new one
   * stored) when it's about to expire.
   */
  async function googleAccessToken(userId: string): Promise<string> {
    const creds = googleCredentials.parse(
      await store.credentials(userId, "google")
    )
    if (isFresh(creds)) return creds.accessToken
    const refreshed = await refreshGoogleToken(googleClient(), fetch, creds)
    await store.updateCredentials(userId, "google", refreshed)
    return refreshed.accessToken
  }

  async function available(
    userId: string,
    id: string
  ): Promise<AvailableResource[]> {
    if (providerId.parse(id) === "google")
      return listGoogleCalendars(fetch, await googleAccessToken(userId))
    const p = provider(id)
    const creds = p.credentials.parse(await store.credentials(userId, p.id))
    return p.listResources(creds, fetch)
  }

  /**
   * Ask the provider about one link. Never throws for the provider's sake:
   * no connection, out of scope and provider errors become `{ ok: false }`.
   */
  async function fetchState(
    userId: string,
    link: TaskLink
  ): Promise<SyncResult> {
    const p = PROVIDERS[link.provider]
    const connection = await store.get(userId, link.provider)
    if (!connection)
      return {
        ok: false,
        error: `Connect ${p.name} in Settings > Integrations to sync this`,
      }
    const scope = p.scopeOf(link)
    const inScope = connection.resources.some(
      (r) => r.key.toLowerCase() === scope.toLowerCase()
    )
    if (!inScope)
      return {
        ok: false,
        error: `${scope} isn't selected in Settings > Integrations`,
      }
    try {
      const creds = p.credentials.parse(
        await store.credentials(userId, link.provider)
      )
      return { ok: true, state: await p.fetchItem(creds, link, fetch) }
    } catch (error) {
      if (error instanceof ProviderError)
        return { ok: false, error: error.message }
      throw error
    }
  }

  /**
   * Fetch a link's current state now and record it (title, state; later
   * changes go in the task's history). Returns the updated link.
   */
  async function refreshLink(userId: string, linkId: string) {
    const link = await services.links.get(userId, linkId)
    await services.links.recordSync(
      userId,
      linkId,
      await fetchState(userId, link)
    )
    return services.links.get(userId, linkId)
  }

  return {
    refreshLink,

    /**
     * One sync pass: refresh every link that's due (all users). Each
     * provider's links go one at a time, to be gentle on rate limits;
     * providers run side by side.
     */
    async syncDue(
      options: { now?: Date; limit?: number } = {}
    ): Promise<SyncSummary> {
      const due = await services.links.dueForSync(options)
      const groups = new Map<string, typeof due>()
      for (const d of due)
        groups.set(d.provider, [...(groups.get(d.provider) ?? []), d])
      const failures = await Promise.all(
        [...groups.values()].map(async (links) => {
          let failed = 0
          for (const { userId, linkId } of links)
            if ((await refreshLink(userId, linkId)).syncError) failed++
          return failed
        })
      )
      return {
        checked: due.length,
        failed: failures.reduce((a, b) => a + b, 0),
      }
    },

    /** Every provider the user can connect, in display order. */
    providers: (): ProviderInfo[] =>
      INTEGRATION_PROVIDERS.map((id) =>
        id === "google" ? googleInfo(Boolean(google)) : info(PROVIDERS[id])
      ),

    googleAccessToken,

    /**
     * Answer an invitation (the user's call: there's no agent tool). Google
     * hears first and notifies the organizer; then Daily's copy is updated
     * so the page shows the answer at once. `series` answers every
     * occurrence of a recurring meeting.
     */
    async rsvp(
      userId: string,
      eventId: string,
      response: RsvpResponse,
      scope: RsvpScope = "event"
    ): Promise<number> {
      const event = await services.calendar.get(userId, eventId)
      const me = event.attendees.find((a) => a.self)
      if (!me?.email)
        throw new ValidationError("You aren't invited to this meeting")
      if (me.organizer)
        throw new ValidationError(
          "You organize this meeting; there's nothing to answer"
        )
      const series = scope === "series" ? event.recurringEventId : null
      await answerInvitation(fetch, await googleAccessToken(userId), {
        calendarId: event.calendarId,
        eventId: series ?? event.externalId,
        email: me.email,
        response,
      })
      return services.calendar.setMyResponse(userId, eventId, response, scope)
    },

    /**
     * One calendar sync pass (all users): drop calendars no longer selected,
     * then fetch each selected calendar's changes since its sync token. A
     * failing calendar records why and is retried next pass.
     */
    async syncCalendars(now = new Date()): Promise<CalendarSyncSummary> {
      const calendar = services.calendar
      const targets = await calendar.syncTargets()
      let changed = await calendar.retainOnly(targets)
      let failed = 0
      for (const { userId, calendarId, syncToken } of targets) {
        try {
          const batch = await fetchCalendarChanges(
            fetch,
            await googleAccessToken(userId),
            calendarId,
            syncToken,
            now
          )
          changed += await calendar.applySync(userId, calendarId, batch, now)
        } catch (error) {
          // Provider refusals, and Google not being set up on this server.
          if (!(error instanceof ValidationError)) throw error
          failed++
          await calendar.recordSyncError(userId, calendarId, error.message)
        }
      }
      return { calendars: targets.length, changed, failed }
    },

    /** Google's consent page, for the Connect button (PKCE challenge). */
    googleAuthorizeUrl: (params: { state: string; codeChallenge: string }) =>
      googleAuthorizeUrl(googleClient(), params),

    /**
     * Finish connecting Google with the code from its redirect. The primary
     * calendar is selected when nothing was selected before.
     */
    async connectGoogle(
      userId: string,
      code: string,
      codeVerifier: string
    ): Promise<IntegrationConnection> {
      const creds = await exchangeGoogleCode(googleClient(), fetch, {
        code,
        codeVerifier,
      })
      const primary = await googlePrimaryCalendar(fetch, creds.accessToken)
      const connection = await store.connect(userId, {
        provider: "google",
        account: primary.id,
        credentials: creds,
      })
      if (connection.resources.length > 0) return connection
      return store.setResources(userId, "google", [
        stored(toCalendarResource({ ...primary, primary: true })),
      ])
    },

    /**
     * Forget a connection's credentials (the user's call alone). Google is
     * also asked to drop Daily's access.
     */
    async disconnect(actor: Actor, id: string): Promise<void> {
      const parsed = providerId.parse(id)
      assertCanDelete(actor, `the ${parsed} connection`)
      if (parsed === "google") {
        const creds = googleCredentials.safeParse(
          await store.credentials(actor.userId, "google")
        )
        if (creds.success) await revokeGoogleToken(fetch, creds.data)
      }
      await store.disconnect(actor, parsed)
    },

    /** Check credentials with the provider, then store them encrypted. */
    async connect(
      userId: string,
      id: string,
      input: unknown
    ): Promise<IntegrationConnection> {
      const p = provider(id)
      const creds = p.credentials.parse(input)
      const verified = await p.verify(creds, fetch)
      return store.connect(userId, {
        provider: p.id,
        ...verified,
        credentials: creds,
      })
    },

    /** Repositories/projects the stored credentials can see. */
    available,

    /** Make exactly `refs` (external ids or keys) the selection. */
    async select(
      userId: string,
      id: string,
      refs: string[]
    ): Promise<IntegrationConnection> {
      const picked = pickResources(await available(userId, id), refs)
      return store.setResources(
        userId,
        providerId.parse(id),
        picked.map(stored)
      )
    },
  }
}

export type Integrations = ReturnType<typeof createIntegrations>
