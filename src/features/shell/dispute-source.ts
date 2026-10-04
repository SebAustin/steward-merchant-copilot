import { DISPUTE_SOURCES, type DisputeSource } from '@/lib/env/parse'

export { DISPUTE_SOURCES, type DisputeSource }

/** Settings label for each source. */
export const DISPUTE_SOURCE_LABEL: Readonly<Record<DisputeSource, string>> = {
  live: 'Live',
  simulated: 'Simulated',
  mixed: 'Mixed',
}

/** Masthead chip text; null means no chip (live data needs no label). */
export const DISPUTE_SOURCE_CHIP: Readonly<Record<DisputeSource, string | null>> = {
  live: null,
  simulated: 'Simulated disputes',
  mixed: 'Some disputes simulated',
}
