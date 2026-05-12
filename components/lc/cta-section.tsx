import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CTASection() {
  return (
    <section className="py-20 md:py-24 bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-foreground text-background rounded-3xl px-10 py-16 text-center relative overflow-hidden">
          {/* Yellow glow */}
          <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-primary/20 blur-3xl" />

          <p className="relative text-xs font-semibold tracking-widest text-primary uppercase mb-4">
            Get Started Today
          </p>
          <h2 className="relative font-serif text-4xl md:text-5xl font-bold mb-5 leading-tight">
            Ready to start learning?
          </h2>
          <p className="relative text-background/70 text-lg mb-10 max-w-xl mx-auto">
            Join thousands of students across Mauritius who are already improving their grades with LessonComputer.mu.
          </p>
          <div className="relative flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              asChild
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-8 rounded-full h-12"
            >
              <Link href="/register">
                Create Free Account <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-background/20 text-background hover:bg-background/10 hover:border-background/40 px-8 rounded-full h-12"
            >
              <Link href="/pricing">View Pricing</Link>
            </Button>
          </div>
          <p className="relative text-xs text-background/40 mt-6">No credit card required. Free videos available immediately.</p>
        </div>
      </div>
    </section>
  )
}
