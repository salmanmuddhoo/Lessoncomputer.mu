import { BlogForm } from '../blog-form'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = { title: 'New Blog Post' }

export default function NewBlogPostPage() {
  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/blog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Blog
        </Link>
        <h1 className="text-2xl font-bold">New Blog Post</h1>
      </div>
      <BlogForm />
    </div>
  )
}
