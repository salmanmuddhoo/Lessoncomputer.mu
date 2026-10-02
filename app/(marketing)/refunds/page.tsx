import type { Metadata } from 'next'
import { LegalDocument } from '@/components/lc/legal-document'
import { refundsDoc } from '@/lib/legal/refunds'

export const metadata: Metadata = {
  title: 'Refund Policy',
  description: 'When you can get your money back from LessonComputer.mu, how to ask, and how long it takes.',
  alternates: { canonical: '/refunds' },
}

export default function RefundsPage() {
  return <LegalDocument doc={refundsDoc} />
}
