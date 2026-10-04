import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

/** Values shorter than this would match by chance; real secrets are longer. */
const MIN_NEEDLE_LENGTH = 8

export type Leak = Readonly<{ label: string; file: string }>

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(path)
    else yield path
  }
}

/**
 * Find files under `dir` that contain any of the given secret values (SC-15: no secret may
 * reach the client bundle). `needles` maps a label (the variable name) to its value.
 */
export function findLeaks(
  dir: string,
  needles: Readonly<Record<string, string | undefined>>,
): Leak[] {
  const checks = Object.entries(needles).filter(
    (entry): entry is [string, string] => (entry[1]?.length ?? 0) >= MIN_NEEDLE_LENGTH,
  )
  const leaks: Leak[] = []
  for (const path of walk(dir)) {
    const content = readFileSync(path, 'utf8')
    for (const [label, value] of checks) {
      if (content.includes(value)) leaks.push({ label, file: relative(dir, path) })
    }
  }
  return leaks
}
