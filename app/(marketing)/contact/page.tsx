import type { Metadata } from 'next'
import { Mail, MapPin, MessageSquare, Clock } from 'lucide-react'
import { ContactForm } from './contact-form'
import { createClient } from '@/lib/supabase/server'
import { formatWhatsAppDisplay, normalizeWhatsAppDigits } from '@/lib/phone'

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with the LessonComputer.mu team. We\'re here to help students and parents with any questions.',
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Contact Us | LessonComputer.mu',
    description: 'Reach out to the LessonComputer.mu team.',
    siteName: 'LessonComputer.mu',
    url: '/contact',
    type: 'website',
  },
}

export default async function ContactPage() {
  const supabase = await createClient()
  let whatsappNumber: string | null = null
  let businessAddress: string | null = null
  try {
    const { data: ss } = await (supabase as any)
      .from('site_settings')
      .select('whatsapp_number, business_address')
      .eq('id', 1)
      .single()
    whatsappNumber = ss?.whatsapp_number ?? null
    businessAddress = ss?.business_address ?? null
  } catch { /* table may not exist yet */ }
  const whatsappDigits = normalizeWhatsAppDigits(whatsappNumber)

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

        {whatsappDigits && (
          <div className="text-center p-6 rounded-xl border border-border/60 bg-card">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">WhatsApp</h3>
            <p className="text-sm text-muted-foreground">
              <a href={`https://wa.me/${whatsappDigits}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                {formatWhatsAppDisplay(whatsappNumber)}
              </a>
            </p>
          </div>
        )}

        <div className="text-center p-6 rounded-xl border border-border/60 bg-card">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-semibold mb-1">Location</h3>
          <p className="text-sm text-muted-foreground">{businessAddress ?? 'Mauritius'}</p>
        </div>
      </div>

      {/* Office hours + reply time */}
      <div className="max-w-xl mx-auto mb-10 rounded-xl border border-border/60 bg-card p-5 flex items-start gap-3">
        <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground leading-relaxed">
          <p className="text-foreground font-medium mb-0.5">Office hours: Monday – Saturday, 9:00 AM – 5:00 PM (MUT, Mauritius time, GMT+4)</p>
          <p>We reply within 24 hours, Monday to Saturday.</p>
          {whatsappDigits && (
            <p className="mt-2">
              Outside Mauritius? WhatsApp is the fastest way to reach us — we answer messages from any country.
            </p>
          )}
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
