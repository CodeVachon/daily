/** The thing doesn't exist for this user (or was soft-deleted). */
export class NotFoundError extends Error {
  constructor(what: string) {
    super(`${what} not found`)
    this.name = "NotFoundError"
  }
}

/** The input is well-formed but not acceptable (unknown status, bad neighbour…). */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ValidationError"
  }
}
