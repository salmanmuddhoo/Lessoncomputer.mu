import Link from 'next/link'
import { Video, Users, Star, Globe } from 'lucide-react'
import type { Grade } from '@/lib/types/database'

interface GradeCardProps {
  grade: Grade & { videoCount?: number; liveClassCount?: number; is_mauritius_only?: boolean }
}

export function GradeCard({ grade }: GradeCardProps) {
  return (
    <Link href={`/grades/${grade.slug}`} className="group block">
      <div className="bg-card rounded-2xl overflow-hidden lc-shadow lc-card-hover border border-border/50">

        {/* — Image area (Boty product photo equivalent) — */}
        <div
          className="relative aspect-[4/3] flex flex-col items-center justify-center overflow-hidden"
          style={{ backgroundColor: `${grade.color}14` }}
        >
          {grade.image_url ? (
            <img src={grade.image_url} alt={grade.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <>
              {/* Background circles for depth */}
              <div className="absolute w-48 h-48 rounded-full opacity-10" style={{ background: grade.color, top: '-20%', right: '-10%' }} />
              <div className="absolute w-32 h-32 rounded-full opacity-8"  style={{ background: grade.color, bottom: '-10%', left: '-5%' }} />

              {/* Grade number — the hero element */}
              <span className="relative font-serif font-bold text-[5rem] leading-none" style={{ color: grade.color }}>
                {grade.name.replace('Grade ', '')}
              </span>
              <span className="relative text-xs font-semibold tracking-[0.2em] uppercase mt-1" style={{ color: grade.color, opacity: 0.7 }}>
                Grade
              </span>
            </>
          )}

          {/* Mauritius Only badge — top-right corner */}
          {(grade as any).is_mauritius_only === false && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-background/90 backdrop-blur-sm text-foreground text-[10px] font-semibold px-2 py-1 rounded-full border border-border/50">
              <Globe className="w-3 h-3" />
              International
            </div>
          )}
          {(grade as any).is_mauritius_only !== false && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-primary/90 backdrop-blur-sm text-primary-foreground text-[10px] font-semibold px-2 py-1 rounded-full">
              🇲🇺 Mauritius Only
            </div>
          )}
        </div>

        {/* — Info area (Boty product info equivalent) — */}
        <div className="p-5">
          {/* Grade name — like product name in Boty (serif) */}
          <h3 className="font-serif font-semibold text-lg text-foreground mb-3 group-hover:text-primary lc-transition">
            {grade.name}
            {grade.name.includes('SC') || grade.name.includes('HSC') ? '' : ' — Secondary'}
          </h3>

          {/* Rating row */}
          <div className="flex items-center gap-1 mb-3">
            {[1,2,3,4,5].map((s) => (
              <Star key={s} className="w-3.5 h-3.5 fill-primary text-primary" />
            ))}
            <span className="text-xs text-muted-foreground ml-1">Student Rated</span>
          </div>

          {/* Content count — like price in Boty */}
          <div className="flex items-center gap-4 text-sm text-foreground/80 mb-4 font-medium">
            {(grade.videoCount ?? 0) > 0 && (
              <span className="flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-primary" />
                {grade.videoCount} videos
              </span>
            )}
            {(grade.liveClassCount ?? 0) > 0 && (
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" />
                {grade.liveClassCount} live
              </span>
            )}
            {!grade.videoCount && !grade.liveClassCount && (
              <span className="text-muted-foreground text-xs">Content coming soon</span>
            )}
          </div>

          {/* CTA — like "Add to Cart" in Boty */}
          <div className="w-full py-2.5 px-4 rounded-xl bg-secondary text-center text-sm font-semibold text-foreground group-hover:bg-primary group-hover:text-primary-foreground lc-transition">
            Explore Grade
          </div>
        </div>
      </div>
    </Link>
  )
}
