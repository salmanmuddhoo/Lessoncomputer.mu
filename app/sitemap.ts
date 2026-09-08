import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lessoncomputer.mu'

// Always fetch fresh — grades/blog posts change independently of deploys.
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/grades`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/pricing`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/refunds`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/login`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/register`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.5 },
  ]

  const { data: grades } = await supabase
    .from('grades')
    .select('slug, created_at')
    .eq('is_active', true)
  const gradeRoutes: MetadataRoute.Sitemap = ((grades ?? []) as { slug: string; created_at: string }[]).map((g) => ({
    url: `${SITE_URL}/grades/${g.slug}`,
    lastModified: g.created_at ? new Date(g.created_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.9,
  }))

  const { data: posts } = await (supabase as any)
    .from('blog_posts')
    .select('slug, published_at')
    .eq('is_published', true)
  const blogRoutes: MetadataRoute.Sitemap = ((posts ?? []) as { slug: string; published_at: string | null }[]).map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: p.published_at ? new Date(p.published_at) : new Date(),
    changeFrequency: 'monthly',
    priority: 0.5,
  }))

  return [...staticRoutes, ...gradeRoutes, ...blogRoutes]
}
