import { Video, Users, BookOpen, Shield, Zap, Award } from 'lucide-react'

const FEATURES = [
  {
    icon: Video,
    title: 'HD Video Lessons',
    description: 'Pre-recorded lessons you can pause, rewind, and rewatch anytime. Structured by grade and topic.',
  },
  {
    icon: Users,
    title: 'Live Interactive Classes',
    description: 'Join scheduled sessions with teachers and ask questions in real time. Session replays included.',
  },
  {
    icon: BookOpen,
    title: 'Grade-Organised Content',
    description: 'Every lesson is mapped to the Mauritius national curriculum from Grade 7 to Grade 12 (HSC).',
  },
  {
    icon: Zap,
    title: 'Learn at Your Pace',
    description: 'No deadlines, no pressure. Start any lesson whenever you\'re ready and revisit as often as you need.',
  },
  {
    icon: Shield,
    title: 'Trusted by Schools',
    description: 'Content created and verified by qualified Mauritian educators with years of experience.',
  },
  {
    icon: Award,
    title: 'Exam-Focused',
    description: 'Lessons aligned to SC and HSC exam syllabi to maximise your results in national examinations.',
  },
]

export function FeaturesSection() {
  return (
    <section className="py-20 md:py-24 border-b border-border/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything you need to <span className="lc-gradient-text">succeed</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            A complete learning platform built specifically for Mauritian students.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="p-6 rounded-xl border border-border/60 bg-card hover:border-primary/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
