import type { Meta, StoryObj } from "@storybook/react-vite"

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { Toggle } from "@workspace/ui/components/toggle"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"

const meta = { title: "UI/Navigation" } satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const TabsStory: Story = {
  name: "Tabs",
  render: () => (
    <Tabs defaultValue="write" className="w-96">
      <TabsList>
        <TabsTrigger value="write">Write</TabsTrigger>
        <TabsTrigger value="preview">Preview</TabsTrigger>
      </TabsList>
      <TabsContent value="write" className="text-sm">
        Markdown editor
      </TabsContent>
      <TabsContent value="preview" className="text-sm">
        Rendered preview
      </TabsContent>
    </Tabs>
  ),
}

export const ToggleGroupStory: Story = {
  name: "Toggle group",
  render: () => (
    <ToggleGroup
      multiple
      variant="outline"
      size="sm"
      defaultValue={["urgent"]}
      aria-label="Priority"
    >
      {["urgent", "high", "medium", "low"].map((p) => (
        <ToggleGroupItem key={p} value={p} className="capitalize">
          {p}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  ),
}

export const ToggleStory: Story = {
  name: "Toggle",
  render: () => (
    <Toggle variant="outline" size="sm">
      Show cancelled
    </Toggle>
  ),
}
