import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'
import { LegalDocument } from '@/components/lc/legal-document'
import { refundsDoc } from '@/lib/legal/refunds'

export const metadata: Metadata = pageMetadata({
  title: 'Refund Policy',
  description: 'When you can get your money back from LessonComputer.mu, how to ask, and how long it takes.',
  path: '/refunds',
})

export default function RefundsPage() {
  return <LegalDocument doc={refundsDoc} />
}
