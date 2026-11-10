import type { Meta, StoryObj } from "@storybook/react-vite"

import { Badge } from "@workspace/ui/components/badge"
import { Calendar } from "@workspace/ui/components/calendar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

const meta = { title: "UI/Data" } satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const rows = [
  {
    n: 3,
    title: "Invoice reconciliation",
    status: "In Progress",
    priority: "Urgent",
  },
  { n: 2, title: "Renew SSL certificate", status: "Todo", priority: "Urgent" },
  { n: 1, title: "Draft Q4 roadmap", status: "Backlog", priority: "Medium" },
]

export const TableStory: Story = {
  name: "Table",
  render: () => (
    <Table className="w-[36rem]">
      <TableHeader>
        <TableRow>
          <TableHead>#</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Priority</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.n}>
            <TableCell className="text-muted-foreground">#{row.n}</TableCell>
            <TableCell>{row.title}</TableCell>
            <TableCell>
              <Badge variant="outline">{row.status}</Badge>
            </TableCell>
            <TableCell>{row.priority}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
}

export const CalendarStory: Story = {
  name: "Calendar",
  render: () => (
    <Calendar
      mode="single"
      defaultMonth={new Date(2026, 10, 1)}
      selected={new Date(2026, 10, 13)}
    />
  ),
}
