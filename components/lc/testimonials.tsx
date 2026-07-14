import { Star, PlayCircle } from 'lucide-react'

export interface TestimonialItem {
  id: string
  type: 'video' | 'photo' | 'result'
  author_name: string | null
  author_role: string | null
  quote: string | null
  media_url: string
}

// Fallback text testimonials used when the admin hasn't added any yet.
const FALLBACK = [
  { name: 'Priya Ramkhelawon', grade: 'Grade 11 (SC)', text: 'LessonComputer completely changed the way I study. I can rewatch every explanation until I truly understand. My Maths grade went from a C to an A in one term.' },
  { name: 'Kevin Sookiah', grade: 'Grade 12 (HSC)', text: 'The live classes are brilliant — you can ask questions and the teacher responds instantly. It feels like a private tutor at a fraction of the cost.' },
  { name: 'Nadia Boodhoo', grade: 'Grade 9', text: 'I love how everything is organised by grade and subject. The video quality is excellent and the teachers explain things so clearly.' },
]

// Convert a streamable watch URL into its embeddable form.
function toEmbedUrl(url: string): string {
  try {
    const u = new URL(url)
    if (u.hostname.includes('streamable.com')) {
      const id = u.pathname.split('/').filter(Boolean).pop()
      if (id) return `https://streamable.com/e/${id}`
    }
  } catch {
    // fall through
  }
  return url
}

function Header() {
  return (
    <div className="text-center max-w-xl mx-auto mb-14">
      <p className="text-xs font-semibold tracking-[0.15em] text-primary uppercase mb-3">Student &amp; Parent Stories</p>
      <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground leading-tight">
        Trusted by students &amp; families
      </h2>
    </div>
  )
}

function Author({ name, role }: { name: string | null; role: string | null }) {
  if (!name && !role) return null
  return (
    <div className="flex items-center gap-3 pt-5 border-t border-border mt-auto">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-serif font-bold text-primary text-sm shrink-0">
        {name?.[0] ?? '★'}
      </div>
      <div>
        {name && <p className="text-sm font-semibold text-foreground">{name}</p>}
        {role && <p className="text-xs text-muted-foreground">{role}</p>}
      </div>
    </div>
  )
}

export function Testimonials({ items = [] }: { items?: TestimonialItem[] }) {
  return (
    <section className="py-20 md:py-24 bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Header />

        {items.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FALLBACK.map((t) => (
              <div key={t.name} className="bg-card rounded-2xl p-7 border border-border lc-shadow lc-card-hover flex flex-col">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4 fill-primary text-primary" />)}
                </div>
                <blockquote className="text-sm text-foreground/80 leading-relaxed flex-1 mb-6 font-light italic">
                  &ldquo;{t.text}&rdquo;
                </blockquote>
                <div className="flex items-center gap-3 pt-5 border-t border-border">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-serif font-bold text-primary text-sm shrink-0">{t.name[0]}</div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.grade}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((t) => (
              <div key={t.id} className="bg-card rounded-2xl border border-border lc-shadow lc-card-hover overflow-hidden flex flex-col">
                {t.type === 'video' ? (
                  <div className="aspect-video bg-black">
                    <iframe
                      src={toEmbedUrl(t.media_url)}
                      className="w-full h-full"
                      allow="fullscreen; autoplay"
                      allowFullScreen
                      title={t.author_name ?? 'Testimonial video'}
                    />
                  </div>
                ) : t.type === 'result' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.media_url} alt={`Result — ${t.author_name ?? 'student'}`} className="w-full aspect-[4/3] object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.media_url} alt={t.author_name ?? 'Testimonial'} className="w-full aspect-[4/3] object-cover" />
                )}

                <div className="p-6 flex flex-col flex-1">
                  {t.type === 'video' && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-primary mb-3">
                      <PlayCircle className="w-3.5 h-3.5" /> Watch their story
                    </div>
                  )}
                  {t.quote && (
                    <blockquote className="text-sm text-foreground/80 leading-relaxed flex-1 mb-4 font-light italic">
                      &ldquo;{t.quote}&rdquo;
                    </blockquote>
                  )}
                  <Author name={t.author_name} role={t.author_role} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
