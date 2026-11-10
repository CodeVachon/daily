// @vitest-environment happy-dom
/// <reference types="vite/client" />
/**
 * Every Storybook story must render. Runs each story (with the real preview
 * decorators) in happy-dom, so a broken story fails `bun run test`.
 */
import {
  composeStories,
  setProjectAnnotations,
  type Meta,
  type StoryFn,
} from "@storybook/react-vite"
import { afterEach, describe, expect, it } from "vitest"

import preview from "../../.storybook/preview.js"

setProjectAnnotations(preview)

type StoryFile = { default: Meta } & Record<string, StoryFn | Meta>

const files = import.meta.glob<StoryFile>("./*.stories.tsx", { eager: true })

afterEach(() => {
  document.body.innerHTML = ""
})

describe("stories", () => {
  for (const [path, file] of Object.entries(files)) {
    const stories = Object.entries(composeStories(file))
    describe(file.default.title ?? path, () => {
      it("has at least one story", () => {
        expect(stories.length).toBeGreaterThan(0)
      })
      for (const [name, story] of stories) {
        it(`renders ${name}`, async () => {
          await story.run()
          // Rendered something (some stories are just an input, with no text).
          expect(document.body.querySelectorAll("*").length).toBeGreaterThan(1)
        })
      }
    })
  }
})
