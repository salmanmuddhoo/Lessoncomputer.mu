import { ImageResponse } from 'next/og'

export const alt = 'LessonComputer.mu — Cambridge Computer Science Tuition'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Default OG image for the whole site — every page inherits this unless its own route
// segment defines a more specific opengraph-image (e.g. a course page).
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0F0F0F 0%, #262019 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', fontSize: 76, fontWeight: 700, color: '#FAFAF8' }}>
          LessonComputer<span style={{ color: '#FACC15' }}>.mu</span>
        </div>
        <div style={{ display: 'flex', fontSize: 34, marginTop: 24, color: '#FACC15', fontWeight: 600 }}>
          Cambridge Computer Science Tuition
        </div>
        <div style={{ display: 'flex', fontSize: 22, marginTop: 32, color: '#FAFAF8', opacity: 0.65, letterSpacing: 2 }}>
          IGCSE 0478 · O LEVEL 2210 · A LEVEL 9618
        </div>
      </div>
    ),
    { ...size }
  )
}
