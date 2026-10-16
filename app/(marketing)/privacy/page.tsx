import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'
import { LegalDocument } from '@/components/lc/legal-document'
import { privacyDoc } from '@/lib/legal/privacy'

export const metadata: Metadata = pageMetadata({
  title: 'Privacy Policy',
  description: 'How Lesson Computer Ltd collects, uses, shares and protects the personal data of students and parents, and the rights you have over it.',
  path: '/privacy',
})

export default function PrivacyPage() {
  return <LegalDocument doc={privacyDoc} />
}
