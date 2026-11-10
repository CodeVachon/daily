import type { Meta, StoryObj } from "@storybook/react-vite"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

const meta = { title: "UI/Overlays" } satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const DialogStory: Story = {
  name: "Dialog",
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button />}>New task</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>
            Add it to your board. You can fill in details later.
          </DialogDescription>
        </DialogHeader>
        <Input placeholder="What needs doing?" aria-label="Title" />
        <DialogFooter>
          <Button>Create task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

export const AlertDialogStory: Story = {
  name: "Alert dialog",
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" />}>
        Delete comment
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
          <AlertDialogDescription>
            The history keeps a record that it was deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
}

export const PopoverStory: Story = {
  name: "Popover",
  render: () => (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" />}>
        Details
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>#12 Renew SSL certificate</PopoverTitle>
          <PopoverDescription>Due Thu, Nov 12 · Urgent</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  ),
}

export const TooltipStory: Story = {
  name: "Tooltip",
  render: () => (
    <Tooltip>
      <TooltipTrigger render={<Button variant="ghost" />}>
        5 minutes ago
      </TooltipTrigger>
      <TooltipContent>Nov 13, 2026, 6:58 AM</TooltipContent>
    </Tooltip>
  ),
}

export const SheetStory: Story = {
  name: "Sheet",
  render: () => (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>
        Open sheet
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>Narrow down the board.</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  ),
}
