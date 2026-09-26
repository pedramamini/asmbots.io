/** Path and query values, read or refused: a malformed one is a `ProtocolError`, so a 400. */
import { Id, ProtocolError, parse, SHA256, Slug, WEIGHT_CLASSES } from '@asmbots/protocol'

export function idParam(value: string, what: string): string {
  return parse(Id, value, what)
}

export function slugParam(value: string, what: string): string {
  return parse(Slug, value, what)
}

/** A SHA-256 in lowercase hex: a replay key. */
export function keyParam(value: string, what: string): string {
  if (!SHA256.test(value)) throw new ProtocolError(`${what} is not a sha-256 in lowercase hex`)
  return value
}

/** A whole number in `min..max`, or `fallback` when the value is left out. */
export function wholeParam(
  value: string | undefined,
  what: string,
  min: number,
  max: number,
  fallback: number,
): number {
  if (value === undefined) return fallback
  const n = /^\d{1,16}$/.test(value) ? Number(value) : Number.NaN
  if (!(n >= min && n <= max))
    throw new ProtocolError(`${what} must be a whole number in ${min}..${max}`)
  return n
}

/** A weight class by its slug (`?class=`), or null when the value is left out. */
export function classParam(value: string | undefined): (typeof WEIGHT_CLASSES)[number] | null {
  if (value === undefined) return null
  const found = WEIGHT_CLASSES.find((c) => c.slug === value)
  if (found === undefined)
    throw new ProtocolError(
      `the class must be one of ${WEIGHT_CLASSES.map((c) => c.slug).join(', ')}`,
    )
  return found
}
