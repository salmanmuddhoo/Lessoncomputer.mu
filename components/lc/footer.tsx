import Link from 'next/link'
import { Logo } from '@/components/lc/logo'
import { Mail, Phone } from 'lucide-react'

const GRADE_LINKS = [
  { name: 'Grade 7', href: '/grades/grade-7' },
  { name: 'Grade 8', href: '/grades/grade-8' },
  { name: 'Grade 9', href: '/grades/grade-9' },
  { name: 'Grade 10', href: '/grades/grade-10' },
  { name: 'Grade 11 (SC)', href: '/grades/grade-11' },
  { name: 'Grade 12 (HSC)', href: '/grades/grade-12' },
]

const COMPANY_LINKS = [
  { name: 'About Us', href: '/about' },
  { name: 'Pricing', href: '/pricing' },
  { name: 'Live Classes', href: '/live-classes' },
  { name: 'Contact', href: '/contact' },
]

const LEGAL_LINKS = [
  { name: 'Privacy Policy', href: '/privacy' },
  { name: 'Terms of Service', href: '/terms' },
  { name: 'Refund Policy', href: '/refunds' },
]

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-card/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <Logo className="mb-4" />
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              The leading online learning platform for Mauritian students, Grades 7–12.
            </p>
            <div className="space-y-1 text-sm text-muted-foreground">
              <a href="mailto:hello@lessoncomputer.mu" className="flex items-center gap-2 hover:text-primary transition-colors">
                <Mail className="w-3.5 h-3.5" />
                hello@lessoncomputer.mu
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-3">Grades</h4>
            <ul className="space-y-2">
              {GRADE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-3">Company</h4>
            <ul className="space-y-2">
              {COMPANY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-3">Legal</h4>
            <ul className="space-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-border/40 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} LessonComputer.mu. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Made with dedication for Mauritian students
          </p>
        </div>
      </div>
    </footer>
  )
}
