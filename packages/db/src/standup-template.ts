// The standup's Slack template (motte #48): what it can use, the default,
// and the values a draft gives it. Database-free.
import {
  dueNote,
  type StandupItem,
  type StandupSections,
  type StandupWindow,
} from "./standup"
import {
  slackEscape,
  type TemplateContext,
  type TemplateSchema,
} from "./templates"
import { calendarDateIn, formatDue } from "./time"

/** Templates the user manages, by key. */
export const TEMPLATE_KEYS = ["standup"] as const
export type TemplateKey = (typeof TEMPLATE_KEYS)[number]

export function isTemplateKey(value: string): value is TemplateKey {
  return (TEMPLATE_KEYS as readonly string[]).includes(value)
}

const LISTS = {
  done: "Done",
  in_progress: "In progress",
  blocked: "Blocked",
  up_next: "Up next",
} as const

const ITEM_VARIABLES = ["number", "title", "due", "links", "waiting_on"]

export const STANDUP_SCHEMA: TemplateSchema = {
  root: [
    "mention",
    "date",
    "since",
    "nothing_to_report",
    ...Object.keys(LISTS).map((list) => `has_${list}`),
  ],
  lists: Object.fromEntries(
    Object.keys(LISTS).map((list) => [list, ITEM_VARIABLES])
  ),
  raw: ["mention", "links"],
}

/** The variables, explained (the editor's reference, and MCP). */
const STANDUP_VARIABLES: { name: string; description: string }[] = [
  {
    name: "mention",
    description: "Your Slack @mention (set your Slack member ID)",
  },
  { name: "date", description: "Today, e.g. Thu, Nov 12" },
  { name: "since", description: "Where the standup starts" },
  ...Object.entries(LISTS).map(([list, title]) => ({
    name: `#${list}`,
    description: `Repeats for each task in ${title}`,
  })),
  {
    name: "#has_done",
    description:
      "Shows its contents when Done has tasks (for a heading); also has_in_progress, has_blocked, has_up_next",
  },
  {
    name: "#nothing_to_report",
    description: "Shows its contents when every section is empty",
  },
  { name: "number", description: "In a list: the task number" },
  { name: "title", description: "In a list: the task title" },
  {
    name: "due",
    description: 'In a list: "due today", "overdue (…)" or empty',
  },
  {
    name: "links",
    description: "In a list: GitHub/Jira links with their state",
  },
  { name: "waiting_on", description: "In a list: the open tasks it waits on" },
]

const section = (list: keyof typeof LISTS, extra: string) =>
  `{{#has_${list}}}

*${LISTS[list]}*
{{#${list}}}
• #{{number}} {{title}}${extra}{{#links}} · {{links}}{{/links}}
{{/${list}}}
{{/has_${list}}}
`

export const DEFAULT_STANDUP_TEMPLATE = `{{mention}} *Standup · {{date}}*
${section("done", "")}${section("in_progress", "")}${section(
  "blocked",
  "{{#waiting_on}} · waiting on {{waiting_on}}{{/waiting_on}}"
)}${section("up_next", "{{#due}} · {{due}}{{/due}}")}{{#nothing_to_report}}

Nothing to report.
{{/nothing_to_report}}
`

/** The template's details, for the editor and MCP. */
export const TEMPLATES: Record<
  TemplateKey,
  {
    name: string
    description: string
    defaultBody: string
    schema: TemplateSchema
    variables: { name: string; description: string }[]
  }
> = {
  standup: {
    name: "Standup",
    description: "The standup posted to Slack.",
    defaultBody: DEFAULT_STANDUP_TEMPLATE,
    schema: STANDUP_SCHEMA,
    variables: STANDUP_VARIABLES,
  },
}

/** A Slack mention other bots can parse: <@U123>. */
export const slackMention = (memberId: string | null) =>
  memberId ? `<@${memberId}>` : ""

function itemContext(item: StandupItem, w: StandupWindow): TemplateContext {
  return {
    number: String(item.number),
    title: item.title,
    due: dueNote(item, w) ?? "",
    links: item.links
      .map(
        (l) =>
          `<${l.url}|${slackEscape(l.key)}>` +
          (l.state ? ` ${slackEscape(l.state)}` : "")
      )
      .join(", "),
    waiting_on: item.blockedBy.map((b) => `#${b.number} ${b.title}`).join(", "),
  }
}

/** The values a standup template renders with. */
export function standupContext(
  sections: StandupSections,
  w: StandupWindow,
  slackMemberId: string | null
): TemplateContext {
  const lists = {
    done: sections.done,
    in_progress: sections.inProgress,
    blocked: sections.blocked,
    up_next: sections.upNext,
  }
  const context: TemplateContext = {
    mention: slackMention(slackMemberId),
    date: formatDue(
      { kind: "date", date: calendarDateIn(w.now, w.timezone) },
      w.timezone
    ),
    since: formatDue(
      { kind: "instant", at: w.since, timezone: w.timezone },
      w.timezone
    ),
    nothing_to_report: Object.values(lists).every((l) => l.length === 0),
  }
  for (const [key, items] of Object.entries(lists)) {
    context[key] = items.map((item) => itemContext(item, w))
    context[`has_${key}`] = items.length > 0
  }
  return context
}
