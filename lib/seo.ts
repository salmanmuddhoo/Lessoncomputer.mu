import type { Metadata } from 'next'

// The public domain the site will live on. Canonical tags, the sitemap and structured data
// all point here unless NEXT_PUBLIC_SITE_URL says otherwise.
export const PRODUCTION_URL = 'https://www.lessoncomputer.mu'

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || PRODUCTION_URL).replace(/\/+$/, '')

// Search engines may index the site only once it runs on lessoncomputer.mu. While main is
// deployed on the test domain, NEXT_PUBLIC_SITE_URL points there and every page is noindex.
// Swapping the domain = setting NEXT_PUBLIC_SITE_URL to PRODUCTION_URL and redeploying.
const PRODUCTION_HOSTS = ['www.lessoncomputer.mu', 'lessoncomputer.mu']
export const IS_INDEXABLE = (() => {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  if (!configured) return false
  try {
    return PRODUCTION_HOSTS.includes(new URL(configured).host)
  } catch {
    return false
  }
})()

export const SITE_NAME = 'LessonComputer.mu'

// Served by app/opengraph-image.tsx. Pages that set their own openGraph block lose the
// inherited image, so pageMetadata() adds it back explicitly.
export const DEFAULT_OG_IMAGE = {
  url: '/opengraph-image',
  width: 1200,
  height: 630,
  alt: 'LessonComputer.mu — Cambridge Computer Science Tuition',
}

// Title, description, canonical, Open Graph and Twitter tags for a page, all kept in step.
// `title` is the short page title; the root layout's template appends "| LessonComputer.mu".
export function pageMetadata({
  title,
  description,
  path,
  ogTitle,
  ogDescription,
  image = true,
}: {
  title: string
  description: string
  path: string
  ogTitle?: string
  ogDescription?: string
  // false when the route segment has its own opengraph-image file
  image?: boolean
}): Metadata {
  const socialTitle = ogTitle ?? `${title} | ${SITE_NAME}`
  const socialDescription = ogDescription ?? description
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: socialTitle,
      description: socialDescription,
      siteName: SITE_NAME,
      url: path,
      type: 'website',
      locale: 'en_US',
      ...(image ? { images: [DEFAULT_OG_IMAGE] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description: socialDescription,
      ...(image ? { images: [DEFAULT_OG_IMAGE.url] } : {}),
    },
  }
}

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path
  return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`
}

// Organization facts shared by the JSON-LD blocks.
export const ORGANIZATION_ID = `${SITE_URL}/#organization`

export function organizationJsonLd(sameAs: string[] = []) {
  return {
    '@type': 'EducationalOrganization',
    '@id': ORGANIZATION_ID,
    name: 'Lesson Computer Ltd',
    alternateName: SITE_NAME,
    url: `${SITE_URL}/`,
    logo: absoluteUrl('/apple-icon.png'),
    email: 'lessonscomputers@gmail.com',
    telephone: '+230 5915 1012',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Belvedere Road, Brisée Verdière',
      postalCode: '1402-03',
      addressCountry: 'MU',
    },
    ...(sameAs.length > 0 ? { sameAs } : {}),
  }
}

// Short reference used on other pages: Google doesn't follow @id across pages, so the name
// and URL travel with it.
export function organizationRef() {
  return { '@type': 'EducationalOrganization', '@id': ORGANIZATION_ID, name: 'Lesson Computer Ltd', url: `${SITE_URL}/` }
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}
