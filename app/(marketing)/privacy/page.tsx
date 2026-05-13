import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | LessonComputer.mu',
  description: 'Privacy Policy for LessonComputer.mu — how we collect, use and protect your personal data.',
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
            When you create an account on LessonComputer.mu, we collect your name and email address.
            We also collect information about your usage — such as which videos you watch and live classes
            you attend — to personalise your learning experience.
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
            Your data is stored securely using Supabase (hosted in the EU). We use industry-standard
            encryption for data in transit and at rest. We never sell your personal data to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">4. Cookies</h2>
          <p>
            We use session cookies solely for authentication purposes. We do not use tracking or
            advertising cookies.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">5. Your Rights</h2>
          <p>
            You may request deletion of your account and personal data at any time by emailing us at{' '}
            <a href="mailto:hello@lessoncomputer.mu" className="text-primary hover:underline">
              hello@lessoncomputer.mu
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">6. Contact</h2>
          <p>
            For any privacy-related questions, please contact us at{' '}
            <a href="mailto:hello@lessoncomputer.mu" className="text-primary hover:underline">
              hello@lessoncomputer.mu
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  )
}
