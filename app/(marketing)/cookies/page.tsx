import type { Metadata } from 'next'
import { LegalDocument } from '@/components/lc/legal-document'
import { cookiesDoc } from '@/lib/legal/cookies'

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'The cookies LessonComputer.mu uses and how you control them.',
  alternates: { canonical: '/cookies' },
}

export default function CookiesPage() {
  return <LegalDocument doc={cookiesDoc} />
}
