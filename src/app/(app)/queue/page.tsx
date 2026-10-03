import type { Metadata } from 'next'
import { PageStub } from '@/features/shell/ui/PageStub'

export const metadata: Metadata = { title: 'Approval Queue' }

export default function QueuePage() {
  return (
    <PageStub
      title="Approval Queue"
      purpose="Every Proposal waiting for your Approval, grouped by kind."
    />
  )
}
