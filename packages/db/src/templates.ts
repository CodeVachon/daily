// Logic-less message templates (motte #48): Mustache-style {{name}},
// {{#section}}…{{/section}} and {{^inverted}}…{{/inverted}}. No expressions,
// no helpers, so a template can't run code. Database-free.
import { ValidationError } from "./errors"

type Node =
  | { kind: "text"; text: string }
  | { kind: "var"; name: string }
  | { kind: "section"; name: string; inverted: boolean; children: Node[] }

/** A variable's value: text, a flag, or a list of items to repeat for. */
export type TemplateValue = string | boolean | TemplateContext[]
export interface TemplateContext {
  [name: string]: TemplateValue
}

/**
 * What a template may use: root variables, and for each list, the variables
 * its items have. `raw` variables are already formatted (mentions, links)
 * and aren't escaped.
 */
export interface TemplateSchema {
  root: string[]
  lists: Record<string, string[]>
  raw: string[]
}

const TAG = /\{\{\s*([#^/]?)\s*([a-z_]+)\s*\}\}/g
const ANY_TAG = /\{\{[^}]*\}\}/g
// A section tag alone on its line takes the line with it.
const STANDALONE = /^[ \t]*(\{\{\s*[#^/]\s*[a-z_]+\s*\}\})[ \t]*\r?\n/gm

interface Frame {
  name: string
  inverted: boolean
  children: Node[]
}

function checkTags(body: string) {
  const bad = (body.match(ANY_TAG) ?? []).find(
    (tag) => !new RegExp(TAG.source).test(tag)
  )
  if (bad)
    throw new ValidationError(
      `Can't read ${bad}: use {{name}}, {{#name}}…{{/name}} or {{^name}}…{{/name}} with lowercase names`
    )
}

function close(stack: Frame[], name: string) {
  const open = stack.pop()
  if (!open || open.name !== name || stack.length === 0)
    throw new ValidationError(`{{/${name}}} doesn't close an open section`)
  stack.at(-1)!.children.push({ kind: "section", ...open })
}

/** Parse a template; throws a ValidationError for unbalanced sections. */
function parseTemplate(body: string): Node[] {
  checkTags(body)
  const source = body.replace(STANDALONE, "$1")
  const stack: Frame[] = [{ name: "", inverted: false, children: [] }]
  let last = 0
  for (const match of source.matchAll(TAG)) {
    const [tag, sigil, name] = match as unknown as [string, string, string]
    const text = source.slice(last, match.index)
    if (text) stack.at(-1)!.children.push({ kind: "text", text })
    last = match.index + tag.length
    if (sigil === "/") close(stack, name)
    else if (sigil) stack.push({ name, inverted: sigil === "^", children: [] })
    else stack.at(-1)!.children.push({ kind: "var", name })
  }
  const rest = source.slice(last)
  if (rest) stack.at(-1)!.children.push({ kind: "text", text: rest })
  if (stack.length > 1)
    throw new ValidationError(`{{#${stack.at(-1)!.name}}} is never closed`)
  return stack[0]!.children
}

function itemVariables(schema: TemplateSchema): Map<string, string[]> {
  const owners = new Map<string, string[]>()
  for (const [list, names] of Object.entries(schema.lists))
    for (const name of names)
      owners.set(name, [...(owners.get(name) ?? []), list])
  return owners
}

function checkName(
  name: string,
  scope: Set<string>,
  schema: TemplateSchema
): void {
  if (scope.has(name)) return
  const lists = itemVariables(schema).get(name)
  if (lists)
    throw new ValidationError(
      `{{${name}}} only works inside ${lists.map((l) => `{{#${l}}}`).join(" or ")}`
    )
  const known = [...schema.root, ...Object.keys(schema.lists)]
  throw new ValidationError(
    `Unknown variable {{${name}}}. Use one of: ${known.join(", ")}`
  )
}

function checkNodes(nodes: Node[], scope: Set<string>, schema: TemplateSchema) {
  for (const node of nodes) {
    if (node.kind === "text") continue
    checkName(node.name, scope, schema)
    if (node.kind !== "section") continue
    const items = node.inverted ? undefined : schema.lists[node.name]
    const inner = items ? new Set([...scope, ...items]) : scope
    checkNodes(node.children, inner, schema)
  }
}

/** Parse and check a template against what it may use. */
export function validateTemplate(body: string, schema: TemplateSchema): Node[] {
  const nodes = parseTemplate(body)
  const root = new Set([...schema.root, ...Object.keys(schema.lists)])
  checkNodes(nodes, root, schema)
  return nodes
}

const truthy = (value: TemplateValue | undefined) =>
  Array.isArray(value) ? value.length > 0 : Boolean(value)

function renderSection(
  node: Extract<Node, { kind: "section" }>,
  scopes: TemplateContext[],
  escape: (name: string, text: string) => string
): string {
  const value = lookup(node.name, scopes)
  if (node.inverted)
    return truthy(value) ? "" : renderNodes(node.children, scopes, escape)
  if (!truthy(value)) return ""
  const items = Array.isArray(value) ? value : [scopes[0]!]
  return items
    .map((item) => renderNodes(node.children, [item, ...scopes], escape))
    .join("")
}

function lookup(name: string, scopes: TemplateContext[]) {
  return scopes.find((scope) => name in scope)?.[name]
}

function renderNodes(
  nodes: Node[],
  scopes: TemplateContext[],
  escape: (name: string, text: string) => string
): string {
  return nodes
    .map((node) => {
      if (node.kind === "text") return node.text
      if (node.kind === "section") return renderSection(node, scopes, escape)
      const value = lookup(node.name, scopes)
      return typeof value === "string" ? escape(node.name, value) : ""
    })
    .join("")
}

/** Slack treats &, < and > as control characters. */
export const slackEscape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

/**
 * Render a template for Slack. Text values are escaped, except the schema's
 * raw (already formatted) ones.
 */
export function renderTemplate(
  body: string,
  schema: TemplateSchema,
  context: TemplateContext
): string {
  const nodes = validateTemplate(body, schema)
  const raw = new Set(schema.raw)
  const escape = (name: string, text: string) =>
    raw.has(name) ? text : slackEscape(text)
  return renderNodes(nodes, [context], escape).trim()
}
