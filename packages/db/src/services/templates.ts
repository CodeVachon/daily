import { and, eq } from "drizzle-orm"

import type { Actor } from "../actor"
import type { Database } from "../database"
import { NotFoundError, ValidationError } from "../errors"
import { messageTemplate } from "../schema"
import {
  isTemplateKey,
  TEMPLATE_KEYS,
  TEMPLATES,
  type TemplateKey,
} from "../standup-template"
import { validateTemplate } from "../templates"

export interface MessageTemplate {
  key: TemplateKey
  name: string
  description: string
  body: string
  /** True while I haven't changed it (the built-in default applies). */
  isDefault: boolean
  defaultBody: string
  variables: { name: string; description: string }[]
  updatedAt: Date | null
  updatedBy: Actor | null
}

const MAX_BODY = 10_000

function keyOf(key: string): TemplateKey {
  if (!isTemplateKey(key))
    throw new NotFoundError(
      `Template "${key}" (use: ${TEMPLATE_KEYS.join(", ")})`
    )
  return key
}

/**
 * Message templates I manage (motte #48). Agents may edit them but never
 * delete them; there's no delete, and "Restore default" is an edit.
 */
export function createTemplateService(db: Database) {
  async function get(userId: string, rawKey: string): Promise<MessageTemplate> {
    const key = keyOf(rawKey)
    const row = await db.query.messageTemplate.findFirst({
      where: and(
        eq(messageTemplate.userId, userId),
        eq(messageTemplate.key, key)
      ),
    })
    const { name, description, defaultBody, variables } = TEMPLATES[key]
    return {
      key,
      name,
      description,
      body: row?.body ?? defaultBody,
      isDefault: !row || row.body === defaultBody,
      defaultBody,
      variables,
      updatedAt: row?.updatedAt ?? null,
      updatedBy: row?.updatedBy ?? null,
    }
  }

  /** Check a body without saving it; throws a ValidationError. */
  function validate(rawKey: string, body: string): void {
    if (!body.trim()) throw new ValidationError("A template can't be empty")
    if (body.length > MAX_BODY)
      throw new ValidationError(`Keep templates under ${MAX_BODY} characters`)
    validateTemplate(body, TEMPLATES[keyOf(rawKey)].schema)
  }

  return {
    get,
    validate,

    async list(userId: string): Promise<MessageTemplate[]> {
      return Promise.all(TEMPLATE_KEYS.map((key) => get(userId, key)))
    },

    /** Save a template after checking it (unknown variables are errors). */
    async update(
      actor: Actor,
      rawKey: string,
      body: string
    ): Promise<MessageTemplate> {
      const key = keyOf(rawKey)
      validate(key, body)
      const values = { body, updatedAt: new Date(), updatedBy: actor }
      await db
        .insert(messageTemplate)
        .values({ userId: actor.userId, key, ...values })
        .onConflictDoUpdate({
          target: [messageTemplate.userId, messageTemplate.key],
          set: values,
        })
      return get(actor.userId, key)
    },
  }
}
