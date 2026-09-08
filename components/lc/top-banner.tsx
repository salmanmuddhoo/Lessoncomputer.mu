import Link from 'next/link'
import { Megaphone } from 'lucide-react'

interface Props {
  text: string
  link?: string | null
}

// Continuously scrolling announcement strip — sales, tuition start dates, general info.
// Pure CSS animation (no JS): the text renders twice back-to-back and scrolls left by exactly
// half its width, so the loop point is invisible.
export function TopBanner({ text, link }: Props) {
  const isExternal = !!link && /^https?:\/\//i.test(link)

  const item = (
    <span className="inline-flex items-center gap-2 px-6">
      <Megaphone className="w-3.5 h-3.5 shrink-0" />
      {text}
    </span>
  )

  const inner = (
    <div className="w-full whitespace-nowrap overflow-hidden">
      <div className="animate-marquee inline-flex w-max">
        {item}
        {item}
      </div>
    </div>
  )

  return (
    <div className="fixed top-0 inset-x-0 z-[60] h-8 flex items-center bg-primary text-primary-foreground text-xs font-medium overflow-hidden">
      {link ? (
        isExternal ? (
          <a href={link} target="_blank" rel="noopener noreferrer" className="block w-full hover:opacity-90 transition-opacity">
            {inner}
          </a>
        ) : (
          <Link href={link} className="block w-full hover:opacity-90 transition-opacity">
            {inner}
          </Link>
        )
      ) : (
        inner
      )}
    </div>
  )
}
