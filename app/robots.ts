import type { MetadataRoute } from 'next'
import { SITE_URL, IS_INDEXABLE } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    // Crawling stays allowed on the test domain so search engines can see each page's
    // noindex tag and drop anything already indexed. Only the sitemap is withheld there.
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/dashboard', '/api', '/onboarding', '/payment/result'],
    },
    ...(IS_INDEXABLE ? { sitemap: `${SITE_URL}/sitemap.xml` } : {}),
  }
}
