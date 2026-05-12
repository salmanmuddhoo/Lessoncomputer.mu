import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CTASection() {
  return (
    <section className="py-20 md:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="relative rounded-2xl border border-primary/20 bg-primary/5 lc-glow p-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to start learning?
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
            Join thousands of students across Mauritius who are already improving their grades with LessonComputer.mu.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="bg-primary text-primary-foreground hover:bg-accent font-semibold px-8 lc-glow-sm">
              <Link href="/register">
                Create Free Account <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="hover:border-primary/50">
              <Link href="/pricing">View Pricing</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-6">No credit card required. Free videos available immediately.</p>
        </div>
      </div>
    </section>
  )
}
