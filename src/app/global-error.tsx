'use client'

import { Unavailable } from '@/features/shell/ui/Unavailable'
import '@/styles/global.css'

// Replaces the root layout when that layout itself fails, so it supplies <html> and <body>.
// The web fonts live in the root layout, so the serif/mono stacks fall back to system fonts here.
export default function GlobalError() {
  return (
    <html lang="en">
      <body>
        <Unavailable />
      </body>
    </html>
  )
}
