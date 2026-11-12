import { describe, expect, it } from "vitest"

import { ValidationError } from "./errors"
import {
  renderTemplate,
  slackEscape,
  validateTemplate,
  type TemplateSchema,
} from "./templates"

const schema: TemplateSchema = {
  root: ["mention", "date", "has_items"],
  lists: { items: ["title", "links"], others: ["title"] },
  raw: ["mention", "links"],
}

const render = (body: string, context = {}) =>
  renderTemplate(body, schema, {
    mention: "<@U1>",
    date: "Thu",
    has_items: true,
    items: [
      { title: "A & <b>", links: "<https://x|x>" },
      { title: "B", links: "" },
    ],
    others: [],
    ...context,
  })

describe("renderTemplate", () => {
  it("fills variables, escaping all but raw ones", () => {
    expect(render("{{mention}} hi on {{ date }}")).toBe("<@U1> hi on Thu")
    expect(render("{{#items}}{{title}} {{links}};{{/items}}")).toBe(
      "A &amp; &lt;b&gt; <https://x|x>;B ;"
    )
  })

  it("repeats lists, shows flags and text once, and inverts", () => {
    expect(render("{{#has_items}}Yes{{/has_items}}")).toBe("Yes")
    expect(
      render("{{#has_items}}Yes{{/has_items}}", { has_items: false })
    ).toBe("")
    expect(render("{{#items}}{{#links}}[{{links}}]{{/links}}{{/items}}")).toBe(
      "[<https://x|x>]"
    )
    expect(render("{{#others}}x{{/others}}{{^others}}none{{/others}}")).toBe(
      "none"
    )
    // Item sections can still see root variables.
    expect(render("{{#items}}{{date}}{{/items}}")).toBe("ThuThu")
  })

  it("drops lines that hold only a section tag", () => {
    expect(render("Start\n{{#items}}\n- {{title}}\n{{/items}}\nEnd\n")).toBe(
      "Start\n- A &amp; &lt;b&gt;\n- B\nEnd"
    )
  })
})

describe("validateTemplate", () => {
  it.each([
    ["{{nope}}", "Unknown variable {{nope}}"],
    ["{{title}}", "{{title}} only works inside {{#items}} or {{#others}}"],
    ["{{^items}}{{title}}{{/items}}", "{{title}} only works inside"],
    ["{{#items}}", "{{#items}} is never closed"],
    ["{{/items}}", "{{/items}} doesn't close an open section"],
    ["{{#items}}{{/others}}", "{{/others}} doesn't close"],
    ["{{Date}}", "Can't read {{Date}}"],
    ["{{> partial}}", "Can't read {{> partial}}"],
  ])("rejects %s", (body, message) => {
    expect(() => validateTemplate(body, schema)).toThrow(ValidationError)
    expect(() => validateTemplate(body, schema)).toThrow(message)
  })

  it("accepts a good template", () => {
    expect(() =>
      validateTemplate("{{#items}}{{title}}{{/items}} {{mention}}", schema)
    ).not.toThrow()
  })
})

describe("slackEscape", () => {
  it("escapes Slack's control characters", () => {
    expect(slackEscape("a & <@U1> > b")).toBe("a &amp; &lt;@U1&gt; &gt; b")
  })
})
