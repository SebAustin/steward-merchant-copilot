'use client'

import { Unavailable } from '@/features/shell/ui/Unavailable'

// Sits at the app root so it also catches errors thrown by the (app) layout, such as the session
// check failing because the database is down. An error.tsx beside a layout cannot catch that layout.
export default function AppError() {
  return <Unavailable />
}
