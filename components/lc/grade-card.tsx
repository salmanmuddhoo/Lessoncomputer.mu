import Link from 'next/link'
import { ArrowRight, Video, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Grade } from '@/lib/types/database'

interface GradeCardProps {
  grade: Grade & { videoCount?: number; liveClassCount?: number }
}

export function GradeCard({ grade }: GradeCardProps) {
  return (
    <Link href={`/grades/${grade.slug}`}>
      <Card className="lc-card-hover bg-card border-border/60 hover:border-primary/30 h-full cursor-pointer group">
        <CardContent className="p-6">
          <div
            className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center text-2xl font-bold"
            style={{ backgroundColor: `${grade.color}20`, color: grade.color }}
          >
            {grade.name.replace('Grade ', '')}
          </div>

          <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
            {grade.name}
          </h3>

          {grade.description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {grade.description}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {(grade.videoCount ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Video className="w-3 h-3" />
                {grade.videoCount} videos
              </span>
            )}
            {(grade.liveClassCount ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {grade.liveClassCount} live
              </span>
            )}
          </div>

          <div className="mt-4 flex items-center text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            Explore <ArrowRight className="ml-1 w-3 h-3" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
