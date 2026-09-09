import { Video, Users, BookOpen, Zap, Shield, Award } from 'lucide-react'

const FEATURES = [
  {
    icon: Video,
    title: 'HD Video Lessons',
    description: 'Pause, rewind, and rewatch as many times as you need. Every lesson recorded in crystal-clear quality.',
  },
  {
    icon: Users,
    title: 'Live Interactive Classes',
    description: 'Join live sessions, ask questions in real time, and get instant feedback from expert teachers. Missed a class? The video recording is available to watch right after.',
  },
  {
    icon: BookOpen,
    title: 'Syllabus-Organised Content',
    description: 'Every lesson mapped to your exact Cambridge syllabus — IGCSE 0478, O Level 2210, or AS & A Level 9618.',
  },
  {
    icon: Zap,
    title: 'Learn at Your Own Pace',
    description: 'No deadlines, no pressure. Start any lesson whenever you\'re ready and revisit it whenever you like.',
  },
  {
    icon: Shield,
    title: 'Cambridge-Focused Teaching',
    description: 'Content created and taught by an experienced Cambridge Computer Science teacher you can trust.',
  },
  {
    icon: Award,
    title: 'Exam-Focused Lessons',
    description: 'Targeted at Cambridge exam syllabi to give you the best possible shot at top results.',
  },
]

export function FeaturesSection() {
  return (
    <section className="py-20 md:py-24 bg-secondary/40 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Boty-style section header */}
        <div className="max-w-xl mb-14">
          <p className="text-xs font-semibold tracking-[0.15em] text-primary uppercase mb-3">Why LessonComputer</p>
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground leading-tight">
            Everything you need to succeed
          </h2>
        </div>

        {/* Feature grid — Boty card style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="bg-card p-7 rounded-2xl border border-border lc-shadow lc-card-hover"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-serif font-semibold text-[1.05rem] text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
