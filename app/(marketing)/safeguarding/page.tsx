import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'
import { LegalDocument } from '@/components/lc/legal-document'
import { safeguardingDoc } from '@/lib/legal/safeguarding'

export const metadata: Metadata = pageMetadata({
  title: 'Safeguarding & Class Conduct',
  description: 'How LessonComputer.mu keeps live classes safe, what we expect from students, and how a parent raises a concern.',
  path: '/safeguarding',
})

export default function SafeguardingPage() {
  return <LegalDocument doc={safeguardingDoc} />
}
