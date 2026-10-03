const MERCHANT_TIME_ZONE = 'America/Los_Angeles'
const MERCHANT_NAME = 'Maya'
const NOON = 12
const EVENING_START = 17

/** "Thursday evening, Maya." in the roastery's time zone (DESIGN section 5.1). */
export function briefGreeting(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MERCHANT_TIME_ZONE,
    weekday: 'long',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(now)
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? ''
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const period = hour < NOON ? 'morning' : hour < EVENING_START ? 'afternoon' : 'evening'
  return `${weekday} ${period}, ${MERCHANT_NAME}.`
}
