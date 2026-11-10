import type { Meta, StoryObj } from "@storybook/react-vite"
import { SearchIcon } from "lucide-react"

import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"

const meta = { title: "UI/Forms" } satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Fields: Story = {
  render: () => (
    <FieldGroup className="w-96">
      <Field>
        <FieldLabel htmlFor="title">Title</FieldLabel>
        <Input id="title" placeholder="What needs doing?" />
      </Field>
      <Field>
        <FieldLabel htmlFor="description">Description</FieldLabel>
        <Textarea id="description" placeholder="Markdown supported" />
        <FieldDescription>Visible to you and your agents.</FieldDescription>
      </Field>
    </FieldGroup>
  ),
}

export const Search: Story = {
  render: () => (
    <InputGroup className="w-72">
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput placeholder="Search or #number" aria-label="Search" />
    </InputGroup>
  ),
}

export const Checkboxes: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      {["Pull statements", "Match payments"].map((text, i) => (
        <div key={text} className="flex items-center gap-2">
          <Checkbox id={`c${i}`} defaultChecked={i === 0} />
          <Label htmlFor={`c${i}`}>{text}</Label>
        </div>
      ))}
    </div>
  ),
}

export const Disabled: Story = {
  render: () => (
    <Input
      className="w-72"
      disabled
      placeholder="Disabled"
      aria-label="Disabled"
    />
  ),
}
