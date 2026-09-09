import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for LessonComputer — Cambridge Computer Science tuition, how we collect, use and protect your personal data.',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-muted-foreground text-sm mb-8">Last updated: May 2026</p>

      <div className="prose prose-sm max-w-none space-y-6 text-foreground/80 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">1. Information We Collect</h2>
          <p>
            When you create an account on LessonComputer.mu, we collect: your name, email address,
            country, time zone, and the syllabus or exam series you tell us you are studying; payment
            details processed by our payment processor (MIPS) — we do not store your full card
            details ourselves; records of which videos you watch, which live classes you attend, and
            other attendance and viewing information; and any messages you send us through the
            contact form or elsewhere.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">2. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Provide and maintain your account</li>
            <li>Process payments for purchased content</li>
            <li>Send you important account-related emails (e.g. confirmations, receipts)</li>
            <li>Improve our platform and content</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">3. Data Storage & Security</h2>
          <p>
            Your data is stored securely using Supabase (database and storage, hosted in the EU). We
            use industry-standard encryption for data in transit and at rest. We never sell your
            personal data to third parties.
          </p>
          <p className="mt-2">
            We also share data with the following sub-processors, each only for the purpose stated:
            Supabase (database and storage, EU), MIPS (payment processing, Mauritius), and
            [EMAIL PROVIDER] (transactional emails). Your data may be transferred outside your
            country of residence to these providers' hosting locations, under their respective data
            protection safeguards.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">4. Cookies</h2>
          <p>
            We use cookies that are necessary for the site to work, and — with your consent —
            analytics and advertising cookies that help us understand how people find us. You can
            accept or reject each category, and change your choice at any time.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">5. Your Rights</h2>
          <p>
            You may request deletion of your account and personal data at any time by emailing us at{' '}
            <a href="mailto:support@lessoncomputer.mu" className="text-primary hover:underline">
              support@lessoncomputer.mu
            </a>
            . You also have the right to complain to the Data Protection Commissioner in Mauritius if
            you believe your data has been mishandled.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">6. Data Controller, Retention &amp; Minors</h2>
          <p>
            The data controller for LessonComputer.mu is [REGISTERED COMPANY NAME], registered at
            [FULL ADDRESS], Mauritius, contactable at{' '}
            <a href="mailto:support@lessoncomputer.mu" className="text-primary hover:underline">
              support@lessoncomputer.mu
            </a>
            . We process your data on the basis of performing our contract with you (account and
            course access), our legitimate interests (improving the platform), and, where applicable,
            your consent (analytics and advertising cookies). We keep account data for as long as
            your account is active, and for [RETENTION PERIOD] after closure to meet legal and
            accounting obligations. Where a student is under 18, we rely on the consent of a parent or
            guardian, obtained at signup, to process that student's data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">7. Contact</h2>
          <p>
            For any privacy-related questions, please contact us at{' '}
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
