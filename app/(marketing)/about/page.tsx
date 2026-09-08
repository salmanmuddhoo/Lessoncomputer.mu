import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import {
  GraduationCap, BookOpen, Users, Video, TrendingUp, Globe, Mail,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'About',
  description: 'Meet your Cambridge Computer Science teacher — 15+ years teaching IGCSE (0478), O Level (2210) and A Level (9618) Computer Science.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About | LessonComputer.mu',
    description: 'Meet your Cambridge Computer Science teacher — 15+ years teaching IGCSE, O Level and A Level Computer Science.',
    siteName: 'LessonComputer.mu',
    url: '/about',
    type: 'website',
  },
}

const SYLLABUSES = [
  { code: '0478', name: 'IGCSE Computer Science', years: '15+ years' },
  { code: '2210', name: 'O Level Computer Science', years: '15+ years' },
  { code: '9618', name: 'AS & A Level Computer Science', years: '10+ years' },
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
      {/* 1. Photo and name */}
      <div className="text-center mb-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/placeholder-user.jpg"
          alt="[Teacher Name], Cambridge Computer Science teacher"
          className="w-32 h-32 rounded-full object-cover mx-auto mb-5 border-4 border-primary/20"
        />
        <h1 className="text-2xl sm:text-3xl font-bold">[Teacher Name]</h1>
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
          <li>• [Degree/qualification, e.g. BSc Computer Science, PGCE]</li>
          <li>• [Professional certification or teaching qualification]</li>
          <li>• Currently teaching Computer Science at [School Name], Mauritius</li>
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
          I teach students preparing for Cambridge IGCSE, O Level and A Level Computer Science —
          based in Mauritius and internationally, including students in [region examples, e.g. the
          Gulf, South Asia, Africa]. Classes run live online, with every session recorded for students
          in different time zones.
        </p>
      </section>

      {/* 7. What a class looks like */}
      <section className="mb-14">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">What a class actually looks like</h2>
        </div>
        <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
          Live classes run [X minutes] weekly, in small groups so every student gets time to ask
          questions. Each session works through past-paper style problems and pseudocode/programming
          exercises on-screen, step by step. Recordings, notes and practice questions are published
          straight after — so nothing is missed if a student can&apos;t attend live.
        </p>
      </section>

      {/* 8. Results */}
      <section className="mb-14">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Results</h2>
        </div>
        <p className="text-muted-foreground leading-relaxed text-sm sm:text-base mb-4">
          [Add specific results here, e.g. "X% of students achieved A*–B over the last 3 series" or
          named results with permission.]
        </p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl border border-border/60 p-4">
            <p className="text-2xl font-bold text-primary">[X]+</p>
            <p className="text-xs text-muted-foreground mt-1">Students taught</p>
          </div>
          <div className="rounded-xl border border-border/60 p-4">
            <p className="text-2xl font-bold text-primary">[X]%</p>
            <p className="text-xs text-muted-foreground mt-1">A*–B grades</p>
          </div>
          <div className="rounded-xl border border-border/60 p-4">
            <p className="text-2xl font-bold text-primary">15+</p>
            <p className="text-xs text-muted-foreground mt-1">Years teaching</p>
          </div>
        </div>
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
