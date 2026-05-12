const STATS = [
  { value: '500+', label: 'Video Lessons' },
  { value: '1,200+', label: 'Students Enrolled' },
  { value: '6', label: 'Grade Levels' },
  { value: '4.9★', label: 'Average Rating' },
]

export function StatsSection() {
  return (
    <section className="py-14 border-b border-border/40 bg-card/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl md:text-4xl font-bold lc-gradient-text mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
