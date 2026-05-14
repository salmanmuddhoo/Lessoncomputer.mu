import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Refund Policy',
  description: 'Refund and cancellation policy for LessonComputer.mu subscriptions and purchases.',
}

export default function RefundsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <h1 className="text-3xl font-bold mb-2">Refund Policy</h1>
      <p className="text-muted-foreground text-sm mb-10">Last updated: May 2026</p>

      <div className="prose prose-neutral max-w-none space-y-8 text-sm leading-relaxed text-foreground/90">

        <section>
          <h2 className="text-lg font-semibold mb-3">1. Overview</h2>
          <p>
            At LessonComputer.mu we want you to be satisfied with your purchase. This policy explains when you
            are entitled to a refund and how to request one.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">2. Subscription Packages</h2>
          <p>
            Monthly subscription packages may be refunded within <strong>7 days</strong> of purchase, provided
            that fewer than 20% of the included videos have been watched. After this period, or once significant
            content has been accessed, no refund will be issued.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">3. Individual Video Purchases</h2>
          <p>
            Individual video purchases are non-refundable once the video has been accessed. If you experience a
            technical issue that prevents you from watching a purchased video, please contact us within 48 hours
            and we will investigate.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">4. Live Classes</h2>
          <p>
            Cancellations made at least <strong>24 hours before</strong> the scheduled live class start time are
            eligible for a full refund. Cancellations made less than 24 hours before the class, or after the
            class has started, are not eligible for a refund.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">5. How to Request a Refund</h2>
          <p>
            To request a refund, please email us at{' '}
            <a href="mailto:support@lessoncomputer.mu" className="text-primary hover:underline">
              support@lessoncomputer.mu
            </a>{' '}
            with your order details and the reason for your request. We aim to respond within 2 business days.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">6. Processing</h2>
          <p>
            Approved refunds are processed within 5–10 business days and returned to the original payment method.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">7. Contact</h2>
          <p>
            Questions about this policy? Reach us at{' '}
            <a href="mailto:support@lessoncomputer.mu" className="text-primary hover:underline">
              support@lessoncomputer.mu
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  )
}
