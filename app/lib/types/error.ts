export interface ApiError {
  statusCode: number
  message: string
  details?: unknown
}

export class AppError extends Error {
  statusCode: number
  details?: unknown

  /**
   * True when the request was cancelled by the caller (filter change, component unmounted).
   *
   * Without this flag a cancellation surfaces like any other network failure, and the UI would
   * report "the service did not respond" when in fact we hung up on it ourselves.
   */
  readonly aborted: boolean

  constructor(message: string, statusCode: number = 500, details?: unknown, aborted = false) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.details = details
    this.aborted = aborted
  }
}

/** Use inside `catch` blocks to ignore a deliberate cancellation. */
export const isAbortError = (error: unknown): boolean => {
  if (error instanceof AppError) return error.aborted
  return error instanceof Error && error.name === 'AbortError'
}

/**
 * The HTTP status carried by a failure, `0` when there is none (no answer at all, or not an HTTP
 * error). Reads `AppError` first, then any object exposing a numeric `statusCode`, which is what a
 * Nuxt error carries.
 */
export const errorStatusCode = (error: unknown): number => {
  if (error instanceof AppError) return error.statusCode
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const code = (error as { statusCode?: unknown }).statusCode
    return typeof code === 'number' ? code : 0
  }
  return 0
}
