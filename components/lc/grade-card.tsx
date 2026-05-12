import Link from 'next/link'
import { ArrowRight, Video, Users } from 'lucide-react'
import type { Grade } from '@/lib/types/database'

interface GradeCardProps {
  grade: Grade & { videoCount?: number; liveClassCount?: number }
}

export function GradeCard({ grade }: GradeCardProps) {
  return (
    <Link href={`/grades/${grade.slug}`}>
      <div className="group bg-card rounded-2xl overflow-hidden lc-shadow lc-card-hover border border-border/60 cursor-pointer h-full flex flex-col">
        {/* Coloured band — like the product image area in Boty */}
        <div
          className="h-28 flex items-center justify-center relative overflow-hidden"
          style={{ backgroundColor: `${grade.color}18` }}
        >
          <span
            className="font-serif text-5xl font-bold opacity-90"
            style={{ color: grade.color }}
          >
            {grade.name.replace('Grade ', '')}
          </span>
          {/* Subtle pattern */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 80%, ${grade.color} 0%, transparent 50%), radial-gradient(circle at 80% 20%, ${grade.color} 0%, transparent 50%)`,
            }}
          />
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col flex-1">
          <h3 className="font-serif font-semibold text-lg text-foreground mb-1 group-hover:text-primary lc-transition">
            {grade.name}
          </h3>

          {grade.description && (
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed line-clamp-2">
              {grade.description}
            </p>
          )}

          <div className="mt-auto flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {(grade.videoCount ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <Video className="w-3 h-3" />
                  {grade.videoCount}
                </span>
              )}
              {(grade.liveClassCount ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {grade.liveClassCount} live
                </span>
              )}
            </div>
            <span className="flex items-center gap-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 lc-transition">
              Explore <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
