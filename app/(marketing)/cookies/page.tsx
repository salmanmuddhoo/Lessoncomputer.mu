import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'
import { LegalDocument } from '@/components/lc/legal-document'
import { cookiesDoc } from '@/lib/legal/cookies'

export const metadata: Metadata = pageMetadata({
  title: 'Cookie Policy',
  description: 'The cookies LessonComputer.mu uses and how you control them.',
  path: '/cookies',
})

export default function CookiesPage() {
  return <LegalDocument doc={cookiesDoc} />
}
