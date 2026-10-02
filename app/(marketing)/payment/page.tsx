import type { Metadata } from 'next'
import { LegalDocument } from '@/components/lc/legal-document'
import { paymentDoc } from '@/lib/legal/payment'

export const metadata: Metadata = {
  title: 'Payment & Security',
  description: 'How you can pay on LessonComputer.mu, the currency you are charged in, and how your payment is protected.',
  alternates: { canonical: '/payment' },
}

export default function PaymentPage() {
  return <LegalDocument doc={paymentDoc} />
}
