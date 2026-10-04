import { isIPv4, isIPv6 } from 'node:net'

const UNKNOWN = 'unknown'
const IPV6_GROUPS = 8
const IPV6_PREFIX_GROUPS = 4 // /64
const MAPPED_V4 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i

export type ClientIp = Readonly<{
  /** The rate-limit key: an IPv4 address, an IPv6 /64, or `unknown`. */
  bucket: string
  /** True when X-Forwarded-For has fewer entries than the trusted hops (a likely misconfiguration). */
  short: boolean
  /** True when the trusted entry exists but is not an IP address (a likely misconfiguration). */
  unparseable: boolean
}>

function ipv6Prefix(address: string): string {
  const [head = '', tail] = address.split('::')
  const headGroups = head === '' ? [] : head.split(':')
  const tailGroups = tail === undefined || tail === '' ? [] : tail.split(':')
  const zeros = Array<string>(
    Math.max(0, IPV6_GROUPS - headGroups.length - tailGroups.length),
  ).fill('0')
  const groups = (tail === undefined ? headGroups : [...headGroups, ...zeros, ...tailGroups])
    .slice(0, IPV6_PREFIX_GROUPS)
    .map((g) => parseInt(g, 16).toString(16))
  return `${groups.join(':')}::/64`
}

/** Drop `[v6]:port`, `[v6]` and `v4:port` wrappers; a bare IPv6 address is left alone. */
function withoutPort(entry: string): string {
  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(entry)
  if (bracketed?.[1]) return bracketed[1]
  return /^\d+\.\d+\.\d+\.\d+:\d+$/.test(entry) ? entry.slice(0, entry.lastIndexOf(':')) : entry
}

function bucketOf(entry: string): string {
  const address = withoutPort(entry).split('%')[0] ?? ''
  const mapped = MAPPED_V4.exec(address)?.[1]
  if (mapped) return mapped
  if (isIPv4(address)) return address
  return isIPv6(address) ? ipv6Prefix(address) : UNKNOWN
}

/**
 * The client address as seen by the trusted reverse proxy. Entries to the left of the trusted
 * hops are client-supplied and ignored, so a spoofed X-Forwarded-For cannot dodge a rate limit.
 */
export function clientIp(headers: Headers, trustedHops: number): ClientIp {
  if (trustedHops < 1) return { bucket: UNKNOWN, short: false, unparseable: false }
  const forwarded =
    headers
      .get('x-forwarded-for')
      ?.split(',')
      .map((part) => part.trim()) ?? []
  const entry = forwarded[forwarded.length - trustedHops]
  if (!entry) return { bucket: UNKNOWN, short: true, unparseable: false }
  const bucket = bucketOf(entry)
  return { bucket, short: false, unparseable: bucket === UNKNOWN }
}
