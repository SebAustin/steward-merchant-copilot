import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type * as schema from './schema'

/** The Drizzle client type, shared by the app and by tests. */
export type Db = NodePgDatabase<typeof schema>
