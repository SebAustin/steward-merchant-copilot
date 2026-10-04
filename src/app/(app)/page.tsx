import type { Metadata } from 'next'
import { briefGreeting } from '@/features/brief/greeting'
import { PageStub } from '@/features/shell/ui/PageStub'

export const metadata: Metadata = { title: 'Brief' }

export default function BriefPage() {
  return (
    <PageStub
      eyebrow={briefGreeting(new Date())}
      title="Brief"
      purpose="What needs you tonight, ranked by urgency and money at stake. The ranked list arrives with the Brief slice."
    />
  )
}
