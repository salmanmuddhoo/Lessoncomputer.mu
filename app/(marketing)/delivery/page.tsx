import type { Metadata } from 'next'
import { LegalDocument } from '@/components/lc/legal-document'
import { deliveryDoc } from '@/lib/legal/delivery'

export const metadata: Metadata = {
  title: 'Delivery Policy',
  description: 'How LessonComputer.mu courses, video lessons and live classes are delivered after payment.',
  alternates: { canonical: '/delivery' },
}

export default function DeliveryPage() {
  return <LegalDocument doc={deliveryDoc} />
}
