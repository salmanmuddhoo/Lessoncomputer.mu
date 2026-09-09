import { ShieldCheck, Video, GraduationCap, Users } from 'lucide-react'

const BADGES = [
  { icon: ShieldCheck,   label: 'One specialist teacher',    sub: 'Every class taught by the same person, not a rota of tutors' },
  { icon: Video,         label: 'Recorded lessons',          sub: 'Watch on phone, tablet or laptop, and rewind as often as you need' },
  { icon: GraduationCap, label: 'Cambridge syllabuses',       sub: 'IGCSE 0478 · O Level 2210 · AS & A Level 9618' },
  { icon: Users,         label: 'Live weekly classes',        sub: 'Shown in your local time, and recorded if you cannot attend' },
]

export function TrustBadges() {
  return (
    <section className="bg-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-0 lg:divide-x lg:divide-primary-foreground/20">
          {BADGES.map((b) => (
            <div key={b.label} className="flex items-center gap-3 lg:px-8 first:pl-0 last:pr-0">
              <div className="w-9 h-9 rounded-lg bg-primary-foreground/15 flex items-center justify-center shrink-0">
                <b.icon className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary-foreground leading-tight">{b.label}</p>
                <p className="text-xs text-primary-foreground/70 leading-tight">{b.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
