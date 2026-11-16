/** A failure worth one quiet retry: the network dropped, or the server or a
 *  gateway in front of it failed (5xx, Cloudflare's 499/52x). Not a timeout —
 *  the answer was already slow, and waiting twice as long helps nobody — and
 *  not a 4xx, which fails the same way again. */
export function isTransientError(error: unknown): boolean {
  const name = (error as { name?: string } | null)?.name;
  if (name === "TimeoutError" || name === "AbortError") return false;
  const status = (error as { status?: unknown } | null)?.status;
  if (typeof status === "number") return status >= 500 || status === 499 || status === 408;
  return error instanceof TypeError;
}
