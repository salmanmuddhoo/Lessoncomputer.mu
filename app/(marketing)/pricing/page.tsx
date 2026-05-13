import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Pricing | LessonComputer.mu',
  description: 'Affordable video lessons and live classes for Mauritian students, Grades 7–12. Pay per video or access all content.',
  openGraph: {
    title: 'Pricing | LessonComputer.mu',
    description: 'Affordable learning for every Mauritian student.',
    siteName: 'LessonComputer.mu',
  },
}

const FREE_FEATURES = [
  'Access to all free video lessons',
  'Browse all grades and chapters',
  'View upcoming live class schedules',
  'Create a student account',
]

const PAID_FEATURES = [
  'All Free features',
  'Purchase individual video lessons',
  'Enrol in live classes',
  'Replay recordings of past live classes',
  'Access from any device',
]

export default function PricingPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">Simple, affordable pricing</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Start for free. Only pay for the content you want, when you want it. No subscriptions required.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
        {/* Free tier */}
        <div className="rounded-2xl border border-border/60 bg-card p-8 flex flex-col">
          <div className="mb-6">
            <p className="text-sm font-medium text-muted-foreground mb-1">Free</p>
            <p className="text-4xl font-bold">Rs 0</p>
            <p className="text-sm text-muted-foreground mt-1">No credit card needed</p>
          </div>
          <ul className="space-y-3 mb-8 flex-1">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm">
                <Check className="w-4 h-4 text-primary shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <Button variant="outline" asChild className="rounded-full w-full">
            <Link href="/register">Create Free Account</Link>
          </Button>
        </div>

        {/* Pay-per-content */}
        <div className="rounded-2xl border-2 border-primary bg-card p-8 flex flex-col relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
              Most Popular
            </span>
          </div>
          <div className="mb-6">
            <p className="text-sm font-medium text-muted-foreground mb-1">Pay per lesson</p>
            <p className="text-4xl font-bold">From Rs 50</p>
            <p className="text-sm text-muted-foreground mt-1">Per video or live class</p>
          </div>
          <ul className="space-y-3 mb-8 flex-1">
            {PAID_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm">
                <Check className="w-4 h-4 text-primary shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <Button asChild className="rounded-full w-full bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href="/grades">Browse Lessons</Link>
          </Button>
        </div>
      </div>

      {/* FAQ */}
      <div>
        <h2 className="text-xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
        <div className="space-y-4 max-w-2xl mx-auto">
          {[
            {
              q: 'Do I need to pay a monthly fee?',
              a: 'No. LessonComputer.mu operates on a pay-per-content model. You only pay for the individual videos or live classes you want to access — there is no recurring subscription.',
            },
            {
              q: 'How do I access a video after purchasing?',
              a: 'Once purchased, a video is permanently accessible from your student dashboard. You can watch it as many times as you like.',
            },
            {
              q: 'Are there free videos available?',
              a: 'Yes! Many of our lessons are completely free. Look for the "Free" badge on video cards when browsing by grade.',
            },
            {
              q: 'What payment methods are accepted?',
              a: 'We currently support online card payments. More local payment options are coming soon.',
            },
          ].map((item) => (
            <div key={item.q} className="p-5 rounded-xl border border-border/60 bg-card">
              <h3 className="font-semibold mb-2 text-sm">{item.q}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
