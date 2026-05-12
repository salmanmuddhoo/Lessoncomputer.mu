import { Video, Users, BookOpen, Zap, Shield, Award } from 'lucide-react'

const FEATURES = [
  {
    icon: Video,
    title: 'HD Video Lessons',
    description: 'Pre-recorded lessons you can pause, rewind, and rewatch as many times as you need.',
  },
  {
    icon: Users,
    title: 'Live Interactive Classes',
    description: 'Join scheduled sessions with teachers and ask questions in real time. Replays included.',
  },
  {
    icon: BookOpen,
    title: 'Grade-Organised Content',
    description: 'Every lesson is mapped to the Mauritius national curriculum from Grade 7 to Grade 12.',
  },
  {
    icon: Zap,
    title: 'Learn at Your Pace',
    description: 'No deadlines. Start any lesson whenever you\'re ready and revisit as often as you need.',
  },
  {
    icon: Shield,
    title: 'Trusted by Schools',
    description: 'Content created and verified by qualified Mauritian educators with years of experience.',
  },
  {
    icon: Award,
    title: 'Exam-Focused',
    description: 'Lessons aligned to SC and HSC syllabi to maximise your results in national examinations.',
  },
]

export function FeaturesSection() {
  return (
    <section className="py-20 md:py-24 border-b border-border bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-3">Why LessonComputer</p>
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground leading-tight">
            Everything you need
            <br />
            to succeed
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="bg-card p-7 rounded-2xl border border-border lc-shadow lc-card-hover"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-serif font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
