import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: 'Blog | LessonComputer.mu',
  description: 'Tips, guides and news for Mauritian ICT students.',
}

export default async function BlogPage() {
  const supabase = await createClient()
  const { data: posts } = await (supabase as any)
    .from('blog_posts')
    .select('id, title, slug, excerpt, cover_image_url, published_at')
    .eq('is_published', true)
    .order('published_at', { ascending: false })

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="mb-12 text-center">
          <p className="text-xs font-semibold tracking-[0.15em] text-primary uppercase mb-3">Our Blog</p>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground leading-tight">
            Tips & Guides
          </h1>
          <p className="text-muted-foreground mt-4 text-base max-w-xl mx-auto">
            Study tips, ICT guides and updates for Mauritian students.
          </p>
        </div>

        {posts && posts.length > 0 ? (
          <div className="space-y-8">
            {posts.map((post: any) => (
              <article key={post.id} className="group">
                <Link href={`/blog/${post.slug}`} className="block">
                  <div className="flex flex-col sm:flex-row gap-5 p-5 rounded-2xl border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-all">
                    {post.cover_image_url && (
                      <div className="sm:w-48 shrink-0">
                        <img
                          src={post.cover_image_url}
                          alt={post.title}
                          className="w-full h-32 sm:h-full object-cover rounded-xl"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {post.published_at && (
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(post.published_at).toLocaleDateString('en-MU', { dateStyle: 'medium' })}
                        </p>
                      )}
                      <h2 className="font-serif text-xl font-bold text-foreground group-hover:text-primary transition-colors mb-2 leading-snug">
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{post.excerpt}</p>
                      )}
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary mt-3">
                        Read more <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No blog posts yet. Check back soon!</p>
          </div>
        )}
      </div>
    </div>
  )
}
