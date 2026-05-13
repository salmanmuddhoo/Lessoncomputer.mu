import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { GraduationCap, Video, Users, BookOpen } from 'lucide-react'

export const metadata: Metadata = {
  title: 'About Us | LessonComputer.mu',
  description: 'LessonComputer.mu is Mauritius\'s dedicated online learning platform for secondary school students, Grades 7–12.',
  openGraph: {
    title: 'About Us | LessonComputer.mu',
    description: 'Quality online education for Mauritian students, Grades 7–12.',
    siteName: 'LessonComputer.mu',
  },
}

const VALUES = [
  {
    icon: GraduationCap,
    title: 'Curriculum-Aligned',
    description: 'All content is crafted to match the Mauritian national curriculum, from Grade 7 to HSC.',
  },
  {
    icon: Video,
    title: 'On-Demand Learning',
    description: 'Watch lessons at your own pace, pause and replay as many times as you need.',
  },
  {
    icon: Users,
    title: 'Live Interaction',
    description: 'Join live classes to ask questions directly and learn alongside other students.',
  },
  {
    icon: BookOpen,
    title: 'Affordable Access',
    description: 'Quality education should be accessible. We offer free content alongside affordable paid lessons.',
  },
]

export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">
          Quality education for every Mauritian student
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
          LessonComputer.mu was created with a simple mission: to give students across Mauritius
          access to high-quality, curriculum-aligned lessons — anytime, anywhere.
        </p>
      </div>

      {/* Values */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-16">
        {VALUES.map((v) => (
          <div key={v.title} className="p-6 rounded-xl border border-border/60 bg-card">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <v.icon className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">{v.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{v.description}</p>
          </div>
        ))}
      </div>

      {/* Story */}
      <div className="rounded-xl border border-border/60 bg-card p-8 mb-16">
        <h2 className="text-xl font-bold mb-4">Our Story</h2>
        <div className="space-y-3 text-muted-foreground leading-relaxed text-sm sm:text-base">
          <p>
            LessonComputer.mu was founded by educators who saw first-hand the challenges students face
            when preparing for the School Certificate and Higher School Certificate examinations.
          </p>
          <p>
            We set out to build a platform that complements classroom learning with clear, well-paced
            video lessons and live classes, giving every student — regardless of their location or
            resources — a fair shot at success.
          </p>
          <p>
            Today, we cover Grades 7 through 12 across core subjects, with new content added regularly
            by experienced teachers who are passionate about Mauritian education.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        <h2 className="text-xl font-bold mb-3">Ready to start learning?</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          Join thousands of students already learning on LessonComputer.mu.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8">
            <Link href="/register">Get Started Free</Link>
          </Button>
          <Button variant="outline" asChild className="rounded-full px-8">
            <Link href="/grades">Browse Grades</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
