import Link from 'next/link'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Logo({ className, size = 'md' }: LogoProps) {
  const sizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  }

  return (
    <Link href="/" className={`flex items-center gap-2 font-bold ${sizes[size]} ${className}`}>
      <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg text-primary-foreground font-black text-sm">
        LC
      </div>
      <span className="text-foreground">
        Lesson<span className="text-primary">Computer</span>
        <span className="text-muted-foreground text-sm font-normal">.mu</span>
      </span>
    </Link>
  )
}
