import type { Metadata } from 'next'
import { LegalDocument } from '@/components/lc/legal-document'
import { privacyDoc } from '@/lib/legal/privacy'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Lesson Computer Ltd collects, uses, shares and protects your personal data.',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return <LegalDocument doc={privacyDoc} />
}
