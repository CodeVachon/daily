import type { Meta, StoryObj } from "@storybook/react-vite"
import { CircleAlertIcon, InfoIcon } from "lucide-react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"

const meta = {
  title: "UI/Alert",
  component: Alert,
  argTypes: {
    variant: { control: "inline-radio", options: ["default", "destructive"] },
  },
} satisfies Meta<typeof Alert>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Alert {...args} className="w-96">
      <InfoIcon />
      <AlertTitle>Times now shown in Pacific Time</AlertTitle>
      <AlertDescription>
        Due dates follow your current time zone.
      </AlertDescription>
    </Alert>
  ),
}

export const Destructive: Story = {
  args: { variant: "destructive" },
  render: (args) => (
    <Alert {...args} className="w-96">
      <CircleAlertIcon />
      <AlertTitle>Couldn&apos;t sign you in</AlertTitle>
      <AlertDescription>
        That GitHub account isn&apos;t authorized to use this app.
      </AlertDescription>
    </Alert>
  ),
}
