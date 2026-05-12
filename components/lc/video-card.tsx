import Link from 'next/link'
import { Play, Clock, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Video } from '@/lib/types/database'

interface VideoCardProps {
  video: Video
  owned?: boolean
}

export function VideoCard({ video, owned }: VideoCardProps) {
  return (
    <Link href={`/videos/${video.id}`}>
      <div className="group bg-card rounded-2xl overflow-hidden lc-shadow lc-card-hover border border-border/60 cursor-pointer">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-secondary overflow-hidden">
          {video.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.thumbnail_url}
              alt={video.title}
              className="w-full h-full object-cover group-hover:scale-105 lc-transition"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-muted">
              <Play className="w-10 h-10 text-muted-foreground/20" />
            </div>
          )}

          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 lc-transition bg-foreground/30">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center lc-shadow">
              <Play className="w-5 h-5 fill-primary-foreground text-primary-foreground ml-0.5" />
            </div>
          </div>

          {/* Duration */}
          {video.duration_minutes && (
            <div className="absolute bottom-2 right-2 bg-foreground/70 text-background text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {video.duration_minutes}m
            </div>
          )}

          {/* Lock */}
          {!video.is_free && !owned && (
            <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-foreground/70 flex items-center justify-center">
              <Lock className="w-3.5 h-3.5 text-primary" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-medium text-sm leading-snug mb-3 line-clamp-2 group-hover:text-primary lc-transition">
            {video.title}
          </h3>
          <div className="flex items-center justify-between">
            {video.grade && (
              <Badge variant="secondary" className="text-xs font-medium rounded-full">
                {video.grade.name}
              </Badge>
            )}
            <span className="text-sm font-semibold ml-auto">
              {video.is_free || owned ? (
                <span className="text-primary">Free</span>
              ) : (
                `Rs ${video.price}`
              )}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
