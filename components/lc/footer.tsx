import Link from 'next/link'
import { Logo } from '@/components/lc/logo'
import { Mail, Facebook, Instagram } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CookieSettingsButton } from '@/components/ConsentManager'

const GRADE_LINKS = [
  { name: 'Grade 7',       href: '/grades/grade-7' },
  { name: 'Grade 8',       href: '/grades/grade-8' },
  { name: 'Grade 9',       href: '/grades/grade-9' },
  { name: 'Grade 10',      href: '/grades/grade-10' },
  { name: 'Grade 11 (SC)', href: '/grades/grade-11' },
  { name: 'Grade 12 (HSC)',href: '/grades/grade-12' },
]

const COMPANY_LINKS = [
  { name: 'About Us', href: '/about' },
  { name: 'Contact',  href: '/contact' },
  { name: 'Blog',     href: '/blog' },
]

const LEGAL_LINKS = [
  { name: 'Terms of Service',             href: '/terms' },
  { name: 'Refund Policy',                href: '/refunds' },
  { name: 'Delivery Policy',              href: '/delivery' },
  { name: 'Privacy Policy',               href: '/privacy' },
  { name: 'Payment & Security',           href: '/payment' },
  { name: 'Safeguarding & Class Conduct', href: '/safeguarding' },
  { name: 'Cookie Policy',                href: '/cookies' },
]

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.24 8.24 0 004.83 1.56V6.8a4.85 4.85 0 01-1.07-.11z" />
    </svg>
  )
}

export async function Footer() {
  let settings: { facebook_url: string | null; instagram_url: string | null; tiktok_url: string | null } | null = null
  try {
    const supabase = await createClient()
    const { data } = await (supabase as any)
      .from('site_settings')
      .select('facebook_url, instagram_url, tiktok_url')
      .eq('id', 1)
      .single()
    settings = data
  } catch {
    // Table may not exist yet — show footer without social icons
  }

  // Grades in the footer follow the configured active grades (fall back to the static
  // list if the query fails).
  let gradeLinks = GRADE_LINKS
  let mauritiusLinks: { name: string; href: string }[] = []
  let internationalLinks: { name: string; href: string }[] = []
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('grades')
      .select('name, slug, is_mauritius_only')
      .eq('is_active', true)
      .order('order_index', { ascending: true })
    if (data && data.length > 0) {
      gradeLinks = (data as { name: string; slug: string; is_mauritius_only: boolean }[]).map((g) => ({ name: g.name, href: `/grades/${g.slug}` }))
      mauritiusLinks = (data as { name: string; slug: string; is_mauritius_only: boolean }[])
        .filter((g) => g.is_mauritius_only !== false)
        .map((g) => ({ name: g.name, href: `/grades/${g.slug}` }))
      internationalLinks = (data as { name: string; slug: string; is_mauritius_only: boolean }[])
        .filter((g) => g.is_mauritius_only === false)
        .map((g) => ({ name: g.name, href: `/grades/${g.slug}` }))
    }
  } catch { /* keep fallback */ }
  const hasSplit = mauritiusLinks.length > 0 || internationalLinks.length > 0

  const hasSocial = settings?.facebook_url || settings?.instagram_url || settings?.tiktok_url

  return (
    <footer className="border-t border-border bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10 mb-12">
          <div className="col-span-2 md:col-span-1">
            <Logo className="mb-5" />
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              Cambridge Computer Science and ICT tuition. Taught from Mauritius. Open to students worldwide.
            </p>
            <a
              href="mailto:lessonscomputers@gmail.com"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary lc-transition"
            >
              <Mail className="w-4 h-4" />
              lessonscomputers@gmail.com
            </a>

            {hasSocial && (
              <div className="flex items-center gap-2.5 mt-4">
                {settings?.facebook_url && (
                  <a
                    href={settings.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="w-8 h-8 rounded-full bg-[#1877F2] text-white flex items-center justify-center hover:opacity-85 transition-opacity"
                  >
                    <Facebook className="w-4 h-4" />
                  </a>
                )}
                {settings?.instagram_url && (
                  <a
                    href={settings.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="w-8 h-8 rounded-full text-white flex items-center justify-center hover:opacity-85 transition-opacity"
                    style={{ background: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)' }}
                  >
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                {settings?.tiktok_url && (
                  <a
                    href={settings.tiktok_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="TikTok"
                    className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center hover:opacity-75 transition-opacity"
                  >
                    <TikTokIcon className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}
          </div>

          {hasSplit ? (
            <>
              {mauritiusLinks.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-4">Courses — Mauritius</h4>
                  <ul className="space-y-2.5">
                    {mauritiusLinks.map((link) => (
                      <li key={link.href}><Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground lc-transition">{link.name}</Link></li>
                    ))}
                  </ul>
                </div>
              )}
              {internationalLinks.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-4">Courses — International</h4>
                  <ul className="space-y-2.5">
                    {internationalLinks.map((link) => (
                      <li key={link.href}><Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground lc-transition">{link.name}</Link></li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div>
              <h4 className="font-semibold text-sm mb-4">Courses</h4>
              <ul className="space-y-2.5">
                {gradeLinks.map((link) => (
                  <li key={link.href}><Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground lc-transition">{link.name}</Link></li>
                ))}
              </ul>
            </div>
          )}
          {[
            { title: 'Company', links: COMPANY_LINKS },
            { title: 'Legal', links: LEGAL_LINKS },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="font-semibold text-sm mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground lc-transition">
                      {link.name}
                    </Link>
                  </li>
                ))}
                {col.title === 'Legal' && (
                  <li>
                    <CookieSettingsButton className="text-sm text-muted-foreground hover:text-foreground lc-transition text-left" />
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-7 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="text-center sm:text-left space-y-0.5">
            <p>&copy; {new Date().getFullYear()} Lesson Computer Ltd. All rights reserved.</p>
            <p>Registered in Mauritius | Business Registration No.: C24215107</p>
            <p>Registered Address: Belvedere Road, Brisée Verdière, 1402-03, Mauritius</p>
            <p>
              <a href="mailto:lessonscomputers@gmail.com" className="hover:text-foreground lc-transition">lessonscomputers@gmail.com</a>
              {' | '}
              <a href="https://wa.me/23059151012" target="_blank" rel="noopener noreferrer" className="hover:text-foreground lc-transition">+230 5915 1012</a>
            </p>
          </div>
          <p>Developed by Salman. Contact on +230 5822 2428</p>
        </div>
      </div>
    </footer>
  )
}
