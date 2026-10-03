import type { Metadata } from 'next'
import { PageStub } from '@/features/shell/ui/PageStub'

export const metadata: Metadata = { title: 'Transactions & Risk' }

export default function RiskPage() {
  return (
    <PageStub
      title="Transactions & Risk"
      purpose="Transactions and the Risk Flags Steward thinks are worth a look."
    />
  )
}
