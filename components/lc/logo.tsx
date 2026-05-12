import Link from 'next/link'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Logo({ className, size = 'md' }: LogoProps) {
  const textSize = { sm: 'text-lg', md: 'text-xl', lg: 'text-2xl' }[size]

  return (
    <Link href="/" className={`flex items-center gap-2.5 ${textSize} ${className}`}>
      <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg text-primary-foreground font-black text-sm shrink-0">
        LC
      </div>
      <span className="font-semibold tracking-tight text-foreground">
        Lesson<span className="text-primary font-bold">Computer</span>
        <span className="text-muted-foreground font-normal text-sm">.mu</span>
      </span>
    </Link>
  )
}
