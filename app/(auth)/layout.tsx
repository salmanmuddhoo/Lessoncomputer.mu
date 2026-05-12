import Link from 'next/link'
import { Logo } from '@/components/lc/logo'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-secondary/30 flex flex-col">
      <div className="p-6 border-b border-border bg-background">
        <Logo />
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </div>
      <div className="p-6 text-center text-xs text-muted-foreground border-t border-border bg-background">
        &copy; {new Date().getFullYear()} LessonComputer.mu
        {' · '}
        <Link href="/privacy" className="hover:text-foreground lc-transition">Privacy</Link>
        {' · '}
        <Link href="/terms" className="hover:text-foreground lc-transition">Terms</Link>
      </div>
    </div>
  )
}
