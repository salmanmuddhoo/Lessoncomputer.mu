import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BlogForm } from '../../blog-form'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

export const metadata = { title: 'Edit Blog Post' }

export default async function EditBlogPostPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: post } = await (supabase as any)
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .single()

  if (!post) notFound()

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/blog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Blog
        </Link>
        <h1 className="text-2xl font-bold">Edit Post</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{post.title}</p>
      </div>
      <BlogForm post={post} />
    </div>
  )
}
