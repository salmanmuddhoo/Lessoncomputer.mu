import { Star, Quote } from 'lucide-react'

const TESTIMONIALS = [
  {
    name: 'Priya Ramkhelawon',
    grade: 'Grade 11 (SC)',
    text: 'LessonComputer completely changed the way I study. I can rewatch every explanation until I truly understand. My Maths grade went from a C to an A in one term.',
    rating: 5,
  },
  {
    name: 'Kevin Sookiah',
    grade: 'Grade 12 (HSC)',
    text: 'The live classes are brilliant — you can ask questions and the teacher responds instantly. It feels like a private tutor at a fraction of the cost.',
    rating: 5,
  },
  {
    name: 'Nadia Boodhoo',
    grade: 'Grade 9',
    text: 'I love how everything is organised by grade and subject. I always know exactly where to go. The video quality is excellent and the teachers explain things so clearly.',
    rating: 5,
  },
]

export function Testimonials() {
  return (
    <section className="py-20 md:py-24 bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-14">
          <p className="text-xs font-semibold tracking-[0.15em] text-primary uppercase mb-3">Student Stories</p>
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground leading-tight">
            What students are saying
          </h2>
        </div>

        {/* Cards — Boty testimonial card style */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="bg-card rounded-2xl p-7 border border-border lc-shadow lc-card-hover flex flex-col">
              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-sm text-foreground/80 leading-relaxed flex-1 mb-6 font-light italic">
                &ldquo;{t.text}&rdquo;
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3 pt-5 border-t border-border">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-serif font-bold text-primary text-sm shrink-0">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.grade}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
