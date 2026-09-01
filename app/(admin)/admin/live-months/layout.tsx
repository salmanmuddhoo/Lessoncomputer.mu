import type { Metadata } from 'next'

// Own browser title for this admin page (the page itself is a client component and can't
// export metadata). Overrides the site-wide default so it doesn't share the public title.
export const metadata: Metadata = { title: 'Monthly Content' }

export default function LiveMonthsLayout({ children }: { children: React.ReactNode }) {
  return children
}
