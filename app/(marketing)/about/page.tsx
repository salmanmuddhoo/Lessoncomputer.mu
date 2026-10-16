import type { Metadata } from 'next'
import { absoluteUrl, pageMetadata, organizationRef } from '@/lib/seo'
import { JsonLd } from '@/components/lc/json-ld'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import {
  GraduationCap, BookOpen, Users, Video, Globe, Mail,
} from 'lucide-react'

export const metadata: Metadata = pageMetadata({
  title: 'About Your Teacher, Mr Muddhoo Shoheb',
  description: 'Meet your Cambridge Computer Science teacher — 15+ years teaching IGCSE (0478), O Level (2210) and A Level (9618) Computer Science.',
  path: '/about',
  ogDescription: 'Meet your Cambridge Computer Science teacher — 15+ years teaching IGCSE, O Level and A Level Computer Science.',
})

const SYLLABUSES = [
  { code: '9618', name: 'AS & A Level Computer Science', years: '15+ years' },
  { code: '0478', name: 'IGCSE Computer Science', years: '15+ years' },
  { code: '2210', name: 'O Level Computer Science', years: '15+ years' },
  { code: 'Grade 7, 8 & 9 (NCE)', name: 'ICT', years: '15+ years' },
]

export default async function AboutPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let dashboardHref = '/dashboard'
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role === 'admin') dashboardHref = '/admin'
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <JsonLd
        data={{
          '@type': 'Person',
          '@id': absoluteUrl('/about#teacher'),
          name: 'Muddhoo Shoheb',
          honorificPrefix: 'Mr',
          jobTitle: 'Cambridge Computer Science Teacher',
          image: absoluteUrl('/Teacher.png'),
          url: absoluteUrl('/about'),
          worksFor: organizationRef(),
          hasCredential: ['BSc Electronics and Computer Science', 'PGCE'].map((name) => ({
            '@type': 'EducationalOccupationalCredential',
            name,
          })),
          knowsAbout: [
            'Cambridge IGCSE Computer Science (0478)',
            'Cambridge O Level Computer Science (2210)',
            'Cambridge AS & A Level Computer Science (9618)',
          ],
        }}
      />
      {/* 1. Photo and name */}
      <div className="text-center mb-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/Teacher.png"
          alt="Mr Muddhoo Shoheb, Cambridge Computer Science teacher"
          className="w-40 h-40 rounded-full object-cover mx-auto mb-5 border-4 border-primary/20"
        />
        <h1 className="text-2xl sm:text-3xl font-bold">Mr Muddhoo Shoheb</h1>
        <p className="text-muted-foreground mt-1">Cambridge Computer Science Teacher</p>
      </div>

      {/* 2. Headline claim */}
      <div className="text-center mb-14">
        <p className="font-serif text-2xl sm:text-3xl font-bold leading-snug text-foreground max-w-xl mx-auto">
          I have taught Cambridge Computer Science for 15+ years.
        </p>
      </div>

      {/* 3. Qualifications and current position */}
      <section className="mb-14">
        <div className="flex items-center gap-2 mb-4">
          <GraduationCap className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Qualifications</h2>
        </div>
        <ul className="space-y-2 text-muted-foreground leading-relaxed">
          <li>• Degree: BSc Electronics and Computer Science</li>
          <li>• Professional certification: PGCE</li>
          <li>• Currently teaching Computer Science at Islamic Cultural College, Port-Louis, Mauritius</li>
          <li>• Location: Belvedere Road, Brisée Verdière, 1402-03, Mauritius</li>
        </ul>
      </section>

      {/* 4. The three syllabuses */}
      <section className="mb-14">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Syllabuses I teach</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {SYLLABUSES.map((s) => (
            <div key={s.code} className="rounded-xl border border-border/60 bg-card p-5">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">{s.code}</p>
              <p className="font-semibold text-sm mb-1">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.years}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. How I teach */}
      <section className="mb-14">
        <div className="flex items-center gap-2 mb-4">
          <Video className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">How I teach</h2>
        </div>
        <div className="space-y-3 text-muted-foreground leading-relaxed text-sm sm:text-base">
          <p>
            I teach using what I call the <strong className="text-foreground">what / why / how</strong> method:
            what the concept is, why it exists (the real-world problem it solves), and how to apply it —
            in exam answers and in code.
          </p>
          <p>
            Every topic is worked from first principles. Instead of memorising definitions, students see
            where an idea comes from, so it actually sticks. This approach is built specifically for
            students who find Computer Science hard — the pace is deliberate, and nothing is assumed.
          </p>
        </div>
      </section>

      {/* 6. Who I teach and from where */}
      <section className="mb-14">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Who I teach</h2>
        </div>
        <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
          I teach students preparing for Cambridge IGCSE, O Level and A Level Computer Science in
          English-medium schools across Mauritius and international Cambridge education markets,
          including the UAE, Saudi Arabia, Qatar, Kuwait, Oman, Bahrain, Malaysia, Singapore, India,
          Pakistan, Bangladesh, Sri Lanka, Kenya, Nigeria, Ghana, South Africa and other countries.
          Classes are delivered live online, with every session recorded so students can learn from
          any time zone.
        </p>
      </section>

      {/* 7. What a class looks like */}
      <section className="mb-14">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">What a class actually looks like</h2>
        </div>
        <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
          Live classes run 90 minutes weekly, in small groups so every student gets time to ask
          questions. Each session works through past-paper style problems and pseudocode/programming
          exercises on-screen, step by step. Recordings, notes and practice questions are published
          straight after — so nothing is missed if a student can&apos;t attend live.
        </p>
      </section>

      {/* 9. Why Mauritius works for international students */}
      <section className="mb-14">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Why Mauritius works for international students</h2>
        </div>
        <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
          Mauritius is an English-medium Cambridge country, so lessons are taught in the same language
          and exam culture your child is being assessed in. Mauritius also sits at GMT+4 — conveniently
          placed between the Gulf, South Asia, Africa and Asia-Pacific, making live class times workable
          for students across all these regions.
        </p>
      </section>

      {/* 10. Contact */}
      <section className="rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Mail className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Get in touch</h2>
        </div>
        <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
          Questions about a syllabus, live class times, or which course is right for your child?
          I&apos;m happy to help.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8">
            <Link href="/contact">Contact Us</Link>
          </Button>
          {user ? (
            <Button variant="outline" asChild className="rounded-full px-8">
              <Link href={dashboardHref}>Go to Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button variant="outline" asChild className="rounded-full px-8">
                <Link href="/register">Get Started Free</Link>
              </Button>
              <Button variant="outline" asChild className="rounded-full px-8">
                <Link href="/grades">Browse Courses</Link>
              </Button>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
