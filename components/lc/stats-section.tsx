const STATS = [
  { value: '500+', label: 'Video Lessons' },
  { value: '1,200+', label: 'Students Enrolled' },
  { value: '6', label: 'Grade Levels' },
  { value: '4.9 / 5', label: 'Average Rating' },
]

export function StatsSection() {
  return (
    <section className="border-y border-border bg-secondary/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-1">
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
