import type { CalendarEvent, ResponseStatus } from "@workspace/db/core"
import { descriptionMarkdown } from "@workspace/integrations"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  CheckIcon,
  CircleHelpIcon,
  ClockIcon,
  ExternalLinkIcon,
  MapPinIcon,
  PaperclipIcon,
  PhoneIcon,
  VideoIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react"

import { Markdown } from "@/components/markdown"
import {
  meetingDetailsView,
  responseLabel,
  type MeetingDetailsView,
  type PersonView,
} from "@/lib/meeting"

import { RsvpButtons } from "./rsvp-buttons"

const RESPONSE_ICONS: Record<ResponseStatus, LucideIcon> = {
  accepted: CheckIcon,
  tentative: CircleHelpIcon,
  needsAction: ClockIcon,
  declined: XIcon,
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      {children}
    </section>
  )
}

function Person({ person }: { person: PersonView }) {
  const Icon = RESPONSE_ICONS[person.response]
  return (
    <li className="flex items-center gap-2 text-sm">
      <Icon
        className="size-3.5 shrink-0 text-muted-foreground"
        aria-label={responseLabel(person.response)}
      />
      <span className="truncate">{person.name}</span>
      {person.tags.map((tag) => (
        <Badge key={tag} variant="outline">
          {tag}
        </Badge>
      ))}
    </li>
  )
}

/** Answer buttons when invited; else (e.g. my own event) nothing. */
function Answer({ view }: { view: MeetingDetailsView }) {
  if (!view.rsvp) return null
  return <RsvpButtons rsvp={view.rsvp} />
}

function Join({ view }: { view: MeetingDetailsView }) {
  return (
    <div className="flex flex-col gap-2 empty:hidden">
      {view.join && (
        <Button
          className="self-start"
          nativeButton={false}
          render={<a href={view.join.url} target="_blank" rel="noreferrer" />}
        >
          <VideoIcon />
          {view.join.label}
        </Button>
      )}
      {view.phones.map((p) => (
        <a
          key={p.href}
          href={p.href}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <PhoneIcon className="size-3.5" />
          {p.label}
        </a>
      ))}
    </div>
  )
}

function Place({ text }: { text: string | null }) {
  if (!text) return null
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <MapPinIcon className="size-3.5 shrink-0" />
      {text}
    </p>
  )
}

function Guests({ view }: { view: MeetingDetailsView }) {
  if (view.people.length === 0) return <Place text={view.rooms} />
  return (
    <Section title={view.guestsTitle}>
      <ul className="flex flex-col gap-1">
        {view.people.map((p) => (
          <Person key={p.key} person={p} />
        ))}
      </ul>
      <Place text={view.rooms} />
    </Section>
  )
}

function Description({ text }: { text: string | null }) {
  if (!text) return null
  return (
    <Section title="Description">
      <Markdown className="break-words">{text}</Markdown>
    </Section>
  )
}

function Attachments({ files }: { files: MeetingDetailsView["attachments"] }) {
  if (files.length === 0) return null
  return (
    <Section title="Files">
      <ul className="flex flex-col gap-1">
        {files.map((a) => (
          <li key={a.url}>
            <a
              href={a.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm hover:underline"
            >
              <PaperclipIcon className="size-3.5 text-muted-foreground" />
              {a.title}
            </a>
          </li>
        ))}
      </ul>
    </Section>
  )
}

function OpenInGoogle({ url }: { url: string | null }) {
  if (!url) return null
  return (
    <Button
      variant="outline"
      size="sm"
      className="self-start"
      nativeButton={false}
      render={<a href={url} target="_blank" rel="noreferrer" />}
    >
      <ExternalLinkIcon />
      Open in Google Calendar
    </Button>
  )
}

/** Everything about one meeting: how to join, who's coming, the agenda. */
export function MeetingDetails({ event }: { event: CalendarEvent }) {
  const view = meetingDetailsView(event, descriptionMarkdown(event.description))
  return (
    <>
      <Answer view={view} />
      <Join view={view} />
      <Place text={view.location} />
      <Guests view={view} />
      <Description text={view.description} />
      <Attachments files={view.attachments} />
      <OpenInGoogle url={view.googleUrl} />
    </>
  )
}
