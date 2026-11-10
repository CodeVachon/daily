/** The query parameter that opens a task in the board/list drawer. */
const DRAWER_PARAM = "task"

type Params = Record<string, string | string[] | undefined>

/** The current query (filters etc.) without the drawer parameter. */
export function searchWithoutDrawer(params: Params): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (key === DRAWER_PARAM || value === undefined) continue
    for (const v of Array.isArray(value) ? value : [value])
      search.append(key, v)
  }
  return search.toString()
}

/** Link that opens task #number in the drawer, keeping the current filters. */
export function drawerHref(
  pathname: string,
  search: string,
  number: number
): string {
  const params = new URLSearchParams(search)
  params.set(DRAWER_PARAM, String(number))
  return `${pathname}?${params}`
}

/** Link that closes the drawer, keeping the current filters. */
export function closeDrawerHref(pathname: string, search: string): string {
  return search ? `${pathname}?${search}` : pathname
}

/** The task number to show in the drawer, if any. */
export function drawerTask(params: Params): string | null {
  const value = params[DRAWER_PARAM]
  const ref = Array.isArray(value) ? value[0] : value
  return ref && /^\d+$/.test(ref) ? ref : null
}
