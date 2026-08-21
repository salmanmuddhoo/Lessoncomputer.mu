import Link from 'next/link'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  // Render on a dark background (e.g. the sidebar) so "Lesson" and ".mu" stay legible
  onDark?: boolean
}

export function Logo({ className, size = 'md', onDark = false }: LogoProps) {
  const textSize = { sm: 'text-lg', md: 'text-xl', lg: 'text-2xl' }[size]

  return (
    <Link href="/" className={`flex items-center gap-2.5 ${textSize} ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.svg" alt="LessonComputer.mu logo" className="w-8 h-8 shrink-0" />
      <span className={`font-semibold tracking-tight ${onDark ? 'text-sidebar-foreground' : 'text-foreground'}`}>
        Lesson<span className="text-primary font-bold">Computer</span>
        <span className={`font-normal text-sm ${onDark ? 'text-sidebar-foreground/60' : 'text-muted-foreground'}`}>.mu</span>
      </span>
    </Link>
  )
}
