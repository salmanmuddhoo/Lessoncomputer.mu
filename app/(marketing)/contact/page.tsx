import type { Metadata } from 'next'
import { Mail, MapPin, MessageSquare } from 'lucide-react'
import { ContactForm } from './contact-form'

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with the LessonComputer.mu team. We\'re here to help Mauritian students and parents with any questions.',
  openGraph: {
    title: 'Contact Us | LessonComputer.mu',
    description: 'Reach out to the LessonComputer.mu team.',
    siteName: 'LessonComputer.mu',
  },
}

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">Get in Touch</h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Have a question about our courses, subscriptions, or your account? We&apos;re happy to help.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-6 mb-12">
        <div className="text-center p-6 rounded-xl border border-border/60 bg-card">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-semibold mb-1">Email</h3>
          <p className="text-sm text-muted-foreground">
            <a href="mailto:support@lessoncomputer.mu" className="hover:text-primary transition-colors">
              support@lessoncomputer.mu
            </a>
          </p>
        </div>

        <div className="text-center p-6 rounded-xl border border-border/60 bg-card">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-semibold mb-1">WhatsApp</h3>
          <p className="text-sm text-muted-foreground">
            <a href="https://wa.me/23000000000" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
              +230 0000 0000
            </a>
          </p>
        </div>

        <div className="text-center p-6 rounded-xl border border-border/60 bg-card">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-semibold mb-1">Location</h3>
          <p className="text-sm text-muted-foreground">Mauritius</p>
        </div>
      </div>

      {/* Contact form */}
      <div className="max-w-xl mx-auto">
        <div className="rounded-xl border border-border/60 bg-card p-6 sm:p-8">
          <h2 className="text-xl font-semibold mb-6">Send us a message</h2>
          <ContactForm />
        </div>
      </div>
    </div>
  )
}
