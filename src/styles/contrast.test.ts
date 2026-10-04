import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const css = readFileSync(fileURLToPath(new URL('./tokens.css', import.meta.url)), 'utf8')

function token(name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css)
  if (!match?.[1]) throw new Error(`token --${name} not found`)
  return match[1]
}

// WCAG 2.2 relative luminance and contrast ratio.
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
}

function ratio(foreground: string, background: string): number {
  const [a, b] = [luminance(token(foreground)), luminance(token(background))]
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

const TEXT = 4.5 // WCAG 2.2 AA, normal text
const NON_TEXT = 3 // WCAG 2.2 AA, UI components

describe('design token contrast (DESIGN section 2, WCAG 2.2 AA)', () => {
  it.each([
    ['color-ink', 'color-paper', TEXT],
    ['color-ink', 'color-surface', TEXT],
    ['color-ink-muted', 'color-paper', TEXT],
    ['color-ink-muted', 'color-surface', TEXT],
    ['color-ink', 'color-quarantine', TEXT],
    ['color-signal', 'color-paper', TEXT],
    ['color-signal', 'color-surface', TEXT],
    ['color-signal-ink', 'color-signal', TEXT],
    ['color-signal-ink', 'color-signal-strong', TEXT],
    ['color-steward', 'color-paper', TEXT],
    ['color-steward', 'color-surface', TEXT],
    ['color-risk-low', 'color-risk-low-bg', TEXT],
    ['color-risk-med', 'color-risk-med-bg', TEXT],
    ['color-risk-high', 'color-risk-high-bg', TEXT],
    ['color-risk-low', 'color-paper', TEXT],
    ['color-risk-med', 'color-paper', TEXT],
    ['color-risk-high', 'color-paper', TEXT],
    ['color-line-strong', 'color-paper', NON_TEXT],
    ['color-line-strong', 'color-surface', NON_TEXT],
    ['color-steward', 'color-paper', NON_TEXT],
  ])('%s on %s meets %s:1', (fg, bg, minimum) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(minimum)
  })
})
