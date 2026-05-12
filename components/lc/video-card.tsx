import Link from 'next/link'
import { Play, Clock, Lock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Video } from '@/lib/types/database'

interface VideoCardProps {
  video: Video
  owned?: boolean
}

export function VideoCard({ video, owned }: VideoCardProps) {
  return (
    <Link href={`/videos/${video.id}`}>
      <Card className="lc-card-hover bg-card border-border/60 hover:border-primary/30 overflow-hidden group cursor-pointer">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-secondary/50 overflow-hidden">
          {video.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.thumbnail_url}
              alt={video.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play className="w-12 h-12 text-muted-foreground/30" />
            </div>
          )}

          {/* Overlay play button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
              <Play className="w-5 h-5 text-primary-foreground fill-primary-foreground ml-0.5" />
            </div>
          </div>

          {/* Duration badge */}
          {video.duration_minutes && (
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {video.duration_minutes}m
            </div>
          )}

          {/* Lock for non-owned paid content */}
          {!video.is_free && !owned && (
            <div className="absolute top-2 right-2">
              <div className="w-7 h-7 rounded-full bg-black/70 flex items-center justify-center">
                <Lock className="w-3.5 h-3.5 text-primary" />
              </div>
            </div>
          )}
        </div>

        <CardContent className="p-4">
          <h3 className="font-medium text-sm leading-snug mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {video.title}
          </h3>

          <div className="flex items-center justify-between">
            {video.grade && (
              <Badge variant="secondary" className="text-xs">
                {video.grade.name}
              </Badge>
            )}
            <span className="text-sm font-semibold">
              {video.is_free || owned ? (
                <span className="text-primary">Free</span>
              ) : (
                <span className="text-foreground">Rs {video.price}</span>
              )}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
