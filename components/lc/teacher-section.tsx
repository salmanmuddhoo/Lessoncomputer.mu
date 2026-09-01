import { GraduationCap, Award, Users } from 'lucide-react'

// Meet-the-teacher trust section. Uses a placeholder headshot until a real photo is
// added to /public and swapped in here.
export function TeacherSection() {
  return (
    <section className="py-16 md:py-20 bg-secondary/30 border-b border-border">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center gap-8 sm:gap-10 bg-card rounded-2xl border border-border/60 lc-shadow p-6 sm:p-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/placeholder-user.jpg"
            alt="Your teacher at LessonComputer.mu"
            className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl object-cover border-4 border-primary/20 shrink-0"
          />
          <div className="text-center sm:text-left">
            <p className="text-xs font-semibold tracking-[0.15em] text-primary uppercase mb-2">Meet Your Teacher</p>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-2">
              [Teacher Name] — Grade 7–12 Computer Science
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed mb-4">
              With years of experience teaching the Mauritius national curriculum, our lead
              teacher has helped hundreds of students build confidence and top their exams —
              through clear video lessons and live interactive classes.
            </p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-xs sm:text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-primary" /> Qualified educator
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Award className="w-4 h-4 text-primary" /> Years of teaching experience
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-4 h-4 text-primary" /> Hundreds of students taught
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
