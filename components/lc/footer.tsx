import Link from 'next/link'
import { Logo } from '@/components/lc/logo'
import { Mail, Facebook, Instagram } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

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
  { name: 'Privacy Policy',   href: '/privacy' },
  { name: 'Terms of Service', href: '/terms' },
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

  const hasSocial = settings?.facebook_url || settings?.instagram_url || settings?.tiktok_url

  return (
    <footer className="border-t border-border bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          <div className="col-span-2 md:col-span-1">
            <Logo className="mb-5" />
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              The leading online learning platform for Mauritian students, Grades 7–12.
            </p>
            <a
              href="mailto:hello@lessoncomputer.mu"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary lc-transition"
            >
              <Mail className="w-4 h-4" />
              hello@lessoncomputer.mu
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

          {[
            { title: 'Grades', links: GRADE_LINKS },
            { title: 'Company', links: COMPANY_LINKS },
            { title: 'Legal', links: LEGAL_LINKS },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="font-semibold text-sm mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground lc-transition"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-7 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} LessonComputer.mu. All rights reserved.</p>
          <p>Made with dedication for Mauritian students</p>
        </div>
      </div>
    </footer>
  )
}
