import { ShieldCheck, Video, GraduationCap, Users } from 'lucide-react'

const BADGES = [
  { icon: ShieldCheck,   label: 'Qualified Teachers',       sub: 'Certified Mauritian educators' },
  { icon: Video,         label: 'HD Video Lessons',          sub: 'Watch on any device, anytime' },
  { icon: GraduationCap, label: 'SC & HSC Aligned',          sub: 'Follows national curriculum'   },
  { icon: Users,         label: 'Live Interactive Classes',  sub: 'Join & ask questions in real time' },
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
