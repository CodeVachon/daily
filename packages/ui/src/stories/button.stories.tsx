import type { Meta, StoryObj } from "@storybook/react-vite"
import { ArrowRightIcon, PlusIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"

const meta = {
  title: "UI/Button",
  component: Button,
  args: { children: "Button" },
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "outline",
        "secondary",
        "ghost",
        "destructive",
        "link",
      ],
    },
    size: {
      control: "select",
      options: [
        "default",
        "xs",
        "sm",
        "lg",
        "icon",
        "icon-xs",
        "icon-sm",
        "icon-lg",
      ],
    },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-2">
      {(
        [
          "default",
          "outline",
          "secondary",
          "ghost",
          "destructive",
          "link",
        ] as const
      ).map((variant) => (
        <Button key={variant} {...args} variant={variant}>
          {variant}
        </Button>
      ))}
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-center gap-2">
      {(["xs", "sm", "default", "lg"] as const).map((size) => (
        <Button key={size} {...args} size={size}>
          {size}
        </Button>
      ))}
      <Button {...args} size="icon" aria-label="Add">
        <PlusIcon />
      </Button>
    </div>
  ),
}

export const WithIcon: Story = {
  args: {
    children: (
      <>
        Continue <ArrowRightIcon data-icon="inline-end" />
      </>
    ),
  },
}

export const Loading: Story = {
  args: {
    disabled: true,
    children: (
      <>
        <Spinner /> Saving…
      </>
    ),
  },
}
