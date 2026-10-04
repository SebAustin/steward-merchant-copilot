import type { Metadata } from 'next'
import { PageStub } from '@/features/shell/ui/PageStub'

export const metadata: Metadata = { title: 'Standing Policies' }

export default function PoliciesPage() {
  return (
    <PageStub
      title="Standing Policies"
      purpose="Pre-approved invoice reminders within caps. Off by default."
    />
  )
}
