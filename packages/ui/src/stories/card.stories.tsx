import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

const meta = {
  title: "UI/Card",
  component: Card,
  argTypes: { size: { control: "inline-radio", options: ["default", "sm"] } },
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Card {...args} className="w-96">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Access is limited to approved GitHub accounts.
        </CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm">
            Help
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="text-sm">Card content goes here.</CardContent>
      <CardFooter>
        <Button className="w-full">Continue with GitHub</Button>
      </CardFooter>
    </Card>
  ),
}

export const Small: Story = {
  args: { size: "sm" },
  render: (args) => (
    <Card {...args} className="w-72">
      <CardHeader>
        <CardTitle className="text-sm font-normal">
          <span className="text-muted-foreground">#12</span> Renew SSL
          certificate
        </CardTitle>
      </CardHeader>
    </Card>
  ),
}
