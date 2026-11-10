import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

const BARS = [
  { className: "bg-chart-1", height: "h-10" },
  { className: "bg-chart-2", height: "h-16" },
  { className: "bg-chart-3", height: "h-12" },
  { className: "bg-chart-4", height: "h-20" },
  { className: "bg-chart-5", height: "h-14" },
]

/** A sample of components drawn in the current colours. */
export function ThemePreview() {
  return (
    <Card className="self-start">
      <CardHeader>
        <CardTitle>Preview</CardTitle>
        <CardDescription>How the app looks with these colours.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Button size="sm">Primary</Button>
          <Button size="sm" variant="secondary">
            Secondary
          </Button>
          <Button size="sm" variant="outline">
            Outline
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          <Badge>Badge</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Overdue</Badge>
        </div>
        <div
          className="flex h-20 items-end gap-2"
          aria-label="Chart colour sample"
        >
          {BARS.map((bar) => (
            <div
              key={bar.className}
              className={`${bar.className} ${bar.height} flex-1 rounded-t-md`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
