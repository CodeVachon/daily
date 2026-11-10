import type { Meta, StoryObj } from "@storybook/react-vite"
import { CalendarIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"

const meta = {
  title: "UI/Badge",
  component: Badge,
  args: { children: "Badge" },
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "secondary",
        "destructive",
        "outline",
        "ghost",
        "link",
      ],
    },
  },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge>Default</Badge>
      <Badge variant="secondary">Appello</Badge>
      <Badge variant="outline">work</Badge>
      <Badge variant="destructive">Blocked by 2</Badge>
      <Badge variant="ghost">2/5</Badge>
    </div>
  ),
}

export const WithIcon: Story = {
  args: {
    variant: "outline",
    children: (
      <>
        <CalendarIcon /> Fri, Nov 13
      </>
    ),
  },
}
