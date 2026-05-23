import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ live?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('revision_notes')
    .select('title')
    .eq('id', id)
    .single()
  return { title: data?.title ? `${data.title} | Revision Notes` : 'Revision Notes' }
}

function sanitiseHtml(raw: string): string {
  // Strip full-document wrappers and embedded stylesheets so they can't
  // override the page theme. Inline styles (for formatting) are preserved.
  const bodyContent = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? raw
  return bodyContent
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<link[^>]*>/gi, '')
}

export default async function RevisionNotePage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { live } = await searchParams
  const isLiveContext = live === '1'
  const supabase = await createClient()

  const { data: note } = await (supabase as any)
    .from('revision_notes')
    .select('id, title, content, content_live, is_published, is_published_for_live, grade:grades(name, color, slug), chapter:chapters(title)')
    .eq('id', id)
    .single()

  if (!note) notFound()

  const visible = isLiveContext ? note.is_published_for_live : note.is_published
  if (!visible) notFound()

  const rawHtml = (isLiveContext && note.content_live) ? note.content_live : note.content
  const html = rawHtml ? sanitiseHtml(rawHtml) : null
  const grade = note.grade as { name: string; color: string; slug: string } | null
  const chapter = note.chapter as { title: string } | null

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </Link>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <BookOpen className="w-4 h-4 text-primary" />
            {grade && (
              <Badge
                variant="outline"
                style={{ borderColor: `${grade.color}40`, color: grade.color, backgroundColor: `${grade.color}10` }}
              >
                {grade.name}
              </Badge>
            )}
            {chapter && (
              <Badge variant="secondary" className="text-xs">{chapter.title}</Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold">{note.title}</h1>
        </div>

        {/* Content */}
        {html ? (
          <div
            className="prose prose-sm sm:prose max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <p className="text-muted-foreground italic">No content available for these revision notes.</p>
        )}
      </div>
    </div>
  )
}
