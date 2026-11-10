/** A titled block on the task page, with an optional count or action. */
export function Section({
  title,
  aside,
  children,
}: {
  title: string
  aside?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-2 text-sm font-medium">
        {title}
        {aside && (
          <span className="font-normal text-muted-foreground">{aside}</span>
        )}
      </h2>
      {children}
    </section>
  )
}
