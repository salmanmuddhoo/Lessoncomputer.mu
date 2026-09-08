import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'

export const alt = 'Course preview'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: grade } = await supabase
    .from('grades')
    .select('name, description, color')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  const name = grade?.name ?? 'LessonComputer.mu'
  const description = grade?.description ?? 'Cambridge Computer Science Tuition'
  const accent = (grade as any)?.color ?? '#FACC15'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '90px',
          background: '#0F0F0F',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 24, color: accent, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}>
          LessonComputer.mu
        </div>
        <div style={{ display: 'flex', fontSize: 66, fontWeight: 700, marginTop: 24, lineHeight: 1.1, color: '#FAFAF8', maxWidth: 1000 }}>
          {name}
        </div>
        <div style={{ display: 'flex', fontSize: 28, marginTop: 24, color: '#FAFAF8', opacity: 0.7, maxWidth: 950 }}>
          {description}
        </div>
      </div>
    ),
    { ...size }
  )
}
