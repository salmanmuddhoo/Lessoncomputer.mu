import Link from 'next/link'
import { ArrowRight, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background">
      {/* Subtle yellow glow top */}
      <div className="absolute inset-x-0 top-0 h-px bg-border" />
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-primary/8 blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 md:pt-32 md:pb-28 text-center">

        <p className="animate-blur-in text-sm font-medium tracking-widest text-primary uppercase mb-6">
          Online Learning · Mauritius
        </p>

        <h1 className="animate-blur-in-delay-1 font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[1.1] tracking-tight text-foreground mb-6">
          Learn smarter,{' '}
          <span className="relative inline-block">
            score higher
            <span className="absolute bottom-1 left-0 right-0 h-[10px] bg-primary/30 rounded-sm -z-10" />
          </span>
          .
        </h1>

        <p className="animate-blur-in-delay-2 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Premium video lessons and live classes for Grades 7–12,
          crafted by expert Mauritian teachers and aligned to the national curriculum.
        </p>

        <div className="animate-blur-in-delay-3 flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            size="lg"
            asChild
            className="bg-foreground text-background hover:bg-foreground/90 font-semibold text-base px-8 rounded-full h-12"
          >
            <Link href="/register">
              Start Learning Free <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            asChild
            className="border-border hover:border-primary/60 hover:bg-primary/5 font-medium text-base px-8 rounded-full h-12"
          >
            <Link href="/grades/grade-7">
              <Play className="mr-2 w-4 h-4 fill-primary text-primary" />
              Browse Lessons
            </Link>
          </Button>
        </div>

        <div className="animate-blur-in-delay-3 mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
          {['Grades 7 – 12', 'Expert Mauritian Teachers', 'Watch Anytime', 'SC & HSC Aligned'].map((item) => (
            <span key={item} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-border" />
    </section>
  )
}
