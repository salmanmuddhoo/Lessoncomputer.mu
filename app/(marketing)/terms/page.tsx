import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for LessonComputer — Cambridge Computer Science tuition, the rules and conditions for using our platform.',
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-muted-foreground text-sm mb-8">Last updated: May 2026</p>

      <div className="prose prose-sm max-w-none space-y-6 text-foreground/80 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">1. Acceptance of Terms</h2>
          <p>
            By creating an account or using LessonComputer.mu, you agree to be bound by these Terms of
            Service. If you do not agree, please do not use our platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">2. Use of the Platform</h2>
          <p>You agree to use LessonComputer.mu only for lawful purposes. You must not:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Share, redistribute, or resell any purchased content</li>
            <li>Attempt to reverse-engineer or copy video content</li>
            <li>Use the platform to harass, abuse, or harm other users</li>
            <li>Create multiple accounts to circumvent restrictions</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">3. Purchases & Payments</h2>
          <p>
            All purchases are final unless covered by our{' '}
            <Link href="/refunds" className="text-primary hover:underline">Refund Policy</Link>. Prices
            for Cambridge courses are charged in US Dollars (USD). Prices for Mauritius national
            curriculum courses are charged in Mauritian Rupees (MUR). Any other currency shown is an
            estimate only, clearly labelled, and is never the amount actually charged. We reserve the
            right to change pricing at any time; existing purchases will not be affected.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">4. Intellectual Property</h2>
          <p>
            All content on LessonComputer.mu is the sole property of [REGISTERED COMPANY NAME],
            Business Registration Number [BRN], registered at [ADDRESS], Mauritius (&quot;the
            Company&quot;). This includes, without limitation, all video lessons, live classes,
            course materials, documents, revision notes, text, graphics, logos, trademarks, designs,
            and software. No content may be copied, reproduced, redistributed, resold, publicly
            displayed, or otherwise used without the Company's prior written consent. Unauthorised
            use is strictly prohibited and may result in account termination and legal action.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">5. Account Termination</h2>
          <p>
            We reserve the right to suspend or terminate accounts that violate these terms, without
            prior notice. You may delete your account at any time by contacting us.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">6. Limitation of Liability</h2>
          <p>
            LessonComputer.mu is provided "as is". We do not guarantee uninterrupted access and are
            not liable for any indirect, incidental, or consequential damages arising from the use of
            our platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">7. Governing Law</h2>
          <p>
            These Terms are governed by the laws of Mauritius. Any dispute will be subject to the
            exclusive jurisdiction of the courts of Mauritius.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">8. Subscription Cancellation &amp; Renewal</h2>
          <p>
            Monthly subscriptions renew automatically on the same date each month until cancelled.
            You may cancel at any time from your account. Cancellation takes effect at the end of the
            month already paid for, and you keep access until that date. We do not pro-rate part
            months.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">9. Minors &amp; Parental Consent</h2>
          <p>
            Students under 18 must have the consent of a parent or guardian to create an account and
            to purchase a course. Where the student is under 18, the contract is with the parent or
            guardian.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">10. Live Classes: Recording &amp; Conduct</h2>
          <p>
            Live classes are recorded so that students who cannot attend can watch afterwards.
            Recordings capture the teacher's screen and voice. Students may keep their camera off at
            all times. Recordings are available only to students enrolled in that course and must not
            be shared, downloaded, or redistributed.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">11. Contact</h2>
          <p>
            Questions about these terms? Email us at{' '}
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
