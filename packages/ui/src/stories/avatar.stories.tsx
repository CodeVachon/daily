import type { Meta, StoryObj } from "@storybook/react-vite"
import { BotIcon } from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "@workspace/ui/components/avatar"

const meta = { title: "UI/Avatar", component: Avatar } satisfies Meta<
  typeof Avatar
>

export default meta
type Story = StoryObj<typeof meta>

export const Initials: Story = {
  render: () => (
    <Avatar>
      <AvatarFallback>CV</AvatarFallback>
    </Avatar>
  ),
}

export const Image: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src="https://github.com/octocat.png" alt="" />
      <AvatarFallback>OC</AvatarFallback>
    </Avatar>
  ),
}

export const Group: Story = {
  render: () => (
    <AvatarGroup>
      <Avatar>
        <AvatarFallback>CV</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback className="bg-primary/10 text-primary">
          <BotIcon className="size-4" />
        </AvatarFallback>
      </Avatar>
    </AvatarGroup>
  ),
}
