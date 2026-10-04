import type { Metadata } from 'next'
import { Fraunces, IBM_Plex_Mono } from 'next/font/google'
import { connection } from 'next/server'
import type { ReactNode } from 'react'
import '@/styles/global.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['opsz'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-fraunces',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-plex-mono',
})

export const metadata: Metadata = {
  title: { default: 'Steward', template: '%s | Steward' },
  description: 'An ops copilot for one small PayPal Merchant. Nothing moves without your approval.',
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // Every page renders per request: the nonce CSP from proxy.ts can only be applied dynamically.
  await connection()
  return (
    <html lang="en" className={`${fraunces.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
