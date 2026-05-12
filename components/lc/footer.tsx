import Link from 'next/link'
import { Logo } from '@/components/lc/logo'
import { Mail } from 'lucide-react'

const GRADE_LINKS = [
  { name: 'Grade 7',       href: '/grades/grade-7' },
  { name: 'Grade 8',       href: '/grades/grade-8' },
  { name: 'Grade 9',       href: '/grades/grade-9' },
  { name: 'Grade 10',      href: '/grades/grade-10' },
  { name: 'Grade 11 (SC)', href: '/grades/grade-11' },
  { name: 'Grade 12 (HSC)',href: '/grades/grade-12' },
]

const COMPANY_LINKS = [
  { name: 'About Us',     href: '/about' },
  { name: 'Pricing',      href: '/pricing' },
  { name: 'Live Classes', href: '/live-classes' },
  { name: 'Contact',      href: '/contact' },
]

const LEGAL_LINKS = [
  { name: 'Privacy Policy',   href: '/privacy' },
  { name: 'Terms of Service', href: '/terms' },
  { name: 'Refund Policy',    href: '/refunds' },
]

export function Footer() {
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
