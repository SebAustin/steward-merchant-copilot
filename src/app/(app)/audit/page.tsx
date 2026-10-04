import type { Metadata } from 'next'
import { PageStub } from '@/features/shell/ui/PageStub'

export const metadata: Metadata = { title: 'Audit Log' }

export default function AuditPage() {
  return (
    <PageStub
      title="Audit Log"
      purpose="Every Approval, Rejection and Execution, recorded as an Audit Entry."
    />
  )
}
