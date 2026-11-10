import type { Meta, StoryObj } from "@storybook/react-vite"
import { LogOutIcon, MoonIcon, PlusIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@workspace/ui/components/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

const meta = { title: "UI/Menus" } satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Dropdown: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        Account
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>chris@example.com</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <MoonIcon /> Dark mode
        </DropdownMenuItem>
        <DropdownMenuItem>
          <LogOutIcon /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
}

export const CommandPalette: Story = {
  render: () => (
    <Command className="w-72 rounded-xl border">
      <CommandInput placeholder="Find or create a label…" />
      <CommandList>
        <CommandEmpty>No labels yet.</CommandEmpty>
        <CommandGroup heading="Labels">
          <CommandItem data-checked>work</CommandItem>
          <CommandItem>home</CommandItem>
          <CommandItem>errands</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup>
          <CommandItem>
            <PlusIcon /> Create “finance”
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
}
