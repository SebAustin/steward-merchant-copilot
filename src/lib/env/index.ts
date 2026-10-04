import 'server-only'
import { parseEnv, type Env } from './parse'

let cached: Env | undefined

/** The validated process environment, parsed once on first use (fails fast with a clear error). */
export function getEnv(): Env {
  cached ??= parseEnv(process.env)
  return cached
}

export { parseEnv, EnvError } from './parse'
export type { Env } from './parse'
