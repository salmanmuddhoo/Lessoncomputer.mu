'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const schema = z.object({
  title: z.string().min(2, 'Title required'),
  slug: z.string().min(2, 'Slug required').regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only'),
  excerpt: z.string().optional(),
  content: z.string().optional(),
  cover_image_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  is_published: z.boolean(),
})

type FormData = z.infer<typeof schema>

function toSlug(title: string) {
  return title.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

interface BlogFormProps {
  post?: {
    id: string
    title: string
    slug: string
    excerpt?: string | null
    content?: string | null
    cover_image_url?: string | null
    is_published: boolean
  }
}

export function BlogForm({ post }: BlogFormProps) {
  const [saving, setSaving] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)
  const router = useRouter()

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: post?.title ?? '',
      slug: post?.slug ?? '',
      excerpt: post?.excerpt ?? '',
      content: post?.content ?? '',
      cover_image_url: post?.cover_image_url ?? '',
      is_published: post?.is_published ?? false,
    },
  })

  const watchedTitle = watch('title')
  useEffect(() => {
    if (!post && !slugTouched && watchedTitle) {
      setValue('slug', toSlug(watchedTitle))
    }
  }, [watchedTitle, post, slugTouched, setValue])

  async function onSubmit(data: FormData) {
    setSaving(true)
    const supabase = createClient()

    const payload: any = {
      ...data,
      updated_at: new Date().toISOString(),
      published_at: data.is_published ? (post?.is_published ? undefined : new Date().toISOString()) : null,
    }
    if (!data.is_published) delete payload.published_at

    if (post) {
      const { error } = await (supabase as any).from('blog_posts').update(payload).eq('id', post.id)
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Post saved')
    } else {
      if (data.is_published) payload.published_at = new Date().toISOString()
      const { error } = await (supabase as any).from('blog_posts').insert(payload)
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Post created')
    }

    router.push('/admin/blog')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-2xl">
      <div className="space-y-2">
        <Label>Title *</Label>
        <Input placeholder="My blog post title" {...register('title')} />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Slug *</Label>
        <Input
          placeholder="my-blog-post-title"
          {...register('slug')}
          onChange={(e) => { setSlugTouched(true); register('slug').onChange(e) }}
        />
        {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
        <p className="text-xs text-muted-foreground">URL: /blog/{watch('slug') || 'slug'}</p>
      </div>

      <div className="space-y-2">
        <Label>Cover Image URL</Label>
        <Input placeholder="https://example.com/image.jpg" {...register('cover_image_url')} />
        {errors.cover_image_url && <p className="text-xs text-destructive">{errors.cover_image_url.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Excerpt</Label>
        <Textarea placeholder="Short description shown in the blog listing..." rows={2} {...register('excerpt')} />
      </div>

      <div className="space-y-2">
        <Label>Content (HTML)</Label>
        <Textarea
          placeholder="<p>Your blog post content here...</p>"
          rows={16}
          className="font-mono text-xs"
          {...register('content')}
        />
      </div>

      <div className="flex items-center justify-between py-2">
        <div>
          <Label>Published</Label>
          <p className="text-xs text-muted-foreground">Published posts are visible to everyone</p>
        </div>
        <Switch checked={watch('is_published')} onCheckedChange={(v) => setValue('is_published', v)} />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground hover:bg-accent">
          {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {post ? 'Save Changes' : 'Create Post'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/admin/blog')}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
