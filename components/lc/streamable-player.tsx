'use client'

interface StreamablePlayerProps {
  url: string
  title?: string
}

function extractStreamableId(url: string): string | null {
  const match = url.match(/streamable\.com\/(?:e\/)?([a-z0-9]+)/i)
  return match ? match[1] : null
}

export function StreamablePlayer({ url, title }: StreamablePlayerProps) {
  const videoId = extractStreamableId(url)

  if (!videoId) {
    return (
      <div className="aspect-video bg-secondary/50 rounded-xl flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Video unavailable</p>
      </div>
    )
  }

  return (
    <div className="aspect-video rounded-xl overflow-hidden bg-black border border-border/40 lc-glow">
      <iframe
        src={`https://streamable.com/e/${videoId}`}
        title={title ?? 'Video lesson'}
        frameBorder="0"
        allow="fullscreen"
        allowFullScreen
        className="w-full h-full"
      />
    </div>
  )
}
