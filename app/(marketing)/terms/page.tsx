import type { Metadata } from 'next'
import { LegalDocument } from '@/components/lc/legal-document'
import { termsDoc } from '@/lib/legal/terms'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms and conditions for using LessonComputer.mu, operated by Lesson Computer Ltd.',
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
  return <LegalDocument doc={termsDoc} />
}
