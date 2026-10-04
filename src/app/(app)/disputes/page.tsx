import type { Metadata } from 'next'
import { PageStub } from '@/features/shell/ui/PageStub'

export const metadata: Metadata = { title: 'Disputes' }

export default function DisputesPage() {
  return (
    <PageStub
      title="Disputes"
      purpose="Open Disputes with their Response Deadline and Evidence Packet."
    />
  )
}
