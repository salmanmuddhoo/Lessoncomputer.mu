const STATS = [
  { value: '500+',    label: 'Video Lessons'      },
  { value: '1,200+', label: 'Students Enrolled'   },
  { value: '6',      label: 'Grade Levels'         },
  { value: '4.9 ★',  label: 'Average Rating'       },
]

export function StatsSection() {
  return (
    <section className="border-b border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-11">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center px-6">
              <p className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-1">{stat.value}</p>
              <p className="text-xs text-muted-foreground font-medium tracking-wide">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
