import Link from 'next/link'
import { Logo } from '@/components/lc/logo'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lc-hero-bg flex flex-col">
      <div className="p-6">
        <Logo />
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        {children}
      </div>
      <div className="p-6 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} LessonComputer.mu
        {' · '}
        <Link href="/privacy" className="hover:text-primary">Privacy</Link>
        {' · '}
        <Link href="/terms" className="hover:text-primary">Terms</Link>
      </div>
    </div>
  )
}
