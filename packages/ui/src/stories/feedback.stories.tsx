import type { Meta, StoryObj } from "@storybook/react-vite"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Toaster } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"

const meta = { title: "UI/Feedback" } satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Loading: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-3">
      <div className="flex items-center gap-2 text-sm">
        <Spinner /> Loading tasks…
      </div>
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  ),
}

export const Separators: Story = {
  render: () => (
    <div className="w-72 text-sm">
      Above
      <Separator className="my-3" />
      <div className="flex h-5 items-center gap-3">
        Left <Separator orientation="vertical" /> Right
      </div>
    </div>
  ),
}

export const Toast: Story = {
  render: () => (
    <>
      <Button onClick={() => toast.success("Created #42")}>Show toast</Button>
      <Toaster />
    </>
  ),
}
