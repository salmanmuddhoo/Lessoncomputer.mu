'use client'

import { useState } from 'react'

interface Props {
  description: string
}

export function VideoDescription({ description }: Props) {
  const [expanded, setExpanded] = useState(false)
  const isLong = description.length > 200

  return (
    <div className="mt-3">
      <p className={`text-sm text-muted-foreground leading-relaxed whitespace-pre-line ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
        {description}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 text-xs font-semibold text-foreground hover:text-primary transition-colors"
        >
          {expanded ? 'Show less' : '...more'}
        </button>
      )}
    </div>
  )
}
