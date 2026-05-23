import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background pt-20 pb-16 md:pt-28 md:pb-20">
      {/* Subtle yellow radial behind headline */}
      <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
        <div className="w-[800px] h-[400px] rounded-full bg-primary/6 blur-3xl mt-8" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Eyebrow */}
        <p className="animate-blur-in inline-flex items-center gap-2 text-xs font-semibold tracking-[0.15em] text-primary uppercase mb-6">
          <span className="w-6 h-px bg-primary" />
          Mauritius Online Learning Platform
          <span className="w-6 h-px bg-primary" />
        </p>

        {/* Headline — Playfair Display, exactly like Boty */}
        <h1 className="animate-blur-in-delay-1 font-serif text-[3.25rem] sm:text-6xl md:text-7xl lg:text-[5.25rem] font-bold leading-[1.08] tracking-tight text-foreground mb-6">
          Learn at home,
          <br />
          <span className="relative">
            excel at school
            <span className="absolute bottom-2 left-0 right-0 h-[6px] bg-primary/35 rounded-sm -z-10" />
          </span>
          .
        </h1>

        {/* Subtitle — DM Sans */}
        <p className="animate-blur-in-delay-2 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed font-light">
          Premium video lessons and live classes for Grades&nbsp;7–12,
          designed around the Mauritius national curriculum.
        </p>

        {/* CTAs */}
        <div className="animate-blur-in-delay-3 flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" asChild className="bg-foreground text-background hover:bg-foreground/90 font-semibold rounded-full px-9 h-12 text-[15px]">
            <Link href="/register">
              Browse Grades <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
