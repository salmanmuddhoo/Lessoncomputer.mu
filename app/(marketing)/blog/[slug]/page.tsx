import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Calendar } from 'lucide-react'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('blog_posts')
    .select('title, excerpt')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (!data) return { title: 'Blog | LessonComputer.mu' }

  return {
    title: `${data.title} | LessonComputer.mu`,
    description: data.excerpt ?? undefined,
    openGraph: { title: data.title, description: data.excerpt ?? undefined },
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: post } = await (supabase as any)
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (!post) notFound()

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Blog
        </Link>

        {post.cover_image_url && (
          <div className="mb-8 rounded-2xl overflow-hidden">
            <img
              src={post.cover_image_url}
              alt={post.title}
              className="w-full max-h-80 object-cover"
            />
          </div>
        )}

        <header className="mb-8">
          {post.published_at && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(post.published_at).toLocaleDateString('en-MU', { dateStyle: 'long' })}
            </p>
          )}
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground leading-snug">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="text-muted-foreground mt-3 text-base leading-relaxed">{post.excerpt}</p>
          )}
        </header>

        {post.content && (
          <div
            className="[&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:font-semibold [&_h3]:text-xl [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:text-foreground/80 [&_p]:leading-relaxed [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_li]:mb-1 [&_a]:text-primary [&_a]:underline [&_strong]:font-semibold [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:bg-muted [&_td]:border [&_td]:border-border [&_td]:p-2 [&_img]:max-w-full [&_img]:rounded-xl [&_pre]:bg-muted [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:overflow-x-auto [&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_code]:text-sm"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        )}
      </div>
    </div>
  )
}
