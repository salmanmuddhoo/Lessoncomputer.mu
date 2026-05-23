import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Globe } from 'lucide-react'
import { DeletePostButton } from './delete-post-button'

export const metadata = { title: 'Blog Posts' }

export default async function AdminBlogPage() {
  const supabase = await createClient()
  const { data: posts } = await (supabase as any)
    .from('blog_posts')
    .select('id, title, slug, is_published, published_at, created_at')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Blog</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{posts?.length ?? 0} posts</p>
        </div>
        <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-accent">
          <Link href="/admin/blog/new">
            <Plus className="w-4 h-4 mr-1" /> New Post
          </Link>
        </Button>
      </div>

      <div className="rounded-xl border border-border/60 overflow-hidden">
        {posts && posts.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border/60">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Slug</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Published</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {posts.map((p: any) => (
                <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium max-w-[240px] truncate">{p.title}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.slug}</td>
                  <td className="px-4 py-3">
                    {p.is_published ? (
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-xs" variant="outline">Published</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Draft</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {p.published_at
                      ? new Date(p.published_at).toLocaleDateString('en-MU', { dateStyle: 'medium' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {p.is_published && (
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/blog/${p.slug}`} target="_blank">
                            <Globe className="w-3.5 h-3.5 mr-1" /> View
                          </Link>
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/blog/${p.id}/edit`}>
                          <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                        </Link>
                      </Button>
                      <DeletePostButton id={p.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-16 text-center">
            <p className="text-muted-foreground mb-4">No blog posts yet.</p>
            <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-accent">
              <Link href="/admin/blog/new">
                <Plus className="w-4 h-4 mr-1" /> Create First Post
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
