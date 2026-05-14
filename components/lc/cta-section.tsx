import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CTASection() {
  return (
    <section className="relative overflow-hidden bg-foreground py-20 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          {/* Yellow glow */}
          <div className="pointer-events-none absolute w-[600px] h-[200px] rounded-full bg-primary/15 blur-3xl left-1/2 -translate-x-1/2" />

          <p className="relative text-xs font-semibold tracking-[0.15em] text-primary uppercase mb-4">
            Start Today
          </p>
          <h2 className="relative font-serif text-4xl md:text-5xl font-bold text-background leading-tight mb-5">
            Ready to start learning?
          </h2>
          <p className="relative text-background/60 text-base md:text-lg mb-10 font-light leading-relaxed">
            Join thousands of Mauritian students already improving their grades
            with expert-led video lessons and live classes.
          </p>
          <div className="relative flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              asChild
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-full px-9 h-12 text-[15px]"
            >
              <Link href="/register">
                Create Free Account <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="bg-transparent border-background/25 text-background hover:bg-background/10 hover:border-background/50 rounded-full px-9 h-12 text-[15px]"
            >
              <Link href="/pricing">View Pricing</Link>
            </Button>
          </div>
          <p className="relative text-xs text-background/35 mt-6">No credit card required · Free videos available immediately</p>
        </div>
      </div>
    </section>
  )
}
