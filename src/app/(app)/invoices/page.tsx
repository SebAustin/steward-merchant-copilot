import type { Metadata } from 'next'
import { PageStub } from '@/features/shell/ui/PageStub'

export const metadata: Metadata = { title: 'Invoices' }

export default function InvoicesPage() {
  return (
    <PageStub
      title="Invoices"
      purpose="Overdue Invoices with aging and each Customer's payment history."
    />
  )
}
