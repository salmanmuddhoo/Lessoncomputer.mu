import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { SITE_URL } from '@/lib/seo'

// Always fetch fresh — grades/blog posts change independently of deploys.
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  // Static pages carry no lastModified: stamping "now" on every request teaches crawlers to
  // ignore the field. Sign-in and sign-up pages are left out (nothing to rank for).
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/grades`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/live-classes`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/pricing`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/blog`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/refunds`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/delivery`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/payment`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/safeguarding`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/cookies`, changeFrequency: 'yearly', priority: 0.3 },
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

  // Published video lessons have public pages (title, description, demo or upsell).
  const { data: videos } = await supabase
    .from('videos_catalogue')
    .select('id, created_at')
    .eq('is_published', true)
  const videoRoutes: MetadataRoute.Sitemap = ((videos ?? []) as { id: string; created_at: string | null }[]).map((v) => ({
    url: `${SITE_URL}/videos/${v.id}`,
    ...(v.created_at ? { lastModified: new Date(v.created_at) } : {}),
    changeFrequency: 'monthly',
    priority: 0.5,
  }))

  return [...staticRoutes, ...gradeRoutes, ...blogRoutes, ...videoRoutes]
}
