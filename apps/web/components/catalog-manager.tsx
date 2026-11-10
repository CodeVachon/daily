"use client"

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
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"
import { ArchiveIcon, ArchiveRestoreIcon, Trash2Icon } from "lucide-react"
import { useState } from "react"

import type { CatalogPatch } from "@/app/(app)/catalog-actions"
import { useAction } from "@/components/task/use-action"
import type { ActionResult } from "@/lib/actions"
import { COLOR_OPTIONS, dotClass, type ColorName } from "@/lib/colors"

export interface CatalogItem {
  id: string
  name: string
  color: string | null
  archived?: boolean
}

type Act = Promise<ActionResult<null>>

export interface CatalogActions {
  create: (name: string, color: ColorName | null) => Act
  update: (id: string, patch: CatalogPatch) => Act
  remove: (id: string) => Act
}

const NONE = "__none__"
const COLOR_ITEMS = [{ value: NONE, label: "No colour" }, ...COLOR_OPTIONS]

function ColorSelect({
  value,
  onChange,
}: {
  value: string | null
  onChange: (color: ColorName | null) => void
}) {
  return (
    <Select
      value={value ?? NONE}
      onValueChange={(next) =>
        onChange(!next || next === NONE ? null : (next as ColorName))
      }
      items={COLOR_ITEMS}
    >
      <SelectTrigger size="sm" aria-label="Colour" className="w-32">
        <span
          className={cn("size-2.5 shrink-0 rounded-full", dotClass(value))}
        />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {COLOR_ITEMS.map((c) => (
          <SelectItem key={c.value} value={c.value}>
            <span
              className={cn(
                "size-2.5 rounded-full",
                dotClass(c.value === NONE ? null : c.value)
              )}
            />
            {c.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function RemoveButton({
  noun,
  name,
  onConfirm,
}: {
  noun: string
  name: string
  onConfirm: () => void
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete ${name}`}
          />
        }
      >
        <Trash2Icon />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete {noun} “{name}”?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Tasks keep existing; they just won’t show this {noun} any more.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function ArchiveButton({
  archived,
  onToggle,
}: {
  archived: boolean
  onToggle: () => void
}) {
  return (
    <Button variant="ghost" size="sm" onClick={onToggle}>
      {archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
      {archived ? "Unarchive" : "Archive"}
    </Button>
  )
}

function CatalogRow({
  item,
  noun,
  actions,
}: {
  item: CatalogItem
  noun: string
  actions: CatalogActions
}) {
  const { run } = useAction()
  const [name, setName] = useState(item.name)
  const rename = () =>
    name.trim() && name !== item.name
      ? run(() => actions.update(item.id, { name }))
      : null

  return (
    <TableRow className={item.archived ? "opacity-60" : undefined}>
      <TableCell>
        <Input
          aria-label={`${noun} name`}
          className="h-8 max-w-xs border-transparent shadow-none hover:border-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={rename}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
      </TableCell>
      <TableCell>
        <ColorSelect
          value={item.color}
          onChange={(color) => run(() => actions.update(item.id, { color }))}
        />
      </TableCell>
      <TableCell className="text-right">
        {item.archived !== undefined && (
          <ArchiveButton
            archived={item.archived}
            onToggle={() =>
              run(() => actions.update(item.id, { archived: !item.archived }))
            }
          />
        )}
        <RemoveButton
          noun={noun}
          name={item.name}
          onConfirm={() => run(() => actions.remove(item.id))}
        />
      </TableCell>
    </TableRow>
  )
}

function CreateForm({
  noun,
  onCreate,
}: {
  noun: string
  onCreate: CatalogActions["create"]
}) {
  const { pending, run } = useAction()
  const [name, setName] = useState("")
  const [color, setColor] = useState<ColorName | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (await run(() => onCreate(name, color))) {
      setName("")
      setColor(null)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <Input
        aria-label={`New ${noun} name`}
        placeholder={`New ${noun}…`}
        className="h-8 w-64"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <ColorSelect value={color} onChange={setColor} />
      <Button type="submit" size="sm" disabled={pending || !name.trim()}>
        Add {noun}
      </Button>
    </form>
  )
}

/** Create, rename, recolour, archive (projects) and delete projects or labels. */
export function CatalogManager({
  noun,
  items,
  actions,
}: {
  noun: string
  items: CatalogItem[]
  actions: CatalogActions
}) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <CreateForm noun={noun} onCreate={actions.create} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Colour</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <CatalogRow
              key={`${item.id}:${item.name}`}
              item={item}
              noun={noun}
              actions={actions}
            />
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={3}
                className="py-8 text-center text-muted-foreground"
              >
                No {noun}s yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {items.some((i) => i.archived) && (
        <p className="text-xs text-muted-foreground">
          <Badge variant="outline">Archived</Badge> projects are hidden from
          pickers and filters but keep their tasks.
        </p>
      )}
    </div>
  )
}
